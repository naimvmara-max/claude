<?php
/**
 * Customizer settings. Every string on the marketing surfaces is editable here
 * so the store owner never has to touch template files.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

/**
 * Is the storefront running the dark Phantom palette?
 *
 * @return bool
 */
function helix_is_dark() {
	return 'dark' === get_theme_mod( 'helix_theme_mode', 'dark' );
}

/**
 * The catalog URL.
 *
 * Resolves the WooCommerce shop page rather than assuming a /shop/ slug, so
 * the hero and header buttons point somewhere real on any install.
 *
 * @return string
 */
function helix_shop_url() {
	if ( function_exists( 'wc_get_page_id' ) ) {
		$shop_id = wc_get_page_id( 'shop' );
		if ( $shop_id > 0 ) {
			$url = get_permalink( $shop_id );
			if ( $url ) {
				return $url;
			}
		}
	}

	return home_url( '/shop/' );
}

/**
 * A page URL by slug, falling back to the slug under the site root when no
 * such page exists yet.
 *
 * @param string $slug Page slug.
 * @return string
 */
function helix_page_url( $slug ) {
	$page = get_page_by_path( $slug );

	if ( $page ) {
		$url = get_permalink( $page );
		if ( $url ) {
			return $url;
		}
	}

	return home_url( '/' . trim( $slug, '/' ) . '/' );
}

/**
 * Default copy. Written for a laboratory research audience: specifications,
 * documentation and logistics only — no consumption, dosing or outcome language.
 *
 * @return array
 */
function helix_defaults() {
	return array(
		'announcement_enable'  => true,
		'promo_code'           => 'PHANTOM15',
		'promo_text'           => __( 'First order? Use code', 'helix-research' ),
		'promo_suffix'         => __( 'for 15% off', 'helix-research' ),
		'announcement_text'    => __( 'Lot-specific HPLC &amp; MS certificates published with every batch. Orders placed before 2:00 PM CT ship same day.', 'helix-research' ),
		'announcement_link'    => '',
		'header_support'       => __( 'Technical support: support@example.com', 'helix-research' ),
		'header_cta_text'      => __( 'Browse Catalog', 'helix-research' ),
		'header_cta_url'       => helix_shop_url(),

		'hero_eyebrow'         => __( 'Reference materials for in-vitro and laboratory research', 'helix-research' ),
		'hero_heading'         => __( 'Every lot assayed. Every report on file.', 'helix-research' ),
		'hero_subheading'      => __( 'Every catalog item is assayed by HPLC and mass spectrometry before release. Where the report for the lot in stock is published, it is linked on the listing — and it is available on request for any lot.', 'helix-research' ),
		'hero_cta_text'        => __( 'Browse the catalog', 'helix-research' ),
		'hero_cta_url'         => helix_shop_url(),
		'hero_cta2_text'       => __( 'Look up a lot COA', 'helix-research' ),
		'hero_cta2_url'        => helix_page_url( 'coa-lookup' ),
		'hero_note'            => __( 'Sold for laboratory research use only. Not for human or veterinary use.', 'helix-research' ),
		'hero_image'           => '',
		'hero_product_sku'     => 'PH-BPC-10',

		'stat_1_value'         => __( '≥99%', 'helix-research' ),
		'stat_1_label'         => __( 'HPLC purity specification', 'helix-research' ),
		'stat_2_value'         => __( '3rd party', 'helix-research' ),
		'stat_2_label'         => __( 'Independent laboratory, lot by lot', 'helix-research' ),
		'stat_3_value'         => __( 'Same day', 'helix-research' ),
		'stat_3_label'         => __( 'Dispatch on orders before 2 PM CT', 'helix-research' ),

		'trust_1_title'        => __( 'Third-party assayed', 'helix-research' ),
		'trust_1_text'         => __( 'HPLC and MS run by an independent analytical laboratory, named on the report.', 'helix-research' ),
		'trust_2_title'        => __( 'Lot-level documentation', 'helix-research' ),
		'trust_2_text'         => __( 'Purity, identity, mass and test date tied to the lot you receive.', 'helix-research' ),
		'trust_3_title'        => __( 'Cold-chain handling', 'helix-research' ),
		'trust_3_text'         => __( 'Lyophilized, stored at -20 °C and shipped with insulated packs.', 'helix-research' ),
		'trust_4_title'        => __( 'Institutional accounts', 'helix-research' ),
		'trust_4_text'         => __( 'Purchase orders, net terms and quotes for universities and labs.', 'helix-research' ),

		'footer_about'         => __( 'Helix Research supplies analytically characterized reference materials to laboratories, universities and contract research organizations. All products are sold strictly for laboratory research use.', 'helix-research' ),
		'footer_address'       => __( '1200 Research Parkway, Suite 240, Austin, TX 78701', 'helix-research' ),
		'footer_email'         => 'support@example.com',
		'footer_hours'         => __( 'Monday–Friday, 9:00–17:00 CT', 'helix-research' ),
	);
}

