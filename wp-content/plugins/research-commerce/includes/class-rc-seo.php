<?php
/**
 * Search visibility: titles, meta, Open Graph and structured data.
 *
 * Structured data is what Google reads for rich results and for free Shopping
 * listings, so the product markup mirrors the analytical fields the listing
 * already shows — purity, lot, CAS — as additionalProperty entries.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * SEO output.
 */
class RC_SEO {

	/**
	 * Hooks.
	 */
	public static function init() {
		if ( self::conflicts_with_seo_plugin() ) {
			add_action( 'admin_notices', array( __CLASS__, 'plugin_conflict_notice' ) );
			// Another SEO plugin owns titles and meta; only add what it omits.
			add_action( 'wp_head', array( __CLASS__, 'structured_data' ), 20 );
			return;
		}

		// We emit our own canonical, so core's would be a duplicate.
		remove_action( 'wp_head', 'rel_canonical' );

		add_filter( 'document_title_parts', array( __CLASS__, 'title_parts' ) );
		add_filter( 'document_title_separator', array( __CLASS__, 'title_separator' ) );
		add_action( 'wp_head', array( __CLASS__, 'meta_tags' ), 1 );
		add_action( 'wp_head', array( __CLASS__, 'structured_data' ), 20 );
	}

	/**
	 * Detect the common SEO plugins so we never print duplicate tags.
	 *
	 * @return bool
	 */
	public static function conflicts_with_seo_plugin() {
		return defined( 'WPSEO_VERSION' )            // Yoast.
			|| defined( 'RANK_MATH_VERSION' )        // Rank Math.
			|| defined( 'AIOSEO_VERSION' )           // All in One SEO.
			|| function_exists( 'seopress_activation' );
	}

