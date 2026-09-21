<?php
/**
 * Settings screen.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * One options page under Products.
 */
class RC_Settings {

	const GROUP = 'rc_settings';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
	}

	/**
	 * Menu entry.
	 */
	public static function menu() {
		add_submenu_page(
			'edit.php?post_type=product',
			__( 'Research Commerce', 'research-commerce' ),
			__( 'Research settings', 'research-commerce' ),
			'manage_woocommerce',
			'research-commerce',
			array( __CLASS__, 'render' )
		);
	}

	/**
	 * Setting definitions.
	 *
	 * @return array
	 */
	public static function fields() {
		return array(
			'rc_gate_enabled'              => array(
				'label'   => __( 'Show the research-use acknowledgement on first visit', 'research-commerce' ),
				'type'    => 'checkbox',
				'default' => 1,
				'section' => 'compliance',
			),
			'rc_gate_heading'              => array(
				'label'   => __( 'Acknowledgement heading', 'research-commerce' ),
				'type'    => 'text',
				'default' => __( 'Confirm research use before you continue', 'research-commerce' ),
				'section' => 'compliance',
			),
			'rc_gate_days'                 => array(
				'label'   => __( 'Remember the acknowledgement for (days)', 'research-commerce' ),
				'type'    => 'number',
				'default' => 30,
				'section' => 'compliance',
			),
			'rc_gate_decline_url'          => array(
				'label'   => __( 'Send visitors here if they decline', 'research-commerce' ),
				'type'    => 'url',
				'default' => 'https://www.google.com',
				'section' => 'compliance',
			),
			'rc_notice_short'              => array(
				'label'   => __( 'Short notice (badges, cards, footer of emails)', 'research-commerce' ),
				'type'    => 'text',
				'default' => '',
				'section' => 'compliance',
				'hint'    => __( 'Leave blank to use the built-in wording.', 'research-commerce' ),
			),
			'rc_notice_long'               => array(
				'label'   => __( 'Full notice (footer, terms tab, emails)', 'research-commerce' ),
				'type'    => 'textarea',
				'default' => '',
				'section' => 'compliance',
			),
			'rc_notice_checkout'           => array(
				'label'   => __( 'Checkout attestation wording', 'research-commerce' ),
				'type'    => 'textarea',
				'default' => '',
				'section' => 'compliance',
			),
			'rc_tiers'                     => array(
				'label'   => __( 'Quantity price breaks', 'research-commerce' ),
				'type'    => 'text',
				'default' => '3:5, 5:10, 10:15',
				'section' => 'commerce',
				'hint'    => __( 'Format: quantity:percent, comma separated. "3:5, 5:10" means 5% off from 3 units and 10% off from 5. Quantities below 2 and percentages outside 1–99 are ignored. Leave blank to disable.', 'research-commerce' ),
			),
			'rc_free_shipping_threshold'   => array(
				'label'   => __( 'Free shipping progress threshold', 'research-commerce' ),
				'type'    => 'number',
				'default' => 0,
				'section' => 'commerce',
				'hint'    => __( 'Used for the cart progress meter. Set the matching free-shipping rule in WooCommerce → Settings → Shipping. 0 hides the meter.', 'research-commerce' ),
			),
			'rc_quote_email'               => array(
				'label'   => __( 'Quote requests go to', 'research-commerce' ),
				'type'    => 'text',
				'default' => get_option( 'admin_email' ),
				'section' => 'commerce',
			),
		);
	}

	/**
	 * Register settings.
	 */
	public static function register() {
		foreach ( self::fields() as $key => $field ) {
			$sanitize = 'sanitize_text_field';
			if ( 'textarea' === $field['type'] ) {
				$sanitize = 'sanitize_textarea_field';
			} elseif ( 'url' === $field['type'] ) {
				$sanitize = 'esc_url_raw';
			} elseif ( 'number' === $field['type'] ) {
				$sanitize = 'floatval';
			} elseif ( 'checkbox' === $field['type'] ) {
				$sanitize = 'absint';
			}

			register_setting( self::GROUP, $key, array(
				'sanitize_callback' => $sanitize,
				'default'           => $field['default'],
			) );
		}
	}

	/**
	 * Render the page.
	 */
	public static function render() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$sections = array(
			'compliance' => __( 'Compliance', 'research-commerce' ),
			'commerce'   => __( 'Commerce', 'research-commerce' ),
		);
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Research Commerce', 'research-commerce' ); ?></h1>
			<p><?php esc_html_e( 'Compliance wording, quantity pricing and quote routing for the storefront.', 'research-commerce' ); ?></p>

			<form method="post" action="options.php">
				<?php settings_fields( self::GROUP ); ?>

				<?php foreach ( $sections as $section_key => $section_label ) : ?>
					<h2><?php echo esc_html( $section_label ); ?></h2>
					<table class="form-table" role="presentation"><tbody>
						<?php foreach ( self::fields() as $key => $field ) : ?>
							<?php
							if ( $field['section'] !== $section_key ) {
								continue;
							}
							$value = get_option( $key, $field['default'] );
							?>
							<tr>
								<th scope="row"><label for="<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $field['label'] ); ?></label></th>
								<td>
									<?php if ( 'textarea' === $field['type'] ) : ?>
										<textarea id="<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $key ); ?>" rows="4" class="large-text"><?php echo esc_textarea( $value ); ?></textarea>
									<?php elseif ( 'checkbox' === $field['type'] ) : ?>
										<input type="checkbox" id="<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $key ); ?>" value="1" <?php checked( 1, (int) $value ); ?>>
									<?php else : ?>
										<input type="<?php echo esc_attr( 'number' === $field['type'] ? 'number' : 'text' ); ?>"
											<?php echo 'number' === $field['type'] ? 'step="0.01" min="0"' : ''; ?>
											id="<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $key ); ?>"
											value="<?php echo esc_attr( $value ); ?>" class="regular-text">
									<?php endif; ?>

									<?php if ( ! empty( $field['hint'] ) ) : ?>
										<p class="description"><?php echo esc_html( $field['hint'] ); ?></p>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody></table>
				<?php endforeach; ?>

				<?php submit_button(); ?>
			</form>

			<hr>
			<h2><?php esc_html_e( 'Store setup', 'research-commerce' ); ?></h2>
			<p><?php esc_html_e( 'Creates the storefront pages (home, COA lookup, bulk orders, policies, FAQ), assigns them to menus and points WooCommerce at them. Existing pages with the same slug are reused, never overwritten.', 'research-commerce' ); ?></p>
			<form method="post">
				<?php wp_nonce_field( 'rc_install_pages', 'rc_install_nonce' ); ?>
				<input type="hidden" name="rc_install_pages" value="1">
				<?php submit_button( __( 'Create storefront pages', 'research-commerce' ), 'secondary', 'submit', false ); ?>
			</form>
		</div>
		<?php
	}
}
