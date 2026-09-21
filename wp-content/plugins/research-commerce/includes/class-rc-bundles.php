<?php
/**
 * Quantity bundles on the product page.
 *
 * The quantity tiers already discount the line; this presents them as choices
 * with the saving worked out, instead of a table the buyer has to read and a
 * number they have to type. Selecting a card sets the quantity field, so the
 * cart, the tier pricing and the totals all stay the single source of truth.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Bundle selector.
 */
class RC_Bundles {

	/**
	 * Whether the selector rendered on this request.
	 *
	 * @var bool
	 */
	protected static $rendered = false;

	/**
	 * Did the selector render? The quantity tier table checks this so the two
	 * do not say the same thing twice.
	 *
	 * @return bool
	 */
	public static function is_rendered() {
		return self::$rendered;
	}

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'woocommerce_before_add_to_cart_button', array( __CLASS__, 'render' ), 5 );
	}

	/**
	 * The options a product offers: a single vial, then one card per tier.
	 *
	 * @param WC_Product $product Product.
	 * @return array[]
	 */
	public static function options( $product ) {
		$price = (float) $product->get_price();
		if ( $price <= 0 ) {
			return array();
		}

		$quantity = get_post_meta( $product->get_id(), '_rc_quantity', true );

		$options = array(
			array(
				'qty'     => 1,
				'label'   => __( '1 vial', 'research-commerce' ),
				'meta'    => trim( __( 'Single research vial', 'research-commerce' ) . ( $quantity ? ' · ' . $quantity : '' ) ),
				'total'   => $price,
				'saving'  => 0,
				'badge'   => '',
			),
		);

		$tiers = rc_get_tiers();
		$last  = count( $tiers ) - 1;

		foreach ( $tiers as $index => $tier ) {
			$qty      = (int) $tier['qty'];
			$discount = (float) $tier['percent'];
			$total    = round( $price * $qty * ( 1 - $discount / 100 ), wc_get_price_decimals() );
			$saving   = round( ( $price * $qty ) - $total, wc_get_price_decimals() );

			$options[] = array(
				'qty'    => $qty,
				/* translators: %d: number of vials. */
				'label'  => sprintf( __( 'Kit × %d', 'research-commerce' ), $qty ),
				'meta'   => sprintf(
					/* translators: 1: number of vials, 2: formatted saving. */
					__( '%1$d vials · save %2$s', 'research-commerce' ),
					$qty,
					wp_strip_all_tags( wc_price( $saving ) )
				),
				'total'  => $total,
				'saving' => $saving,
				'badge'  => ( $index === $last ) ? __( 'Best value', 'research-commerce' ) : '',
			);
		}

		/**
		 * Filter the bundle options for a product.
		 *
		 * @param array      $options Options.
		 * @param WC_Product $product Product.
		 */
		return apply_filters( 'rc_bundle_options', $options, $product );
	}

	/**
	 * Render the selector.
	 */
	public static function render() {
		global $product;

		if ( ! $product instanceof WC_Product || ! $product->is_in_stock() ) {
			return;
		}

		$options = self::options( $product );
		if ( count( $options ) < 2 ) {
			return;
		}

		self::$rendered = true;
		?>
		<div class="rc-bundles" data-rc-bundles>
			<p class="rc-bundles__label"><?php esc_html_e( 'Select quantity', 'research-commerce' ); ?></p>

			<?php foreach ( $options as $index => $option ) : ?>
				<label class="rc-bundle<?php echo 0 === $index ? ' is-selected' : ''; ?>">
					<input type="radio" name="rc_bundle" value="<?php echo esc_attr( $option['qty'] ); ?>" <?php checked( 0, $index ); ?>>
					<span class="rc-bundle__box" aria-hidden="true"></span>

					<span class="rc-bundle__text">
						<span class="rc-bundle__name">
							<?php echo esc_html( $option['label'] ); ?>
							<?php if ( $option['badge'] ) : ?>
								<span class="rc-bundle__badge"><?php echo esc_html( $option['badge'] ); ?></span>
							<?php endif; ?>
						</span>
						<span class="rc-bundle__meta"><?php echo esc_html( $option['meta'] ); ?></span>
					</span>

					<span class="rc-bundle__price"><?php echo wp_kses_post( wc_price( $option['total'] ) ); ?></span>
				</label>
			<?php endforeach; ?>
		</div>
		<?php
	}
}
