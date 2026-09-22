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
	$fonts = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap';

	if ( helix_is_dark() ) {
		$fonts = 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
	}

	wp_enqueue_style( 'helix-fonts', $fonts, array(), null );

	wp_enqueue_style( 'helix-main', HELIX_URI . '/assets/css/main.css', array(), HELIX_VERSION );

	if ( helix_is_dark() ) {
		wp_enqueue_style( 'helix-dark', HELIX_URI . '/assets/css/dark.css', array( 'helix-main' ), HELIX_VERSION );
	}
	if ( ! helix_is_dark() ) {
		wp_add_inline_style( 'helix-main', helix_inline_css() );
	}

	wp_enqueue_script( 'helix-main', HELIX_URI . '/assets/js/main.js', array(), HELIX_VERSION, true );
	wp_localize_script( 'helix-main', 'helixData', array(
		'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
		'isCart'      => function_exists( 'is_cart' ) ? is_cart() : false,
		'searchIndex' => helix_search_index_url(),
		'searchUrl'   => home_url( '/' ),
		'i18n'        => array(
			'noResults' => __( 'No match in the catalog', 'helix-research' ),
			'seeAll'    => __( 'See all results for “%s”', 'helix-research' ),
			'journal'   => __( 'Search the journal for “%s”', 'helix-research' ),
		),
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

/**
 * Where the header search reads its catalog index from.
 *
 * The plugin serves it; the static preview export writes it next to the pages,
 * so a filter can point the theme at a flat file instead.
 *
 * @return string
 */
function helix_search_index_url() {
	$url = add_query_arg( 'rc_index', 'products', home_url( '/' ) );

	/**
	 * Filter the catalog index URL.
	 *
	 * @param string $url Index URL.
	 */
	return apply_filters( 'helix_search_index_url', $url );
}
