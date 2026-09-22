/**
 * Research Commerce — front-end behaviour.
 * The acknowledgement is stored in the visitor's browser only; the checkout
 * attestation is the record that matters and it is stored on the order.
 */
(function () {
	'use strict';

	var data = window.rcData || {};
	var STORAGE_KEY = 'rc_research_ack';

	// Days <= 0 means "ask once per browser session", which is what you want
	// while reviewing the site — and what some operators want in production.
	var days = parseInt(data.gateDays, 10);
	if (isNaN(days)) {
		days = 30;
	}
	var perSession = days <= 0;

	function store() {
		return perSession ? window.sessionStorage : window.localStorage;
	}

	function readAck() {
		try {
			var raw = store().getItem(STORAGE_KEY);
			if (!raw) {
				return false;
			}
			return perSession ? true : parseInt(raw, 10) > Date.now();
		} catch (e) {
			// Storage can be unavailable in a third-party iframe or with site
			// data blocked; fall back to a cookie so the gate still works.
			return document.cookie.indexOf(STORAGE_KEY + '=1') !== -1;
		}
	}

	function writeAck() {
		var expires = perSession ? 1 : Date.now() + (days * 86400000);
		try {
			store().setItem(STORAGE_KEY, String(expires));
		} catch (e) {
			document.cookie = STORAGE_KEY + '=1;path=/'
				+ (perSession ? '' : ';max-age=' + (days * 86400)) + ';SameSite=Lax';
		}
	}

	/* Research-use acknowledgement ------------------------------------- */
	var gate = document.querySelector('[data-rc-gate]');

	// ?rc_gate=reset forgets the stored confirmation, so the gate can be
	// reviewed without clearing site data. The acceptance lives in the
	// browser for the configured number of days, which is why it only
	// appears once.
	if (window.location.search.indexOf('rc_gate=reset') !== -1) {
		try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) {}
		try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
		document.cookie = STORAGE_KEY + '=;path=/;max-age=0;SameSite=Lax';
	}

	if (gate && !readAck()) {
		gate.hidden = false;
		document.documentElement.style.overflow = 'hidden';

		var accept = gate.querySelector('[data-rc-gate-accept]');
		var decline = gate.querySelector('[data-rc-gate-decline]');

		if (accept) {
			accept.focus();
			accept.addEventListener('click', function () {
				writeAck();
				gate.hidden = true;
				document.documentElement.style.overflow = '';
			});
		}

		if (decline) {
			decline.addEventListener('click', function () {
				window.location.href = data.declineUrl || 'https://www.google.com';
			});
		}

		// Keep focus inside the dialog while it is open.
		gate.addEventListener('keydown', function (event) {
			if (event.key !== 'Tab') {
				return;
			}
			var focusable = gate.querySelectorAll('button, [href], input, select, textarea');
			if (!focusable.length) {
				return;
			}
			var first = focusable[0];
			var last = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		});
	}

	/* COA lookup without a page reload --------------------------------- */
	var lookup = document.querySelector('[data-rc-lookup]');

	if (lookup && data.ajaxUrl) {
		var form = lookup.querySelector('form');
		var output = lookup.querySelector('[data-rc-lookup-output]');

		if (form && output) {
			form.addEventListener('submit', function (event) {
				var input = form.querySelector('input[name="rc_lot"]');
				if (!input || !input.value.trim()) {
					return;
				}

				event.preventDefault();
				output.setAttribute('aria-busy', 'true');

				var body = new URLSearchParams();
				body.append('action', 'rc_coa_lookup');
				body.append('nonce', data.nonce || '');
				body.append('lot', input.value.trim());

				fetch(data.ajaxUrl, {
					method: 'POST',
					credentials: 'same-origin',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
					body: body.toString()
				})
					.then(function (response) { return response.json(); })
					.then(function (payload) {
						output.innerHTML = (payload && payload.data && payload.data.html) ? payload.data.html : '';
						output.removeAttribute('aria-busy');
					})
					.catch(function () {
						// Fall back to a normal page submission.
						form.submit();
					});
			});
		}
	}
}());

