// Live-call content: objections and product cards are plain Markdown in the vault
// (wiki/objections.md, wiki/product-cards.md) so Naim can edit them in Obsidian and the
// skills can add to them. Each card is a "## Title" followed by "- Key: value" lines.
// Shared by the server and the browser demo, so it has no imports.

/**
 * @param {string} md
 * @returns {{title: string, fields: Record<string, string>}[]}
 */
export function parseCards(md) {
  const cards = [];
  let cur = null;
  for (const raw of String(md || '').split('\n')) {
    const h = raw.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1].trim(), fields: {} }; cards.push(cur); continue; }
    if (!cur) continue;
    const f = raw.match(/^\s*[-*]\s+([^:«»]{1,40}?):\s*(.+?)\s*$/);
    if (!f) continue;
    const key = f[1].trim().toLowerCase();
    cur.fields[key] = cur.fields[key] ? `${cur.fields[key]}\n${f[2]}` : f[2];
  }
  return cards;
}

/** Lower-case text with Norwegian and Swedish letters folded, for forgiving search. */
export function fold(text) {
  return String(text || '').toLowerCase()
    .replace(/[øö]/g, 'o').replace(/[æä]/g, 'a').replace(/å/g, 'a')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Cards whose title or any field contains every word of the query. */
export function searchCards(cards, query) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return cards;
  return cards.filter((c) => {
    const hay = fold(`${c.title} ${Object.values(c.fields).join(' ')}`);
    return words.every((w) => hay.includes(w));
  });
}

/**
 * Objection cards whose keywords (the "Nyckelord" line) occur in `text`, newest mention first.
 * Used while listening to a call: what the customer just said brings up the right answer.
 */
export function matchObjections(cards, text) {
  const hay = fold(text);
  const hits = [];
  for (const c of cards) {
    const words = String(c.fields.nyckelord || '').split(',').map((w) => fold(w.trim())).filter(Boolean);
    let at = -1;
    for (const w of words) at = Math.max(at, hay.lastIndexOf(w));
    if (at >= 0) hits.push({ card: c, at });
  }
  return hits.sort((a, b) => b.at - a.at).map((h) => h.card);
}
