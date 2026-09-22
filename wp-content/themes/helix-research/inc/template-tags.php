<?php
/**
 * Reusable output helpers.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Inline SVG icon set (stroke icons, currentColor).
 *
 * @param string $name Icon key.
 * @param int    $size Pixel size.
 * @return string
 */
function helix_icon( $name, $size = 20 ) {
	$paths = array(
		'flask'     => '<path d="M9 3h6M10 3v6.2L4.8 18A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3L14 9.2V3"/><path d="M7.5 15h9"/>',
		'document'  => '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
		'snow'      => '<path d="M12 2v20M4.2 6.5l15.6 9M19.8 6.5l-15.6 9"/>',
		'building'  => '<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M15 9h2a2 2 0 0 1 2 2v10"/><path d="M9 7h2M9 11h2M9 15h2"/>',
		'shield'    => '<path d="M12 22s8-3.5 8-10V5.5L12 2 4 5.5V12c0 6.5 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
		'truck'     => '<path d="M3 16V6h11v10"/><path d="M14 9h4l3 3.5V16h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
		'check'     => '<path d="m5 13 4 4L19 7"/>',
		'chevron'   => '<path d="m6 9 6 6 6-6"/>',
		'search'    => '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
		'cart'      => '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4A2 2 0 0 0 9.6 17h8.9a2 2 0 0 0 2-1.6L22 7H6"/>',
		'lock'      => '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
		'alert'     => '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
		'microscope'=> '<path d="M6 18h12M9 18a5 5 0 1 0 6-8"/><path d="m10 6 3-3 4 4-3 3z"/><path d="M8 8 6 10l3 3 2-2"/>',
	);

	$path = isset( $paths[ $name ] ) ? $paths[ $name ] : $paths['check'];

	return sprintf(
		'<svg class="hx-icon hx-icon--%1$s" width="%2$d" height="%2$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">%3$s</svg>',
		esc_attr( $name ),
		absint( $size ),
		$path
	);
}

/**
 * Research-use-only notice. The plugin owns the canonical string so it survives
 * a theme change; the theme falls back to its own default.
 *
 * @param string $context 'short' or 'long'.
 * @return string
 */
function helix_ruo_notice( $context = 'short' ) {
	if ( function_exists( 'rc_ruo_notice' ) ) {
		return rc_ruo_notice( $context );
	}

	if ( 'long' === $context ) {
		return __( 'All products listed on this site are sold as reference materials for laboratory research use only. They are not drugs, foods, cosmetics or dietary supplements, and they are not approved for human or veterinary use, diagnostic use, or any form of in-vivo application. Purchasers are responsible for compliance with all applicable laws, institutional policies and handling requirements.', 'helix-research' );
	}

	return __( 'Research use only. Not for human or veterinary use.', 'helix-research' );
}

/**
 * Announcement bar.
 */
function helix_announcement_bar() {
	if ( ! helix_opt( 'announcement_enable' ) ) {
		return;
	}

	$text = helix_opt( 'announcement_text' );
	if ( ! $text ) {
		return;
	}

	$link = helix_opt( 'announcement_link' );
	$code = helix_opt( 'promo_code' );

	echo '<div class="hx-announce"><div class="hx-wrap">';

	if ( $code ) {
		// A first-order code the visitor can copy with one tap.
		printf(
			'<span class="hx-promo">%1$s <button type="button" class="hx-promo__code" data-hx-copy="%2$s">%2$s</button> %3$s <span class="hx-promo__hint" data-hx-copy-hint>%4$s</span></span>',
			esc_html( helix_opt( 'promo_text' ) ),
			esc_attr( $code ),
			esc_html( helix_opt( 'promo_suffix' ) ),
			esc_html__( 'Tap to copy', 'helix-research' )
		);
	} elseif ( $link ) {
		printf( '<a href="%s">%s</a>', esc_url( $link ), wp_kses_post( $text ) );
	} else {
		echo wp_kses_post( $text );
	}

	echo '</div></div>';
}

/**
 * Section heading block.
 *
 * @param string $eyebrow Small label.
 * @param string $title   Heading.
 * @param string $intro   Paragraph.
 */
function helix_section_head( $eyebrow, $title, $intro = '' ) {
	echo '<header class="hx-section-head">';
	if ( $eyebrow ) {
		printf( '<p class="hx-eyebrow">%s</p>', esc_html( $eyebrow ) );
	}
	printf( '<h2>%s</h2>', esc_html( $title ) );
	if ( $intro ) {
		printf( '<p class="hx-section-intro">%s</p>', wp_kses_post( $intro ) );
	}
	echo '</header>';
}

/**
 * The four-item trust strip.
 */
function helix_trust_strip() {
	$icons = array( 'microscope', 'document', 'snow', 'building' );

	echo '<section class="hx-trust" aria-label="' . esc_attr__( 'Why laboratories order here', 'helix-research' ) . '"><div class="hx-wrap hx-trust__grid">';
	for ( $i = 1; $i <= 4; $i++ ) {
		$title = helix_opt( 'trust_' . $i . '_title' );
		$text  = helix_opt( 'trust_' . $i . '_text' );
		if ( ! $title ) {
			continue;
		}
		echo '<div class="hx-trust__item">';
		echo '<span class="hx-trust__icon">' . helix_icon( $icons[ $i - 1 ], 22 ) . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup.
		printf( '<h3>%s</h3><p>%s</p>', esc_html( $title ), wp_kses_post( $text ) );
		echo '</div>';
	}
	echo '</div></section>';
}

/**
 * Breadcrumb-free page hero for interior pages.
 *
 * @param string $title Page title.
 * @param string $intro Optional intro.
 */
function helix_page_hero( $title, $intro = '' ) {
	static $printed = false;

	// A catalog built as an ordinary page fires both the page template's hero
	// and the shop wrapper's; one page gets one hero.
	if ( $printed ) {
		return;
	}
	$printed = true;

	echo '<header class="hx-page-hero"><div class="hx-wrap">';
	printf( '<h1>%s</h1>', esc_html( $title ) );
	if ( $intro ) {
		printf( '<p>%s</p>', wp_kses_post( $intro ) );
	}
	echo '</div></header>';
}

/**
 * Compact research-use badge.
 */
function helix_ruo_badge() {
	printf(
		'<p class="hx-ruo-badge">%s <span>%s</span></p>',
		helix_icon( 'alert', 16 ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup.
		esc_html( helix_ruo_notice( 'short' ) )
	);
}

/**
 * Menu fallback so a fresh install is never empty.
 */
function helix_nav_fallback() {
	echo '<ul class="hx-nav__list">';
	if ( function_exists( 'wc_get_page_id' ) ) {
		printf(
			'<li><a href="%s">%s</a></li>',
			esc_url( get_permalink( wc_get_page_id( 'shop' ) ) ),
			esc_html__( 'Catalog', 'helix-research' )
		);
	}
	printf( '<li><a href="%s">%s</a></li>', esc_url( helix_page_url( 'coa-lookup' ) ), esc_html__( 'COA Lookup', 'helix-research' ) );
	printf( '<li><a href="%s">%s</a></li>', esc_url( helix_page_url( 'bulk-orders' ) ), esc_html__( 'Bulk &amp; Institutional', 'helix-research' ) );
	printf( '<li><a href="%s">%s</a></li>', esc_url( helix_page_url( 'shipping-and-storage' ) ), esc_html__( 'Shipping &amp; Storage', 'helix-research' ) );
	printf( '<li><a href="%s">%s</a></li>', esc_url( helix_page_url( 'faq' ) ), esc_html__( 'FAQ', 'helix-research' ) );
	echo '</ul>';
}
