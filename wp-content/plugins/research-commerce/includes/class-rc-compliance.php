<?php
/**
 * Research-use compliance layer: entry acknowledgement, checkout attestation,
 * order records and an editorial guard for product copy.
 *
 * @package ResearchCommerce
 */

defined( 'ABSPATH' ) || exit;

/**
 * Compliance features.
 */
class RC_Compliance {

	const ACK_META = '_rc_research_ack';

	/**
	 * Hooks.
	 */
	public static function init() {
		add_action( 'wp_footer', array( __CLASS__, 'render_gate' ), 5 );

		add_action( 'woocommerce_review_order_before_submit', array( __CLASS__, 'checkout_field' ), 9 );
		add_action( 'woocommerce_checkout_process', array( __CLASS__, 'validate_checkout' ) );
		add_action( 'woocommerce_checkout_create_order', array( __CLASS__, 'store_ack' ), 10, 2 );
		add_action( 'woocommerce_admin_order_data_after_billing_address', array( __CLASS__, 'admin_order_ack' ) );
		add_action( 'woocommerce_email_after_order_table', array( __CLASS__, 'email_notice' ), 20, 4 );

		add_action( 'woocommerce_before_single_product', array( __CLASS__, 'product_page_notice' ), 5 );
		add_action( 'woocommerce_before_cart', array( __CLASS__, 'cart_notice' ), 5 );

		add_action( 'save_post_product', array( __CLASS__, 'scan_product_copy' ), 20, 2 );
		add_action( 'admin_notices', array( __CLASS__, 'copy_warning_notice' ) );
	}

	/**
	 * The first-visit acknowledgement modal.
	 */
	public static function render_gate() {
		if ( ! get_option( 'rc_gate_enabled', 1 ) || is_admin() ) {
			return;
		}

		$heading = get_option( 'rc_gate_heading', __( 'Confirm research use before you continue', 'research-commerce' ) );
		?>
		<div class="rc-gate" data-rc-gate hidden role="dialog" aria-modal="true" aria-labelledby="rc-gate-title">
			<div class="rc-gate__box">
				<h2 id="rc-gate-title"><?php echo esc_html( $heading ); ?></h2>
				<p><?php echo esc_html( rc_ruo_notice( 'long' ) ); ?></p>

				<ul class="rc-gate__list">
					<li><?php esc_html_e( 'I am at least 21 years old and legally able to purchase laboratory chemicals in my jurisdiction.', 'research-commerce' ); ?></li>
					<li><?php esc_html_e( 'I am acquiring these materials for in-vitro laboratory research or analytical reference use only.', 'research-commerce' ); ?></li>
					<li><?php esc_html_e( 'I will not administer them to humans or animals, and I will not resell or repackage them for such use.', 'research-commerce' ); ?></li>
					<li><?php esc_html_e( 'I accept responsibility for safe handling, storage and disposal under my institution\'s procedures.', 'research-commerce' ); ?></li>
				</ul>

				<div class="rc-gate__actions">
					<button type="button" class="hx-btn rc-btn" data-rc-gate-accept><?php esc_html_e( 'I confirm — enter the site', 'research-commerce' ); ?></button>
					<button type="button" class="rc-gate__decline" data-rc-gate-decline><?php esc_html_e( 'I do not agree', 'research-commerce' ); ?></button>
				</div>

				<p class="rc-gate__fine"><?php esc_html_e( 'Your confirmation is stored in your browser only. Nothing on this site is a drug, supplement or medical device, and no product is offered for human or veterinary use.', 'research-commerce' ); ?></p>
			</div>
		</div>
		<?php
	}

	/**
	 * Required attestation checkbox at checkout.
	 */
	public static function checkout_field() {
		echo '<div class="rc-ack">';
		woocommerce_form_field( 'rc_research_ack', array(
			'type'     => 'checkbox',
			'class'    => array( 'form-row', 'rc-ack__row' ),
			'label'    => rc_ruo_notice( 'checkout' ),
			'required' => true,
		), WC()->checkout()->get_value( 'rc_research_ack' ) );
		echo '</div>';
	}

