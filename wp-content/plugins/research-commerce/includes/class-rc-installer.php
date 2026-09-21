<?php
/**
 * One-click storefront setup: pages, menus and WooCommerce page assignment.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Builds the site structure so a fresh install is a working store.
 */
class RC_Installer {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'admin_init', array( __CLASS__, 'maybe_install' ) );
		add_action( 'admin_notices', array( __CLASS__, 'notice' ) );
	}

	/**
	 * Page definitions: slug => title, content, template.
	 *
	 * @return array
	 */
	public static function pages() {
		return array(
			'home' => array(
				'title'    => __( 'Home', 'research-commerce' ),
				'template' => 'template-home.php',
				'content'  => '',
			),

			'coa-lookup' => array(
				'title'   => __( 'COA Lookup', 'research-commerce' ),
				'content' => "\n<p>" . __( 'Every lot we release is assayed before it is listed, and the certificate stays on file after the lot sells out. Enter the lot number printed on your vial label or packing slip to pull the record.', 'research-commerce' ) . "</p>\n\n[rc_coa_lookup]\n\n<h2>" . __( 'What the certificate shows', 'research-commerce' ) . "</h2>\n\n<ul><li>" . __( 'Purity by reverse-phase HPLC with the method, column and gradient recorded.', 'research-commerce' ) . '</li><li>' . __( 'Identity confirmation by mass spectrometry against the theoretical molecular weight.', 'research-commerce' ) . '</li><li>' . __( 'Appearance, net content and water content where applicable.', 'research-commerce' ) . '</li><li>' . __( 'The testing facility, analyst signature and test date.', 'research-commerce' ) . "</li></ul>\n",
			),

			'bulk-orders' => array(
				'title'   => __( 'Bulk &amp; Institutional Orders', 'research-commerce' ),
				'content' => "\n<p>" . __( 'Gram-scale quantities, reserved lots for multi-month studies, custom vialing and purchase-order billing for universities, hospitals, core facilities and contract research organizations.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'What we can quote', 'research-commerce' ) . "</h2>\n\n<ul><li>" . __( 'Bulk quantities beyond the catalog sizes, quoted per gram.', 'research-commerce' ) . '</li><li>' . __( 'A single lot reserved across repeat orders so your data stays internally consistent.', 'research-commerce' ) . '</li><li>' . __( 'Custom fill weights, vial formats and labelling for automated handling.', 'research-commerce' ) . '</li><li>' . __( 'Additional analytics on request: water content, counter-ion, residual solvents, extended stability data.', 'research-commerce' ) . '</li><li>' . __( 'Net-30 terms against a purchase order for established institutions.', 'research-commerce' ) . "</li></ul>\n\n[rc_quote_form]\n",
			),

			'shipping-and-storage' => array(
				'title'   => __( 'Shipping &amp; Storage', 'research-commerce' ),
				'content' => "\n<h2>" . __( 'Dispatch', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Orders placed before 2:00 PM CT on a business day are packed and dispatched the same day. Every parcel ships tracked, and the tracking number is emailed with the certificate of analysis for the lot you received.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Packaging', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Material ships lyophilized in sealed vials with desiccant, inside an insulated mailer with cold packs. Lyophilized material is stable in transit at ambient temperature for the duration of a standard shipment; cold packs are a margin of safety, not a requirement for integrity.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Storage on arrival', 'research-commerce' ) . "</h2>\n\n<ul><li>" . __( 'Store sealed vials at -20 °C, desiccated and protected from light.', 'research-commerce' ) . '</li><li>' . __( 'Let a vial reach room temperature before opening so moisture does not condense onto the lyophilizate.', 'research-commerce' ) . '</li><li>' . __( 'Record solvent, concentration and date whenever material is reconstituted in the laboratory.', 'research-commerce' ) . '</li><li>' . __( 'Aliquot reconstituted material to avoid repeated freeze–thaw cycles.', 'research-commerce' ) . "</li></ul>\n\n<h2>" . __( 'International orders', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'We ship to destinations where these materials may lawfully be imported for laboratory use. Import permits, customs declarations and any institutional approvals are the purchaser\'s responsibility. Restricted destinations are flagged at checkout before payment is taken.', 'research-commerce' ) . "</p>\n",
			),

			'research-use-policy' => array(
				'title'   => __( 'Research Use Policy', 'research-commerce' ),
				'content' => "\n<p>" . rc_ruo_notice( 'long' ) . "</p>\n\n<h2>" . __( 'Who may purchase', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Orders are accepted from qualified purchasers acquiring reference materials for laboratory research: universities, hospitals, government and commercial laboratories, contract research organizations, and individuals with the training and facilities to handle laboratory chemicals safely. Purchasers must be at least 21 years old.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Prohibited uses', 'research-commerce' ) . "</h2>\n\n<ul><li>" . __( 'Administration to humans or animals in any form or quantity.', 'research-commerce' ) . '</li><li>' . __( 'Use in food, beverages, cosmetics, dietary supplements or medical devices.', 'research-commerce' ) . '</li><li>' . __( 'Diagnostic or therapeutic use of any kind.', 'research-commerce' ) . '</li><li>' . __( 'Resale, repackaging or distribution for any of the above.', 'research-commerce' ) . "</li></ul>\n\n<h2>" . __( 'How we enforce this', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Every order requires an explicit research-use attestation at checkout, which is recorded against the order. We cancel and refund orders where the stated intended use conflicts with this policy, and we decline future orders from the same account. We do not provide guidance on administration, formulation for living subjects, or any non-laboratory application, and requests for that information are declined.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'No claims are made', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Nothing on this site describes, implies or endorses an effect in humans or animals. Product pages describe composition, analytical results, laboratory handling and logistics only. Any published literature referenced elsewhere is the work of its authors and is not a representation by us about any use of these materials.', 'research-commerce' ) . "</p>\n",
			),

			'terms-of-sale' => array(
				'title'   => __( 'Terms of Sale', 'research-commerce' ),
				'content' => "\n<h2>" . __( 'Acceptance', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Placing an order constitutes acceptance of these terms and of the Research Use Policy. Orders are accepted at our discretion and are not binding until dispatched.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Specifications and warranty', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Material is warranted to meet the specification on the certificate of analysis for the lot supplied, as tested on the date shown, when stored as directed. No other warranty is given, express or implied, and no warranty of fitness for any particular purpose is given or implied.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Claims, returns and replacements', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Report transit damage, a missing item, or a discrepancy between the vial label and the certificate within 30 days of delivery, with the order number and lot number. Verified claims are replaced or refunded. Opened vials cannot be returned once a seal is broken, for chain-of-custody reasons.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Limitation of liability', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Our liability for any claim is limited to the purchase price of the material supplied. We are not liable for indirect or consequential loss, including loss of data or experimental time. The purchaser is responsible for verifying suitability for their protocol, for safe handling, and for compliance with all applicable law.', 'research-commerce' ) . "</p>\n\n<p><em>" . __( 'This page is a starting template. Have it reviewed by a lawyer in your jurisdiction before you open for orders.', 'research-commerce' ) . "</em></p>\n",
			),

			'faq' => array(
				'title'   => __( 'FAQ', 'research-commerce' ),
				'content' => "\n<h2>" . __( 'What exactly am I buying?', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'A characterized reference material supplied as a lyophilized powder in a sealed vial, for laboratory research use. It is not a drug, supplement, food or cosmetic, and it is not supplied for human or veterinary use.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Can I see the certificate before ordering?', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Yes. The certificate for the lot in stock is linked on the product page and in the COA lookup tool. A listing with no certificate attached is not available for purchase.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'How is purity measured?', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Reverse-phase HPLC with UV detection establishes purity; ESI mass spectrometry confirms identity against the theoretical mass. The method and test date are recorded on the certificate.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'Do you give protocol advice?', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'We answer questions about composition, analytical results, solubility in laboratory solvents, storage and shipping. We do not advise on experimental design, and we do not answer questions about administration to humans or animals.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'What payment methods are accepted?', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Card payment at checkout, and bank transfer or purchase order for approved institutional accounts. Contact us before ordering if your institution requires a formal quote first.', 'research-commerce' ) . "</p>\n\n<h2>" . __( 'How quickly do orders ship?', 'research-commerce' ) . "</h2>\n\n<p>" . __( 'Same business day for orders placed before 2:00 PM CT, otherwise the next business day. Tracking and the lot certificate are emailed at dispatch.', 'research-commerce' ) . "</p>\n",
			),

			'contact' => array(
				'title'   => __( 'Contact', 'research-commerce' ),
				'content' => "\n<p>" . __( 'Technical questions about specifications, certificates, storage or shipping are answered by the laboratory team, not a call centre. We reply within one business day.', 'research-commerce' ) . "</p>\n\n[rc_quote_form button=\"Send message\"]\n",
			),
		);
	}

	/**
	 * Run the installer when the settings page asks for it.
	 */
	public static function maybe_install() {
		if ( empty( $_POST['rc_install_pages'] ) ) {
			return;
		}
		if ( ! isset( $_POST['rc_install_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rc_install_nonce'] ) ), 'rc_install_pages' ) ) {
			return;
		}
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$created = self::install();
		set_transient( 'rc_install_done', $created, 60 );
	}

	/**
	 * Create pages and menus.
	 *
	 * @return array Slugs created.
	 */
	public static function install() {
		$created = array();
		$ids     = array();

		foreach ( self::pages() as $slug => $page ) {
			$existing = get_page_by_path( $slug );

			if ( $existing ) {
				$ids[ $slug ] = $existing->ID;
				continue;
			}

			$id = wp_insert_post( array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => wp_specialchars_decode( $page['title'] ),
				'post_name'    => $slug,
				'post_content' => $page['content'],
			) );

			if ( $id && ! is_wp_error( $id ) ) {
				$ids[ $slug ] = $id;
				$created[]    = $slug;

				if ( ! empty( $page['template'] ) ) {
					update_post_meta( $id, '_wp_page_template', $page['template'] );
				}
			}
		}

		// Front page.
		if ( ! empty( $ids['home'] ) && 'page' !== get_option( 'show_on_front' ) ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', $ids['home'] );
		}

		self::build_menus( $ids );

		return $created;
	}

	/**
	 * Build the four menus if they do not exist yet.
	 *
	 * @param array $ids Slug => page ID.
	 */
	protected static function build_menus( $ids ) {
		$shop_id = function_exists( 'wc_get_page_id' ) ? wc_get_page_id( 'shop' ) : 0;

		$menus = array(
			'primary'      => array(
				'name'  => __( 'Primary Menu', 'research-commerce' ),
				'items' => array( 'shop', 'coa-lookup', 'bulk-orders', 'shipping-and-storage', 'faq' ),
			),
			'footer-learn' => array(
				'name'  => __( 'Footer Documentation', 'research-commerce' ),
				'items' => array( 'coa-lookup', 'shipping-and-storage', 'faq', 'contact' ),
			),
			'footer-legal' => array(
				'name'  => __( 'Footer Legal', 'research-commerce' ),
				'items' => array( 'research-use-policy', 'terms-of-sale' ),
			),
			'footer-shop'  => array(
				'name'  => __( 'Footer Catalog', 'research-commerce' ),
				'items' => array( 'shop', 'bulk-orders' ),
			),
		);

		$locations = get_theme_mod( 'nav_menu_locations', array() );

		foreach ( $menus as $location => $config ) {
			if ( ! empty( $locations[ $location ] ) && wp_get_nav_menu_object( $locations[ $location ] ) ) {
				continue;
			}

			$menu = wp_get_nav_menu_object( $config['name'] );
			$menu_id = $menu ? $menu->term_id : wp_create_nav_menu( $config['name'] );

			if ( is_wp_error( $menu_id ) ) {
				continue;
			}

			if ( ! $menu ) {
				foreach ( $config['items'] as $slug ) {
					$page_id = ( 'shop' === $slug ) ? $shop_id : ( isset( $ids[ $slug ] ) ? $ids[ $slug ] : 0 );
					if ( ! $page_id ) {
						continue;
					}

					wp_update_nav_menu_item( $menu_id, 0, array(
						'menu-item-object-id' => $page_id,
						'menu-item-object'    => 'page',
						'menu-item-type'      => 'post_type',
						'menu-item-status'    => 'publish',
						'menu-item-title'     => ( 'shop' === $slug ) ? __( 'Catalog', 'research-commerce' ) : get_the_title( $page_id ),
					) );
				}
			}

			$locations[ $location ] = $menu_id;
		}

		set_theme_mod( 'nav_menu_locations', $locations );
	}

	/**
	 * Result notice.
	 */
	public static function notice() {
		$created = get_transient( 'rc_install_done' );
		if ( false === $created ) {
			return;
		}
		delete_transient( 'rc_install_done' );

		echo '<div class="notice notice-success is-dismissible"><p>';
		if ( $created ) {
			printf(
				/* translators: %s: comma separated slugs. */
				esc_html__( 'Storefront pages created: %s. Menus assigned. Review the copy before launch.', 'research-commerce' ),
				esc_html( implode( ', ', $created ) )
			);
		} else {
			esc_html_e( 'All storefront pages already existed — nothing was overwritten. Menus checked.', 'research-commerce' );
		}
		echo '</p></div>';
	}
}
