<?php
/**
 * Panels: several vials sold together.
 *
 * A buyer cannot tell a multi-vial set from a single vial by the price alone,
 * so a panel listing spells out what arrives — each component named, imaged
 * and linked to its own listing and its own report.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Panel display.
 */
class RC_Panels {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'woocommerce_single_product_summary', array( __CLASS__, 'contents' ), 24 );
		add_action( 'woocommerce_before_shop_loop_item_title', array( __CLASS__, 'card_badge' ), 8 );
		add_filter( 'rc_product_specs', array( __CLASS__, 'filter_specs' ), 10, 2 );
	}

	/**
	 * The products a panel contains.
	 *
	 * @param int $product_id Panel product ID.
	 * @return int[] Component product IDs, empty when this is not a panel.
	 */
	public static function components( $product_id ) {
		$skus = get_post_meta( $product_id, '_rc_panel_items', true );
		if ( ! $skus ) {
			return array();
		}

		$ids = array();
		foreach ( array_map( 'trim', explode( ',', $skus ) ) as $sku ) {
			$found = get_posts( array(
				'post_type'      => 'product',
				'posts_per_page' => 1,
				'post_status'    => 'publish',
				'meta_key'       => '_sku', // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_key
				'meta_value'     => $sku,   // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_value
				'fields'         => 'ids',
			) );
			if ( $found ) {
				$ids[] = $found[0];
			}
		}

		return $ids;
	}

	/**
	 * Is this listing a panel?
	 *
	 * @param int $product_id Product ID.
	 * @return bool
	 */
	public static function is_panel( $product_id ) {
		return (bool) get_post_meta( $product_id, '_rc_panel_items', true );
	}

	/**
	 * A panel holds several vials, so "quantity per vial" is the wrong label
	 * for it — the contents block above already says what is in the box.
	 *
	 * @param array $specs      Label => value.
	 * @param int   $product_id Product ID.
	 * @return array
	 */
	public static function filter_specs( $specs, $product_id ) {
		if ( self::is_panel( $product_id ) ) {
			unset( $specs[ __( 'Quantity per vial', 'research-commerce' ) ] );
		}
		return $specs;
	}

	/**
	 * "Panel · 3 vials" on the catalog card, so the grid reads correctly.
	 */
	public static function card_badge() {
		global $product;

		if ( ! $product instanceof WC_Product || ! self::is_panel( $product->get_id() ) ) {
			return;
		}

		$count = count( self::components( $product->get_id() ) );
		printf(
			'<span class="rc-panel-flag">%s</span>',
			esc_html( sprintf(
				/* translators: %d: number of vials in the panel. */
				_n( 'Panel · %d vial', 'Panel · %d vials', $count, 'research-commerce' ),
				$count
			) )
		);
	}

	/**
	 * What is in the box, on the product page.
	 */
	public static function contents() {
		global $product;

		if ( ! $product instanceof WC_Product ) {
			return;
		}

		$components = self::components( $product->get_id() );
		if ( ! $components ) {
			return;
		}

		$separate = 0;
		foreach ( $components as $id ) {
			$item = wc_get_product( $id );
			if ( $item ) {
				$separate += (float) $item->get_price();
			}
		}

		$price  = (float) $product->get_price();
		$saving = $separate - $price;
		?>
		<div class="rc-panel">
			<p class="rc-panel__label">
				<?php
				printf(
					esc_html( _n( 'This panel is %d vial, shipped together', 'This panel is %d separate vials, shipped together', count( $components ), 'research-commerce' ) ),
					count( $components )
				);
				?>
			</p>

			<ul class="rc-panel__items">
				<?php foreach ( $components as $id ) : ?>
					<?php $item = wc_get_product( $id ); ?>
					<?php if ( ! $item ) { continue; } ?>
					<li class="rc-panel__item">
						<a class="rc-panel__thumb" href="<?php echo esc_url( get_permalink( $id ) ); ?>">
							<?php echo has_post_thumbnail( $id ) ? get_the_post_thumbnail( $id, 'thumbnail' ) : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
						</a>
						<span class="rc-panel__text">
							<a href="<?php echo esc_url( get_permalink( $id ) ); ?>"><?php echo esc_html( $item->get_name() ); ?></a>
							<span class="rc-panel__meta">
								<?php echo wp_kses_post( wc_price( $item->get_price() ) ); ?>
								<?php if ( function_exists( 'rc_has_coa' ) && rc_has_coa( $id ) ) : ?>
									· <?php esc_html_e( 'own lot &amp; report', 'research-commerce' ); ?>
								<?php else : ?>
									· <?php esc_html_e( 'awaiting report', 'research-commerce' ); ?>
								<?php endif; ?>
							</span>
						</span>
					</li>
				<?php endforeach; ?>
			</ul>

			<?php if ( $saving > 0 ) : ?>
				<p class="rc-panel__saving">
					<?php
					printf(
						/* translators: 1: separate total, 2: saving. */
						esc_html__( 'Bought separately: %1$s — you save %2$s', 'research-commerce' ),
						wp_kses_post( wc_price( $separate ) ),
						wp_kses_post( wc_price( $saving ) )
					);
					?>
				</p>
			<?php endif; ?>
		</div>
		<?php
	}
}
