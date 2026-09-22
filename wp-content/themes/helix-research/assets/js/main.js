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

/* Copy the promo code from the announcement bar ------------------------- */
(function () {
	'use strict';

	var button = document.querySelector('[data-hx-copy]');
	if (!button) {
		return;
	}

	var hint = document.querySelector('[data-hx-copy-hint]');
	var original = hint ? hint.textContent : '';

	button.addEventListener('click', function () {
		var code = button.getAttribute('data-hx-copy');

		var done = function () {
			if (!hint) { return; }
			hint.textContent = 'Copied';
			hint.classList.add('is-copied');
			setTimeout(function () {
				hint.textContent = original;
				hint.classList.remove('is-copied');
			}, 2000);
		};

		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(code).then(done, fallback);
		} else {
			fallback();
		}

		function fallback() {
			// execCommand still works where the async clipboard API is blocked,
			// which includes some third-party iframes.
			var field = document.createElement('textarea');
			field.value = code;
			field.setAttribute('readonly', '');
			field.style.position = 'absolute';
			field.style.left = '-9999px';
			document.body.appendChild(field);
			field.select();
			try { document.execCommand('copy'); done(); } catch (e) { /* nothing to do */ }
			document.body.removeChild(field);
		}
	});
}());

/* Catalog instant search ----------------------------------------------- */
(function () {
	'use strict';

	var forms = document.querySelectorAll('[data-hx-search]');

	if (!forms.length || typeof window.helixData === 'undefined' || !helixData.searchIndex) {
		return;
	}

	var index = null;
	var loading = null;
	var strings = helixData.i18n || {};

	function load() {
		if (index) { return Promise.resolve(index); }
		if (loading) { return loading; }

		loading = fetch(helixData.searchIndex, { credentials: 'same-origin' })
			.then(function (r) { return r.ok ? r.json() : []; })
			.then(function (rows) {
				index = Array.isArray(rows) ? rows : [];
				return index;
			})
			.catch(function () { index = []; return index; });

		return loading;
	}

	// "GLP RT", "glp-rt" and "glprt" should all find GLP-RT, and an accented
	// paste should still match.
	function loose(value) {
		var text = String(value == null ? '' : value).toLowerCase();

		if (text.normalize) {
			text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
		}

		return text.replace(/[^a-z0-9]+/g, '');
	}

	function score(row, term) {
		var haystacks = [row.name, row.compound, row.sku, row.cas, row.size];
		var tight = loose(term);
		var best = 0;

		for (var i = 0; i < haystacks.length; i++) {
			var field = loose(haystacks[i]);
			if (!field || !tight) { continue; }

			var at = field.indexOf(tight);
			if (at === 0) {
				best = Math.max(best, i === 0 ? 100 : 80);
			} else if (at > 0) {
				best = Math.max(best, i === 0 ? 60 : 45);
			}
		}

		// A panel matches through the compounds it contains, so it should sit
		// just under the single vials a buyer asked for.
		if (best && String(row.compound || '').indexOf('+') > -1) {
			best -= 5;
		}

		return best;
	}

	function match(term) {
		if (!index || term.length < 2) { return []; }

		return index
			.map(function (row) { return { row: row, score: score(row, term) }; })
			.filter(function (hit) { return hit.score > 0; })
			.sort(function (a, b) { return b.score - a.score; })
			.slice(0, 6)
			.map(function (hit) { return hit.row; });
	}

	function escape(value) {
		var node = document.createElement('span');
		node.textContent = String(value == null ? '' : value);
		return node.innerHTML;
	}

	function sprintf(template, value) {
		return String(template || '').replace('%s', escape(value));
	}

	function rowMarkup(row) {
		var sub = [row.compound, row.size].filter(Boolean).join(' · ');

		return '<a class="hx-search__hit" role="option" href="' + escape(row.url) + '">' +
			(row.thumb ? '<img src="' + escape(row.thumb) + '" alt="" width="40" height="40">' : '<span class="hx-search__hit-blank" aria-hidden="true"></span>') +
			'<span class="hx-search__hit-text">' +
				'<span class="hx-search__hit-name">' + escape(row.name) + '</span>' +
				(sub ? '<span class="hx-search__hit-sub">' + escape(sub) + '</span>' : '') +
			'</span>' +
			(row.price ? '<span class="hx-search__hit-price">' + escape(row.price) + '</span>' : '') +
		'</a>';
	}

	forms.forEach(function (form) {
		var input = form.querySelector('input[type="search"]');
		var panel = form.querySelector('.hx-search__panel');

		if (!input || !panel) { return; }

		var active = -1;
		var hits = [];

		function close() {
			panel.hidden = true;
			panel.innerHTML = '';
			input.setAttribute('aria-expanded', 'false');
			active = -1;
			hits = [];
		}

		function highlight(next) {
			var links = panel.querySelectorAll('.hx-search__hit');
			if (!links.length) { return; }

			active = (next + links.length) % links.length;

			for (var i = 0; i < links.length; i++) {
				links[i].classList.toggle('is-active', i === active);
			}

			links[active].scrollIntoView({ block: 'nearest' });
		}

		function render(term) {
			hits = match(term);

			if (term.length < 2) { close(); return; }

			var html = '';

			if (hits.length) {
				html += hits.map(rowMarkup).join('');
			} else {
				html += '<p class="hx-search__none">' + escape(strings.noResults || 'No match in the catalog') + '</p>';
			}

			// A static preview has no results page to link to.
			if (!window.helixStaticSearch) {
				html += '<a class="hx-search__all" href="' + escape(helixData.searchUrl + '?s=' + encodeURIComponent(term)) + '">' +
					sprintf(hits.length ? strings.seeAll : strings.journal, term) +
				'</a>';
			}

			panel.innerHTML = html;
			panel.hidden = false;
			input.setAttribute('aria-expanded', 'true');
			active = -1;
		}

		input.addEventListener('input', function () {
			var term = input.value.trim();

			if (term.length < 2) { close(); return; }

			load().then(function () { render(input.value.trim()); });
		});

		input.addEventListener('focus', function () {
			load();
			if (input.value.trim().length >= 2) { render(input.value.trim()); }
		});

		input.addEventListener('keydown', function (event) {
			if (panel.hidden) { return; }

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				highlight(active + 1);
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				highlight(active - 1);
			} else if (event.key === 'Escape') {
				close();
			} else if (event.key === 'Enter' && active > -1) {
				var links = panel.querySelectorAll('.hx-search__hit');
				if (links[active]) {
					event.preventDefault();
					window.location.href = links[active].getAttribute('href');
				}
			}
		});

		// A static preview has no server to run the results page, so send a
		// bare Enter to the single best match instead of a dead URL.
		form.addEventListener('submit', function (event) {
			if (window.helixStaticSearch && hits.length) {
				event.preventDefault();
				window.location.href = hits[0].url;
			}
		});

		document.addEventListener('click', function (event) {
			if (!form.contains(event.target)) { close(); }
		});
	});
}());
