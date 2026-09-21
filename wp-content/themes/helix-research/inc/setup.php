<?php
/**
 * Theme supports, menus and sidebars.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Register theme supports.
 */
function helix_setup() {
	load_theme_textdomain( 'helix-research', HELIX_DIR . '/languages' );

	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'automatic-feed-links' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'align-wide' );
	add_theme_support( 'custom-logo', array(
		'height'      => 60,
		'width'       => 260,
		'flex-height' => true,
		'flex-width'  => true,
	) );
	add_theme_support( 'html5', array(
		'search-form',
		'comment-form',
		'comment-list',
		'gallery',
		'caption',
		'style',
		'script',
	) );

	// WooCommerce.
	add_theme_support( 'woocommerce', array(
		'thumbnail_image_width' => 600,
		'single_image_width'    => 1000,
		'product_grid'          => array(
			'default_rows'    => 3,
			'min_rows'        => 2,
			'default_columns' => 3,
			'min_columns'     => 2,
			'max_columns'     => 4,
		),
	) );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );

	// Tells the Research Commerce plugin the theme styles its markup itself.
	add_theme_support( 'research-commerce' );

	register_nav_menus( array(
		'primary'      => __( 'Primary Menu', 'helix-research' ),
		'catalog'      => __( 'Catalog Dropdown', 'helix-research' ),
		'footer-shop'  => __( 'Footer — Catalog', 'helix-research' ),
		'footer-learn' => __( 'Footer — Documentation', 'helix-research' ),
		'footer-legal' => __( 'Footer — Legal', 'helix-research' ),
	) );
}
add_action( 'after_setup_theme', 'helix_setup' );

/**
 * Content width.
 */
function helix_content_width() {
	$GLOBALS['content_width'] = apply_filters( 'helix_content_width', 780 );
}
add_action( 'after_setup_theme', 'helix_content_width', 0 );

/**
 * Widget areas.
 */
function helix_widgets_init() {
	register_sidebar( array(
		'name'          => __( 'Shop Sidebar', 'helix-research' ),
		'id'            => 'shop-sidebar',
		'description'   => __( 'Filters and trust content shown beside the catalog.', 'helix-research' ),
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h3 class="widget-title">',
		'after_title'   => '</h3>',
	) );

	register_sidebar( array(
		'name'          => __( 'Footer Callout', 'helix-research' ),
		'id'            => 'footer-callout',
		'description'   => __( 'Optional block shown above the footer columns.', 'helix-research' ),
		'before_widget' => '<section id="%1$s" class="widget %2$s">',
		'after_widget'  => '</section>',
		'before_title'  => '<h3 class="widget-title">',
		'after_title'   => '</h3>',
	) );
}
add_action( 'widgets_init', 'helix_widgets_init' );

/**
 * Body classes used by the stylesheet.
 *
 * @param array $classes Existing classes.
 * @return array
 */
function helix_body_classes( $classes ) {
	if ( helix_is_dark() ) {
		$classes[] = 'hx-dark';
	}
	if ( ! is_active_sidebar( 'shop-sidebar' ) ) {
		$classes[] = 'no-shop-sidebar';
	}
	if ( is_page_template( 'template-home.php' ) || is_front_page() ) {
		$classes[] = 'helix-landing';
	}
	return $classes;
}
add_filter( 'body_class', 'helix_body_classes' );

/**
 * Excerpt tweaks.
 */
add_filter( 'excerpt_more', function () {
	return '&hellip;';
} );