/* Laboratory dilution calculator ------------------------------------- */
(function () {
	'use strict';

	var root = document.querySelector('[data-rc-calc]');
	if (!root) {
		return;
	}

	function field(name) {
		return root.querySelector('[data-rc-field="' + name + '"]');
	}

	function value(name) {
		var el = field(name);
		if (!el) {
			return 0;
		}
		var n = parseFloat(el.value);
		return isFinite(n) ? n : 0;
	}

	function out(name, text) {
		var el = root.querySelector('[data-rc-out="' + name + '"]');
		if (el) {
			el.textContent = text;
		}
	}

	/**
	 * Trim a number to a sensible number of significant figures for the bench:
	 * small volumes need decimals, large concentrations do not.
	 */
	function fmt(n, unit) {
		if (!isFinite(n) || n <= 0) {
			return '—';
		}
		var decimals = n >= 100 ? 1 : (n >= 10 ? 2 : (n >= 1 ? 3 : 4));
		var text = n.toFixed(decimals).replace(/\.?0+$/, '');
		return text + ' ' + unit;
	}

	function recalc() {
		// Panel 1 — solvent volume to concentration.
		var content = value('content');
		var net = value('net') || 100;
		var volume = value('volume');
		var weight = value('weight');

		var mass = content * (net / 100);
		out('mass', fmt(mass, 'mg'));

		var conc = volume > 0 ? mass / volume : 0;
		out('conc', conc > 0 ? fmt(conc, 'mg/mL') + '  (' + fmt(conc, 'µg/µL') + ')' : '—');

		if (weight > 0 && conc > 0) {
			// mg/mL is g/L, so molarity = (g/L) / (g/mol).
			var molar = conc / weight;
			out('molarity', molar >= 0.001 ? fmt(molar * 1000, 'mM') : fmt(molar * 1e6, 'µM'));
		} else {
			out('molarity', '— add molecular weight');
		}

		// Panel 2 — target concentration to solvent volume.
		var tContent = value('t-content');
		var tNet = value('t-net') || 100;
		var tTarget = value('t-target');
		var tMass = tContent * (tNet / 100);

		out('t-mass', fmt(tMass, 'mg'));
		out('t-volume', tTarget > 0 ? fmt(tMass / tTarget, 'mL') : '—');

		// Panel 3 — C1V1 = C2V2.
		var stock = value('d-stock');
		var target = value('d-target');
		var finalVol = value('d-final');

		if (stock > 0 && target > 0 && finalVol > 0 && target <= stock) {
			var take = (target * finalVol) / stock;
			out('d-stock-vol', fmt(take, 'mL') + '  (' + fmt(take * 1000, 'µL') + ')');
			out('d-diluent', fmt(finalVol - take, 'mL'));
			out('d-factor', '1:' + (stock / target).toFixed(1).replace(/\.0$/, ''));
		} else {
			out('d-stock-vol', target > stock ? 'Cannot be stronger than what you have' : '—');
			out('d-diluent', '—');
			out('d-factor', '—');
		}
	}

	root.addEventListener('input', recalc);

	root.querySelectorAll('[data-rc-tab]').forEach(function (tab) {
		tab.addEventListener('click', function () {
			var name = tab.getAttribute('data-rc-tab');

			root.querySelectorAll('[data-rc-tab]').forEach(function (t) {
				var active = t === tab;
				t.classList.toggle('is-active', active);
				t.setAttribute('aria-selected', active ? 'true' : 'false');
			});

			root.querySelectorAll('[data-rc-panel]').forEach(function (panel) {
				panel.classList.toggle('is-active', panel.getAttribute('data-rc-panel') === name);
			});
		});
	});

	recalc();
}());

/* Quantity bundles ----------------------------------------------------- */
(function () {
	'use strict';

	var wrap = document.querySelector('[data-rc-bundles]');
	if (!wrap) {
		return;
	}

	var qty = document.querySelector('form.cart .quantity input[type="number"]');

	wrap.addEventListener('change', function (event) {
		var input = event.target;
		if (!input || input.name !== 'rc_bundle') {
			return;
		}

		wrap.querySelectorAll('.rc-bundle').forEach(function (card) {
			card.classList.toggle('is-selected', card.contains(input));
		});

		if (qty) {
			qty.value = input.value;
			// Let the tier table and anything else listening react.
			qty.dispatchEvent(new Event('input', { bubbles: true }));
			qty.dispatchEvent(new Event('change', { bubbles: true }));
		}
	});

	// Typing in the quantity field directly should keep the cards honest.
	if (qty) {
		qty.addEventListener('input', function () {
			var value = parseInt(qty.value, 10);
			var match = wrap.querySelector('input[name="rc_bundle"][value="' + value + '"]');

			wrap.querySelectorAll('.rc-bundle').forEach(function (card) {
				var radio = card.querySelector('input[name="rc_bundle"]');
				var selected = !!match && radio === match;
				card.classList.toggle('is-selected', selected);
				radio.checked = selected;
			});
		});
	}
}());

