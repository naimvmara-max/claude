<?php
/**
 * Assets.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Front-end styles and scripts.
 */
function helix_assets() {
	wp_enqueue_style(
		'helix-fonts',
		'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap',
		array(),
		null
	);

	wp_enqueue_style( 'helix-main', HELIX_URI . '/assets/css/main.css', array(), HELIX_VERSION );
	wp_add_inline_style( 'helix-main', helix_inline_css() );

	wp_enqueue_script( 'helix-main', HELIX_URI . '/assets/js/main.js', array(), HELIX_VERSION, true );
	wp_localize_script( 'helix-main', 'helixData', array(
		'ajaxUrl' => admin_url( 'admin-ajax.php' ),
		'isCart'  => function_exists( 'is_cart' ) ? is_cart() : false,
	) );

	if ( is_singular() && comments_open() && get_option( 'thread_comments' ) ) {
		wp_enqueue_script( 'comment-reply' );
	}
}
add_action( 'wp_enqueue_scripts', 'helix_assets' );

/**
 * Customizer-driven CSS variables.
 *
 * @return string
 */
function helix_inline_css() {
	$accent = get_theme_mod( 'helix_color_accent', '#1f7a5a' );
	$ink    = get_theme_mod( 'helix_color_ink', '#0b1a17' );
	$deep   = get_theme_mod( 'helix_color_deep', '#0e1f1b' );

	return sprintf(
		':root{--hx-accent:%1$s;--hx-ink:%2$s;--hx-deep:%3$s;}',
		esc_attr( $accent ),
		esc_attr( $ink ),
		esc_attr( $deep )
	);
}

/**
 * Preconnect to the font host.
 *
 * @param array  $urls Existing URLs.
 * @param string $relation_type Relation.
 * @return array
 */
function helix_resource_hints( $urls, $relation_type ) {
	if ( 'preconnect' === $relation_type ) {
		$urls[] = array(
			'href' => 'https://fonts.gstatic.com',
			'crossorigin',
		);
	}
	return $urls;
}
add_filter( 'wp_resource_hints', 'helix_resource_hints', 10, 2 );
