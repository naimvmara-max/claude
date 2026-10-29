// Finding companies without a model: the Norwegian business register (Brønnøysund,
// Enhetsregisteret: open, no key) and a quick look at a company's own website for an existing
// chat widget and a published generic address. Everything here is public data the companies
// publish themselves, and nothing is guessed.

import dns from 'node:dns/promises';
import net from 'node:net';
import { isGenericEmail } from '../public/js/pipeline.js';

const BRREG = 'https://data.brreg.no/enhetsregisteret/api/enheter';
const UA = 'Mozilla/5.0 (compatible; Jarvis lead check; one page per company)';

/** One register entry, cut down to what the pipeline needs. */
export function normalizeEnhet(e) {
  const addr = e.forretningsadresse || e.postadresse || {};
  const email = String(e.epostadresse || '').trim().toLowerCase();
  const site = String(e.hjemmeside || '').trim();
  return {
    orgnr: String(e.organisasjonsnummer || ''),
    name: String(e.navn || '').trim(),
    form: e.organisasjonsform?.kode || '',
    industry: e.naeringskode1?.beskrivelse || '',
    industryCode: e.naeringskode1?.kode || '',
    employees: e.antallAnsatte ?? null,
    website: site ? site.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '',
    // Only a generic company mailbox may be used for cold email; a named one is dropped.
    email: isGenericEmail(email) ? email : '',
    namedEmailDropped: Boolean(email) && !isGenericEmail(email),
    phone: String(e.telefon || '').trim(),
    city: addr.poststed ? titleCase(addr.poststed) : '',
    municipality: addr.kommune ? titleCase(addr.kommune) : '',
    closed: Boolean(e.konkurs || e.underAvvikling || e.underTvangsavviklingEllerTvangsopplosning),
  };
}

function titleCase(s) {
  return String(s).toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, a, b) => a + b.toUpperCase());
}

/** The register query. ENK is never asked for (no cold email to them); bankrupt companies are dropped after. */
export function brregUrl(q = {}) {
  const p = new URLSearchParams();
  if (q.industry) p.set('naeringskode', String(q.industry).replace(/\s+/g, ''));
  if (q.municipality) p.set('kommunenummer', String(q.municipality).replace(/\D/g, ''));
  if (q.name) p.set('navn', String(q.name).trim());
  if (Number(q.min) > 0) p.set('fraAntallAnsatte', String(Number(q.min)));
  if (Number(q.max) > 0) p.set('tilAntallAnsatte', String(Number(q.max)));
  if (!q.anyForm) p.set('organisasjonsform', 'AS,ASA,DA,ANS,SA,NUF');
  p.set('size', String(Math.min(100, Math.max(1, Number(q.size) || 50))));
  if (Number(q.page) > 0) p.set('page', String(Number(q.page)));
  return `${BRREG}?${p}`;
}

async function getEnheter(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, { headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`Brønnøysund svarade ${res.status}`);
    const data = await res.json();
    return { raw: data?._embedded?.enheter || [], page: data?.page || {} };
  } catch (err) {
    throw Object.assign(new Error(`Kunde inte nå Brønnøysundregistret: ${err.message}`), { status: 502 });
  }
}

const codeCache = new Map();

/**
 * Which industry code companies with these words in their name have, most common first,
 * keeping only codes whose description matches `match`. The register moved to SN2025 in
 * 2025 and old codes changed meaning (47.910 is no longer web shops), so Jarvis reads the
 * current code from the register instead of trusting a fixed list.
 */
export async function industryCodes(words, { match = '', fetchImpl = fetch } = {}) {
  const key = `${words.join('|')}#${match}`;
  if (codeCache.has(key)) return codeCache.get(key);
  const tally = new Map();
  for (const w of words) {
    const { raw } = await getEnheter(brregUrl({ name: w, size: 100, anyForm: true }), fetchImpl);
    for (const e of raw) {
      const k = e.naeringskode1?.kode;
      if (!k) continue;
      const t = tally.get(k) || { code: k, description: e.naeringskode1.beskrivelse || '', n: 0 };
      t.n += 1;
      tally.set(k, t);
    }
  }
  const re = match ? new RegExp(match, 'i') : null;
  const codes = [...tally.values()].filter((t) => !re || re.test(t.description)).sort((a, b) => b.n - a.n).slice(0, 6);
  if (codes.length) codeCache.set(key, codes);
  return codes;
}

