<?php
/**
 * Analytical specification fields on products.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Adds a "Research data" tab to the product data panel.
 */
class RC_Product_Meta {

	/**
	 * Hooks.
	 */
	public static function init() {
		add_filter( 'woocommerce_product_data_tabs', array( __CLASS__, 'add_tab' ) );
		add_action( 'woocommerce_product_data_panels', array( __CLASS__, 'render_panel' ) );
		add_action( 'woocommerce_process_product_meta', array( __CLASS__, 'save' ) );
		add_filter( 'manage_edit-product_columns', array( __CLASS__, 'admin_columns' ), 20 );
		add_action( 'manage_product_posts_custom_column', array( __CLASS__, 'admin_column_content' ), 20, 2 );
		add_filter( 'woocommerce_product_import_inserted_product_object', array( __CLASS__, 'import_meta' ), 10, 2 );
	}

	/**
	 * Register the product data tab.
	 *
	 * @param array $tabs Existing tabs.
	 * @return array
	 */
	public static function add_tab( $tabs ) {
		$tabs['rc_research'] = array(
			'label'    => __( 'Research data', 'research-commerce' ),
			'target'   => 'rc_research_data',
			'class'    => array( 'show_if_simple', 'show_if_variable' ),
			'priority' => 21,
		);
		return $tabs;
	}

	/**
	 * Render the panel.
	 */
	public static function render_panel() {
		global $post;

		echo '<div id="rc_research_data" class="panel woocommerce_options_panel hidden">';
		echo '<div class="options_group">';

		foreach ( rc_spec_fields() as $key => $field ) {
			woocommerce_wp_text_input( array(
				'id'          => $key,
				'label'       => $field['label'],
				'placeholder' => isset( $field['placeholder'] ) ? $field['placeholder'] : '',
				'desc_tip'    => false,
				'value'       => get_post_meta( $post->ID, $key, true ),
			) );
		}

		echo '</div><div class="options_group">';

		woocommerce_wp_textarea_input( array(
			'id'          => '_rc_handling',
			'label'       => __( 'Storage &amp; handling notes', 'research-commerce' ),
			'placeholder' => __( 'Overrides the default handling text on the product page. Keep to storage, reconstitution in the laboratory, and disposal.', 'research-commerce' ),
			'value'       => get_post_meta( $post->ID, '_rc_handling', true ),
			'rows'        => 5,
		) );

		woocommerce_wp_checkbox( array(
			'id'          => '_rc_feed_exclude',
			'label'       => __( 'Keep out of the product feed', 'research-commerce' ),
			'description' => __( 'Excludes this item from the Google Merchant Center feed. Use it for anything a channel will not accept — a rejected item can suspend the whole account, so hold it back rather than submit and find out.', 'research-commerce' ),
			'value'       => get_post_meta( $post->ID, '_rc_feed_exclude', true ),
		) );

		echo '<p class="form-field"><em>';
		esc_html_e( 'Reminder: product copy must describe the material, its analysis and its handling. Do not describe effects, dosing, administration or outcomes of any kind.', 'research-commerce' );
		echo '</em></p>';

		echo '</div></div>';
	}

	/**
	 * Persist the fields.
	 *
	 * @param int $post_id Product ID.
	 */
	public static function save( $post_id ) {
		if ( ! current_user_can( 'edit_product', $post_id ) ) {
			return;
		}

		// WooCommerce verifies its own nonce before firing this hook.
		foreach ( array_keys( rc_spec_fields() ) as $key ) {
			if ( ! isset( $_POST[ $key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
				continue;
			}

			$raw = wp_unslash( $_POST[ $key ] ); // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$value = ( '_rc_coa_url' === $key ) ? esc_url_raw( $raw ) : sanitize_text_field( $raw );

			if ( '' === $value ) {
				delete_post_meta( $post_id, $key );
			} else {
				update_post_meta( $post_id, $key, $value );
			}
		}

		$exclude = ! empty( $_POST['_rc_feed_exclude'] ) ? 'yes' : 'no'; // phpcs:ignore WordPress.Security.NonceVerification.Missing
		update_post_meta( $post_id, '_rc_feed_exclude', $exclude );

		if ( isset( $_POST['_rc_handling'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			$handling = sanitize_textarea_field( wp_unslash( $_POST['_rc_handling'] ) ); // phpcs:ignore WordPress.Security.NonceVerification.Missing
			if ( '' === $handling ) {
				delete_post_meta( $post_id, '_rc_handling' );
			} else {
				update_post_meta( $post_id, '_rc_handling', $handling );
			}
		}
	}

	/**
	 * Purity / lot columns in the product list.
	 *
	 * @param array $columns Columns.
	 * @return array
	 */
	public static function admin_columns( $columns ) {
		$new = array();
		foreach ( $columns as $key => $label ) {
			$new[ $key ] = $label;
			if ( 'price' === $key ) {
				$new['rc_purity'] = __( 'Purity', 'research-commerce' );
				$new['rc_lot']    = __( 'Lot / COA', 'research-commerce' );
			}
		}
		return $new;
	}

	/**
	 * Column output.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Product ID.
	 */
	public static function admin_column_content( $column, $post_id ) {
		if ( 'rc_purity' === $column ) {
			echo esc_html( get_post_meta( $post_id, '_rc_purity', true ) ?: '—' );
		}

		if ( 'rc_lot' === $column ) {
			$lot = get_post_meta( $post_id, '_rc_lot', true );
			$coa = get_post_meta( $post_id, '_rc_coa_url', true );

			if ( ! $lot && ! $coa ) {
				echo '—';
				return;
			}

			echo esc_html( $lot ? $lot : __( 'no lot', 'research-commerce' ) );
			if ( $coa ) {
				printf( ' — <a href="%s" target="_blank" rel="noopener">%s</a>', esc_url( $coa ), esc_html__( 'COA', 'research-commerce' ) );
			} else {
				printf( ' — <span style="color:#b32d2e">%s</span>', esc_html__( 'COA missing', 'research-commerce' ) );
			}
		}
	}

	/**
	 * Map CSV import columns (e.g. "Meta: _rc_purity") — WooCommerce already
	 * handles meta columns; this hook normalizes the COA URL if supplied.
	 *
	 * @param WC_Product $product Imported product.
	 * @param array      $data    Row data.
	 * @return WC_Product
	 */
	public static function import_meta( $product, $data ) {
		if ( ! empty( $data['meta_data'] ) ) {
			foreach ( $data['meta_data'] as $meta ) {
				if ( isset( $meta['key'] ) && '_rc_coa_url' === $meta['key'] && ! empty( $meta['value'] ) ) {
					update_post_meta( $product->get_id(), '_rc_coa_url', esc_url_raw( $meta['value'] ) );
				}
			}
		}
		return $product;
	}
}
