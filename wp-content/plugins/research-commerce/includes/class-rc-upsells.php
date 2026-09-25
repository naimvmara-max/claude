<?php
/**
 * Upsells.
 *
 * Three places a buyer decides how much to order, and one offer at each:
 *
 *   Product page — "Complete the set": this vial, the compound it is most
 *   often run alongside, and the solvent a lyophilized vial needs. Ticked by
 *   default, priced with the set discount already applied, added in one go.
 *
 *   Basket — what closes the free-shipping gap, the solvent if it is
 *   missing, and how far the order is from the next set-discount tier.
 *
 * Every figure shown is the one the cart will charge: the set discount comes
 * from RC_Builder's cart rule, and nothing here invents a price of its own.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Upsells.
 */
class RC_Upsells {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'woocommerce_after_add_to_cart_form', array( __CLASS__, 'bundle_box' ), 15 );
		add_action( 'woocommerce_after_cart_table', array( __CLASS__, 'cart_suggestions' ), 20 );
	}

	/* ------------------------------------------------------------- lookups */

	/**
	 * The solvent listing, if the catalog has one in stock.
	 *
	 * @return int Product ID, 0 when there is none to offer.
	 */
	public static function solvent_id() {
		$sku = get_option( 'rc_upsell_solvent_sku', 'PH-BAC-30' );
		$id  = $sku ? wc_get_product_id_by_sku( $sku ) : 0;

		return self::offerable( $id ) ? (int) $id : 0;
	}

	/**
	 * Can this product be put in front of a buyer as an add-on?
	 *
	 * @param int $id Product ID.
	 * @return bool
	 */
	public static function offerable( $id ) {
		if ( ! $id || 'publish' !== get_post_status( $id ) ) {
			return false;
		}

		$product = wc_get_product( $id );

		return $product && $product->is_purchasable() && $product->is_in_stock() && (float) $product->get_price() > 0;
	}

	/**
	 * The compounds most naturally ordered alongside this one.
	 *
	 * Taken from the builder presets, which are the owner's own pairings, so
	 * the suggestion is a curated one rather than whatever sold last.
	 *
	 * @param int $product_id Product ID.
	 * @return int[]
	 */
	public static function partners( $product_id ) {
		if ( ! class_exists( 'RC_Builder' ) ) {
			return array();
		}

		$code     = rc_catalog_code( $product_id );
		$partners = array();

		foreach ( RC_Builder::presets() as $preset ) {
			$ids = array_map( 'intval', $preset['ids'] );

			// A preset names one size of each compound; a buyer on the 30 mg
			// listing is just as much in that set as one on the 10 mg.
			$in_set = in_array( (int) $product_id, $ids, true );
			if ( ! $in_set ) {
				foreach ( $ids as $id ) {
					if ( 0 === strcasecmp( rc_catalog_code( $id ), $code ) ) {
						$in_set = true;
						break;
					}
				}
			}

			if ( ! $in_set ) {
				continue;
			}

			foreach ( $ids as $id ) {
				if ( $id !== (int) $product_id && 0 !== strcasecmp( rc_catalog_code( $id ), $code ) && self::offerable( $id ) ) {
					$partners[] = $id;
				}
			}
		}

		/**
		 * Filter the compounds suggested alongside a product.
		 *
		 * @param int[] $partners   Product IDs.
		 * @param int   $product_id The product being viewed.
		 */
		return array_values( array_unique( apply_filters( 'rc_upsell_partners', $partners, $product_id ) ) );
	}

	/**
	 * What a row needs to render.
	 *
	 * @param int $id Product ID.
	 * @return array
	 */
	protected static function row( $id ) {
		$product = wc_get_product( $id );

		$thumb = has_post_thumbnail( $id ) ? wp_get_attachment_image_url( get_post_thumbnail_id( $id ), 'thumbnail' ) : '';
		if ( ! $thumb && function_exists( 'wc_placeholder_img_src' ) ) {
			$thumb = wc_placeholder_img_src( 'thumbnail' );
		}

		$compound = (string) get_post_meta( $id, '_rc_compound', true );
		$code     = rc_catalog_code( $id );
		$size     = (string) get_post_meta( $id, '_rc_quantity', true );

		$sub = array_filter( array(
			0 === strcasecmp( $compound, $code ) ? '' : $compound,
			$size,
		) );

		return array(
			'id'       => (int) $id,
			'name'     => $code,
			'sub'      => implode( ' · ', $sub ),
			'price'    => (float) $product->get_price(),
			'url'      => get_permalink( $id ),
			'thumb'    => $thumb,
			'eligible' => class_exists( 'RC_Builder' ) && RC_Builder::is_eligible( $id ),
		);
	}

	/**
	 * Escape an image source, keeping the placeholder's data URI intact.
	 *
	 * @param string $src Source.
	 * @return string
	 */
	protected static function image_src( $src ) {
		return 0 === strpos( $src, 'data:image/' ) ? $src : esc_url( $src );
	}

	/* ------------------------------------------------------- product page */

	/**
	 * "Complete the set", under the add-to-cart form.
	 */
	public static function bundle_box() {
		$product_id = get_queried_object_id();

		if ( ! $product_id || ! self::offerable( $product_id ) ) {
			return;
		}

		// An accessory has nothing to complete.
		if ( class_exists( 'RC_Builder' ) && ! RC_Builder::is_eligible( $product_id ) ) {
			return;
		}

		$ids = array( $product_id );

		$partners = array_slice( self::partners( $product_id ), 0, 1 );
		$ids      = array_merge( $ids, $partners );

		$solvent = self::solvent_id();
		if ( $solvent ) {
			$ids[] = $solvent;
		}

		// A box with nothing to add is not an offer.
		if ( count( $ids ) < 2 ) {
			return;
		}

		$rows  = array_map( array( __CLASS__, 'row' ), $ids );
		$tiers = array();
		foreach ( rc_get_stack_tiers() as $tier ) {
			$tiers[] = array( 'count' => (int) $tier['count'], 'percent' => (float) $tier['percent'] );
		}
		?>
		<form class="rc-bundle-box" method="post" data-rc-bundle
			data-tiers="<?php echo esc_attr( wp_json_encode( $tiers ) ); ?>"
			data-decimals="<?php echo esc_attr( wc_get_price_decimals() ); ?>"
			data-decimal-sep="<?php echo esc_attr( wc_get_price_decimal_separator() ); ?>"
			data-thousand-sep="<?php echo esc_attr( wc_get_price_thousand_separator() ); ?>"
			data-currency="<?php echo esc_attr( get_woocommerce_currency_symbol() ); ?>"
			data-currency-position="<?php echo esc_attr( get_option( 'woocommerce_currency_pos', 'left' ) ); ?>">

			<?php wp_nonce_field( 'rc_add_stack', 'rc_stack_nonce' ); ?>

			<div class="rc-bundle-box__head">
				<p class="rc-bundle-box__title"><?php esc_html_e( 'Complete the set', 'research-commerce' ); ?></p>
				<?php if ( $partners && $tiers ) : ?>
					<p class="rc-bundle-box__deal">
						<?php
						printf(
							/* translators: %s: discount percentage. */
							esc_html__( '%s off with a second compound', 'research-commerce' ),
							esc_html( rc_format_percent( $tiers[0]['percent'] ) )
						);
						?>
					</p>
				<?php endif; ?>
			</div>

			<ul class="rc-bundle-box__items">
				<?php foreach ( $rows as $i => $row ) : ?>
					<li class="rc-bundle-box__item">
						<label>
							<input type="checkbox" name="rc_stack[]" value="<?php echo esc_attr( $row['id'] ); ?>" checked
								data-price="<?php echo esc_attr( $row['price'] ); ?>"
								data-eligible="<?php echo $row['eligible'] ? '1' : '0'; ?>"
								<?php echo 0 === $i ? 'data-rc-anchor' : ''; ?>>
							<span class="rc-bundle-box__thumb">
								<img src="<?php echo esc_attr( self::image_src( $row['thumb'] ) ); ?>" alt="" width="40" height="40" loading="lazy">
							</span>
							<span class="rc-bundle-box__label">
								<span class="rc-bundle-box__name">
									<?php if ( 0 === $i ) : ?>
										<?php
										/* translators: %s: catalog code. */
										printf( esc_html__( 'This item: %s', 'research-commerce' ), esc_html( $row['name'] ) );
										?>
									<?php else : ?>
										<?php echo esc_html( $row['name'] ); ?>
									<?php endif; ?>
								</span>
								<?php if ( $row['sub'] ) : ?>
									<span class="rc-bundle-box__sub"><?php echo esc_html( $row['sub'] ); ?></span>
								<?php endif; ?>
							</span>
							<span class="rc-bundle-box__price"><?php echo wp_kses_post( wc_price( $row['price'] ) ); ?></span>
						</label>
					</li>
				<?php endforeach; ?>
			</ul>

			<div class="rc-bundle-box__foot">
				<p class="rc-bundle-box__total">
					<span class="rc-bundle-box__total-label"><?php esc_html_e( 'Set total', 'research-commerce' ); ?></span>
					<del data-rc-bundle-was hidden></del>
					<strong data-rc-bundle-total></strong>
				</p>
				<button type="submit" class="rc-bundle-box__submit button" data-rc-bundle-submit>
					<?php esc_html_e( 'Add the set to order', 'research-commerce' ); ?>
				</button>
			</div>
		</form>
		<?php
	}

	/* ------------------------------------------------------------ the cart */

	/**
	 * Suggestions under the cart table.
	 *
	 * @param WC_Cart|null $cart Cart; the live one when omitted.
	 */
	public static function cart_suggestions( $cart = null ) {
		if ( ! $cart instanceof WC_Cart && function_exists( 'WC' ) ) {
			$cart = WC()->cart;
		}

		if ( ! $cart || ! method_exists( $cart, 'get_cart' ) ) {
			return;
		}

		$in_cart   = array();
		$compounds = array();
		$subtotal  = 0.0;

		foreach ( $cart->get_cart() as $item ) {
			$id              = (int) $item['product_id'];
			$in_cart[ $id ]  = true;
			$subtotal       += (float) $item['line_total'];

			if ( class_exists( 'RC_Builder' ) && RC_Builder::is_eligible( $id ) ) {
				$compounds[ $id ] = true;
			}
		}

		if ( ! $in_cart ) {
			return;
		}

		$blocks = array();

		/* The next tier of the set discount. */
		$count = count( $compounds );
		foreach ( rc_get_stack_tiers() as $tier ) {
			if ( $count > 0 && $count < $tier['count'] ) {
				$missing  = $tier['count'] - $count;
				$blocks[] = array(
					'kind'  => 'tier',
					'title' => sprintf(
						/* translators: 1: compounds still to add, 2: discount percentage. */
						_n( 'Add %1$d more compound and the whole set is %2$s off', 'Add %1$d more compounds and the whole set is %2$s off', $missing, 'research-commerce' ),
						$missing,
						rc_format_percent( $tier['percent'] )
					),
					'ids'   => array(),
				);
				break;
			}
		}

		/* The free-shipping gap, and what closes it. */
		$threshold = (float) get_option( 'rc_free_shipping_threshold', 0 );
		if ( $threshold > 0 && $subtotal < $threshold ) {
			$gap = $threshold - $subtotal;

			// The compounds this basket is usually run with come first.
			$related = array();
			foreach ( array_keys( $compounds ) as $cid ) {
				foreach ( self::partners( $cid ) as $pid ) {
					$related[ $pid ] = true;
				}
			}

			// Suggesting a €399 vial to close the gap on a €38 order reads as
			// a grab, not help. Nothing much dearer than the gap itself, and
			// never more than a mid-range vial when the gap is large.
			$ceiling = max( $gap * 1.2, 150.0 );

			$candidates = array();
			foreach ( self::catalog_ids() as $id ) {
				if ( isset( $in_cart[ $id ] ) || ! self::offerable( $id ) ) {
					continue;
				}

				$price = (float) wc_get_product( $id )->get_price();

				if ( $price > $ceiling ) {
					continue;
				}

				// Related first; then whatever clears the gap for the least;
				// then whatever gets closest to it.
				$rank = $price >= $gap ? $price - $gap : 1000 + ( $gap - $price );
				if ( isset( $related[ $id ] ) ) {
					$rank -= 100000;
				}

				$candidates[ $id ] = $rank;
			}

			asort( $candidates );

			$blocks[] = array(
				'kind'  => 'shipping',
				'title' => sprintf(
					/* translators: %s: amount still to spend. */
					__( '%s more and shipping is free', 'research-commerce' ),
					wp_strip_all_tags( wc_price( $gap ) )
				),
				'ids'   => array_slice( array_keys( $candidates ), 0, 3 ),
			);
		}

		/* The solvent, if a compound is in the basket without one. */
		$solvent = self::solvent_id();
		if ( $solvent && $compounds && ! isset( $in_cart[ $solvent ] ) ) {
			$blocks[] = array(
				'kind'  => 'solvent',
				'title' => __( 'Lyophilized vials need a solvent', 'research-commerce' ),
				'ids'   => array( $solvent ),
			);
		}

		if ( ! $blocks ) {
			return;
		}

		echo '<section class="rc-cart-upsells" aria-label="' . esc_attr__( 'Suggested additions', 'research-commerce' ) . '">';

		foreach ( $blocks as $block ) {
			printf( '<div class="rc-cart-upsells__block rc-cart-upsells__block--%s">', esc_attr( $block['kind'] ) );
			printf( '<p class="rc-cart-upsells__title">%s</p>', esc_html( $block['title'] ) );

			if ( 'tier' === $block['kind'] && class_exists( 'RC_Builder' ) ) {
				$builder = get_page_by_path( 'panels' );
				if ( $builder ) {
					printf(
						'<a class="rc-cart-upsells__link" href="%s">%s</a>',
						esc_url( get_permalink( $builder ) ),
						esc_html__( 'Open the panel builder', 'research-commerce' )
					);
				}
			}

			if ( $block['ids'] ) {
				echo '<ul class="rc-cart-upsells__items">';
				foreach ( $block['ids'] as $id ) {
					$row = self::row( $id );
					printf(
						'<li><a class="rc-cart-upsells__item" href="%1$s"><img src="%2$s" alt="" width="44" height="44" loading="lazy"><span class="rc-cart-upsells__name">%3$s<small>%4$s</small></span><span class="rc-cart-upsells__price">%5$s</span><span class="rc-cart-upsells__add">%6$s</span></a></li>',
						esc_url( add_query_arg( 'add-to-cart', $row['id'], wc_get_cart_url() ) ),
						esc_attr( self::image_src( $row['thumb'] ) ),
						esc_html( $row['name'] ),
						esc_html( $row['sub'] ),
						wp_kses_post( wc_price( $row['price'] ) ),
						esc_html__( 'Add', 'research-commerce' )
					);
				}
				echo '</ul>';
			}

			echo '</div>';
		}

		echo '</section>';
	}

	/**
	 * Every published listing, cheapest first.
	 *
	 * @return int[]
	 */
	protected static function catalog_ids() {
		return get_posts( array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => 100,
			'fields'         => 'ids',
			'meta_key'       => '_price', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
			'orderby'        => 'meta_value_num',
			'order'          => 'ASC',
		) );
	}
}
