/**
 * Helix Research — front-end behaviour.
 * No dependencies; everything degrades to a usable page without JS.
 */
(function () {
	'use strict';

	/* Mobile navigation ------------------------------------------------ */
	var burger = document.querySelector('.hx-burger');
	var nav = document.getElementById('hx-nav');

	if (burger && nav) {
		burger.addEventListener('click', function () {
			var open = nav.classList.toggle('is-open');
			burger.setAttribute('aria-expanded', open ? 'true' : 'false');
		});
	}

	/* Sticky add-to-cart bar on product pages -------------------------- */
	var stickyBar = document.querySelector('[data-hx-sticky]');
	var cartForm = document.querySelector('.woocommerce div.product form.cart');

	if (stickyBar && cartForm && 'IntersectionObserver' in window) {
		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				stickyBar.hidden = entry.isIntersecting;
			});
		}, { rootMargin: '-80px 0px 0px 0px' });

		observer.observe(cartForm);

		var stickyAdd = stickyBar.querySelector('[data-hx-sticky-add]');
		if (stickyAdd) {
			stickyAdd.addEventListener('click', function () {
				var submit = cartForm.querySelector('button[type="submit"], input[type="submit"]');
				var variationNeeded = cartForm.classList.contains('variations_form');

				if (variationNeeded || !submit) {
					cartForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
					return;
				}
				submit.click();
			});
		}
	}

	/* Quantity tier highlighting --------------------------------------- */
	var qtyInput = document.querySelector('form.cart .quantity input[type="number"]');
	var tierRows = document.querySelectorAll('[data-hx-tier]');

	function syncTiers() {
		if (!qtyInput || !tierRows.length) {
			return;
		}
		var qty = parseInt(qtyInput.value, 10) || 1;
		var active = null;

		tierRows.forEach(function (row) {
			row.classList.remove('is-active');
			if (qty >= parseInt(row.getAttribute('data-hx-tier'), 10)) {
				active = row;
			}
		});

		if (active) {
			active.classList.add('is-active');
		}
	}

	if (qtyInput) {
		qtyInput.addEventListener('input', syncTiers);
		syncTiers();
	}

	/* Header shadow on scroll ------------------------------------------ */
	var header = document.getElementById('hx-header');
	if (header) {
		var lastState = false;
		window.addEventListener('scroll', function () {
			var scrolled = window.scrollY > 8;
			if (scrolled !== lastState) {
				header.classList.toggle('is-scrolled', scrolled);
				lastState = scrolled;
			}
		}, { passive: true });
	}
}());
