<?php
/**
 * Homepage content below the hero.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

$hx_has_wc = class_exists( 'WooCommerce' );
?>

<?php helix_trust_strip(); ?>

<?php if ( $hx_has_wc ) : ?>
	<?php
	$hx_featured = wc_get_products( array(
		'status'   => 'publish',
		'limit'    => 1,
		'featured' => true,
		'return'   => 'ids',
	) );
	$hx_shortcode = $hx_featured
		? '[products limit="8" columns="4" visibility="featured"]'
		: '[products limit="8" columns="4" orderby="popularity"]';
	?>
	<section class="hx-section hx-section--products">
		<div class="hx-wrap">
			<?php
			helix_section_head(
				__( 'Catalog', 'helix-research' ),
				__( 'Most-ordered reference materials', 'helix-research' ),
				__( 'Each listing shows the assayed purity, the lot currently in stock and a direct link to its certificate of analysis.', 'helix-research' )
			);
			echo do_shortcode( $hx_shortcode ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WooCommerce output.
			?>
			<p class="hx-section-cta">
				<a class="hx-btn hx-btn--ghost" href="<?php echo esc_url( get_permalink( wc_get_page_id( 'shop' ) ) ); ?>">
					<?php esc_html_e( 'View the full catalog', 'helix-research' ); ?>
				</a>
			</p>
		</div>
	</section>
<?php endif; ?>

<section class="hx-section hx-section--process">
	<div class="hx-wrap">
		<?php
		helix_section_head(
			__( 'How a lot reaches your bench', 'helix-research' ),
			__( 'Documentation before dispatch, not after', 'helix-research' ),
			__( 'Nothing is listed as in stock until its analytical package is complete and published.', 'helix-research' )
		);
		?>
		<ol class="hx-steps">
			<li>
				<span class="hx-steps__num">01</span>
				<h3><?php esc_html_e( 'Synthesis and intake', 'helix-research' ); ?></h3>
				<p><?php esc_html_e( 'Material is received under lot control, logged, and quarantined until testing is complete. Nothing is blended between lots.', 'helix-research' ); ?></p>
			</li>
			<li>
				<span class="hx-steps__num">02</span>
				<h3><?php esc_html_e( 'Independent assay', 'helix-research' ); ?></h3>
				<p><?php esc_html_e( 'An external ISO/IEC 17025 laboratory runs RP-HPLC for purity and mass spectrometry for identity, plus appearance and water content checks.', 'helix-research' ); ?></p>
			</li>
			<li>
				<span class="hx-steps__num">03</span>
				<h3><?php esc_html_e( 'Certificate published', 'helix-research' ); ?></h3>
				<p><?php esc_html_e( 'The signed COA is attached to the product page and to the lot lookup tool, so you can review it before purchase.', 'helix-research' ); ?></p>
			</li>
			<li>
				<span class="hx-steps__num">04</span>
				<h3><?php esc_html_e( 'Cold-chain dispatch', 'helix-research' ); ?></h3>
				<p><?php esc_html_e( 'Vials ship sealed and desiccated with insulated packs and tracking. Orders placed before 2:00 PM CT leave the same business day.', 'helix-research' ); ?></p>
			</li>
		</ol>
	</div>
</section>

<section class="hx-section hx-section--coa">
	<div class="hx-wrap hx-coa-band">
		<div class="hx-coa-band__copy">
			<p class="hx-eyebrow"><?php esc_html_e( 'Verification', 'helix-research' ); ?></p>
			<h2><?php esc_html_e( 'Check any lot number against our records', 'helix-research' ); ?></h2>
			<p><?php esc_html_e( 'Enter the lot printed on the vial label to pull the matching certificate of analysis, test date and testing facility. Records stay available after the lot sells out.', 'helix-research' ); ?></p>
		</div>
		<div class="hx-coa-band__tool">
			<?php if ( shortcode_exists( 'rc_coa_lookup' ) ) : ?>
				<?php echo do_shortcode( '[rc_coa_lookup]' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- plugin output. ?>
			<?php else : ?>
				<p class="hx-empty"><?php esc_html_e( 'Activate the Research Commerce plugin to enable lot verification here.', 'helix-research' ); ?></p>
			<?php endif; ?>
		</div>
	</div>
</section>

<?php
$hx_terms = $hx_has_wc ? get_terms( array(
	'taxonomy'   => 'product_cat',
	'hide_empty' => true,
	'number'     => 6,
	'exclude'    => array( get_option( 'default_product_cat' ) ),
) ) : array();
?>
<?php if ( ! empty( $hx_terms ) && ! is_wp_error( $hx_terms ) ) : ?>
	<section class="hx-section hx-section--cats">
		<div class="hx-wrap">
			<?php
			helix_section_head(
				__( 'Browse by research area', 'helix-research' ),
				__( 'Catalog categories', 'helix-research' ),
				''
			);
			?>
			<div class="hx-cats">
				<?php foreach ( $hx_terms as $hx_term ) : ?>
					<a class="hx-cat" href="<?php echo esc_url( get_term_link( $hx_term ) ); ?>">
						<span class="hx-cat__name"><?php echo esc_html( $hx_term->name ); ?></span>
						<span class="hx-cat__count">
							<?php
							/* translators: %d: number of catalog items. */
							printf( esc_html( _n( '%d item', '%d items', $hx_term->count, 'helix-research' ) ), absint( $hx_term->count ) );
							?>
						</span>
						<?php echo helix_icon( 'chevron', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					</a>
				<?php endforeach; ?>
			</div>
		</div>
	</section>
<?php endif; ?>

<section class="hx-section hx-section--compare hx-section--dark">
	<div class="hx-wrap">
		<?php
		helix_section_head(
			__( 'Sourcing standards', 'helix-research' ),
			__( 'What a documented supplier looks like', 'helix-research' ),
			__( 'Use this list when you evaluate any vendor, including us. Ask for the items on the left before you place an order.', 'helix-research' )
		);
		?>
		<div class="hx-compare">
			<table>
				<caption class="screen-reader-text"><?php esc_html_e( 'Sourcing criteria comparison', 'helix-research' ); ?></caption>
				<thead>
					<tr>
						<th scope="col"><?php esc_html_e( 'Criterion', 'helix-research' ); ?></th>
						<th scope="col"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></th>
						<th scope="col"><?php esc_html_e( 'Commodity listings', 'helix-research' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<th scope="row"><?php esc_html_e( 'COA tied to the lot shipped', 'helix-research' ); ?></th>
						<td class="is-yes"><?php echo helix_icon( 'check', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php esc_html_e( 'Published per lot', 'helix-research' ); ?></td>
						<td><?php esc_html_e( 'Generic or undated PDF', 'helix-research' ); ?></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Testing laboratory named', 'helix-research' ); ?></th>
						<td class="is-yes"><?php echo helix_icon( 'check', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php esc_html_e( 'Facility and method listed', 'helix-research' ); ?></td>
						<td><?php esc_html_e( 'Unattributed results', 'helix-research' ); ?></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Storage and handling data', 'helix-research' ); ?></th>
						<td class="is-yes"><?php echo helix_icon( 'check', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php esc_html_e( 'On every product page', 'helix-research' ); ?></td>
						<td><?php esc_html_e( 'Rarely documented', 'helix-research' ); ?></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Research-use terms at checkout', 'helix-research' ); ?></th>
						<td class="is-yes"><?php echo helix_icon( 'check', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php esc_html_e( 'Required acknowledgement', 'helix-research' ); ?></td>
						<td><?php esc_html_e( 'Buried or absent', 'helix-research' ); ?></td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Institutional purchasing', 'helix-research' ); ?></th>
						<td class="is-yes"><?php echo helix_icon( 'check', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php esc_html_e( 'POs, quotes, net terms', 'helix-research' ); ?></td>
						<td><?php esc_html_e( 'Card checkout only', 'helix-research' ); ?></td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</section>

<section class="hx-section hx-section--faq">
	<div class="hx-wrap hx-faq-layout">
		<div>
			<?php
			helix_section_head(
				__( 'Questions', 'helix-research' ),
				__( 'Ordering and documentation', 'helix-research' ),
				''
			);
			?>
			<p class="hx-faq-contact">
				<?php esc_html_e( 'Need something the catalog does not list?', 'helix-research' ); ?><br>
				<a href="<?php echo esc_url( helix_page_url( 'bulk-orders' ) ); ?>"><?php esc_html_e( 'Request a custom quote →', 'helix-research' ); ?></a>
			</p>
		</div>
		<div class="hx-faq">
			<?php
			$hx_faqs = array(
				array(
					__( 'What exactly am I buying?', 'helix-research' ),
					__( 'Lyophilized reference material supplied in a sealed vial, characterized by HPLC and mass spectrometry, for use as a laboratory research chemical. It is not a drug, supplement, food or cosmetic, and it is not supplied for human or veterinary use.', 'helix-research' ),
				),
				array(
					__( 'Can I see the certificate before I order?', 'helix-research' ),
					__( 'Yes. The COA for the lot currently in stock is linked on every product page and in the lot lookup tool. If a listing has no certificate attached, it is not available for purchase.', 'helix-research' ),
				),
				array(
					__( 'How is purity determined?', 'helix-research' ),
					__( 'Reverse-phase HPLC with UV detection establishes the purity figure, and ESI mass spectrometry confirms molecular identity against the theoretical mass. The method, column, gradient and test date appear on the certificate.', 'helix-research' ),
				),
				array(
					__( 'How should material be stored on arrival?', 'helix-research' ),
					__( 'Keep vials sealed, desiccated and at -20 °C. Allow a vial to reach room temperature before opening to avoid condensation. Handling guidance for each item is on its product page.', 'helix-research' ),
				),
				array(
					__( 'Do you ship internationally?', 'helix-research' ),
					__( 'We ship to destinations where the material may lawfully be imported for laboratory use. Import compliance, permits and customs documentation are the purchaser\'s responsibility. Some destinations are restricted; the checkout will tell you before payment.', 'helix-research' ),
				),
				array(
					__( 'Can my institution pay by purchase order?', 'helix-research' ),
					__( 'Yes. Universities, hospitals and established research organizations can request net-30 terms and formal quotes through the bulk and institutional page.', 'helix-research' ),
				),
			);
			foreach ( $hx_faqs as $hx_index => $hx_faq ) :
				?>
				<details class="hx-faq__item"<?php echo 0 === $hx_index ? ' open' : ''; ?>>
					<summary><?php echo esc_html( $hx_faq[0] ); ?><?php echo helix_icon( 'chevron', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></summary>
					<div class="hx-faq__body"><p><?php echo esc_html( $hx_faq[1] ); ?></p></div>
				</details>
			<?php endforeach; ?>
		</div>
	</div>
</section>

<section class="hx-section hx-cta-band">
	<div class="hx-wrap hx-cta-band__inner">
		<div>
			<h2><?php esc_html_e( 'Bulk quantities and institutional accounts', 'helix-research' ); ?></h2>
			<p><?php esc_html_e( 'Gram-scale quantities, repeat-lot reservations, custom vialing and purchase-order billing for universities, CROs and core facilities.', 'helix-research' ); ?></p>
		</div>
		<a class="hx-btn hx-btn--lg hx-btn--light" href="<?php echo esc_url( helix_page_url( 'bulk-orders' ) ); ?>">
			<?php esc_html_e( 'Request a quote', 'helix-research' ); ?>
		</a>
	</div>
</section>
