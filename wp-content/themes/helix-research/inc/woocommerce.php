<?php
/**
 * WooCommerce integration and conversion layer.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

/* -------------------------------------------------------------------------
 * Layout wrappers
 * ---------------------------------------------------------------------- */

remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 );

/**
 * Open the shop wrapper.
 */
function helix_wc_wrapper_start() {
	if ( is_shop() || is_product_taxonomy() ) {
		$title = woocommerce_page_title( false );
		$intro = is_shop()
			? __( 'Analytically characterized reference materials for laboratory research use. Purity, lot and certificate shown on every listing.', 'helix-research' )
			: '';
		helix_page_hero( wp_strip_all_tags( $title ), $intro );
	}
	echo '<div class="hx-wrap hx-shop"><div class="hx-shop__main">';
}
add_action( 'woocommerce_before_main_content', 'helix_wc_wrapper_start', 10 );

/**
 * Close the shop wrapper and print the sidebar.
 */
function helix_wc_wrapper_end() {
	echo '</div>';
	if ( ( is_shop() || is_product_taxonomy() ) && is_active_sidebar( 'shop-sidebar' ) ) {
		echo '<aside class="hx-shop__aside">';
		dynamic_sidebar( 'shop-sidebar' );
		echo '</aside>';
	}
	echo '</div>';
}
add_action( 'woocommerce_after_main_content', 'helix_wc_wrapper_end', 10 );

/**
 * Hide the duplicate archive title (the hero prints it).
 */
add_filter( 'woocommerce_show_page_title', '__return_false' );

/**
 * Grid density.
 *
 * @return int
 */
function helix_loop_columns() {
	return 3;
}
add_filter( 'loop_shop_columns', 'helix_loop_columns', 20 );

/**
 * Products per page.
 *
 * @return int
 */
function helix_products_per_page() {
	return 12;
}
add_filter( 'loop_shop_per_page', 'helix_products_per_page', 20 );

/**
 * Related products count.
 *
 * @param array $args Args.
 * @return array
 */
function helix_related_args( $args ) {
	$args['posts_per_page'] = 3;
	$args['columns']        = 3;
	return $args;
}
add_filter( 'woocommerce_output_related_products_args', 'helix_related_args', 20 );

/* -------------------------------------------------------------------------
 * Product cards
 * ---------------------------------------------------------------------- */

/**
 * Purity flag on the card image.
 */
function helix_loop_purity_flag() {
	global $product;
	if ( ! $product ) {
		return;
	}
	// Out of stock is the more useful flag, and two badges collide on a
	// narrow card — so the purity flag yields to it.
	if ( ! $product->is_in_stock() ) {
		printf( '<span class="hx-card__oos">%s</span>', esc_html__( 'Awaiting next lot', 'helix-research' ) );
		return;
	}

	$purity = get_post_meta( $product->get_id(), '_rc_purity', true );

	if ( $purity ) {
		printf( '<span class="hx-card__purity">%s %s</span>', esc_html( $purity ), esc_html__( 'HPLC', 'helix-research' ) );
		return;
	}

	// No figure recorded yet, but the lot has a published report — say so,
	// because that is the claim that matters.
	if ( function_exists( 'rc_has_coa' ) && rc_has_coa( $product->get_id() ) ) {
		printf( '<span class="hx-card__purity hx-card__purity--lab">%s</span>', esc_html__( 'Lab verified', 'helix-research' ) );
	}
}
add_action( 'woocommerce_before_shop_loop_item_title', 'helix_loop_purity_flag', 9 );

/**
 * Spec line under the card title.
 */
function helix_loop_spec_line() {
	global $product;
	if ( ! $product ) {
		return;
	}

	$bits = array();
	$cas  = get_post_meta( $product->get_id(), '_rc_cas', true );
	$form = get_post_meta( $product->get_id(), '_rc_formula', true );
	$lot  = get_post_meta( $product->get_id(), '_rc_lot', true );

	if ( $cas ) {
		$bits[] = sprintf( /* translators: %s: CAS registry number. */ __( 'CAS %s', 'helix-research' ), $cas );
	}
	if ( $form ) {
		$bits[] = $form;
	}
	if ( $lot ) {
		$bits[] = sprintf( /* translators: %s: lot number. */ __( 'Lot %s', 'helix-research' ), $lot );
	}

	if ( $bits ) {
		printf( '<p class="hx-card__spec">%s</p>', esc_html( implode( ' · ', $bits ) ) );
	}
}
add_action( 'woocommerce_after_shop_loop_item_title', 'helix_loop_spec_line', 6 );

/**
 * COA link on the card.
 */
