<?php
/**
 * 404.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

get_header();
?>
<section class="hx-wrap hx-404">
	<p class="hx-eyebrow"><?php esc_html_e( 'Error 404', 'helix-research' ); ?></p>
	<h1><?php esc_html_e( 'That page is no longer on the shelf.', 'helix-research' ); ?></h1>
	<p><?php esc_html_e( 'The listing may have been renamed or retired. Search the catalog, or browse everything currently in stock.', 'helix-research' ); ?></p>
	<?php get_search_form(); ?>
	<p class="hx-404__actions">
		<?php if ( function_exists( 'wc_get_page_id' ) ) : ?>
			<a class="hx-btn" href="<?php echo esc_url( get_permalink( wc_get_page_id( 'shop' ) ) ); ?>"><?php esc_html_e( 'Browse the catalog', 'helix-research' ); ?></a>
		<?php endif; ?>
		<a class="hx-btn hx-btn--ghost" href="<?php echo esc_url( home_url( '/' ) ); ?>"><?php esc_html_e( 'Back to home', 'helix-research' ); ?></a>
	</p>
</section>
<?php
get_footer();