/**
 * Search the register. `q` holds an industry preset id or a word of your own (Jarvis finds
 * the code), or an exact code, plus municipality, size and a word in the name. `existing` is
 * the set of company names already in the pipeline (lower case).
 */
export async function searchBrreg(q, { existing = new Set(), fetchImpl = fetch, presets = [] } = {}) {
  const preset = presets.find((x) => x.id === q.preset);
  const word = String(q.word || '').trim();
  let code = String(q.industry || '').trim();
  let names = q.name ? [String(q.name).trim()] : [];
  let resolved = null;
  if (!code && preset?.mode === 'name') {
    names = preset.words;
    resolved = { by: preset.words.join(', '), mode: 'name' };
  } else if (!code && (preset || word)) {
    const words = preset ? preset.words : [word];
    const codes = await industryCodes(words, { match: preset?.match || '', fetchImpl });
    if (codes.length) {
      code = codes[0].code;
      resolved = { by: words.join(', '), code, description: codes[0].description, n: codes[0].n, alternatives: codes.slice(1, 5) };
    } else {
      names = words;
      resolved = { by: words.join(', '), mode: 'name', none: true };
    }
  }
  if (!code && !names.length) throw Object.assign(new Error('Välj en bransch, skriv ett eget ord eller ett ord i namnet.'), { status: 400 });

  // One search per name word (or one by code), merged by organisation number.
  const searches = names.length ? names.map((n) => ({ ...q, industry: code, name: n })) : [{ ...q, industry: code, name: '' }];
  const seen = new Map();
  let total = 0;
  let page = { number: 0, totalPages: 1 };
  for (const s of searches) {
    const r = await getEnheter(brregUrl(s), fetchImpl);
    total += r.page.totalElements ?? r.raw.length;
    if ((r.page.totalPages ?? 1) > (page.totalPages ?? 1)) page = r.page;
    for (const e of r.raw) if (!seen.has(e.organisasjonsnummer)) seen.set(e.organisasjonsnummer, e);
  }
  const min = Number(q.min) || 0;
  const max = Number(q.max) || 0;
  const skipped = { enk: 0, closed: 0, existing: 0, size: 0, namedEmail: 0 };
  const results = [...seen.values()].map(normalizeEnhet).filter((r) => {
    if (r.form === 'ENK') { skipped.enk += 1; return false; }
    if (r.closed) { skipped.closed += 1; return false; }
    if (existing.has(r.name.toLowerCase())) { skipped.existing += 1; return false; }
    // The register filters on size too; this keeps it right if it ever ignores the filter.
    if (r.employees != null && ((min && r.employees < min) || (max && r.employees > max))) { skipped.size += 1; return false; }
    if (r.namedEmailDropped) skipped.namedEmail += 1;
    return true;
  });
  return { total, page: page.number ?? 0, pages: page.totalPages ?? 1, results, skipped, resolved, code };
}

// ---------------------------------------------------------------- website check

