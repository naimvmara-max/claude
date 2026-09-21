<?php
/**
 * Shared helpers and the canonical compliance copy.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Research-use-only language. Stored as options so it can be edited once and
 * reused by the theme, the product pages, the checkout and the emails.
 *
 * @param string $context 'short', 'long' or 'checkout'.
 * @return string
 */
function rc_ruo_notice( $context = 'short' ) {
	$defaults = array(
		'short'    => __( 'Research use only. Not for human or veterinary use.', 'research-commerce' ),
		'long'     => __( 'All products on this site are supplied as reference materials for laboratory research use only. They are not drugs, foods, cosmetics or dietary supplements, they are not approved for human or veterinary use, and they must not be used for diagnostic, therapeutic or any in-vivo purpose. Purchasers are responsible for handling the material safely and for complying with all applicable laws, import rules and institutional policies.', 'research-commerce' ),
		'checkout' => __( 'I confirm I am a qualified purchaser acquiring these materials for laboratory research use only, and that they will not be administered to humans or animals or resold for such use.', 'research-commerce' ),
	);

	$stored = get_option( 'rc_notice_' . $context, '' );
	$text   = $stored ? $stored : ( isset( $defaults[ $context ] ) ? $defaults[ $context ] : $defaults['short'] );

	/**
	 * Filter the research-use notice.
	 *
	 * @param string $text    Notice text.
	 * @param string $context Notice context.
	 */
	return apply_filters( 'rc_ruo_notice', $text, $context );
}

/**
 * The analytical specification fields a listing can carry.
 *
 * @return array[] Field key => label, type, placeholder.
 */
function rc_spec_fields() {
	return array(
		'_rc_compound'   => array(
			'label'       => __( 'Compound', 'research-commerce' ),
			'placeholder' => __( 'Full chemical name, e.g. Retatrutide', 'research-commerce' ),
		),
		'_rc_cas'        => array(
			'label'       => __( 'CAS number', 'research-commerce' ),
			'placeholder' => '000000-00-0',
		),
		'_rc_formula'    => array(
			'label'       => __( 'Molecular formula', 'research-commerce' ),
			'placeholder' => 'C45H73N11O10',
		),
		'_rc_weight'     => array(
			'label'       => __( 'Molecular weight', 'research-commerce' ),
			'placeholder' => '960.1 g/mol',
		),
		'_rc_sequence'   => array(
			'label'       => __( 'Sequence', 'research-commerce' ),
			'placeholder' => 'H-Tyr-D-Ala-Gly-…-OH',
		),
		'_rc_purity'     => array(
			'label'       => __( 'Assayed purity', 'research-commerce' ),
			'placeholder' => '99.2%',
		),
		'_rc_test_method'=> array(
			'label'       => __( 'Test method', 'research-commerce' ),
			'placeholder' => 'RP-HPLC / ESI-MS',
		),
		'_rc_net_content' => array(
			'label'       => __( 'Net peptide content', 'research-commerce' ),
			'placeholder' => '82%',
		),
		'_rc_lot'        => array(
			'label'       => __( 'Lot in stock', 'research-commerce' ),
			'placeholder' => 'HX-24-0918',
		),
		'_rc_quantity'   => array(
			'label'       => __( 'Quantity per vial', 'research-commerce' ),
			'placeholder' => '5 mg',
		),
		'_rc_form'       => array(
			'label'       => __( 'Physical form', 'research-commerce' ),
			'placeholder' => __( 'Lyophilized powder', 'research-commerce' ),
		),
		'_rc_storage'    => array(
			'label'       => __( 'Storage', 'research-commerce' ),
			'placeholder' => __( '-20 °C, desiccated', 'research-commerce' ),
		),
		'_rc_solubility' => array(
			'label'       => __( 'Solubility', 'research-commerce' ),
			'placeholder' => __( 'Soluble in sterile water and DMSO', 'research-commerce' ),
		),
		'_rc_coa_url'    => array(
			'label'       => __( 'COA file URL', 'research-commerce' ),
			'placeholder' => 'https://…/coa-hx-24-0918.pdf',
		),
	);
}

