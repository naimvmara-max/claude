<?php
/**
 * Laboratory dilution calculator.
 *
 * Preparation arithmetic for in-vitro work: how much solvent gives what
 * concentration, and the C1V1 = C2V2 step that follows. It deals in mass,
 * volume and molarity only — there is no administration, route or schedule
 * anywhere in this feature, and there must never be.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders the calculator on product pages and via shortcode.
 */
class RC_Calculator {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_shortcode( 'rc_dilution_calculator', array( __CLASS__, 'shortcode' ) );
		add_action( 'woocommerce_after_single_product_summary', array( __CLASS__, 'render_on_product' ), 9 );
	}

	/**
	 * Pull the leading number out of a spec string such as "5 mg" or
	 * "1419.53 g/mol".
	 *
	 * @param string $value Raw meta value.
	 * @return float Zero when nothing numeric is present.
	 */
	public static function parse_number( $value ) {
		if ( ! is_string( $value ) || '' === trim( $value ) ) {
			return 0.0;
		}

		// Normalize decimal commas before matching.
		$value = str_replace( ',', '.', $value );

		if ( preg_match( '/-?\d+(\.\d+)?/', $value, $match ) ) {
			return (float) $match[0];
		}

		return 0.0;
	}

	/**
	 * Vial figures for a product, used to prefill the form.
	 *
	 * @param int $product_id Product ID.
	 * @return array
	 */
	public static function product_defaults( $product_id ) {
		$content = self::parse_number( get_post_meta( $product_id, '_rc_quantity', true ) );
		$weight  = self::parse_number( get_post_meta( $product_id, '_rc_weight', true ) );
		$net     = self::parse_number( get_post_meta( $product_id, '_rc_net_content', true ) );

		return array(
			'content' => $content > 0 ? $content : 5,
			'weight'  => $weight > 0 ? $weight : 0,
			'net'     => ( $net > 0 && $net <= 100 ) ? $net : 100,
		);
	}

	/**
	 * Auto-render below the product summary.
	 */
	public static function render_on_product() {
		global $product;

		if ( ! $product instanceof WC_Product ) {
			return;
		}

		echo self::render( self::product_defaults( $product->get_id() ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in render().
	}

	/**
	 * [rc_dilution_calculator] for a standalone tools page.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode( $atts ) {
		$atts = shortcode_atts( array(
			'content' => 5,
			'weight'  => 0,
			'net'     => 100,
		), $atts, 'rc_dilution_calculator' );

		return self::render( array(
			'content' => (float) $atts['content'],
			'weight'  => (float) $atts['weight'],
			'net'     => (float) $atts['net'],
		) );
	}

	/**
	 * Markup.
	 *
	 * @param array $defaults Prefill values.
	 * @return string
	 */
	public static function render( $defaults ) {
		$article = get_page_by_path( 'stock-solution-and-dilution-arithmetic', OBJECT, 'post' );

		ob_start();
		?>
		<section class="rc-calc" data-rc-calc
			data-content="<?php echo esc_attr( $defaults['content'] ); ?>"
			data-weight="<?php echo esc_attr( $defaults['weight'] ); ?>"
			data-net="<?php echo esc_attr( $defaults['net'] ); ?>">

			<header class="rc-calc__head">
				<h2><?php esc_html_e( 'Laboratory dilution calculator', 'research-commerce' ); ?></h2>
				<p><?php esc_html_e( 'Preparation arithmetic for in-vitro work: solvent volume, resulting concentration, and the dilution step that follows. Figures are prefilled from this lot and can be overridden.', 'research-commerce' ); ?></p>
			</header>

			<div class="rc-calc__tabs" role="tablist">
				<button type="button" class="rc-calc__tab is-active" role="tab" aria-selected="true" data-rc-tab="reconstitute">
					<?php esc_html_e( 'Solvent → concentration', 'research-commerce' ); ?>
				</button>
				<button type="button" class="rc-calc__tab" role="tab" aria-selected="false" data-rc-tab="target">
					<?php esc_html_e( 'Target concentration → solvent', 'research-commerce' ); ?>
				</button>
				<button type="button" class="rc-calc__tab" role="tab" aria-selected="false" data-rc-tab="dilute">
					<?php esc_html_e( 'Dilution (C₁V₁ = C₂V₂)', 'research-commerce' ); ?>
				</button>
			</div>

			<div class="rc-calc__panel is-active" data-rc-panel="reconstitute">
				<div class="rc-calc__grid">
					<label><span><?php esc_html_e( 'Vial content (mg)', 'research-commerce' ); ?></span>
						<input type="number" step="0.1" min="0" data-rc-field="content" value="<?php echo esc_attr( $defaults['content'] ); ?>">
					</label>
					<label><span><?php esc_html_e( 'Net peptide content (%)', 'research-commerce' ); ?></span>
						<input type="number" step="0.1" min="1" max="100" data-rc-field="net" value="<?php echo esc_attr( $defaults['net'] ); ?>">
					</label>
					<label><span><?php esc_html_e( 'Solvent volume (mL)', 'research-commerce' ); ?></span>
						<input type="number" step="0.1" min="0.01" data-rc-field="volume" value="1">
					</label>
					<label><span><?php esc_html_e( 'Molecular weight (g/mol)', 'research-commerce' ); ?></span>
						<input type="number" step="0.01" min="0" data-rc-field="weight" value="<?php echo esc_attr( $defaults['weight'] ? $defaults['weight'] : '' ); ?>" placeholder="<?php esc_attr_e( 'optional — enables mM', 'research-commerce' ); ?>">
					</label>
				</div>

				<dl class="rc-calc__out">
					<div><dt><?php esc_html_e( 'Peptide in the vial', 'research-commerce' ); ?></dt><dd data-rc-out="mass">—</dd></div>
					<div><dt><?php esc_html_e( 'Concentration', 'research-commerce' ); ?></dt><dd data-rc-out="conc">—</dd></div>
					<div><dt><?php esc_html_e( 'Molarity', 'research-commerce' ); ?></dt><dd data-rc-out="molarity">—</dd></div>
				</dl>
			</div>

			<div class="rc-calc__panel" data-rc-panel="target">
				<div class="rc-calc__grid">
					<label><span><?php esc_html_e( 'Vial content (mg)', 'research-commerce' ); ?></span>
						<input type="number" step="0.1" min="0" data-rc-field="t-content" value="<?php echo esc_attr( $defaults['content'] ); ?>">
					</label>
					<label><span><?php esc_html_e( 'Net peptide content (%)', 'research-commerce' ); ?></span>
						<input type="number" step="0.1" min="1" max="100" data-rc-field="t-net" value="<?php echo esc_attr( $defaults['net'] ); ?>">
					</label>
					<label><span><?php esc_html_e( 'Target concentration (mg/mL)', 'research-commerce' ); ?></span>
						<input type="number" step="0.1" min="0.001" data-rc-field="t-target" value="2">
					</label>
				</div>

				<dl class="rc-calc__out">
					<div><dt><?php esc_html_e( 'Peptide in the vial', 'research-commerce' ); ?></dt><dd data-rc-out="t-mass">—</dd></div>
					<div><dt><?php esc_html_e( 'Solvent to add', 'research-commerce' ); ?></dt><dd data-rc-out="t-volume">—</dd></div>
				</dl>
			</div>

			<div class="rc-calc__panel" data-rc-panel="dilute">
				<div class="rc-calc__grid">
					<label><span><?php esc_html_e( 'Stock concentration (mg/mL)', 'research-commerce' ); ?></span>
						<input type="number" step="0.01" min="0.001" data-rc-field="d-stock" value="2">
					</label>
					<label><span><?php esc_html_e( 'Working concentration (mg/mL)', 'research-commerce' ); ?></span>
						<input type="number" step="0.001" min="0.0001" data-rc-field="d-target" value="0.1">
					</label>
					<label><span><?php esc_html_e( 'Final volume (mL)', 'research-commerce' ); ?></span>
						<input type="number" step="0.1" min="0.01" data-rc-field="d-final" value="1">
					</label>
				</div>

				<dl class="rc-calc__out">
					<div><dt><?php esc_html_e( 'Stock to take', 'research-commerce' ); ?></dt><dd data-rc-out="d-stock-vol">—</dd></div>
					<div><dt><?php esc_html_e( 'Diluent to add', 'research-commerce' ); ?></dt><dd data-rc-out="d-diluent">—</dd></div>
					<div><dt><?php esc_html_e( 'Dilution factor', 'research-commerce' ); ?></dt><dd data-rc-out="d-factor">—</dd></div>
				</dl>
			</div>

			<footer class="rc-calc__foot">
				<p class="rc-calc__note">
					<?php esc_html_e( 'Net peptide content corrects for water and counter-ion, which are part of the vial\'s gross weight but not of the peptide. Leave it at 100% only if your certificate reports net content of 100%.', 'research-commerce' ); ?>
					<?php if ( $article ) : ?>
						<a href="<?php echo esc_url( get_permalink( $article ) ); ?>"><?php esc_html_e( 'How this arithmetic works →', 'research-commerce' ); ?></a>
					<?php endif; ?>
				</p>
				<p class="rc-calc__ruo"><?php echo esc_html( rc_ruo_notice( 'short' ) ); ?> <?php esc_html_e( 'This tool performs laboratory preparation arithmetic only and is not guidance for any use in humans or animals.', 'research-commerce' ); ?></p>
			</footer>
		</section>
		<?php
		return ob_get_clean();
	}
}