/**
 * Fetch a theme option with its default.
 *
 * @param string $key     Option key.
 * @param mixed  $default Optional override.
 * @return mixed
 */
function helix_opt( $key, $default = null ) {
	$defaults = helix_defaults();
	if ( null === $default && isset( $defaults[ $key ] ) ) {
		$default = $defaults[ $key ];
	}
	return get_theme_mod( 'helix_' . $key, $default );
}

/**
 * Register Customizer controls.
 *
 * @param WP_Customize_Manager $wp_customize Manager.
 */
function helix_customize_register( $wp_customize ) {
	$defaults = helix_defaults();

	$wp_customize->add_panel( 'helix_panel', array(
		'title'       => __( 'Store Content', 'helix-research' ),
		'description' => __( 'Headlines, trust points and footer details for the storefront.', 'helix-research' ),
		'priority'    => 20,
	) );

	$sections = array(
		'helix_announcement' => __( 'Announcement Bar', 'helix-research' ),
		'helix_header'       => __( 'Header', 'helix-research' ),
		'helix_hero'         => __( 'Homepage Hero', 'helix-research' ),
		'helix_trust'        => __( 'Trust Points', 'helix-research' ),
		'helix_footer'       => __( 'Footer', 'helix-research' ),
	);
	foreach ( $sections as $id => $title ) {
		$wp_customize->add_section( $id, array(
			'title' => $title,
			'panel' => 'helix_panel',
		) );
	}

	$fields = array(
		'announcement_enable' => array( 'helix_announcement', 'checkbox' ),
		'promo_code'          => array( 'helix_announcement', 'text' ),
		'promo_text'          => array( 'helix_announcement', 'text' ),
		'promo_suffix'        => array( 'helix_announcement', 'text' ),
		'announcement_text'   => array( 'helix_announcement', 'textarea' ),
		'announcement_link'   => array( 'helix_announcement', 'url' ),

		'header_support'      => array( 'helix_header', 'text' ),
		'header_cta_text'     => array( 'helix_header', 'text' ),
		'header_cta_url'      => array( 'helix_header', 'url' ),

		'hero_eyebrow'        => array( 'helix_hero', 'text' ),
		'hero_heading'        => array( 'helix_hero', 'textarea' ),
		'hero_product_sku'    => array( 'helix_hero', 'text' ),
		'hero_subheading'     => array( 'helix_hero', 'textarea' ),
		'hero_cta_text'       => array( 'helix_hero', 'text' ),
		'hero_cta_url'        => array( 'helix_hero', 'url' ),
		'hero_cta2_text'      => array( 'helix_hero', 'text' ),
		'hero_cta2_url'       => array( 'helix_hero', 'url' ),
		'hero_note'           => array( 'helix_hero', 'text' ),
		'stat_1_value'        => array( 'helix_hero', 'text' ),
		'stat_1_label'        => array( 'helix_hero', 'text' ),
		'stat_2_value'        => array( 'helix_hero', 'text' ),
		'stat_2_label'        => array( 'helix_hero', 'text' ),
		'stat_3_value'        => array( 'helix_hero', 'text' ),
		'stat_3_label'        => array( 'helix_hero', 'text' ),

		'trust_1_title'       => array( 'helix_trust', 'text' ),
		'trust_1_text'        => array( 'helix_trust', 'textarea' ),
		'trust_2_title'       => array( 'helix_trust', 'text' ),
		'trust_2_text'        => array( 'helix_trust', 'textarea' ),
		'trust_3_title'       => array( 'helix_trust', 'text' ),
		'trust_3_text'        => array( 'helix_trust', 'textarea' ),
		'trust_4_title'       => array( 'helix_trust', 'text' ),
		'trust_4_text'        => array( 'helix_trust', 'textarea' ),

		'footer_about'        => array( 'helix_footer', 'textarea' ),
		'footer_address'      => array( 'helix_footer', 'text' ),
		'footer_email'        => array( 'helix_footer', 'text' ),
		'footer_hours'        => array( 'helix_footer', 'text' ),
	);

	foreach ( $fields as $key => $config ) {
		list( $section, $type ) = $config;

		$sanitize = 'sanitize_text_field';
		if ( 'textarea' === $type ) {
			$sanitize = 'wp_kses_post';
		} elseif ( 'url' === $type ) {
			$sanitize = 'esc_url_raw';
		} elseif ( 'checkbox' === $type ) {
			$sanitize = 'helix_sanitize_checkbox';
		}

		$wp_customize->add_setting( 'helix_' . $key, array(
			'default'           => isset( $defaults[ $key ] ) ? $defaults[ $key ] : '',
			'sanitize_callback' => $sanitize,
			'transport'         => 'refresh',
		) );

		$wp_customize->add_control( 'helix_' . $key, array(
			'label'   => ucwords( str_replace( '_', ' ', $key ) ),
			'section' => $section,
			'type'    => $type,
		) );
	}

	$wp_customize->add_setting( 'helix_hero_image', array(
		'default'           => '',
		'sanitize_callback' => 'esc_url_raw',
	) );
	$wp_customize->add_control( new WP_Customize_Image_Control( $wp_customize, 'helix_hero_image', array(
		'label'   => __( 'Hero Image', 'helix-research' ),
		'section' => 'helix_hero',
	) ) );

	$wp_customize->add_setting( 'helix_theme_mode', array(
		'default'           => 'dark',
		'sanitize_callback' => function ( $value ) {
			return in_array( $value, array( 'dark', 'light' ), true ) ? $value : 'dark';
		},
	) );
	$wp_customize->add_control( 'helix_theme_mode', array(
		'label'       => __( 'Theme', 'helix-research' ),
		'description' => __( 'Dark is the Phantom storefront palette. Light is the clinical-supply look.', 'helix-research' ),
		'section'     => 'helix_header',
		'type'        => 'select',
		'choices'     => array(
			'dark'  => __( 'Dark', 'helix-research' ),
			'light' => __( 'Light', 'helix-research' ),
		),
	) );

	// Brand colors.
	$wp_customize->add_section( 'helix_colors', array(
		'title' => __( 'Brand Colors', 'helix-research' ),
		'panel' => 'helix_panel',
	) );

	$colors = array(
		'color_accent' => array( __( 'Accent / buttons', 'helix-research' ), '#1f7a5a' ),
		'color_ink'    => array( __( 'Headings', 'helix-research' ), '#0b1a17' ),
		'color_deep'   => array( __( 'Dark sections', 'helix-research' ), '#0e1f1b' ),
	);
	foreach ( $colors as $key => $data ) {
		$wp_customize->add_setting( 'helix_' . $key, array(
			'default'           => $data[1],
			'sanitize_callback' => 'sanitize_hex_color',
		) );
		$wp_customize->add_control( new WP_Customize_Color_Control( $wp_customize, 'helix_' . $key, array(
			'label'   => $data[0],
			'section' => 'helix_colors',
		) ) );
	}
}
add_action( 'customize_register', 'helix_customize_register' );

/**
 * Checkbox sanitizer.
 *
 * @param mixed $value Raw value.
 * @return bool
 */
function helix_sanitize_checkbox( $value ) {
	return (bool) $value;
}