/**
 * Specs formatted for display, skipping empty values and the COA URL.
 *
 * @param int $product_id Product ID.
 * @return array Label => value.
 */
function rc_get_specs( $product_id ) {
	$out = array();

	foreach ( rc_spec_fields() as $key => $field ) {
		if ( '_rc_coa_url' === $key ) {
			continue;
		}

		$value = get_post_meta( $product_id, $key, true );
		if ( '' === $value || null === $value ) {
			continue;
		}

		$out[ $field['label'] ] = $value;
	}

	// When a report is linked, name the laboratory in the specification. The
	// link is the evidence, so the row is worth showing even when the purity
	// figure has not been copied across yet.
	$lab = get_option( 'rc_lab_name', '' );
	$coa = get_post_meta( $product_id, '_rc_coa_url', true );

	if ( $lab && $coa ) {
		$out[ __( 'Verification', 'research-commerce' ) ] = sprintf(
			'<a href="%s" target="_blank" rel="noopener">%s</a>',
			esc_url( $coa ),
			esc_html( $lab )
		);
	}

	/**
	 * Filter the rendered specification rows.
	 *
	 * @param array $out        Label => value.
	 * @param int   $product_id Product ID.
	 */
	return apply_filters( 'rc_product_specs', $out, $product_id );
}

/**
 * Quantity discount tiers.
 *
 * @return array[] Each: qty, percent.
 */
function rc_get_tiers() {
	$stored = get_option( 'rc_tiers', '' );
	$tiers  = array();

	if ( $stored ) {
		// Stored as "3:5, 5:10, 10:15" — quantity:percent pairs.
		$by_qty = array();

		foreach ( explode( ',', $stored ) as $pair ) {
			$parts = array_map( 'trim', explode( ':', $pair ) );

			if ( count( $parts ) !== 2 ) {
				continue;
			}

			$qty     = (int) $parts[0];
			$percent = (float) $parts[1];

			// A tier needs at least 2 units, and a discount that is neither
			// zero nor a typo like "5:100" that would give the stock away.
			if ( $qty < 2 || $percent <= 0 || $percent >= 100 ) {
				continue;
			}

			// A repeated quantity keeps the larger discount rather than
			// whichever happened to be typed last.
			if ( ! isset( $by_qty[ $qty ] ) || $percent > $by_qty[ $qty ] ) {
				$by_qty[ $qty ] = $percent;
			}
		}

		ksort( $by_qty );

		foreach ( $by_qty as $qty => $percent ) {
			$tiers[] = array(
				'qty'     => $qty,
				'percent' => $percent,
			);
		}
	}

	/**
	 * Filter the quantity discount tiers.
	 *
	 * @param array $tiers Tier definitions.
	 */
	return apply_filters( 'rc_tiers', $tiers );
}

/**
 * Is a certificate attached to this listing?
 *
 * @param int $product_id Product ID.
 * @return bool
 */
function rc_has_coa( $product_id ) {
	$url = get_post_meta( $product_id, '_rc_coa_url', true );

	/**
	 * Filter whether a product counts as certified.
	 *
	 * @param bool $has_coa    Result.
	 * @param int  $product_id Product ID.
	 */
	return (bool) apply_filters( 'rc_has_coa', ! empty( $url ), $product_id );
}

/**
 * Is the certificate a file to download, or a report page to open?
 *
 * @param int $product_id Product ID.
 * @return string 'file' or 'report'.
 */
function rc_coa_link_type( $product_id ) {
	$url = (string) get_post_meta( $product_id, '_rc_coa_url', true );
	$path = wp_parse_url( $url, PHP_URL_PATH );

	return ( $path && preg_match( '/\.(pdf|jpe?g|png)$/i', $path ) ) ? 'file' : 'report';
}
