<?php
/**
 * Search form.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;
?>
<form role="search" method="get" class="hx-searchform" action="<?php echo esc_url( home_url( '/' ) ); ?>">
	<label class="screen-reader-text" for="hx-s-<?php echo esc_attr( wp_unique_id() ); ?>"><?php esc_html_e( 'Search', 'helix-research' ); ?></label>
	<input type="search" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="<?php esc_attr_e( 'Compound, CAS or lot number…', 'helix-research' ); ?>">
	<button type="submit" class="hx-btn hx-btn--sm"><?php esc_html_e( 'Search', 'helix-research' ); ?></button>
</form>
