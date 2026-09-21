<?php
/**
 * Template Name: Storefront Home
 * Description: The full conversion-optimized homepage — hero, trust strip, featured catalog, process, COA lookup, categories, standards table, FAQ and quote CTA.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

get_header();

get_template_part( 'template-parts/home', 'hero' );

while ( have_posts() ) {
	the_post();
	$hx_content = trim( get_the_content() );
	if ( $hx_content ) {
		echo '<section class="hx-section hx-section--editor"><div class="hx-wrap hx-prose">';
		the_content();
		echo '</div></section>';
	}
}

get_template_part( 'template-parts/home', 'sections' );

get_footer();
