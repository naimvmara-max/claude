<?php
/**
 * Quantity price breaks — the main average-order-value lever for a
 * consumables catalog.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Applies and advertises per-line quantity tiers.
 */
class RC_Pricing {

	/**
	 * Hooks.
	 */
	public static function init() {
		if ( ! rc_get_tiers() ) {
			return;
		}

		add_action( 'woocommerce_before_calculate_totals', array( __CLASS__, 'apply_tiers' ), 20 );
		add_action( 'woocommerce_after_add_to_cart_form', array( __CLASS__, 'render_table' ), 15 );
		add_filter( 'woocommerce_cart_item_price', array( __CLASS__, 'cart_item_price' ), 10, 3 );
		add_action( 'woocommerce_before_cart_table', array( __CLASS__, 'cart_prompt' ), 8 );
	}

	/**
	 * Tier that applies to a quantity.
	 *
	 * @param int $qty Quantity.
	 * @return array|null
	 */
	public static function tier_for( $qty ) {
		$match = null;
		foreach ( rc_get_tiers() as $tier ) {
			if ( $qty >= $tier['qty'] ) {
				$match = $tier;
			}
		}
		return $match;
	}

	/**
	 * Recalculate line prices.
	 *
	 * @param WC_Cart $cart Cart.
	 */
	public static function apply_tiers( $cart ) {
		if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
			return;
		}
		foreach ( $cart->get_cart() as $item ) {
			if ( empty( $item['data'] ) || ! $item['data'] instanceof WC_Product ) {
				continue;
			}

			/**
			 * Filter whether a product participates in quantity tiers.
			 *
			 * @param bool       $eligible Eligibility.
			 * @param WC_Product $product  Product.
			 */
			$eligible = apply_filters( 'rc_product_tier_eligible', true, $item['data'] );
			if ( ! $eligible ) {
				continue;
			}

			$tier = self::tier_for( (int) $item['quantity'] );
			if ( ! $tier ) {
				continue;
			}

			// Read the base price from a fresh product object so repeated
			// recalculations never compound the discount.
			$base = wc_get_product( $item['data']->get_id() );
			if ( ! $base ) {
				continue;
			}

			$price = (float) $base->get_price();
			if ( $price <= 0 ) {
				continue;
			}

			$item['data']->set_price( round( $price * ( 1 - ( $tier['percent'] / 100 ) ), wc_get_price_decimals() ) );
		}
	}

	/**
	 * Show the original unit price struck through in the cart.
	 *
	 * @param string $html      Price HTML.
	 * @param array  $cart_item Cart item.
	 * @param string $cart_item_key Key.
	 * @return string
	 */
	public static function cart_item_price( $html, $cart_item, $cart_item_key ) {
		$tier = self::tier_for( (int) $cart_item['quantity'] );
		if ( ! $tier || empty( $cart_item['data'] ) ) {
			return $html;
		}

		$base = wc_get_product( $cart_item['data']->get_id() );
		if ( ! $base ) {
			return $html;
		}

		return wc_format_sale_price(
			wc_get_price_to_display( $base ),
			wc_get_price_to_display( $cart_item['data'] )
		) . ' <small>' . sprintf(
			/* translators: %s: discount percentage. */
			esc_html__( '%s%% volume discount applied', 'research-commerce' ),
			esc_html( rtrim( rtrim( number_format( $tier['percent'], 1, '.', '' ), '0' ), '.' ) )
		) . '</small>';
	}

	/**
	 * Tier table under the add-to-cart form.
	 */
	public static function render_table() {
		global $product;

		if ( ! $product instanceof WC_Product || ! $product->is_in_stock() ) {
			return;
		}

		// The bundle selector already shows these prices as choices.
		if ( class_exists( 'RC_Bundles' ) && RC_Bundles::is_rendered() ) {
			return;
		}

		$tiers = rc_get_tiers();
		if ( ! $tiers ) {
			return;
		}

		$price = (float) $product->get_price();

		echo '<table class="hx-tiers rc-tiers"><caption>' . esc_html__( 'Quantity pricing', 'research-commerce' ) . '</caption><tbody>';
		printf(
			'<tr><th>%s</th><td>%s</td></tr>',
			esc_html( sprintf(
				/* translators: %s: quantity range, e.g. "1-2". */
				__( '%s vials', 'research-commerce' ),
				'1–' . max( 1, $tiers[0]['qty'] - 1 )
			) ),
			wp_kses_post( wc_price( $price ) )
		);

		foreach ( $tiers as $index => $tier ) {
			$next  = isset( $tiers[ $index + 1 ] ) ? ( $tiers[ $index + 1 ]['qty'] - 1 ) : null;
			$range = $next ? $tier['qty'] . '–' . $next : $tier['qty'] . '+';
			$unit  = $price * ( 1 - ( $tier['percent'] / 100 ) );

			printf(
				'<tr data-hx-tier="%1$d"><th>%2$s</th><td>%3$s <span>(−%4$s%%)</span></td></tr>',
				absint( $tier['qty'] ),
				esc_html( sprintf(
					/* translators: %s: quantity range. */
					__( '%s vials', 'research-commerce' ),
					$range
				) ),
				wp_kses_post( wc_price( $unit ) ),
				esc_html( rtrim( rtrim( number_format( $tier['percent'], 1, '.', '' ), '0' ), '.' ) )
			);
		}

		echo '</tbody></table>';
	}

	/**
	 * Prompt in the cart when the next tier is close.
	 */
	public static function cart_prompt() {
		if ( ! WC()->cart ) {
			return;
		}

		foreach ( WC()->cart->get_cart() as $item ) {
			$qty   = (int) $item['quantity'];
			$tiers = rc_get_tiers();

			foreach ( $tiers as $tier ) {
				$gap = $tier['qty'] - $qty;
				if ( $gap > 0 && $gap <= 2 ) {
					wc_print_notice(
						sprintf(
							/* translators: 1: number of units, 2: product name, 3: discount percent. */
							esc_html__( 'Add %1$d more of %2$s to reach the %3$s%% quantity price.', 'research-commerce' ),
							absint( $gap ),
							esc_html( $item['data']->get_name() ),
							esc_html( rtrim( rtrim( number_format( $tier['percent'], 1, '.', '' ), '0' ), '.' ) )
						),
						'notice'
					);
					break 2;
				}
			}
		}
	}
}
