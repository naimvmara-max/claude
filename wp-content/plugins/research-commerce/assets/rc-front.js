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
