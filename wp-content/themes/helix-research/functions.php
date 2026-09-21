<?php
/**
 * Helix Research theme bootstrap.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

define( 'HELIX_VERSION', '1.0.0' );
define( 'HELIX_DIR', get_template_directory() );
define( 'HELIX_URI', get_template_directory_uri() );

require_once HELIX_DIR . '/inc/setup.php';
require_once HELIX_DIR . '/inc/enqueue.php';
require_once HELIX_DIR . '/inc/customizer.php';
require_once HELIX_DIR . '/inc/template-tags.php';

if ( class_exists( 'WooCommerce' ) ) {
	require_once HELIX_DIR . '/inc/woocommerce.php';
}
