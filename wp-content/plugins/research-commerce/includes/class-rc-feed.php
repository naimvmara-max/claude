<?php
/**
 * Google Merchant Center product feed.
 *
 * Serves an RSS 2.0 feed with the g: namespace at /?rc_feed=google, which is
 * the format Merchant Center reads for both paid Shopping ads and free
 * listings. The same file is what most marketplaces and comparison engines
 * accept, so it is worth having even if Shopping itself is not available to
 * this category — see docs/seo-keyword-map.md on Merchant Center policy.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Feed generator.
 */
class RC_Feed {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'add_rewrite' ) );
		add_filter( 'query_vars', array( __CLASS__, 'query_vars' ) );
		add_action( 'template_redirect', array( __CLASS__, 'maybe_serve' ) );
	}

	/**
	 * Pretty URL for the feed.
	 */
	public static function add_rewrite() {
		add_rewrite_rule( '^feed/google-shopping/?$', 'index.php?rc_feed=google', 'top' );
	}

	/**
	 * Register the query var.
	 *
	 * @param array $vars Query vars.
	 * @return array
	 */
	public static function query_vars( $vars ) {
		$vars[] = 'rc_feed';
		return $vars;
	}

	/**
	 * Serve the feed when asked for.
	 */
	public static function maybe_serve() {
		$feed = get_query_var( 'rc_feed' );

		if ( ! $feed && isset( $_GET['rc_feed'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$feed = sanitize_key( wp_unslash( $_GET['rc_feed'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		}

		if ( 'google' !== $feed ) {
			return;
		}

		nocache_headers();
		header( 'Content-Type: application/xml; charset=utf-8' );
		echo self::render(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped per field in render().
		exit;
	}

	/**
	 * Products eligible for the feed.
	 *
	 * @return int[]
	 */
	public static function product_ids() {
		$ids = get_posts( array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => 1000,
			'fields'         => 'ids',
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				'relation' => 'OR',
				array(
					'key'     => '_rc_feed_exclude',
					'compare' => 'NOT EXISTS',
				),
				array(
					'key'     => '_rc_feed_exclude',
					'value'   => 'yes',
					'compare' => '!=',
				),
			),
		) );

		/**
		 * Filter which products appear in the feed. Use this to hold back
		 * anything a channel will not accept.
		 *
		 * @param int[] $ids Product IDs.
		 */
		return apply_filters( 'rc_feed_product_ids', $ids );
	}

	/**
	 * One <item> element.
	 *
	 * @param int $id Product ID.
	 * @return string
	 */
	protected static function item( $id ) {
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( $id ) : null;
		if ( ! $product ) {
			return '';
		}

		$sku       = get_post_meta( $id, '_sku', true );
		$purity    = get_post_meta( $id, '_rc_purity', true );
		$quantity  = get_post_meta( $id, '_rc_quantity', true );
		$cas       = get_post_meta( $id, '_rc_cas', true );
		$excerpt   = wp_strip_all_tags( get_post_field( 'post_excerpt', $id ) );
		$currency  = function_exists( 'get_woocommerce_currency' ) ? get_woocommerce_currency() : 'USD';

		// The research-use line rides along in the description, unless the
		// excerpt already says it — several channels reject duplicated text.
		$description = trim( $excerpt );
		if ( false === stripos( $description, 'research use only' ) ) {
			$description = trim( $description . ' ' . rc_ruo_notice( 'short' ) );
		}

		$title_bits = array( get_the_title( $id ) );
		if ( $purity ) {
			$title_bits[] = $purity . ' ' . __( 'purity', 'research-commerce' );
		}

		$image = '';
		if ( has_post_thumbnail( $id ) ) {
			$src = wp_get_attachment_image_src( get_post_thumbnail_id( $id ), 'large' );
			if ( $src ) {
				$image = $src[0];
			}
		}

		$fields = array(
			'g:id'                      => $sku ? $sku : (string) $id,
			'g:title'                   => implode( ' — ', $title_bits ),
			'g:description'             => $description,
			'g:link'                    => get_permalink( $id ),
			'g:image_link'              => $image,
			'g:availability'            => $product->is_in_stock() ? 'in_stock' : 'out_of_stock',
			'g:price'                   => $product->get_price() . ' ' . $currency,
			'g:condition'               => 'new',
			'g:brand'                   => get_option( 'rc_brand_name', get_bloginfo( 'name' ) ),
			'g:mpn'                     => $sku,
			'g:identifier_exists'       => $sku ? 'yes' : 'no',
			'g:google_product_category' => get_option( 'rc_google_category', 'Business & Industrial > Science & Laboratory > Laboratory Chemicals' ),
			'g:product_type'            => self::product_type( $id ),
			'g:adult'                   => 'no',
		);

		if ( $quantity ) {
			$fields['g:unit_pricing_measure'] = str_replace( ' ', '', strtolower( $quantity ) );
		}

		$custom = array();
		if ( $purity ) {
			$custom['g:custom_label_0'] = $purity;
		}
		if ( $cas ) {
			$custom['g:custom_label_1'] = 'CAS ' . $cas;
		}
		$fields = array_merge( $fields, $custom );

		/**
		 * Filter a feed row before it is written.
		 *
		 * @param array $fields Field name => value.
		 * @param int   $id     Product ID.
		 */
		$fields = apply_filters( 'rc_feed_item_fields', $fields, $id );

		$xml = "\t<item>\n";
		foreach ( $fields as $name => $value ) {
			if ( '' === $value || null === $value ) {
				continue;
			}
			$xml .= sprintf( "\t\t<%1\$s><![CDATA[%2\$s]]></%1\$s>\n", esc_attr( $name ), $value );
		}
		$xml .= "\t</item>\n";

		return $xml;
	}

	/**
	 * Category path for a product.
	 *
	 * @param int $id Product ID.
	 * @return string
	 */
	protected static function product_type( $id ) {
		$terms = get_the_terms( $id, 'product_cat' );
		if ( ! $terms || is_wp_error( $terms ) ) {
			return '';
		}
		return implode( ' > ', wp_list_pluck( $terms, 'name' ) );
	}

	/**
	 * The whole document.
	 *
	 * @return string
	 */
	public static function render() {
		$items = '';
		foreach ( self::product_ids() as $id ) {
			$items .= self::item( $id );
		}

		return '<?xml version="1.0" encoding="UTF-8"?>' . "\n"
			. '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">' . "\n"
			. "<channel>\n"
			. sprintf( "\t<title><![CDATA[%s]]></title>\n", get_bloginfo( 'name' ) )
			. sprintf( "\t<link>%s</link>\n", esc_url( home_url( '/' ) ) )
			. sprintf( "\t<description><![CDATA[%s]]></description>\n", get_bloginfo( 'description' ) )
			. $items
			. "</channel>\n</rss>\n";
	}
}
