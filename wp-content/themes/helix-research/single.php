<?php
/**
 * Single post.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	helix_page_hero( get_the_title(), get_the_date() );
	?>
	<article <?php post_class( 'hx-wrap hx-prose hx-page' ); ?>>
		<?php if ( has_post_thumbnail() ) : ?>
			<figure class="hx-post__media"><?php the_post_thumbnail( 'large' ); ?></figure>
		<?php endif; ?>
		<?php the_content(); ?>
		<p class="hx-post__ruo"><?php echo esc_html( helix_ruo_notice( 'long' ) ); ?></p>
	</article>
	<?php
	if ( comments_open() || get_comments_number() ) {
		echo '<div class="hx-wrap hx-prose">';
		comments_template();
		echo '</div>';
	}
endwhile;

get_footer();