	/**
	 * Tell the store owner which half we stepped back from.
	 */
	public static function plugin_conflict_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'product_page_research-commerce' !== $screen->id ) {
			return;
		}

		echo '<div class="notice notice-info"><p>';
		esc_html_e( 'Another SEO plugin is active, so Research Commerce is leaving titles, meta descriptions and Open Graph tags to it. The product, article and organization structured data is still being output, because most SEO plugins do not include the analytical fields.', 'research-commerce' );
		echo '</p></div>';
	}

	/**
	 * Title separator.
	 *
	 * @return string
	 */
	public static function title_separator() {
		return '|';
	}

	/**
	 * Title templates. Search intent in this category is "compound + size +
	 * purity/price", so the size and the assayed purity go in the title where
	 * they are known.
	 *
	 * @param array $parts Title parts.
	 * @return array
	 */
	public static function title_parts( $parts ) {
		if ( is_singular( 'product' ) ) {
			$id       = get_the_ID();
			$purity   = get_post_meta( $id, '_rc_purity', true );
			$compound = get_post_meta( $id, '_rc_compound', true );
			$title    = get_the_title( $id );

			// The catalog code is what the listing and the vial label show;
			// the full chemical name is what people search for, so the search
			// title carries both.
			if ( $compound && false === stripos( $title, $compound ) ) {
				$title = sprintf( '%s (%s)', $title, $compound );
			}

			$bits = array( $title );
			if ( $purity ) {
				/* translators: %s: assayed purity, e.g. 99.1%. */
				$bits[] = sprintf( __( '%s Purity', 'research-commerce' ), $purity );
			}
			$bits[] = __( 'COA Included', 'research-commerce' );

			$parts['title'] = implode( ' | ', $bits );
		}

		if ( is_post_type_archive( 'product' ) || ( function_exists( 'is_shop' ) && is_shop() ) ) {
			$parts['title'] = __( 'Research Peptide Catalog | Lot-Tested with Certificates', 'research-commerce' );
		}

		if ( is_page() ) {
			$titles = self::page_titles();
			$slug   = get_post_field( 'post_name', get_the_ID() );

			if ( isset( $titles[ $slug ] ) ) {
				$parts['title'] = wp_specialchars_decode( $titles[ $slug ] );
			}
		}

		return $parts;
	}

	/**
	 * Trim a description to what a result snippet will actually show, cutting
	 * on a word boundary. Google truncates around 155-160 characters.
	 *
	 * @param string $text  Description.
	 * @param int    $limit Character limit.
	 * @return string
	 */
	public static function trim_description( $text, $limit = 155 ) {
		$text = trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( $text ) ) );

		if ( strlen( $text ) <= $limit ) {
			return $text;
		}

		$cut = substr( $text, 0, $limit );
		$gap = strrpos( $cut, ' ' );

		if ( false !== $gap ) {
			$cut = substr( $cut, 0, $gap );
		}

		return rtrim( $cut, ' ,.;:' ) . '…';
	}

	/**
	 * Title templates for the pages that carry search intent of their own.
	 *
	 * @return array Slug => title.
	 */
	public static function page_titles() {
		return apply_filters( 'rc_page_titles', array(
			'coa-lookup'           => __( 'Certificate of Analysis Lookup | Verify Any Lot Number', 'research-commerce' ),
			'faq'                  => __( 'Research Peptide FAQ | Purity, Certificates, Storage &amp; Shipping', 'research-commerce' ),
			'bulk-orders'          => __( 'Bulk &amp; Institutional Orders | Purchase Orders and Quotes', 'research-commerce' ),
			'shipping-and-storage' => __( 'Shipping &amp; Storage | Cold-Chain Handling and Dispatch', 'research-commerce' ),
			'research-use-policy'  => __( 'Research Use Policy | Laboratory Use Only', 'research-commerce' ),
		) );
	}

	/**
	 * The description for the current view.
	 *
	 * @return string
	 */
	public static function description() {
		if ( is_singular( 'product' ) ) {
			$id       = get_the_ID();
			$excerpt  = get_post_field( 'post_excerpt', $id );
			$compound = get_post_meta( $id, '_rc_compound', true );

			if ( $excerpt ) {
				$excerpt = wp_strip_all_tags( $excerpt );

				// Lead with the catalog code and the compound it refers to, so
				// the snippet answers what the listing actually is. When the
				// code already is the compound name, say it once.
				if ( $compound && false === stripos( $excerpt, $compound ) ) {
					$code  = preg_replace( '/\s+\d+\s*m?g$/i', '', get_the_title( $id ) );
					$lead  = ( 0 === strcasecmp( trim( $code ), trim( $compound ) ) )
						? $code
						: sprintf( '%s (%s)', $code, $compound );

					$excerpt = sprintf( '%s — %s', $lead, $excerpt );
				}

				return $excerpt;
			}

			$purity   = get_post_meta( $id, '_rc_purity', true );
			$quantity = get_post_meta( $id, '_rc_quantity', true );
			$compound = get_post_meta( $id, '_rc_compound', true );
			$name     = get_the_title( $id );

			if ( $compound && false === stripos( $name, $compound ) ) {
				$name = sprintf( '%s (%s)', $name, $compound );
			}

			return trim( sprintf(
				/* translators: 1: product name, 2: fill size, 3: purity. */
				__( '%1$s reference material%2$s%3$s, supplied lyophilized with a lot-specific certificate of analysis. Research use only.', 'research-commerce' ),
				$name,
				$quantity ? ', ' . $quantity . ' per vial' : '',
				$purity ? ', assayed at ' . $purity . ' by RP-HPLC' : ''
			) );
		}

		if ( is_singular() ) {
			$excerpt = get_the_excerpt();
			if ( $excerpt ) {
				return wp_strip_all_tags( $excerpt );
			}
		}

		if ( is_post_type_archive( 'product' ) || ( function_exists( 'is_shop' ) && is_shop() ) ) {
			return __( 'Analytically characterized research peptides and reference materials. Purity by RP-HPLC, identity by mass spectrometry, and the certificate for the lot in stock published before purchase. Research use only.', 'research-commerce' );
		}

		if ( is_front_page() || is_home() ) {
			$tagline = get_bloginfo( 'description' );

			/**
			 * Filter the homepage meta description.
			 *
			 * @param string $description Description.
			 */
			return apply_filters(
				'rc_home_description',
				trim( $tagline . ( $tagline ? '. ' : '' ) . __( 'Research peptides and reference materials assayed by RP-HPLC and confirmed by mass spectrometry, with the certificate for the lot in stock published before you order. Research use only.', 'research-commerce' ) )
			);
		}

		return get_bloginfo( 'description' );
	}

	/**
	 * Description, canonical, robots and social tags.
	 */
	public static function meta_tags() {
		$description = self::description();
		$canonical   = self::canonical();

		if ( $description ) {
			printf( '<meta name="description" content="%s">' . "\n", esc_attr( self::trim_description( $description ) ) );
		}

		if ( $canonical ) {
			printf( '<link rel="canonical" href="%s">' . "\n", esc_url( $canonical ) );
		}

		// Open Graph.
		printf( '<meta property="og:site_name" content="%s">' . "\n", esc_attr( get_bloginfo( 'name' ) ) );
		// A static front page is still the website, not an article.
		if ( is_singular( 'product' ) ) {
			$og_type = 'product';
		} elseif ( is_front_page() || is_home() ) {
			$og_type = 'website';
		} elseif ( is_singular( 'post' ) ) {
			$og_type = 'article';
		} else {
			$og_type = 'website';
		}

		printf( '<meta property="og:type" content="%s">' . "\n", esc_attr( $og_type ) );
		printf( '<meta property="og:title" content="%s">' . "\n", esc_attr( wp_get_document_title() ) );
		if ( $description ) {
			printf( '<meta property="og:description" content="%s">' . "\n", esc_attr( self::trim_description( $description ) ) );
		}
		if ( $canonical ) {
			printf( '<meta property="og:url" content="%s">' . "\n", esc_url( $canonical ) );
		}

		$image = self::image();
		if ( $image ) {
			printf( '<meta property="og:image" content="%s">' . "\n", esc_url( $image ) );
			printf( '<meta name="twitter:image" content="%s">' . "\n", esc_url( $image ) );
		}

		printf( '<meta name="twitter:card" content="%s">' . "\n", $image ? 'summary_large_image' : 'summary' );
		printf( '<meta name="twitter:title" content="%s">' . "\n", esc_attr( wp_get_document_title() ) );

		/**
		 * Alternate language versions, for stores that publish translated pages.
		 * Return an array of language code => URL.
		 *
		 * @param array $alternates Language code => URL.
		 */
		$alternates = apply_filters( 'rc_hreflang_alternates', array() );
		foreach ( $alternates as $lang => $url ) {
			printf(
				'<link rel="alternate" hreflang="%s" href="%s">' . "\n",
				esc_attr( $lang ),
				esc_url( $url )
			);
		}
	}

	/**
	 * Canonical URL for the current view.
	 *
	 * @return string
	 */
	public static function canonical() {
		if ( is_singular() ) {
			return get_permalink();
		}
		if ( is_post_type_archive() ) {
			return get_post_type_archive_link( get_post_type() ?: 'product' );
		}
		if ( is_tax() || is_category() || is_tag() ) {
			$term = get_queried_object();
			return $term ? get_term_link( $term ) : '';
		}
		if ( is_front_page() ) {
			return home_url( '/' );
		}
		return '';
	}

	/**
	 * A representative image URL for the current view.
	 *
	 * @return string
	 */
	public static function image() {
		if ( is_singular() && has_post_thumbnail() ) {
			$src = wp_get_attachment_image_src( get_post_thumbnail_id(), 'large' );
			if ( $src ) {
				return $src[0];
			}
		}

		$logo_id = get_theme_mod( 'custom_logo' );
		if ( $logo_id ) {
			$src = wp_get_attachment_image_src( $logo_id, 'full' );
			if ( $src ) {
				return $src[0];
			}
		}

		return '';
	}

	/**
	 * JSON-LD graph for the current view.
	 */
	public static function structured_data() {
		$graph = array( self::organization_schema(), self::website_schema() );

		if ( is_singular( 'product' ) ) {
			$graph[] = self::product_schema( get_the_ID() );
			$graph[] = self::breadcrumb_schema();
		} elseif ( is_singular( 'post' ) ) {
			$graph[] = self::article_schema( get_the_ID() );
			$graph[] = self::breadcrumb_schema();
		} elseif ( is_page() ) {
			$faq = self::faq_schema( get_the_ID() );
			if ( $faq ) {
				$graph[] = $faq;
			}
		}

		$payload = array(
			'@context' => 'https://schema.org',
			'@graph'   => array_values( array_filter( $graph ) ),
		);

		printf(
			'<script type="application/ld+json">%s</script>' . "\n",
			wp_json_encode( $payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
		);
	}

	/**
	 * Organization.
	 *
	 * @return array
	 */
	public static function organization_schema() {
		$schema = array(
			'@type' => 'Organization',
			'@id'   => home_url( '/#organization' ),
			'name'  => get_bloginfo( 'name' ),
			'url'   => home_url( '/' ),
		);

		$logo_id = get_theme_mod( 'custom_logo' );
		if ( $logo_id ) {
			$src = wp_get_attachment_image_src( $logo_id, 'full' );
			if ( $src ) {
				$schema['logo'] = $src[0];
			}
		}

		$email = get_option( 'rc_quote_email' );
		if ( $email ) {
			$schema['contactPoint'] = array(
				'@type'       => 'ContactPoint',
				'contactType' => 'customer support',
				'email'       => $email,
			);
		}

		return $schema;
	}

	/**
	 * WebSite with the catalog search action.
	 *
	 * @return array
	 */
	public static function website_schema() {
		return array(
			'@type'           => 'WebSite',
			'@id'             => home_url( '/#website' ),
			'url'             => home_url( '/' ),
			'name'            => get_bloginfo( 'name' ),
			'publisher'       => array( '@id' => home_url( '/#organization' ) ),
			'potentialAction' => array(
				'@type'       => 'SearchAction',
				'target'      => array(
					'@type'       => 'EntryPoint',
					'urlTemplate' => home_url( '/?s={search_term_string}&post_type=product' ),
				),
				'query-input' => 'required name=search_term_string',
			),
		);
	}

	/**
	 * Product schema, including the analytical fields.
	 *
	 * @param int $product_id Product ID.
	 * @return array
	 */
	public static function product_schema( $product_id ) {
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( $product_id ) : null;

		$schema = array(
			'@type'       => 'Product',
			'@id'         => get_permalink( $product_id ) . '#product',
			'name'        => get_the_title( $product_id ),
			'description' => wp_strip_all_tags( get_post_field( 'post_excerpt', $product_id ) ?: get_post_field( 'post_content', $product_id ) ),
			'url'         => get_permalink( $product_id ),
			'brand'       => array(
				'@type' => 'Brand',
				'name'  => get_option( 'rc_brand_name', get_bloginfo( 'name' ) ),
			),
		);

		if ( has_post_thumbnail( $product_id ) ) {
			$src = wp_get_attachment_image_src( get_post_thumbnail_id( $product_id ), 'large' );
			if ( $src ) {
				$schema['image'] = $src[0];
			}
		}

		$compound = get_post_meta( $product_id, '_rc_compound', true );
		if ( $compound && false === stripos( $schema['name'], $compound ) ) {
			$schema['alternateName'] = $compound;
		}

		$sku = get_post_meta( $product_id, '_sku', true );
		if ( $sku ) {
			$schema['sku'] = $sku;
			$schema['mpn'] = $sku;
		}

		// Analytical specification, the part a generic SEO plugin never emits.
		$properties = array();
		foreach ( rc_get_specs( $product_id ) as $label => $value ) {
			$properties[] = array(
				'@type' => 'PropertyValue',
				'name'  => $label,
				'value' => $value,
			);
		}
		if ( $properties ) {
			$schema['additionalProperty'] = $properties;
		}

		if ( $product ) {
			$schema['offers'] = array(
				'@type'         => 'Offer',
				'url'           => get_permalink( $product_id ),
				'price'         => (string) $product->get_price(),
				'priceCurrency' => function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD',
				'availability'  => $product->is_in_stock() ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
				'itemCondition' => 'https://schema.org/NewCondition',
				'seller'        => array( '@id' => home_url( '/#organization' ) ),
			);

			// Only ever publish a rating that real reviews produced.
			if ( method_exists( $product, 'get_review_count' ) && $product->get_review_count() > 0 ) {
				$schema['aggregateRating'] = array(
					'@type'       => 'AggregateRating',
					'ratingValue' => (string) $product->get_average_rating(),
					'reviewCount' => (string) $product->get_review_count(),
				);
			}
		}

		return $schema;
	}

	/**
	 * Article schema for the documentation posts.
	 *
	 * @param int $post_id Post ID.
	 * @return array
	 */
	public static function article_schema( $post_id ) {
		$schema = array(
			'@type'            => 'Article',
			'@id'              => get_permalink( $post_id ) . '#article',
			'headline'         => get_the_title( $post_id ),
			'description'      => wp_strip_all_tags( get_the_excerpt( $post_id ) ),
			'datePublished'    => get_the_date( 'c', $post_id ),
			'dateModified'     => get_the_modified_date( 'c', $post_id ),
			'mainEntityOfPage' => get_permalink( $post_id ),
			'publisher'        => array( '@id' => home_url( '/#organization' ) ),
			'author'           => array( '@id' => home_url( '/#organization' ) ),
		);

		if ( has_post_thumbnail( $post_id ) ) {
			$src = wp_get_attachment_image_src( get_post_thumbnail_id( $post_id ), 'large' );
			if ( $src ) {
				$schema['image'] = $src[0];
			}
		}

		return $schema;
	}

	/**
	 * Breadcrumbs.
	 *
	 * @return array
	 */
	public static function breadcrumb_schema() {
		$items = array(
			array(
				'@type'    => 'ListItem',
				'position' => 1,
				'name'     => __( 'Home', 'research-commerce' ),
				'item'     => home_url( '/' ),
			),
		);

		if ( is_singular( 'product' ) && function_exists( 'wc_get_page_id' ) ) {
			$shop_id = wc_get_page_id( 'shop' );
			if ( $shop_id > 0 ) {
				$items[] = array(
					'@type'    => 'ListItem',
					'position' => 2,
					'name'     => get_the_title( $shop_id ),
					'item'     => get_permalink( $shop_id ),
				);
			}
		}

		$items[] = array(
			'@type'    => 'ListItem',
			'position' => count( $items ) + 1,
			'name'     => get_the_title(),
			'item'     => get_permalink(),
		);

		return array(
			'@type'           => 'BreadcrumbList',
			'itemListElement' => $items,
		);
	}

	/**
	 * FAQ schema, built from the h2 + following paragraph pattern the FAQ page
	 * uses. Returns null when the page is not an FAQ.
	 *
	 * @param int $page_id Page ID.
	 * @return array|null
	 */
	public static function faq_schema( $page_id ) {
		$slug = get_post_field( 'post_name', $page_id );

		/**
		 * Which page slugs should emit FAQPage markup.
		 *
		 * @param string[] $slugs Page slugs.
		 */
		$faq_slugs = apply_filters( 'rc_faq_page_slugs', array( 'faq' ) );

		if ( ! in_array( $slug, $faq_slugs, true ) ) {
			return null;
		}

		$content = get_post_field( 'post_content', $page_id );
		if ( ! preg_match_all( '#<h2[^>]*>(.*?)</h2>\s*<p[^>]*>(.*?)</p>#is', $content, $matches, PREG_SET_ORDER ) ) {
			return null;
		}

		$questions = array();
		foreach ( $matches as $match ) {
			$questions[] = array(
				'@type'          => 'Question',
				'name'           => wp_strip_all_tags( $match[1] ),
				'acceptedAnswer' => array(
					'@type' => 'Answer',
					'text'  => wp_strip_all_tags( $match[2] ),
				),
			);
		}

		if ( ! $questions ) {
			return null;
		}

		return array(
			'@type'      => 'FAQPage',
			'@id'        => get_permalink( $page_id ) . '#faq',
			'mainEntity' => $questions,
		);
	}
}
