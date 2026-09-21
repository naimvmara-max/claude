<?php
/**
 * Header.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;
?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<link rel="profile" href="https://gmpg.org/xfn/11">
	<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<a class="hx-skip" href="#hx-content"><?php esc_html_e( 'Skip to content', 'helix-research' ); ?></a>

<?php helix_announcement_bar(); ?>

<header class="hx-header" id="hx-header">
	<div class="hx-wrap hx-header__inner">
		<div class="hx-header__brand">
			<?php
			if ( has_custom_logo() ) {
				the_custom_logo();
			} else {
				printf(
					'<a class="hx-logo" href="%s"><span class="hx-logo__mark">%s</span><span class="hx-logo__text">%s</span></a>',
					esc_url( home_url( '/' ) ),
					helix_icon( 'flask', 22 ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static SVG markup.
					esc_html( get_bloginfo( 'name' ) )
				);
			}
			?>
		</div>

		<button class="hx-burger" aria-expanded="false" aria-controls="hx-nav" aria-label="<?php esc_attr_e( 'Toggle menu', 'helix-research' ); ?>">
			<span></span><span></span><span></span>
		</button>

		<nav class="hx-nav" id="hx-nav" aria-label="<?php esc_attr_e( 'Primary', 'helix-research' ); ?>">
			<?php
			wp_nav_menu( array(
				'theme_location' => 'primary',
				'container'      => false,
				'menu_class'     => 'hx-nav__list',
				'depth'          => 2,
				'fallback_cb'    => 'helix_nav_fallback',
			) );
			?>
			<div class="hx-nav__mobile-extras">
				<p><?php echo esc_html( helix_opt( 'header_support' ) ); ?></p>
			</div>
		</nav>

		<div class="hx-header__actions">
			<?php if ( class_exists( 'WooCommerce' ) ) : ?>
				<form role="search" method="get" class="hx-search" action="<?php echo esc_url( home_url( '/' ) ); ?>">
					<label class="screen-reader-text" for="hx-search-field"><?php esc_html_e( 'Search the catalog', 'helix-research' ); ?></label>
					<?php echo helix_icon( 'search', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<input type="search" id="hx-search-field" name="s" value="<?php echo esc_attr( get_search_query() ); ?>" placeholder="<?php esc_attr_e( 'Search by compound or CAS…', 'helix-research' ); ?>">
					<input type="hidden" name="post_type" value="product">
				</form>

				<a class="hx-cart-link" href="<?php echo esc_url( wc_get_cart_url() ); ?>" aria-label="<?php esc_attr_e( 'View cart', 'helix-research' ); ?>">
					<?php echo helix_icon( 'cart', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<span class="hx-cart-count" data-hx-cart-count><?php echo esc_html( WC()->cart ? WC()->cart->get_cart_contents_count() : 0 ); ?></span>
				</a>
			<?php endif; ?>

			<a class="hx-btn hx-btn--sm hx-header__cta" href="<?php echo esc_url( helix_opt( 'header_cta_url' ) ); ?>">
				<?php echo esc_html( helix_opt( 'header_cta_text' ) ); ?>
			</a>
		</div>
	</div>
</header>

<main id="hx-content" class="hx-main">
