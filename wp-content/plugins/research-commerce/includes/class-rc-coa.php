<?php
/**
 * Certificates of analysis: storage, lookup and display.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * COA records are their own post type so a lot stays verifiable long after the
 * product listing changes or sells out.
 */
class RC_COA {

	const POST_TYPE = 'rc_coa';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
		add_action( 'add_meta_boxes', array( __CLASS__, 'meta_box' ) );
		add_action( 'save_post_' . self::POST_TYPE, array( __CLASS__, 'save' ), 10, 2 );
		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column_content' ), 10, 2 );

		add_shortcode( 'rc_coa_lookup', array( __CLASS__, 'lookup_shortcode' ) );
		add_action( 'wp_ajax_rc_coa_lookup', array( __CLASS__, 'ajax_lookup' ) );
		add_action( 'wp_ajax_nopriv_rc_coa_lookup', array( __CLASS__, 'ajax_lookup' ) );
	}

	/**
	 * Register the COA post type.
	 */
	public static function register_post_type() {
		register_post_type( self::POST_TYPE, array(
			'labels'          => array(
				'name'               => __( 'Certificates', 'research-commerce' ),
				'singular_name'      => __( 'Certificate', 'research-commerce' ),
				'add_new_item'       => __( 'Add certificate', 'research-commerce' ),
				'edit_item'          => __( 'Edit certificate', 'research-commerce' ),
				'search_items'       => __( 'Search certificates', 'research-commerce' ),
				'not_found'          => __( 'No certificates recorded yet.', 'research-commerce' ),
				'menu_name'          => __( 'Certificates', 'research-commerce' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => 'edit.php?post_type=product',
			'supports'        => array( 'title' ),
			'capability_type' => 'post',
			'menu_icon'       => 'dashicons-media-document',
		) );
	}

	/**
	 * Meta box.
	 */
	public static function meta_box() {
		add_meta_box(
			'rc_coa_fields',
			__( 'Certificate details', 'research-commerce' ),
			array( __CLASS__, 'render_meta_box' ),
			self::POST_TYPE,
			'normal',
			'high'
		);
	}

	/**
	 * Fields on a COA record.
	 *
	 * @return array
	 */
	public static function fields() {
		return array(
			'_rc_coa_lot'      => __( 'Lot number', 'research-commerce' ),
			'_rc_coa_product'  => __( 'Product name as labelled', 'research-commerce' ),
			'_rc_coa_purity'   => __( 'Purity result', 'research-commerce' ),
			'_rc_coa_method'   => __( 'Method', 'research-commerce' ),
			'_rc_coa_facility' => __( 'Testing facility', 'research-commerce' ),
			'_rc_coa_date'     => __( 'Test date (YYYY-MM-DD)', 'research-commerce' ),
			'_rc_coa_file'     => __( 'Certificate file URL', 'research-commerce' ),
		);
	}

	/**
	 * Meta box markup.
	 *
	 * @param WP_Post $post Post.
	 */
	public static function render_meta_box( $post ) {
		wp_nonce_field( 'rc_coa_save', 'rc_coa_nonce' );

		echo '<table class="form-table"><tbody>';
		foreach ( self::fields() as $key => $label ) {
			printf(
				'<tr><th><label for="%1$s">%2$s</label></th><td><input type="text" class="regular-text" id="%1$s" name="%1$s" value="%3$s"></td></tr>',
				esc_attr( $key ),
				esc_html( $label ),
				esc_attr( get_post_meta( $post->ID, $key, true ) )
			);
		}
		echo '</tbody></table>';
		printf(
			'<p class="description">%s</p>',
			esc_html__( 'The lot number is what customers type into the lookup tool, so it must match the vial label exactly.', 'research-commerce' )
		);
	}

	/**
	 * Save COA meta.
	 *
	 * @param int     $post_id Post ID.
	 * @param WP_Post $post    Post.
	 */
	public static function save( $post_id, $post ) {
		if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
			return;
		}
		if ( ! isset( $_POST['rc_coa_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rc_coa_nonce'] ) ), 'rc_coa_save' ) ) {
			return;
		}
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			return;
		}

		foreach ( array_keys( self::fields() ) as $key ) {
			if ( ! isset( $_POST[ $key ] ) ) {
				continue;
			}

			$raw   = wp_unslash( $_POST[ $key ] ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
			$value = ( '_rc_coa_file' === $key ) ? esc_url_raw( $raw ) : sanitize_text_field( $raw );

			if ( '' === $value ) {
				delete_post_meta( $post_id, $key );
			} else {
				update_post_meta( $post_id, $key, $value );
			}
		}
	}

	/**
	 * Admin list columns.
	 *
	 * @param array $columns Columns.
	 * @return array
	 */
	public static function columns( $columns ) {
		return array(
			'cb'           => isset( $columns['cb'] ) ? $columns['cb'] : '',
			'title'        => __( 'Record', 'research-commerce' ),
			'rc_lot'       => __( 'Lot', 'research-commerce' ),
			'rc_purity'    => __( 'Purity', 'research-commerce' ),
			'rc_facility'  => __( 'Facility', 'research-commerce' ),
			'rc_date'      => __( 'Tested', 'research-commerce' ),
			'rc_file'      => __( 'File', 'research-commerce' ),
		);
	}

	/**
	 * Admin column output.
	 *
	 * @param string $column  Column key.
	 * @param int    $post_id Post ID.
	 */
	public static function column_content( $column, $post_id ) {
		$map = array(
			'rc_lot'      => '_rc_coa_lot',
			'rc_purity'   => '_rc_coa_purity',
			'rc_facility' => '_rc_coa_facility',
			'rc_date'     => '_rc_coa_date',
		);

		if ( isset( $map[ $column ] ) ) {
			echo esc_html( get_post_meta( $post_id, $map[ $column ], true ) ?: '—' );
			return;
		}

		if ( 'rc_file' === $column ) {
			$file = get_post_meta( $post_id, '_rc_coa_file', true );
			if ( $file ) {
				printf( '<a href="%s" target="_blank" rel="noopener">%s</a>', esc_url( $file ), esc_html__( 'Open', 'research-commerce' ) );
			} else {
				echo '—';
			}
		}
	}

	/**
	 * Find a certificate by lot number.
	 *
	 * @param string $lot Lot number.
	 * @return array|null
	 */
	public static function find( $lot ) {
		$lot = trim( $lot );
		if ( '' === $lot ) {
			return null;
		}

		$records = get_posts( array(
			'post_type'      => self::POST_TYPE,
			'posts_per_page' => 1,
			'post_status'    => 'publish',
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => '_rc_coa_lot',
					'value'   => $lot,
					'compare' => '=',
				),
			),
		) );

		if ( $records ) {
			$id = $records[0]->ID;
			return array(
				'lot'      => get_post_meta( $id, '_rc_coa_lot', true ),
				'product'  => get_post_meta( $id, '_rc_coa_product', true ),
				'purity'   => get_post_meta( $id, '_rc_coa_purity', true ),
				'method'   => get_post_meta( $id, '_rc_coa_method', true ),
				'facility' => get_post_meta( $id, '_rc_coa_facility', true ),
				'date'     => get_post_meta( $id, '_rc_coa_date', true ),
				'file'     => get_post_meta( $id, '_rc_coa_file', true ),
			);
		}

		// Fall back to a product that lists this lot as its current stock.
		$products = get_posts( array(
			'post_type'      => 'product',
			'posts_per_page' => 1,
			'post_status'    => 'publish',
			'meta_query'     => array( // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				array(
					'key'     => '_rc_lot',
					'value'   => $lot,
					'compare' => '=',
				),
			),
		) );

		if ( $products ) {
			$id = $products[0]->ID;
			return array(
				'lot'      => $lot,
				'product'  => get_the_title( $id ),
				'purity'   => get_post_meta( $id, '_rc_purity', true ),
				'method'   => get_post_meta( $id, '_rc_test_method', true ),
				'facility' => '',
				'date'     => '',
				'file'     => get_post_meta( $id, '_rc_coa_url', true ),
			);
		}

		return null;
	}

	/**
	 * Render a result block.
	 *
	 * @param array|null $record Record.
	 * @return string
	 */
	public static function render_result( $record ) {
		if ( ! $record ) {
			return sprintf(
				'<div class="rc-lookup__result"><p class="rc-lookup__miss">%s</p></div>',
				esc_html__( 'No record found for that lot number. Check the label and try again, or email support and we will pull the paperwork manually.', 'research-commerce' )
			);
		}

		$rows = array(
			__( 'Lot', 'research-commerce' )              => $record['lot'],
			__( 'Material', 'research-commerce' )         => $record['product'],
			__( 'Purity', 'research-commerce' )           => $record['purity'],
			__( 'Method', 'research-commerce' )           => $record['method'],
			__( 'Testing facility', 'research-commerce' ) => $record['facility'],
			__( 'Test date', 'research-commerce' )        => $record['date'],
		);

		$html = '<div class="rc-lookup__result"><table><tbody>';
		foreach ( $rows as $label => $value ) {
			if ( '' === $value || null === $value ) {
				continue;
			}
			$html .= sprintf( '<tr><th>%s</th><td>%s</td></tr>', esc_html( $label ), esc_html( $value ) );
		}
		$html .= '</tbody></table>';

		if ( ! empty( $record['file'] ) ) {
			$html .= sprintf(
				'<p><a class="hx-btn hx-btn--sm rc-btn" href="%s" target="_blank" rel="noopener">%s</a></p>',
				esc_url( $record['file'] ),
				esc_html__( 'Open the certificate (PDF)', 'research-commerce' )
			);
		}

		$html .= '</div>';
		return $html;
	}

	/**
	 * [rc_coa_lookup] — lot verification tool. Works without JavaScript.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function lookup_shortcode( $atts ) {
		$atts = shortcode_atts( array(
			'title' => __( 'Verify a lot', 'research-commerce' ),
		), $atts, 'rc_coa_lookup' );

		$submitted = isset( $_GET['rc_lot'] ) ? sanitize_text_field( wp_unslash( $_GET['rc_lot'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		ob_start();
		?>
		<div class="rc-lookup" data-rc-lookup>
			<?php if ( $atts['title'] ) : ?>
				<h3 class="rc-lookup__title"><?php echo esc_html( $atts['title'] ); ?></h3>
			<?php endif; ?>

			<form class="rc-lookup__form" method="get" action="">
				<label class="screen-reader-text" for="rc-lot-input"><?php esc_html_e( 'Lot number', 'research-commerce' ); ?></label>
				<input type="text" id="rc-lot-input" name="rc_lot" value="<?php echo esc_attr( $submitted ); ?>" placeholder="<?php esc_attr_e( 'e.g. HX-24-0918', 'research-commerce' ); ?>" autocomplete="off">
				<button type="submit" class="hx-btn rc-btn"><?php esc_html_e( 'Look up', 'research-commerce' ); ?></button>
			</form>

			<p class="rc-lookup__hint"><?php esc_html_e( 'The lot number is printed on the vial label and on your packing slip.', 'research-commerce' ); ?></p>

			<div data-rc-lookup-output>
				<?php
				if ( '' !== $submitted ) {
					echo self::render_result( self::find( $submitted ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- escaped in render_result().
				}
				?>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * AJAX lookup.
	 */
	public static function ajax_lookup() {
		check_ajax_referer( 'rc_public', 'nonce' );

		$lot = isset( $_POST['lot'] ) ? sanitize_text_field( wp_unslash( $_POST['lot'] ) ) : '';

		wp_send_json_success( array(
			'html' => self::render_result( self::find( $lot ) ),
		) );
	}
}
