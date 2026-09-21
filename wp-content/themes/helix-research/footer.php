<?php
/**
 * Footer.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;
?>
</main><!-- .hx-main -->

<?php if ( is_active_sidebar( 'footer-callout' ) ) : ?>
	<section class="hx-footer-callout"><div class="hx-wrap"><?php dynamic_sidebar( 'footer-callout' ); ?></div></section>
<?php endif; ?>

<footer class="hx-footer">
	<div class="hx-wrap hx-footer__grid">
		<div class="hx-footer__brand">
			<span class="hx-logo hx-logo--footer">
				<span class="hx-logo__mark"><?php echo helix_icon( 'flask', 20 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></span>
				<span class="hx-logo__text"><?php echo esc_html( get_bloginfo( 'name' ) ); ?></span>
			</span>
			<p><?php echo wp_kses_post( helix_opt( 'footer_about' ) ); ?></p>
			<ul class="hx-footer__contact">
				<li><?php echo esc_html( helix_opt( 'footer_address' ) ); ?></li>
				<li><a href="mailto:<?php echo esc_attr( helix_opt( 'footer_email' ) ); ?>"><?php echo esc_html( helix_opt( 'footer_email' ) ); ?></a></li>
				<li><?php echo esc_html( helix_opt( 'footer_hours' ) ); ?></li>
			</ul>
		</div>

		<div class="hx-footer__col">
			<h3><?php esc_html_e( 'Catalog', 'helix-research' ); ?></h3>
			<?php
			wp_nav_menu( array(
				'theme_location' => 'footer-shop',
				'container'      => false,
				'menu_class'     => 'hx-footer__list',
				'depth'          => 1,
				'fallback_cb'    => '__return_empty_string',
			) );
			?>
		</div>

		<div class="hx-footer__col">
			<h3><?php esc_html_e( 'Documentation', 'helix-research' ); ?></h3>
			<?php
			wp_nav_menu( array(
				'theme_location' => 'footer-learn',
				'container'      => false,
				'menu_class'     => 'hx-footer__list',
				'depth'          => 1,
				'fallback_cb'    => '__return_empty_string',
			) );
			?>
		</div>

		<div class="hx-footer__col">
			<h3><?php esc_html_e( 'Policies', 'helix-research' ); ?></h3>
			<?php
			wp_nav_menu( array(
				'theme_location' => 'footer-legal',
				'container'      => false,
				'menu_class'     => 'hx-footer__list',
				'depth'          => 1,
				'fallback_cb'    => '__return_empty_string',
			) );
			?>
		</div>
	</div>

	<div class="hx-footer__legal">
		<div class="hx-wrap">
			<p class="hx-footer__ruo">
				<?php echo helix_icon( 'alert', 16 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<?php echo esc_html( helix_ruo_notice( 'long' ) ); ?>
			</p>
			<p class="hx-footer__copy">
				&copy; <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php echo esc_html( get_bloginfo( 'name' ) ); ?>.
				<?php esc_html_e( 'All rights reserved.', 'helix-research' ); ?>
			</p>
		</div>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
