<?php
/**
 * Search results.
 *
 * Catalog listings are titled by code (GLP-RT), so a search for a compound
 * name matches through the plugin's meta search. Products are shown first, as
 * catalog cards; journal articles and pages follow underneath.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

get_header();

$helix_term = get_search_query();

helix_page_hero(
	/* translators: %s: search term. */
	sprintf( __( 'Search results for “%s”', 'helix-research' ), $helix_term ),
	''
);

$helix_products = array();
$helix_reading  = array();

if ( have_posts() ) {
	while ( have_posts() ) {
		the_post();

		if ( 'product' === get_post_type() ) {
			$helix_products[] = get_the_ID();
		} else {
			$helix_reading[] = get_the_ID();
		}
	}
	rewind_posts();
}
?>

<div class="hx-wrap hx-archive hx-search-results">
	<?php if ( ! $helix_products && ! $helix_reading ) : ?>
		<p class="hx-empty"><?php esc_html_e( 'Nothing matched that query. Try a compound name, catalog code, CAS number or lot number.', 'helix-research' ); ?></p>
		<?php get_search_form(); ?>

		<?php
		$helix_suggest = get_posts( array(
			'post_type'      => 'product',
			'posts_per_page' => 4,
			'orderby'        => 'menu_order title',
			'order'          => 'ASC',
			'fields'         => 'ids',
		) );

		if ( $helix_suggest ) :
			?>
			<h2 class="hx-search-results__heading"><?php esc_html_e( 'From the catalog', 'helix-research' ); ?></h2>
			<?php helix_render_product_cards( $helix_suggest ); ?>
		<?php endif; ?>

	<?php else : ?>

		<?php if ( $helix_products ) : ?>
			<h2 class="hx-search-results__heading">
				<?php
				printf(
					/* translators: %d: number of catalog listings. */
					esc_html( _n( '%d catalog listing', '%d catalog listings', count( $helix_products ), 'helix-research' ) ),
					count( $helix_products )
				);
				?>
			</h2>
			<?php helix_render_product_cards( $helix_products ); ?>
		<?php endif; ?>

		<?php if ( $helix_reading ) : ?>
			<h2 class="hx-search-results__heading"><?php esc_html_e( 'From the journal', 'helix-research' ); ?></h2>
			<div class="hx-post-grid">
				<?php foreach ( $helix_reading as $helix_id ) : ?>
					<article class="hx-post-card">
						<?php if ( has_post_thumbnail( $helix_id ) ) : ?>
							<a class="hx-post-card__media" href="<?php echo esc_url( get_permalink( $helix_id ) ); ?>"><?php echo get_the_post_thumbnail( $helix_id, 'medium_large' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></a>
						<?php endif; ?>
						<h3 class="hx-post-card__title"><a href="<?php echo esc_url( get_permalink( $helix_id ) ); ?>"><?php echo esc_html( get_the_title( $helix_id ) ); ?></a></h3>
						<p class="hx-post-card__meta"><?php echo esc_html( get_the_date( '', $helix_id ) ); ?></p>
						<p><?php echo esc_html( wp_trim_words( get_the_excerpt( $helix_id ), 26 ) ); ?></p>
						<a class="hx-link" href="<?php echo esc_url( get_permalink( $helix_id ) ); ?>"><?php esc_html_e( 'Read more', 'helix-research' ); ?></a>
					</article>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>

		<?php
		the_posts_pagination( array(
			'mid_size'  => 1,
			'prev_text' => __( 'Previous', 'helix-research' ),
			'next_text' => __( 'Next', 'helix-research' ),
		) );
		?>
	<?php endif; ?>
</div>

<?php
get_footer();