function helix_loop_coa_link() {
	global $product;
	if ( ! $product ) {
		return;
	}
	$coa = get_post_meta( $product->get_id(), '_rc_coa_url', true );
	if ( ! $coa ) {
		return;
	}
	printf(
		'<a class="hx-card__coa" href="%s" target="_blank" rel="noopener">%s %s</a>',
		esc_url( $coa ),
		helix_icon( 'document', 15 ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup.
		esc_html__( 'View COA', 'helix-research' )
	);
}
add_action( 'woocommerce_after_shop_loop_item', 'helix_loop_coa_link', 9 );

/**
 * Cart button label.
 *
 * @param string $text Default text.
 * @return string
 */
function helix_add_to_cart_text( $text ) {
	return is_product() ? __( 'Add to order', 'helix-research' ) : $text;
}
add_filter( 'woocommerce_product_single_add_to_cart_text', 'helix_add_to_cart_text' );

/* -------------------------------------------------------------------------
 * Single product
 * ---------------------------------------------------------------------- */

/**
 * The heading shows the catalog code alone; the fill size sits above it as an
 * eyebrow and the compound below it, so the three read as one block instead of
 * one long line.
 */
function helix_single_title() {
	global $product;

	$title = get_the_title();

	if ( $product ) {
		$quantity = trim( (string) get_post_meta( $product->get_id(), '_rc_quantity', true ) );

		// Strip a trailing fill size when the eyebrow already shows it.
		if ( $quantity ) {
			$pattern = '/\s*' . preg_quote( $quantity, '/' ) . '$/i';
			$title   = preg_replace( $pattern, '', $title );

			// Also match "30mg" where the meta reads "30 mg".
			$compact = preg_replace( '/\s+/', '', $quantity );
			$title   = preg_replace( '/\s*' . preg_quote( $compact, '/' ) . '$/i', '', $title );

			// Stripping the size can leave the separator that introduced it.
			$title = rtrim( $title, " \t—–-·," );
		}
	}

	printf( '<h1 class="product_title entry-title">%s</h1>', esc_html( $title ) );
}

/**
 * Fill size above the title, the way the brand page leads.
 */
function helix_single_eyebrow() {
	global $product;
	if ( ! $product ) {
		return;
	}

	$quantity = get_post_meta( $product->get_id(), '_rc_quantity', true );
	if ( $quantity ) {
		printf( '<p class="hx-product-eyebrow">%s</p>', esc_html( $quantity ) );
	}
}
add_action( 'woocommerce_single_product_summary', 'helix_single_eyebrow', 4 );

remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_title', 5 );
add_action( 'woocommerce_single_product_summary', 'helix_single_title', 5 );

/**
 * The compound the catalog code refers to, directly under the title.
 */
function helix_single_compound() {
	global $product;
	if ( ! $product ) {
		return;
	}

	$compound = get_post_meta( $product->get_id(), '_rc_compound', true );
	if ( $compound && 0 !== strcasecmp( $compound, $product->get_name() ) ) {
		printf( '<p class="hx-product-compound">%s</p>', esc_html( $compound ) );
	}
}
add_action( 'woocommerce_single_product_summary', 'helix_single_compound', 6 );

/**
 * Research-use badge under the product title.
 */
function helix_single_ruo() {
	helix_ruo_badge();
}
add_action( 'woocommerce_single_product_summary', 'helix_single_ruo', 7 );

/**
 * The four specs a buyer checks before adding to the order. The full table
 * follows the add-to-cart form so the buy action stays above the fold.
 *
 * @return string[] Spec labels, in display order.
 */
function helix_key_spec_labels() {
	return apply_filters( 'helix_key_spec_labels', array(
		__( 'Assayed purity', 'research-commerce' ),
		__( 'Verification', 'research-commerce' ),
		__( 'Lot in stock', 'research-commerce' ),
		__( 'Quantity per vial', 'research-commerce' ),
		__( 'Physical form', 'research-commerce' ),
	) );
}

/**
 * Render a spec table.
 *
 * @param array  $specs Label => value.
 * @param string $class Extra class.
 * @param string $id    Optional element id.
 */
function helix_render_spec_table( $specs, $class = '', $id = '' ) {
	printf(
		'<div class="hx-specs %s"%s><table><tbody>',
		esc_attr( $class ),
		$id ? ' id="' . esc_attr( $id ) . '"' : ''
	);
	foreach ( $specs as $label => $value ) {
		printf(
			'<tr><th scope="row">%s</th><td>%s</td></tr>',
			esc_html( $label ),
			wp_kses_post( $value )
		);
	}
	echo '</tbody></table></div>';
}

/**
 * Condensed specs directly above the add-to-cart form.
 */
function helix_single_key_specs() {
	global $product;
	if ( ! $product || ! function_exists( 'rc_get_specs' ) ) {
		return;
	}

	$specs = rc_get_specs( $product->get_id() );
	if ( empty( $specs ) ) {
		return;
	}

	$keys = helix_key_spec_labels();
	$top  = array();
	foreach ( $keys as $label ) {
		if ( isset( $specs[ $label ] ) ) {
			$top[ $label ] = $specs[ $label ];
		}
	}

	if ( empty( $top ) ) {
		return;
	}

	helix_render_spec_table( $top, 'hx-specs--key' );

	if ( count( $specs ) > count( $top ) ) {
		printf(
			'<p class="hx-specs__more"><a href="#hx-full-specs">%s</a></p>',
			esc_html__( 'Full specifications and sequence ↓', 'helix-research' )
		);
	}
}
add_action( 'woocommerce_single_product_summary', 'helix_single_key_specs', 25 );

/**
 * The complete specification table, below the buy area.
 */
function helix_single_full_specs() {
	global $product;
	if ( ! $product || ! function_exists( 'rc_get_specs' ) ) {
		return;
	}

	$specs = rc_get_specs( $product->get_id() );
	$keys  = helix_key_spec_labels();

	foreach ( $keys as $label ) {
		unset( $specs[ $label ] );
	}

	if ( empty( $specs ) ) {
		return;
	}

	printf( '<h2 class="hx-specs__heading">%s</h2>', esc_html__( 'Full specification', 'helix-research' ) );
	helix_render_spec_table( $specs, 'hx-specs--full', 'hx-full-specs' );
}
add_action( 'woocommerce_single_product_summary', 'helix_single_full_specs', 45 );

/**
 * Reassurance list and COA button below the add-to-cart form.
 */
function helix_single_assurances() {
	global $product;
	if ( ! $product ) {
		return;
	}

	$coa = get_post_meta( $product->get_id(), '_rc_coa_url', true );

	echo '<div class="hx-assure">';

	if ( $coa ) {
		// A hosted report page is opened, not downloaded — and an independent
		// verification link is worth naming as one.
		$is_file = ! function_exists( 'rc_coa_link_type' ) || 'file' === rc_coa_link_type( $product->get_id() );
		$label   = $is_file
			? __( 'Download certificate of analysis', 'helix-research' )
			: __( 'View the independent lab report', 'helix-research' );

		printf(
			'<a class="hx-btn hx-btn--ghost hx-btn--block" href="%s" target="_blank" rel="noopener">%s %s</a>',
			esc_url( $coa ),
			helix_icon( 'document', 18 ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup.
			esc_html( $label )
		);
	}

	$items = array(
		array( 'truck', __( 'Ships same business day on orders placed before 2:00 PM CT', 'helix-research' ) ),
		array( 'snow', __( 'Insulated, desiccated packaging with tracking on every parcel', 'helix-research' ) ),
		array( 'lock', __( 'Encrypted checkout; card details never touch our servers', 'helix-research' ) ),
		array( 'shield', __( 'Lot mismatch or transit damage replaced or refunded within 30 days', 'helix-research' ) ),
	);

	echo '<ul class="hx-assure__list">';
	foreach ( $items as $item ) {
		printf(
			'<li>%s<span>%s</span></li>',
			helix_icon( $item[0], 17 ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup.
			esc_html( $item[1] )
		);
	}
	echo '</ul></div>';
}
add_action( 'woocommerce_after_add_to_cart_form', 'helix_single_assurances', 20 );

/**
 * Handling tab.
 *
 * @param array $tabs Tabs.
 * @return array
 */
function helix_product_tabs( $tabs ) {
	if ( isset( $tabs['description'] ) ) {
		$tabs['description']['title'] = __( 'Product data', 'helix-research' );
	}
	if ( isset( $tabs['reviews'] ) ) {
		$tabs['reviews']['title'] = __( 'Customer feedback', 'helix-research' );
	}

	$tabs['helix_handling'] = array(
		'title'    => __( 'Storage &amp; handling', 'helix-research' ),
		'priority' => 25,
		'callback' => 'helix_handling_tab',
	);

	$tabs['helix_terms'] = array(
		'title'    => __( 'Terms of sale', 'helix-research' ),
		'priority' => 40,
		'callback' => 'helix_terms_tab',
	);

	return $tabs;
}
add_filter( 'woocommerce_product_tabs', 'helix_product_tabs' );

/**
 * Storage and handling tab body.
 */
function helix_handling_tab() {
	global $product;

	$custom = $product ? get_post_meta( $product->get_id(), '_rc_handling', true ) : '';

	echo '<div class="hx-prose">';
	if ( $custom ) {
		echo wp_kses_post( wpautop( $custom ) );
	} else {
		echo '<ul>';
		printf( '<li>%s</li>', esc_html__( 'Store sealed vials at -20 °C, desiccated and protected from light.', 'helix-research' ) );
		printf( '<li>%s</li>', esc_html__( 'Allow vials to equilibrate to room temperature before opening to prevent condensation on the lyophilizate.', 'helix-research' ) );
		printf( '<li>%s</li>', esc_html__( 'Reconstitute with an appropriate laboratory-grade solvent; record the solvent, concentration and date on the vial.', 'helix-research' ) );
		printf( '<li>%s</li>', esc_html__( 'Avoid repeated freeze–thaw cycles; aliquot reconstituted material for single-use volumes.', 'helix-research' ) );
		printf( '<li>%s</li>', esc_html__( 'Handle with standard laboratory PPE and dispose of material according to your institution\'s chemical waste procedures.', 'helix-research' ) );
		echo '</ul>';
	}
	echo '</div>';
}

/**
 * Terms of sale tab body.
 */
function helix_terms_tab() {
	echo '<div class="hx-prose">';
	printf( '<p>%s</p>', esc_html( helix_ruo_notice( 'long' ) ) );
	printf(
		'<p>%s</p>',
		esc_html__( 'By placing an order you confirm that you are a qualified purchaser acquiring this material for laboratory research, that you will not administer it to humans or animals, and that you will not resell or repackage it for such use. Orders that indicate otherwise are cancelled and refunded.', 'helix-research' )
	);
	echo '</div>';
}

/**
 * Sticky mobile add-to-cart bar.
 */
function helix_sticky_bar() {
	if ( ! is_product() ) {
		return;
	}

	global $product;
	if ( ! $product instanceof WC_Product ) {
		return;
	}
	?>
	<div class="hx-sticky-bar" data-hx-sticky hidden>
		<div class="hx-sticky-bar__info">
			<span class="hx-sticky-bar__title"><?php echo esc_html( wp_trim_words( $product->get_name(), 5 ) ); ?></span>
			<span class="hx-sticky-bar__price"><?php echo wp_kses_post( $product->get_price_html() ); ?></span>
		</div>
		<?php if ( $product->is_in_stock() ) : ?>
			<button type="button" class="hx-btn hx-btn--sm" data-hx-sticky-add><?php esc_html_e( 'Add to order', 'helix-research' ); ?></button>
		<?php else : ?>
			<span class="hx-sticky-bar__oos"><?php esc_html_e( 'Awaiting next lot', 'helix-research' ); ?></span>
		<?php endif; ?>
	</div>
	<?php
}
add_action( 'wp_footer', 'helix_sticky_bar' );

/* -------------------------------------------------------------------------
 * Cart and checkout
 * ---------------------------------------------------------------------- */

/**
 * Free-shipping progress meter shown in the cart and drawer.
 */
function helix_free_shipping_meter() {
	if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
		return;
	}

	$threshold = (float) apply_filters( 'helix_free_shipping_threshold', (float) get_option( 'rc_free_shipping_threshold', 0 ) );
	if ( $threshold <= 0 ) {
		return;
	}

	$subtotal = (float) WC()->cart->get_displayed_subtotal();
	$progress = min( 100, ( $subtotal / $threshold ) * 100 );

	echo '<div class="hx-ship-meter">';
	if ( $subtotal >= $threshold ) {
		printf( '<p>%s %s</p>', helix_icon( 'check', 16 ), esc_html__( 'Free shipping applied to this order.', 'helix-research' ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	} else {
		printf(
			'<p>%s</p>',
			wp_kses_post( sprintf(
				/* translators: %s: formatted currency amount. */
				__( 'Add %s more to qualify for free shipping.', 'helix-research' ),
				wc_price( $threshold - $subtotal )
			) )
		);
	}
	printf(
		'<div class="hx-ship-meter__track"><span style="width:%s%%"></span></div>',
		esc_attr( number_format( $progress, 2, '.', '' ) )
	);
	echo '</div>';
}
add_action( 'woocommerce_before_cart_table', 'helix_free_shipping_meter', 5 );
add_action( 'woocommerce_before_checkout_form', 'helix_free_shipping_meter', 5 );

/**
 * Trust row under the checkout form.
 */
function helix_checkout_trust() {
	$items = array(
		array( 'lock', __( 'PCI-compliant encrypted payment', 'helix-research' ) ),
		array( 'document', __( 'COA for your lot emailed with dispatch', 'helix-research' ) ),
		array( 'truck', __( 'Tracked, insulated shipping', 'helix-research' ) ),
	);

	echo '<ul class="hx-checkout-trust">';
	foreach ( $items as $item ) {
		printf( '<li>%s<span>%s</span></li>', helix_icon( $item[0], 17 ), esc_html( $item[1] ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	}
	echo '</ul>';
}
add_action( 'woocommerce_review_order_after_submit', 'helix_checkout_trust', 20 );

/**
 * Keep the header cart badge in sync.
 *
 * @param array $fragments Fragments.
 * @return array
 */
function helix_cart_count_fragment( $fragments ) {
	ob_start();
	printf(
		'<span class="hx-cart-count" data-hx-cart-count>%s</span>',
		esc_html( WC()->cart ? WC()->cart->get_cart_contents_count() : 0 )
	);
	$fragments['span.hx-cart-count'] = ob_get_clean();
	return $fragments;
}
add_filter( 'woocommerce_add_to_cart_fragments', 'helix_cart_count_fragment' );

/**
 * Empty-cart copy that points back at the catalog.
 */
function helix_empty_cart_cta() {
	printf(
		'<p class="hx-empty-cart"><a class="hx-btn" href="%s">%s</a></p>',
		esc_url( get_permalink( wc_get_page_id( 'shop' ) ) ),
		esc_html__( 'Browse the catalog', 'helix-research' )
	);
}
add_action( 'woocommerce_cart_is_empty', 'helix_empty_cart_cta', 20 );

/**
 * A grid of catalog cards for an arbitrary list of product IDs.
 *
 * Used by the search results template. With WooCommerce active the real loop
 * template renders, so the cards are identical to the catalog; without it the
 * fallback below fires the same loop hooks, which is what the purity flag,
 * spec line and certificate link hang off.
 *
 * @param int[] $ids     Product IDs.
 * @param int   $columns Grid columns.
 */
function helix_render_product_cards( $ids, $columns = 4 ) {
	if ( ! $ids ) {
		return;
	}

	$query = new WP_Query( array(
		'post_type'           => 'product',
		'post__in'            => $ids,
		'orderby'             => 'post__in',
		'posts_per_page'      => count( $ids ),
		'ignore_sticky_posts' => true,
	) );

	if ( ! $query->have_posts() ) {
		return;
	}

	echo '<ul class="products columns-' . esc_attr( (int) $columns ) . '">';

	while ( $query->have_posts() ) {
		$query->the_post();

		if ( function_exists( 'woocommerce_template_loop_add_to_cart' ) && function_exists( 'wc_get_template_part' ) ) {
			wc_get_template_part( 'content', 'product' );
		} else {
			helix_fallback_product_card();
		}
	}

	echo '</ul>';

	wp_reset_postdata();
}

/**
 * One catalog card, for contexts where the WooCommerce loop template is not
 * available.
 */
function helix_fallback_product_card() {
	global $product;

	$product = function_exists( 'wc_get_product' ) ? wc_get_product( get_the_ID() ) : null;

	echo '<li class="product">';
	do_action( 'woocommerce_before_shop_loop_item' );
	echo '<a href="' . esc_url( get_permalink() ) . '" class="woocommerce-LoopProduct-link">';
	do_action( 'woocommerce_before_shop_loop_item_title' );

	if ( has_post_thumbnail() ) {
		the_post_thumbnail( 'woocommerce_thumbnail' );
	}

	echo '<h2 class="woocommerce-loop-product__title">' . esc_html( get_the_title() ) . '</h2>';
	do_action( 'woocommerce_after_shop_loop_item_title' );

	if ( $product ) {
		echo '<span class="price">' . wp_kses_post( $product->get_price_html() ) . '</span>';
	}

	echo '</a>';
	do_action( 'woocommerce_after_shop_loop_item' );

	if ( $product && ! function_exists( 'woocommerce_template_loop_add_to_cart' ) ) {
		if ( $product->is_in_stock() && ! $product->is_purchasable() ) {
			$label = __( 'Awaiting certificate', 'helix-research' );
		} elseif ( $product->is_in_stock() ) {
			$label = __( 'Add to order', 'helix-research' );
		} else {
			$label = __( 'Notify me', 'helix-research' );
		}

		printf( '<a href="%s" class="button add_to_cart_button">%s</a>', esc_url( get_permalink() ), esc_html( $label ) );
	}

	echo '</li>';

	$product = null;
}
