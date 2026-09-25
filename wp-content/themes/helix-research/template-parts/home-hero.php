<?php
/**
 * Homepage hero.
 *
 * @package HelixResearch
 */

defined( 'ABSPATH' ) || exit;

$hx_hero_image = helix_opt( 'hero_image' );
?>
<section class="hx-hero">
	<div class="hx-hero__glow" aria-hidden="true"></div>
	<div class="hx-wrap hx-hero__grid">
		<div class="hx-hero__copy">
			<p class="hx-eyebrow"><?php echo esc_html( helix_opt( 'hero_eyebrow' ) ); ?></p>
			<h1><?php echo wp_kses_post( helix_opt( 'hero_heading' ) ); ?></h1>
			<p class="hx-hero__sub"><?php echo wp_kses_post( helix_opt( 'hero_subheading' ) ); ?></p>

			<div class="hx-hero__actions">
				<a class="hx-btn hx-btn--lg" href="<?php echo esc_url( helix_opt( 'hero_cta_url' ) ); ?>">
					<?php echo esc_html( helix_opt( 'hero_cta_text' ) ); ?>
				</a>
				<a class="hx-btn hx-btn--ghost hx-btn--lg" href="<?php echo esc_url( helix_opt( 'hero_cta2_url' ) ); ?>">
					<?php echo helix_icon( 'document', 18 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
					<?php echo esc_html( helix_opt( 'hero_cta2_text' ) ); ?>
				</a>
			</div>

			<p class="hx-hero__note">
				<?php echo helix_icon( 'alert', 15 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
				<?php echo esc_html( helix_opt( 'hero_note' ) ); ?>
			</p>

			<ul class="hx-stats">
				<?php for ( $hx_i = 1; $hx_i <= 3; $hx_i++ ) : ?>
					<?php $hx_value = helix_opt( 'stat_' . $hx_i . '_value' ); ?>
					<?php if ( $hx_value ) : ?>
						<li>
							<strong><?php echo esc_html( $hx_value ); ?></strong>
							<span><?php echo esc_html( helix_opt( 'stat_' . $hx_i . '_label' ) ); ?></span>
						</li>
					<?php endif; ?>
				<?php endfor; ?>
			</ul>
		</div>

		<div class="hx-hero__visual">
			<?php if ( $hx_hero_image ) : ?>
				<img src="<?php echo esc_url( $hx_hero_image ); ?>" alt="" class="hx-hero__img" width="720" height="720" loading="eager">
			<?php endif; ?>

			<?php helix_hero_listing_card(); ?>
			</div>
		</div>
	</div>
</section>