/** Chat and help-desk widgets, found by the scripts they load. */
export const CHAT_WIDGETS = [
  ['Intercom', /widget\.intercom\.io|intercomcdn\.com|intercomSettings/i],
  ['Zendesk', /static\.zdassets\.com|zopim\.com|zendesk\.com\/embeddable/i],
  ['Tidio', /code\.tidio\.co|tidiochat/i],
  ['LiveChat', /cdn\.livechatinc\.com|livechatinc\.com\/tracking/i],
  ['HubSpot chat', /js\.hs-scripts\.com|js\.usemessages\.com|hubspot\.com\/conversations/i],
  ['Crisp', /client\.crisp\.chat/i],
  ['Tawk.to', /embed\.tawk\.to/i],
  ['Freshchat', /wchat\.freshchat\.com|freshworks\.com\/livechat|fw-cdn\.com/i],
  ['Drift', /js\.driftt\.com|drift\.com\/include/i],
  ['Gorgias', /config\.gorgias\.chat|gorgias\.chat/i],
  ['Zoho SalesIQ', /salesiq\.zoho/i],
  ['Smartsupp', /smartsuppchat\.com|smartsupp/i],
  ['Userlike', /userlike-cdn|userlike\.com/i],
  ['LiveAgent', /ladesk\.com|liveagent/i],
  ['Help Scout', /beacon-v2\.helpscout\.net/i],
  ['Trengo', /static\.widget\.trengo\.eu|trengo/i],
  ['Puzzel', /puzzel\.com/i],
  ['Boost.ai', /boost\.ai|boostai/i],
  ['Kindly', /chat\.kindlycdn\.com|kindly\.ai/i],
  ['Messenger', /connect\.facebook\.net\/[^"']*customerchat|fb-customerchat/i],
];

const PRIVATE_V4 = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

function isPrivate(ip) {
  if (net.isIPv4(ip)) return PRIVATE_V4.some((re) => re.test(ip));
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fe80') || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.');
}

/** Only public websites on the normal ports: the Bridge never fetches the local network. */
export async function assertPublicUrl(raw, lookup = dns.lookup) {
  const text = String(raw || '').trim();
  // A bare "firma.no" gets https://; any other scheme (ftp:, file:, …) is refused below.
  let u;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`); } catch { throw Object.assign(new Error('Ogiltig webbadress.'), { status: 400 }); }
  if (!['http:', 'https:'].includes(u.protocol) || (u.port && !['80', '443'].includes(u.port)) || u.username || u.password) {
    throw Object.assign(new Error('Bara vanliga webbadresser (http/https) kan kollas.'), { status: 400 });
  }
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw Object.assign(new Error(`Hittar inte ${host}.`), { status: 400 });
  if (addrs.some((a) => isPrivate(a.address))) throw Object.assign(new Error('Den adressen pekar på ett internt nätverk och kollas inte.'), { status: 400 });
  return u;
}

async function getPage(url, { fetchImpl, lookup }) {
  let u = await assertPublicUrl(url, lookup);
  for (let hop = 0; hop < 4; hop += 1) {
    const res = await fetchImpl(u, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(9000) });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      u = await assertPublicUrl(new URL(res.headers.get('location'), u).href, lookup);
      continue;
    }
    if (!res.ok) throw new Error(`svarade ${res.status}`);
    const text = (await res.text()).slice(0, 1_500_000);
    return { url: u.href, html: text };
  }
  throw new Error('för många omdirigeringar');
}

/** What a page shows: chat widgets, generic mailboxes, phone links, a contact form, a contact page link. */
export function readPage(html, base) {
  const chat = CHAT_WIDGETS.filter(([, re]) => re.test(html)).map(([name]) => name);
  const emails = [...new Set([...html.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)].map((m) => m[0].toLowerCase()))];
  const phones = [...new Set([...html.matchAll(/href=["']tel:([^"']+)["']/gi)].map((m) => decodeURIComponent(m[1]).replace(/\s+/g, ' ').trim()))].slice(0, 3);
  const form = /<form[\s\S]{0,4000}?(type=["']email["']|name=["'][^"']*(e-?post|email|melding|message))/i.test(html);
  let contact = '';
  const link = html.match(/<a[^>]+href=["']([^"'#]+)["'][^>]*>\s*(?:<[^>]+>\s*)*(kontakt[^<]{0,20}|kundeservice|contact)/i);
  if (link) { try { const u = new URL(link[1], base); if (u.hostname === new URL(base).hostname) contact = u.href; } catch { /* bad link */ } }
  return { chat, generic: emails.filter(isGenericEmail), named: emails.filter((e) => !isGenericEmail(e)).length, phones, form, contact };
}

/**
 * Look at a company's homepage (and its contact page, if it links one) the way a visitor would.
 * Returns what to say in the opener: whether they already have chat.
 */
export async function checkSite(raw, { fetchImpl = fetch, lookup = dns.lookup } = {}) {
  const home = await getPage(raw, { fetchImpl, lookup });
  const a = readPage(home.html, home.url);
  const pages = [home.url];
  let b = null;
  if (a.contact && a.contact !== home.url) {
    try { const c = await getPage(a.contact, { fetchImpl, lookup }); b = readPage(c.html, c.url); pages.push(c.url); } catch { /* the homepage is enough */ }
  }
  const chat = [...new Set([...a.chat, ...(b?.chat || [])])];
  const generic = [...new Set([...a.generic, ...(b?.generic || [])])];
  const phones = [...new Set([...a.phones, ...(b?.phones || [])])].slice(0, 3);
  const form = a.form || Boolean(b?.form);
  const observation = chat.length
    ? `Har redan chatt (${chat.join(', ')}): fråga vad den klarar och vad som händer efter stängning.`
    : `Ingen chatt på webbplatsen${form ? ', bara kontaktformulär' : ''}${generic.length ? `, mejl till ${generic[0]}` : ''}.`;
  return { url: home.url, pages, chat, hasChat: chat.length > 0, generic, phones, form, observation };
}