/* Panel builder ---------------------------------------------------------- */
(function () {
	'use strict';

	document.querySelectorAll('[data-rc-builder]').forEach(function (root) {
		var boxes = Array.prototype.slice.call(root.querySelectorAll('input[name="rc_stack[]"]'));
		var lines = root.querySelector('[data-rc-lines]');
		var count = root.querySelector('[data-rc-count]');
		var hint = root.querySelector('[data-rc-hint]');
		var submit = root.querySelector('[data-rc-submit]');
		var subtotalOut = root.querySelector('[data-rc-subtotal]');
		var savingRow = root.querySelector('[data-rc-saving-row]');
		var savingLabel = root.querySelector('[data-rc-saving-label]');
		var savingOut = root.querySelector('[data-rc-saving]');
		var totalOut = root.querySelector('[data-rc-total]');

		if (!boxes.length || !lines) { return; }

		var tiers = [];
		try { tiers = JSON.parse(root.getAttribute('data-tiers') || '[]'); } catch (e) { tiers = []; }

		var decimals = parseInt(root.getAttribute('data-decimals'), 10);
		if (isNaN(decimals)) { decimals = 2; }
		var decimalSep = root.getAttribute('data-decimal-sep') || '.';
		var thousandSep = root.getAttribute('data-thousand-sep') || '';
		var symbol = root.getAttribute('data-currency') || '';
		var position = root.getAttribute('data-currency-position') || 'left';

		function money(amount) {
			var fixed = Math.abs(amount).toFixed(decimals);
			var parts = fixed.split('.');
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);

			var text = parts.join(parts.length > 1 ? decimalSep : '');
			var sign = amount < 0 ? '−' : '';

			if (position === 'right') { return sign + text + symbol; }
			if (position === 'right_space') { return sign + text + ' ' + symbol; }
			if (position === 'left_space') { return sign + symbol + ' ' + text; }
			return sign + symbol + text;
		}

		function percentFor(n) {
			var percent = 0;
			tiers.forEach(function (tier) {
				if (n >= tier.count) { percent = tier.percent; }
			});
			return percent;
		}

		function percentText(value) {
			return (Math.round(value * 10) / 10) + '%';
		}

		function nextHint(n) {
			for (var i = 0; i < tiers.length; i++) {
				if (n < tiers[i].count) {
					var missing = tiers[i].count - n;
					return 'Add ' + missing + (missing === 1 ? ' more compound' : ' more compounds') +
						' for ' + percentText(tiers[i].percent) + ' off.';
				}
			}
			return '';
		}

		function update() {
			var picked = boxes.filter(function (box) { return box.checked; });
			var subtotal = 0;

			lines.innerHTML = '';

			picked.forEach(function (box) {
				var price = parseFloat(box.getAttribute('data-price')) || 0;
				subtotal += price;

				var row = document.createElement('li');

				var name = document.createElement('span');
				name.className = 'rc-builder__line-name';
				name.textContent = box.getAttribute('data-name');

				var size = box.getAttribute('data-size');
				if (size) {
					var sub = document.createElement('span');
					sub.className = 'rc-builder__line-size';
					sub.textContent = '· ' + size;
					name.appendChild(sub);
				}

				var value = document.createElement('span');
				value.className = 'rc-builder__line-price';
				value.textContent = money(price);

				// Unticking from the summary is the obvious gesture once a
				// stack gets long.
				var drop = document.createElement('button');
				drop.type = 'button';
				drop.className = 'rc-builder__line-drop';
				drop.setAttribute('aria-label', 'Remove ' + box.getAttribute('data-name'));
				drop.textContent = '×';
				drop.addEventListener('click', function () {
					box.checked = false;
					update();
				});

				row.appendChild(name);
				row.appendChild(value);
				row.appendChild(drop);
				lines.appendChild(row);
			});

			var n = picked.length;
			var percent = percentFor(n);
			var saving = subtotal * percent / 100;

			if (count) {
				count.textContent = n === 0
					? 'Nothing selected yet'
					: n + (n === 1 ? ' compound' : ' compounds');
			}

			if (subtotalOut) { subtotalOut.textContent = money(subtotal); }

			if (savingRow) {
				savingRow.hidden = saving <= 0;
				if (savingLabel) { savingLabel.textContent = 'Stack discount · ' + percentText(percent); }
				if (savingOut) { savingOut.textContent = money(-saving); }
			}

			if (totalOut) { totalOut.textContent = money(subtotal - saving); }
			if (hint) { hint.textContent = nextHint(n); }
			if (submit) { submit.disabled = n === 0; }

			root.querySelectorAll('.rc-builder__item').forEach(function (item) {
				var box = item.querySelector('input[name="rc_stack[]"]');
				item.classList.toggle('is-picked', !!(box && box.checked));
			});
		}

		boxes.forEach(function (box) { box.addEventListener('change', update); });

		root.querySelectorAll('[data-rc-preset]').forEach(function (button) {
			button.addEventListener('click', function () {
				var ids = [];
				try { ids = JSON.parse(button.getAttribute('data-rc-preset') || '[]'); } catch (e) { return; }

				boxes.forEach(function (box) {
					box.checked = !box.disabled && ids.indexOf(parseInt(box.value, 10)) > -1;
				});
				update();
			});
		});

		var clear = root.querySelector('[data-rc-clear]');
		if (clear) {
			clear.addEventListener('click', function () {
				boxes.forEach(function (box) { box.checked = false; });
				update();
			});
		}

		update();
	});
}());
