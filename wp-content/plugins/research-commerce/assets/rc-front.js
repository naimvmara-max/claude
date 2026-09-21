/**
 * Research Commerce — front-end behaviour.
 * The acknowledgement is stored in the visitor's browser only; the checkout
 * attestation is the record that matters and it is stored on the order.
 */
(function () {
	'use strict';

	var data = window.rcData || {};
	var STORAGE_KEY = 'rc_research_ack';

	function readAck() {
		try {
			var raw = window.localStorage.getItem(STORAGE_KEY);
			if (!raw) {
				return false;
			}
			return parseInt(raw, 10) > Date.now();
		} catch (e) {
			return document.cookie.indexOf(STORAGE_KEY + '=1') !== -1;
		}
	}

	function writeAck(days) {
		var expires = Date.now() + (days * 86400000);
		try {
			window.localStorage.setItem(STORAGE_KEY, String(expires));
		} catch (e) {
			document.cookie = STORAGE_KEY + '=1;path=/;max-age=' + (days * 86400) + ';SameSite=Lax';
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
				writeAck(parseInt(data.gateDays, 10) || 30);
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
