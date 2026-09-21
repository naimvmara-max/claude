<?php
/**
 * Bulk / institutional quote requests — stored as records and emailed.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * [rc_quote_form] shortcode and its handler.
 */
class RC_Quote_Form {

	const POST_TYPE = 'rc_inquiry';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_post_type' ) );
		add_shortcode( 'rc_quote_form', array( __CLASS__, 'shortcode' ) );
		add_action( 'admin_post_nopriv_rc_quote', array( __CLASS__, 'handle' ) );
		add_action( 'admin_post_rc_quote', array( __CLASS__, 'handle' ) );
		add_filter( 'manage_' . self::POST_TYPE . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::POST_TYPE . '_posts_custom_column', array( __CLASS__, 'column_content' ), 10, 2 );
	}

	/**
	 * Store inquiries so nothing is lost if email delivery fails.
	 */
	public static function register_post_type() {
		register_post_type( self::POST_TYPE, array(
			'labels'          => array(
				'name'          => __( 'Quote requests', 'research-commerce' ),
				'singular_name' => __( 'Quote request', 'research-commerce' ),
				'menu_name'     => __( 'Quote requests', 'research-commerce' ),
				'not_found'     => __( 'No quote requests yet.', 'research-commerce' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => 'edit.php?post_type=product',
			'capability_type' => 'post',
			'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			'map_meta_cap'    => true,
			'supports'        => array( 'title', 'editor' ),
			'menu_icon'       => 'dashicons-email-alt',
		) );
	}

	/**
	 * Render the form.
	 *
	 * @param array $atts Attributes.
	 * @return string
	 */
	public static function shortcode( $atts ) {
		$atts = shortcode_atts( array(
			'button' => __( 'Request a quote', 'research-commerce' ),
		), $atts, 'rc_quote_form' );

		$sent  = isset( $_GET['rc_quote'] ) ? sanitize_key( wp_unslash( $_GET['rc_quote'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

		ob_start();

		if ( 'sent' === $sent ) {
			printf(
				'<p class="rc-form__status is-ok">%s</p>',
				esc_html__( 'Request received. A quote normally comes back within one business day.', 'research-commerce' )
			);
		} elseif ( 'error' === $sent ) {
			printf(
				'<p class="rc-form__status is-error">%s</p>',
				esc_html__( 'That request could not be sent. Please check the required fields and try again.', 'research-commerce' )
			);
		}
		?>
		<form class="rc-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="rc_quote">
			<input type="hidden" name="redirect_to" value="<?php echo esc_url( get_permalink() ); ?>">
			<?php wp_nonce_field( 'rc_quote', 'rc_quote_nonce' ); ?>

			<p class="rc-honey">
				<label for="rc-website"><?php esc_html_e( 'Leave this field empty', 'research-commerce' ); ?></label>
				<input type="text" id="rc-website" name="rc_website" tabindex="-1" autocomplete="off">
			</p>

			<div class="rc-form__row">
				<label for="rc-name"><?php esc_html_e( 'Contact name', 'research-commerce' ); ?> *</label>
				<input type="text" id="rc-name" name="rc_name" required>
			</div>

			<div class="rc-form__row">
				<label for="rc-org"><?php esc_html_e( 'Institution or company', 'research-commerce' ); ?> *</label>
				<input type="text" id="rc-org" name="rc_org" required>
			</div>

			<div class="rc-form__row">
				<label for="rc-email"><?php esc_html_e( 'Work email', 'research-commerce' ); ?> *</label>
				<input type="email" id="rc-email" name="rc_email" required>
				<span class="rc-form__note"><?php esc_html_e( 'Institutional addresses receive net-terms pricing.', 'research-commerce' ); ?></span>
			</div>

			<div class="rc-form__row">
				<label for="rc-role"><?php esc_html_e( 'Role', 'research-commerce' ); ?></label>
				<select id="rc-role" name="rc_role">
					<option value="researcher"><?php esc_html_e( 'Principal investigator / researcher', 'research-commerce' ); ?></option>
					<option value="lab-manager"><?php esc_html_e( 'Laboratory manager', 'research-commerce' ); ?></option>
					<option value="procurement"><?php esc_html_e( 'Procurement / purchasing', 'research-commerce' ); ?></option>
					<option value="cro"><?php esc_html_e( 'CRO / contract laboratory', 'research-commerce' ); ?></option>
					<option value="other"><?php esc_html_e( 'Other', 'research-commerce' ); ?></option>
				</select>
			</div>

			<div class="rc-form__row">
				<label for="rc-items"><?php esc_html_e( 'Materials and quantities required', 'research-commerce' ); ?> *</label>
				<textarea id="rc-items" name="rc_items" required placeholder="<?php esc_attr_e( 'e.g. 5 × 10 mg of catalog item HX-104, plus 1 g bulk of HX-220. Note any purity or documentation requirements.', 'research-commerce' ); ?>"></textarea>
			</div>

			<div class="rc-form__row">
				<label>
					<input type="checkbox" name="rc_ack" value="1" required>
					<?php echo esc_html( rc_ruo_notice( 'checkout' ) ); ?> *
				</label>
			</div>

			<div class="rc-form__row">
				<button type="submit" class="hx-btn rc-btn"><?php echo esc_html( $atts['button'] ); ?></button>
			</div>

			<p class="rc-form__note"><?php echo esc_html( rc_ruo_notice( 'short' ) ); ?></p>
		</form>
		<?php
		return ob_get_clean();
	}

	/**
	 * Process the submission.
	 */
	public static function handle() {
		$redirect = isset( $_POST['redirect_to'] ) ? esc_url_raw( wp_unslash( $_POST['redirect_to'] ) ) : home_url( '/' );

		if ( ! isset( $_POST['rc_quote_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['rc_quote_nonce'] ) ), 'rc_quote' ) ) {
			wp_safe_redirect( add_query_arg( 'rc_quote', 'error', $redirect ) );
			exit;
		}

		// Honeypot.
		if ( ! empty( $_POST['rc_website'] ) ) {
			wp_safe_redirect( add_query_arg( 'rc_quote', 'sent', $redirect ) );
			exit;
		}

		$name  = isset( $_POST['rc_name'] ) ? sanitize_text_field( wp_unslash( $_POST['rc_name'] ) ) : '';
		$org   = isset( $_POST['rc_org'] ) ? sanitize_text_field( wp_unslash( $_POST['rc_org'] ) ) : '';
		$email = isset( $_POST['rc_email'] ) ? sanitize_email( wp_unslash( $_POST['rc_email'] ) ) : '';
		$role  = isset( $_POST['rc_role'] ) ? sanitize_text_field( wp_unslash( $_POST['rc_role'] ) ) : '';
		$items = isset( $_POST['rc_items'] ) ? sanitize_textarea_field( wp_unslash( $_POST['rc_items'] ) ) : '';
		$ack   = ! empty( $_POST['rc_ack'] );

		if ( ! $name || ! $org || ! is_email( $email ) || ! $items || ! $ack ) {
			wp_safe_redirect( add_query_arg( 'rc_quote', 'error', $redirect ) );
			exit;
		}

		$body = sprintf(
			"%s: %s\n%s: %s\n%s: %s\n%s: %s\n\n%s:\n%s\n\n%s\n",
			__( 'Contact', 'research-commerce' ),
			$name,
			__( 'Organization', 'research-commerce' ),
			$org,
			__( 'Email', 'research-commerce' ),
			$email,
			__( 'Role', 'research-commerce' ),
			$role,
			__( 'Requested materials', 'research-commerce' ),
			$items,
			__( 'Research-use terms accepted at submission.', 'research-commerce' )
		);

		$post_id = wp_insert_post( array(
			'post_type'    => self::POST_TYPE,
			'post_status'  => 'publish',
			'post_title'   => sprintf( '%s — %s', $org, $name ),
			'post_content' => $body,
		) );

		if ( $post_id && ! is_wp_error( $post_id ) ) {
			update_post_meta( $post_id, '_rc_email', $email );
			update_post_meta( $post_id, '_rc_org', $org );
			update_post_meta( $post_id, '_rc_role', $role );
		}

		$to = get_option( 'rc_quote_email', get_option( 'admin_email' ) );
		wp_mail(
			$to,
			/* translators: %s: organization name. */
			sprintf( __( 'Quote request — %s', 'research-commerce' ), $org ),
			$body,
			array( 'Reply-To: ' . $email )
		);

		wp_safe_redirect( add_query_arg( 'rc_quote', 'sent', $redirect ) );
		exit;
	}

	/**
	 * Admin columns.
	 *
	 * @param array $columns Columns.
	 * @return array
	 */
	public static function columns( $columns ) {
		return array(
			'cb'       => isset( $columns['cb'] ) ? $columns['cb'] : '',
			'title'    => __( 'Request', 'research-commerce' ),
			'rc_email' => __( 'Email', 'research-commerce' ),
			'rc_role'  => __( 'Role', 'research-commerce' ),
			'date'     => __( 'Received', 'research-commerce' ),
		);
	}

	/**
	 * Admin column output.
	 *
	 * @param string $column  Column.
	 * @param int    $post_id Post ID.
	 */
	public static function column_content( $column, $post_id ) {
		if ( 'rc_email' === $column ) {
			$email = get_post_meta( $post_id, '_rc_email', true );
			if ( $email ) {
				printf( '<a href="mailto:%1$s">%1$s</a>', esc_attr( $email ) );
			}
		}

		if ( 'rc_role' === $column ) {
			echo esc_html( get_post_meta( $post_id, '_rc_role', true ) ?: '—' );
		}
	}
}
