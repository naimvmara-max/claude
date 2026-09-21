<?php
/**
 * Fallback archive template.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

get_header();

helix_page_hero(
	is_search()
		/* translators: %s: search term. */
		? sprintf( __( 'Search results for “%s”', 'helix-research' ), get_search_query() )
		: get_the_archive_title(),
	is_search() ? '' : get_the_archive_description()
);
?>

<div class="hx-wrap hx-archive">
	<?php if ( have_posts() ) : ?>
		<div class="hx-post-grid">
			<?php
			while ( have_posts() ) :
				the_post();
				?>
				<article <?php post_class( 'hx-post-card' ); ?>>
					<?php if ( has_post_thumbnail() ) : ?>
						<a class="hx-post-card__media" href="<?php the_permalink(); ?>"><?php the_post_thumbnail( 'medium_large' ); ?></a>
					<?php endif; ?>
					<h2 class="hx-post-card__title"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
					<p class="hx-post-card__meta"><?php echo esc_html( get_the_date() ); ?></p>
					<p><?php echo esc_html( get_the_excerpt() ); ?></p>
					<a class="hx-link" href="<?php the_permalink(); ?>"><?php esc_html_e( 'Read more', 'helix-research' ); ?></a>
				</article>
			<?php endwhile; ?>
		</div>
		<?php
		the_posts_pagination( array(
			'mid_size'  => 1,
			'prev_text' => __( 'Previous', 'helix-research' ),
			'next_text' => __( 'Next', 'helix-research' ),
		) );
		?>
	<?php else : ?>
		<p class="hx-empty"><?php esc_html_e( 'Nothing matched that query. Try a compound name, CAS number or lot number.', 'helix-research' ); ?></p>
		<?php get_search_form(); ?>
	<?php endif; ?>
</div>

<?php
get_footer();
