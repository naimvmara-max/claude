<?php
/**
 * Panel builder.
 *
 * A fixed panel makes the buyer take the combination someone else chose. This
 * lets them assemble their own: tick the compounds, watch the set discount
 * apply, add the lot in one action. The discount is a cart rule, not a
 * property of this page — a buyer who picks the same three vials one at a
 * time gets the same price.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builder.
 */
class RC_Builder {

	const FEE_KEY = 'rc_stack_fee';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_shortcode( 'rc_panel_builder', array( __CLASS__, 'render' ) );
		add_action( 'template_redirect', array( __CLASS__, 'handle_submit' ) );
		add_action( 'woocommerce_cart_calculate_fees', array( __CLASS__, 'apply_discount' ) );
	}

	/* ------------------------------------------------------------ the rule */

	/**
	 * Is this product one of the compounds a stack is built from?
	 *
	 * Accessories carry no compound name, and a preset panel is already a set,
	 * so neither counts towards the tier or takes the discount.
	 *
	 * @param int $product_id Product ID.
	 * @return bool
	 */
	public static function is_eligible( $product_id ) {
		if ( ! get_post_meta( $product_id, '_rc_compound', true ) ) {
			return false;
		}

		if ( class_exists( 'RC_Panels' ) && RC_Panels::is_panel( $product_id ) ) {
			return false;
		}

		/**
		 * Filter whether a product counts towards a stack.
		 *
		 * @param bool $eligible   Eligibility.
		 * @param int  $product_id Product ID.
		 */
		return (bool) apply_filters( 'rc_stack_eligible', true, $product_id );
	}

	/**
	 * The discount a set of this many distinct compounds earns.
	 *
	 * @param int $count Distinct compounds.
	 * @return float Percent, 0 when no tier is met.
	 */
	public static function percent_for( $count ) {
		$percent = 0.0;

		foreach ( rc_get_stack_tiers() as $tier ) {
			if ( $count >= $tier['count'] ) {
				$percent = (float) $tier['percent'];
			}
		}

		return $percent;
	}

	/**
	 * Take the set discount off the cart.
	 *
	 * @param WC_Cart $cart Cart.
	 */
	public static function apply_discount( $cart ) {
		if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
			return;
		}

		$compounds = array();
		$total     = 0.0;

		foreach ( $cart->get_cart() as $item ) {
			$id = ! empty( $item['variation_id'] ) ? $item['product_id'] : $item['product_id'];

			if ( ! self::is_eligible( $id ) ) {
				continue;
			}

			$compounds[ $id ] = true;
			$total           += (float) $item['line_total'];
		}

		$count   = count( $compounds );
		$percent = self::percent_for( $count );

		if ( $percent <= 0 || $total <= 0 ) {
			return;
		}

		$cart->add_fee(
			sprintf(
				/* translators: 1: number of compounds, 2: discount percentage. */
				__( 'Stack discount — %1$d compounds, %2$s off', 'research-commerce' ),
				$count,
				rc_format_percent( $percent )
			),
			- round( $total * $percent / 100, wc_get_price_decimals() ),
			false
		);
	}

	/* --------------------------------------------------------- the listing */

	/**
	 * Compounds the builder offers.
	 *
	 * @return array[]
	 */
	public static function compounds() {
		$ids = get_posts( array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => 100,
			'orderby'        => 'menu_order title',
			'order'          => 'ASC',
			'fields'         => 'ids',
		) );

		$rows = array();

		foreach ( $ids as $id ) {
			if ( ! self::is_eligible( $id ) ) {
				continue;
			}

			$product = wc_get_product( $id );
			if ( ! $product ) {
				continue;
			}

			$reason = '';
			if ( ! $product->is_in_stock() ) {
				$reason = __( 'Awaiting next lot', 'research-commerce' );
			} elseif ( ! $product->is_purchasable() ) {
				$reason = __( 'Awaiting certificate', 'research-commerce' );
			}

			$thumb = '';
			if ( has_post_thumbnail( $id ) ) {
				$src   = wp_get_attachment_image_src( get_post_thumbnail_id( $id ), 'thumbnail' );
				$thumb = $src ? $src[0] : '';
			}

			// An empty square in the middle of the list reads as a broken
			// image, so a listing without a photograph gets the placeholder.
			if ( ! $thumb && function_exists( 'wc_placeholder_img_src' ) ) {
				$thumb = wc_placeholder_img_src( 'thumbnail' );
			}

			$rows[] = array(
				'id'       => $id,
				// The sub-line under it carries the compound and the size, so
				// the code alone here keeps a row from saying both twice.
				'name'     => rc_catalog_code( $id ),
				'compound' => (string) get_post_meta( $id, '_rc_compound', true ),
				'size'     => (string) get_post_meta( $id, '_rc_quantity', true ),
				'price'    => (float) $product->get_price(),
				'url'      => get_permalink( $id ),
				'thumb'    => $thumb,
				'reason'   => $reason,
			);
		}

		/**
		 * Filter the compounds the builder offers.
		 *
		 * @param array $rows Rows.
		 */
		return apply_filters( 'rc_builder_compounds', $rows );
	}

	/**
	 * Escape an image source.
	 *
	 * The placeholder is an inline SVG, and esc_url() drops the data scheme,
	 * which leaves a broken image where a photograph is simply missing.
	 *
	 * @param string $src Source.
	 * @return string
	 */
	protected static function image_src( $src ) {
		if ( 0 === strpos( $src, 'data:image/' ) ) {
			return $src;
		}

		return esc_url( $src );
	}

	/**
	 * Preset combinations, offered as a starting point.
	 *
	 * @return array[] Each: label, ids.
	 */
	public static function presets() {
		$presets = array();

		// Stored one per line as "Label: SKU, SKU".
		foreach ( preg_split( '/\r\n|\r|\n/', (string) get_option( 'rc_stack_presets', '' ) ) as $line ) {
			$line = trim( $line );

			if ( '' === $line || false === strpos( $line, ':' ) ) {
				continue;
			}

			list( $label, $skus ) = explode( ':', $line, 2 );

			$ids = array();
			foreach ( array_filter( array_map( 'trim', explode( ',', $skus ) ) ) as $sku ) {
				$id = wc_get_product_id_by_sku( $sku );

				if ( $id && self::is_eligible( $id ) ) {
					$ids[] = $id;
				}
			}

			// A preset the catalog cannot fill is worse than no preset.
			if ( count( $ids ) > 1 ) {
				$presets[] = array( 'label' => trim( $label ), 'ids' => $ids );
			}
		}

		/**
		 * Filter the builder's preset combinations.
		 *
		 * @param array $presets Each entry needs a label and an ids array.
		 */
		return apply_filters( 'rc_builder_presets', $presets );
	}

	/* ----------------------------------------------------------- rendering */

	/**
	 * The builder.
	 *
	 * @param array $atts Shortcode attributes.
	 * @return string
	 */
	public static function render( $atts = array() ) {
		$atts = shortcode_atts( array( 'title' => __( 'Pick compounds', 'research-commerce' ) ), (array) $atts, 'rc_panel_builder' );

		$rows = self::compounds();
		if ( ! $rows ) {
			return '';
		}

		$tiers = array();
		foreach ( rc_get_stack_tiers() as $tier ) {
			$tiers[] = array( 'count' => (int) $tier['count'], 'percent' => (float) $tier['percent'] );
		}

		ob_start();
		?>
		<form class="rc-builder" method="post" data-rc-builder
			data-tiers="<?php echo esc_attr( wp_json_encode( $tiers ) ); ?>"
			data-decimals="<?php echo esc_attr( wc_get_price_decimals() ); ?>"
			data-decimal-sep="<?php echo esc_attr( wc_get_price_decimal_separator() ); ?>"
			data-thousand-sep="<?php echo esc_attr( wc_get_price_thousand_separator() ); ?>"
			data-currency="<?php echo esc_attr( get_woocommerce_currency_symbol() ); ?>"
			data-currency-position="<?php echo esc_attr( get_option( 'woocommerce_currency_pos', 'left' ) ); ?>">

			<?php wp_nonce_field( 'rc_add_stack', 'rc_stack_nonce' ); ?>

			<div class="rc-builder__pick">
				<div class="rc-builder__head">
					<h2 class="rc-builder__title"><?php echo esc_html( $atts['title'] ); ?></h2>
					<?php if ( $tiers ) : ?>
						<p class="rc-builder__tiers"><?php echo esc_html( self::tier_line( $tiers ) ); ?></p>
					<?php endif; ?>
					<p class="rc-builder__standfirst">
						<?php esc_html_e( 'The set discount applies however you add the compounds, so nothing here is a package you are locked into. Every vial ships as a separate reference material with its own lot number and its own published report.', 'research-commerce' ); ?>
					</p>
				</div>

				<?php self::preset_buttons(); ?>

				<ul class="rc-builder__items">
					<?php foreach ( $rows as $index => $row ) : ?>
						<?php
						$disabled = '' !== $row['reason'];

						// On a listing whose code is the compound — BPC-157,
						// TB-500 — naming it again under the title reads as a
						// stutter, so the sub-line is then just the fill size.
						$sub = array( $row['compound'], $row['size'] );
						if ( 0 === strcasecmp( $row['compound'], $row['name'] ) ) {
							$sub = array( $row['size'] );
						}
						$sub = array_filter( $sub );
						?>
						<li class="rc-builder__item<?php echo $disabled ? ' is-unavailable' : ''; ?>">
							<label class="rc-builder__row">
								<span class="rc-builder__index"><?php echo esc_html( str_pad( $index + 1, 2, '0', STR_PAD_LEFT ) ); ?></span>

								<span class="rc-builder__thumb">
									<?php if ( $row['thumb'] ) : ?>
										<img src="<?php echo esc_attr( self::image_src( $row['thumb'] ) ); ?>" alt="" width="44" height="44" loading="lazy">
									<?php endif; ?>
								</span>

								<span class="rc-builder__label">
									<span class="rc-builder__code"><?php echo esc_html( $row['name'] ); ?></span>
									<span class="rc-builder__sub"><?php echo esc_html( implode( ' · ', $sub ) ); ?></span>
								</span>

								<span class="rc-builder__price">
									<?php
									echo $disabled
										? esc_html( $row['reason'] )
										: wp_kses_post( wc_price( $row['price'] ) );
									?>
								</span>

								<input type="checkbox" name="rc_stack[]" value="<?php echo esc_attr( $row['id'] ); ?>"
									data-price="<?php echo esc_attr( $row['price'] ); ?>"
									data-name="<?php echo esc_attr( $row['name'] ); ?>"
									data-size="<?php echo esc_attr( $row['size'] ); ?>"
									<?php disabled( $disabled ); ?>>
							</label>
						</li>
					<?php endforeach; ?>
				</ul>
			</div>

			<aside class="rc-builder__summary">
				<div class="rc-builder__summary-inner">
					<h2 class="rc-builder__title"><?php esc_html_e( 'Your stack', 'research-commerce' ); ?></h2>
					<p class="rc-builder__count" data-rc-count><?php esc_html_e( 'Nothing selected yet', 'research-commerce' ); ?></p>

					<ul class="rc-builder__lines" data-rc-lines></ul>

					<p class="rc-builder__hint" data-rc-hint><?php echo esc_html( self::next_tier_hint( 0, $tiers ) ); ?></p>

					<dl class="rc-builder__totals">
						<div>
							<dt><?php esc_html_e( 'Subtotal', 'research-commerce' ); ?></dt>
							<dd data-rc-subtotal><?php echo wp_kses_post( wc_price( 0 ) ); ?></dd>
						</div>
						<div class="rc-builder__saving" data-rc-saving-row hidden>
							<dt data-rc-saving-label><?php esc_html_e( 'Stack discount', 'research-commerce' ); ?></dt>
							<dd data-rc-saving></dd>
						</div>
						<div class="rc-builder__total">
							<dt><?php esc_html_e( 'Total', 'research-commerce' ); ?></dt>
							<dd data-rc-total><?php echo wp_kses_post( wc_price( 0 ) ); ?></dd>
						</div>
					</dl>

					<button type="submit" class="rc-builder__submit button" disabled data-rc-submit>
						<?php esc_html_e( 'Add stack to cart', 'research-commerce' ); ?>
					</button>

					<p class="rc-builder__note"><?php echo esc_html( rc_ruo_notice( 'short' ) ); ?></p>
				</div>
			</aside>
		</form>
		<?php
		return ob_get_clean();
	}

	/**
	 * "2+ compounds → 6% off · 3+ → 12% off".
	 *
	 * @param array $tiers Tiers.
	 * @return string
	 */
	protected static function tier_line( $tiers ) {
		$parts = array();

		foreach ( $tiers as $i => $tier ) {
			$parts[] = 0 === $i
				? sprintf(
					/* translators: 1: number of compounds, 2: percentage. */
					__( '%1$d+ compounds → %2$s off', 'research-commerce' ),
					$tier['count'],
					rc_format_percent( $tier['percent'] )
				)
				: sprintf(
					/* translators: 1: number of compounds, 2: percentage. */
					__( '%1$d+ → %2$s off', 'research-commerce' ),
					$tier['count'],
					rc_format_percent( $tier['percent'] )
				);
		}

		return implode( '  ·  ', $parts );
	}

	/**
	 * What the buyer would gain by adding one more.
	 *
	 * @param int   $count Current selection.
	 * @param array $tiers Tiers.
	 * @return string
	 */
	public static function next_tier_hint( $count, $tiers ) {
		foreach ( $tiers as $tier ) {
			if ( $count < $tier['count'] ) {
				$missing = $tier['count'] - $count;

				return sprintf(
					/* translators: 1: number of compounds still to add, 2: percentage. */
					_n(
						'Add %1$d more compound for %2$s off.',
						'Add %1$d more compounds for %2$s off.',
						$missing,
						'research-commerce'
					),
					$missing,
					rc_format_percent( $tier['percent'] )
				);
			}
		}

		return '';
	}

	/**
	 * Preset combinations as buttons that tick the boxes.
	 */
	protected static function preset_buttons() {
		$presets = self::presets();

		if ( ! $presets ) {
			return;
		}
		?>
		<div class="rc-builder__presets">
			<span class="rc-builder__presets-label"><?php esc_html_e( 'Start from', 'research-commerce' ); ?></span>
			<?php foreach ( $presets as $preset ) : ?>
				<button type="button" class="rc-builder__preset"
					data-rc-preset="<?php echo esc_attr( wp_json_encode( array_map( 'absint', $preset['ids'] ) ) ); ?>">
					<?php echo esc_html( $preset['label'] ); ?>
				</button>
			<?php endforeach; ?>
			<button type="button" class="rc-builder__preset rc-builder__preset--clear" data-rc-clear>
				<?php esc_html_e( 'Clear', 'research-commerce' ); ?>
			</button>
		</div>
		<?php
	}

	/* ------------------------------------------------------------- the POST */

	/**
	 * Add the ticked compounds to the cart, then go to it.
	 */
	public static function handle_submit() {
		if ( empty( $_POST['rc_stack'] ) || ! isset( $_POST['rc_stack_nonce'] ) ) {
			return;
		}

		if ( ! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['rc_stack_nonce'] ) ), 'rc_add_stack' ) ) {
			return;
		}

		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return;
		}

		$added   = 0;
		$refused = array();

		foreach ( array_map( 'absint', (array) wp_unslash( $_POST['rc_stack'] ) ) as $id ) {
			if ( ! $id || ! self::is_eligible( $id ) ) {
				continue;
			}

			$product = wc_get_product( $id );

			// The certificate rule still governs; the builder cannot route
			// around it.
			if ( ! $product || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
				$refused[] = $product ? $product->get_name() : (string) $id;
				continue;
			}

			if ( WC()->cart->add_to_cart( $id ) ) {
				$added++;
			}
		}

		if ( $refused ) {
			wc_add_notice(
				sprintf(
					/* translators: %s: comma separated product names. */
					__( 'Left out of the stack, because nothing is listed without a published report for the lot in stock: %s', 'research-commerce' ),
					implode( ', ', $refused )
				),
				'notice'
			);
		}

		if ( ! $added ) {
			return;
		}

		wp_safe_redirect( wc_get_cart_url() );
		exit;
	}
}