	/**
	 * Block checkout when the attestation is missing.
	 */
	public static function validate_checkout() {
		// Nonce is verified by WooCommerce before this hook runs.
		if ( empty( $_POST['rc_research_ack'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			wc_add_notice(
				__( 'Please confirm the research-use terms before placing your order.', 'research-commerce' ),
				'error'
			);
		}
	}

	/**
	 * Record the attestation on the order.
	 *
	 * @param WC_Order $order Order.
	 * @param array    $data  Posted data.
	 */
	public static function store_ack( $order, $data ) {
		if ( ! empty( $_POST['rc_research_ack'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Missing
			$order->update_meta_data( self::ACK_META, array(
				'text' => rc_ruo_notice( 'checkout' ),
				'time' => current_time( 'mysql' ),
				'ip'   => isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '',
			) );
		}
	}

	/**
	 * Show the attestation on the admin order screen.
	 *
	 * @param WC_Order $order Order.
	 */
	public static function admin_order_ack( $order ) {
		$ack = $order->get_meta( self::ACK_META );
		if ( ! $ack || ! is_array( $ack ) ) {
			return;
		}

		echo '<div class="rc-order-ack" style="clear:both;padding-top:12px">';
		printf( '<h4>%s</h4>', esc_html__( 'Research-use attestation', 'research-commerce' ) );
		printf( '<p style="margin:0"><strong>%s</strong><br>', esc_html__( 'Accepted', 'research-commerce' ) );
		printf(
			'%s<br><em>%s — %s</em></p>',
			esc_html( $ack['text'] ),
			esc_html( $ack['time'] ),
			esc_html( $ack['ip'] )
		);
		echo '</div>';
	}

	/**
	 * Append the notice to WooCommerce emails.
	 *
	 * @param WC_Order $order         Order.
	 * @param bool     $sent_to_admin Admin copy.
	 * @param bool     $plain_text    Plain text.
	 * @param WC_Email $email         Email object.
	 */
	public static function email_notice( $order, $sent_to_admin, $plain_text, $email ) {
		$text = rc_ruo_notice( 'long' );

		if ( $plain_text ) {
			echo "\n" . esc_html( $text ) . "\n";
			return;
		}

		printf(
			'<p style="font-size:12px;color:#777;border-top:1px solid #eee;padding-top:12px;margin-top:18px">%s</p>',
			esc_html( $text )
		);
	}

	/**
	 * Notice above the product summary.
	 */
	public static function product_page_notice() {
		if ( current_theme_supports( 'research-commerce' ) ) {
			return; // The theme prints its own badge.
		}
		printf( '<p class="rc-ruo">%s</p>', esc_html( rc_ruo_notice( 'short' ) ) );
	}

	/**
	 * Notice at the top of the cart.
	 */
	public static function cart_notice() {
		printf( '<p class="rc-ruo rc-ruo--cart">%s</p>', esc_html( rc_ruo_notice( 'short' ) ) );
	}

	/**
	 * Terms that do not belong in research-material copy. Used to warn the
	 * editor — it never blocks saving.
	 *
	 * @return string[]
	 */
	public static function flagged_terms() {
		$terms = array(
			'dosage', 'dose', 'dosing', 'mg/kg', 'per day', 'daily use', 'cycle length',
			'inject', 'injection', 'subcutaneous', 'intramuscular', 'oral use',
			'consume', 'consumption', 'ingest', 'supplement', 'prescription',
			'treat', 'treatment', 'cure', 'heal', 'therapy', 'therapeutic',
			'weight loss', 'fat loss', 'muscle growth', 'anti-aging', 'anti aging',
			'bodybuilding', 'performance enhancement', 'results you', 'your body',
			'side effects', 'before and after', 'safe for humans', 'human use',
		);

		/**
		 * Filter the flagged-copy term list.
		 *
		 * @param string[] $terms Terms.
		 */
		return apply_filters( 'rc_flagged_terms', $terms );
	}

	/**
	 * Scan product copy on save and record any flagged terms.
	 *
	 * @param int     $post_id Product ID.
	 * @param WP_Post $post    Post.
	 */
	public static function scan_product_copy( $post_id, $post ) {
		if ( wp_is_post_revision( $post_id ) || wp_is_post_autosave( $post_id ) ) {
			return;
		}

		$haystack = strtolower( $post->post_title . ' ' . $post->post_content . ' ' . $post->post_excerpt );
		$hits     = array();

		foreach ( self::flagged_terms() as $term ) {
			if ( false !== strpos( $haystack, strtolower( $term ) ) ) {
				$hits[] = $term;
			}
		}

		if ( $hits ) {
			update_post_meta( $post_id, '_rc_copy_flags', $hits );
			set_transient( 'rc_copy_flags_' . get_current_user_id(), $hits, 60 );
		} else {
			delete_post_meta( $post_id, '_rc_copy_flags' );
		}
	}

	/**
	 * Surface the scan result to the editor.
	 */
	public static function copy_warning_notice() {
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || 'product' !== $screen->id ) {
			return;
		}

		$hits = get_transient( 'rc_copy_flags_' . get_current_user_id() );
		if ( ! $hits ) {
			return;
		}
		delete_transient( 'rc_copy_flags_' . get_current_user_id() );

		echo '<div class="notice notice-warning is-dismissible"><p><strong>';
		esc_html_e( 'Research-use copy check', 'research-commerce' );
		echo '</strong><br>';
		printf(
			/* translators: %s: comma-separated list of flagged phrases. */
			esc_html__( 'This listing contains wording that reads as consumption or outcome language: %s. Rewrite it to describe the material, its analysis and its laboratory handling only.', 'research-commerce' ),
			'<code>' . esc_html( implode( '</code>, <code>', $hits ) ) . '</code>' // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		);
		echo '</p></div>';
	}
}
