<?php
/**
 * Plugin Name:       Research Commerce for WooCommerce
 * Plugin URI:        https://example.com/research-commerce
 * Description:       Adds the data and compliance layer a research-materials store needs: lot-level certificates of analysis, analytical specifications on products, a research-use acknowledgement gate, quantity price breaks and an institutional quote form.
 * Version:           1.0.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            Helix Research
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       research-commerce
 * WC requires at least: 7.0
 * WC tested up to:   9.1
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

define( 'RC_VERSION', '1.0.0' );
define( 'RC_FILE', __FILE__ );
define( 'RC_DIR', plugin_dir_path( __FILE__ ) );
define( 'RC_URL', plugin_dir_url( __FILE__ ) );

require_once RC_DIR . 'includes/helpers.php';
require_once RC_DIR . 'includes/class-rc-product-meta.php';
require_once RC_DIR . 'includes/class-rc-coa.php';
require_once RC_DIR . 'includes/class-rc-compliance.php';
require_once RC_DIR . 'includes/class-rc-pricing.php';
require_once RC_DIR . 'includes/class-rc-quote-form.php';
require_once RC_DIR . 'includes/class-rc-settings.php';
require_once RC_DIR . 'includes/class-rc-installer.php';

/**
 * Boot the plugin once WooCommerce is known to be present.
 */
function rc_bootstrap() {
	if ( ! class_exists( 'WooCommerce' ) ) {
		add_action( 'admin_notices', 'rc_missing_woocommerce_notice' );
		return;
	}

	RC_Product_Meta::init();
	RC_COA::init();
	RC_Compliance::init();
	RC_Pricing::init();
	RC_Quote_Form::init();
	RC_Settings::init();
	RC_Installer::init();
}
add_action( 'plugins_loaded', 'rc_bootstrap' );

/**
 * Admin notice when WooCommerce is inactive.
 */
function rc_missing_woocommerce_notice() {
	echo '<div class="notice notice-error"><p>';
	esc_html_e( 'Research Commerce needs WooCommerce to be installed and active.', 'research-commerce' );
	echo '</p></div>';
}

/**
 * Front-end assets. The plugin only loads its own stylesheet when the active
 * theme has not declared support for the plugin markup.
 */
function rc_front_assets() {
	if ( ! current_theme_supports( 'research-commerce' ) ) {
		wp_enqueue_style( 'rc-front', RC_URL . 'assets/rc-front.css', array(), RC_VERSION );
	}

	wp_enqueue_script( 'rc-front', RC_URL . 'assets/rc-front.js', array(), RC_VERSION, true );
	wp_localize_script( 'rc-front', 'rcData', array(
		'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
		'nonce'      => wp_create_nonce( 'rc_public' ),
		'gateDays'   => (int) get_option( 'rc_gate_days', 30 ),
		'declineUrl' => esc_url_raw( get_option( 'rc_gate_decline_url', 'https://www.google.com' ) ),
	) );
}
add_action( 'wp_enqueue_scripts', 'rc_front_assets' );

/**
 * Declare HPOS compatibility.
 */
add_action( 'before_woocommerce_init', function () {
	if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
		\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
	}
} );

/**
 * Activation: register post types then flush rewrites.
 */
function rc_activate() {
	RC_COA::register_post_type();
	flush_rewrite_rules();
	add_option( 'rc_activation_redirect', 1 );
}
register_activation_hook( __FILE__, 'rc_activate' );

/**
 * Deactivation.
 */
function rc_deactivate() {
	flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'rc_deactivate' );
