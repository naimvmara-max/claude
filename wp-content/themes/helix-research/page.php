<?php
/**
 * Single page.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

get_header();

while ( have_posts() ) :
	the_post();
	helix_page_hero( get_the_title(), has_excerpt() ? get_the_excerpt() : '' );
	?>
	<article <?php post_class( 'hx-wrap hx-prose hx-page' ); ?>>
		<?php
		the_content();
		wp_link_pages( array(
			'before' => '<nav class="hx-page-links">',
			'after'  => '</nav>',
		) );
		?>
	</article>
	<?php
endwhile;

get_footer();
