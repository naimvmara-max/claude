// The vault is the shared memory: plain Markdown and JSON in an Obsidian folder.
// Every surface (HUD, Obsidian, Claude Code, Codex) reads and writes the same files.

import fs from 'node:fs';
import path from 'node:path';
import { parsePipeline, renderPipeline, computeStats, nextId, applyStatus, packageOf, COLUMNS, STAGES } from '../public/js/pipeline.js';

export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function localTime(d = new Date()) {
  return d.toTimeString().slice(0, 5);
}

export function slugify(text, max = 48) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max) || 'run';
}

export class Vault {
  constructor(root) {
    this.root = path.resolve(root);
  }

  /** Resolve a vault-relative path and refuse anything that escapes the vault. */
  resolve(rel) {
    const full = path.resolve(this.root, rel);
    if (full !== this.root && !full.startsWith(this.root + path.sep)) throw new Error('Path is outside the vault');
    return full;
  }

  read(rel, fallback = '') {
    try { return fs.readFileSync(this.resolve(rel), 'utf8'); } catch { return fallback; }
  }

  readJson(rel, fallback = null) {
    try { return JSON.parse(this.read(rel)); } catch { return fallback; }
  }

  write(rel, content) {
    const full = this.resolve(rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return rel;
  }

  writeJson(rel, data) {
    return this.write(rel, `${JSON.stringify(data, null, 2)}\n`);
  }

  append(rel, line) {
    const full = this.resolve(rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.appendFileSync(full, line);
  }

  todayNotePath(d = new Date()) {
    return `daily-notes/${localDate(d)}.md`;
  }

  /** Split a note into { heading: [lines] } on "## " headings. */
  sections(md) {
    const out = {};
    let current = '_top';
    for (const raw of md.split('\n')) {
      const h = raw.match(/^##\s+(.+?)\s*$/);
      if (h) { current = h[1].toLowerCase(); out[current] = []; continue; }
      (out[current] ||= []).push(raw);
    }
    return out;
  }

  /** List items with their line numbers so the HUD can tick them off in place. */
  listItems(file, heading) {
    const md = this.read(file);
    if (!md) return null;
    const lines = md.split('\n');
    let inSection = !heading;
    const items = [];
    lines.forEach((raw, i) => {
      const h = raw.match(/^##\s+(.+?)\s*$/);
      if (h) { inSection = heading ? h[1].toLowerCase() === heading : true; return; }
      if (!inSection) return;
      const box = raw.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/);
      const plain = raw.match(/^\s*(?:[-*]|\d+[.)])\s+(.+)$/);
      if (box) items.push({ text: box[2].trim(), done: box[1].toLowerCase() === 'x', file, line: i });
      else if (plain) items.push({ text: plain[1].trim(), done: false, file, line: i });
    });
    return items;
  }

  /**
   * Create today's note from system/templates/daily.md the first time the day is
   * opened: this week's directives plus the routine blocks from system/routine.md.
   */
  ensureToday(d = new Date()) {
    const rel = this.todayNotePath(d);
    if (this.read(rel)) return false;
    const template = this.read('system/templates/daily.md');
    if (!template) return false;
    const week = (this.listItems('ops/directives.md', 'this week') || []).filter((x) => !x.done).map((x) => x.text);
    const routine = (this.listItems('system/routine.md', 'every day') || []).map((x) => `- ${x.text}`);
    let note = template
      .replace('{{date}}', localDate(d))
      .replace('{{schedule}}', routine.join('\n') || '- 09:00 Deep work');
    for (let i = 1; i <= 3; i += 1) note = note.replace(`{{directive${i}}}`, week[i - 1] || 'Set a directive');
    this.write(rel, note);
    return true;
  }

  directives() {
    const today = this.listItems(this.todayNotePath(), 'directives');
    if (today && today.length) return today.slice(0, 3);
    return (this.listItems('ops/directives.md', 'this week') || this.listItems('ops/directives.md') || []).slice(0, 3);
  }

  schedule() {
    const items = this.listItems(this.todayNotePath(), 'schedule') || [];
    return items
      .map((it) => {
        const m = it.text.match(/^(\d{1,2}:\d{2})\s*[-–]?\s*(.+)$/);
        return m ? { time: m[1].padStart(5, '0'), text: m[2] } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  tasks() {
    const today = this.listItems(this.todayNotePath(), 'tasks');
    const base = this.listItems('ops/tasks.md', 'open') || this.listItems('ops/tasks.md') || [];
    return [...(today || []), ...base];
  }

  toggleTask(file, line) {
    const md = this.read(file);
    const lines = md.split('\n');
    const raw = lines[line];
    if (raw == null) throw new Error('That line no longer exists. Refresh and try again.');
    if (/\[ \]/.test(raw)) lines[line] = raw.replace('[ ]', '[x]');
    else if (/\[(x|X)\]/.test(raw)) lines[line] = raw.replace(/\[(x|X)\]/, '[ ]');
    else throw new Error('That line is not a checkbox.');
    this.write(file, lines.join('\n'));
    return !/\[ \]/.test(lines[line]);
  }

  business() {
    return { currency: 'NOK', sek_per_nok: 0, goal_deals_month: 0, daily_contacts: 0, packages: {}, default_package: 'M', assumptions: {}, confirmed: false, ...this.readJson('system/business.json', {}) };
  }

  pipeline() {
    return parsePipeline(this.read('ops/pipeline.md'));
  }

  stats(rows = this.pipeline().rows) {
    return computeStats(rows, { business: this.business(), today: localDate() });
  }

  addLead(fields) {
    const doc = this.pipeline();
    const company = String(fields.company || '').trim();
    if (!company) throw Object.assign(new Error('A company name is needed.'), { status: 400 });
    const email = String(fields.email || '').trim().toLowerCase();
    if (doc.rows.some((r) => r.company.toLowerCase() === company.toLowerCase() || (email && r.email.toLowerCase() === email))) {
      throw Object.assign(new Error(`${company} is already in the pipeline.`), { status: 409 });
    }
    const row = Object.fromEntries(COLUMNS.map((c) => [c, '']));
    for (const c of COLUMNS) if (fields[c] != null && c !== 'id') row[c] = String(fields[c]).trim();
    row.id = nextId(doc.rows);
    row.email = email;
    row.added = row.added || localDate();
    row.package = packageOf(row);
    const typed = { next_date: row.next_date, next_action: row.next_action };
    applyStatus(row, STAGES.includes(row.status) ? row.status : 'researched', localDate());
    if (typed.next_date) row.next_date = typed.next_date;
    if (typed.next_action) row.next_action = typed.next_action;
    doc.rows.push(row);
    this.write('ops/pipeline.md', renderPipeline(doc));
    return row;
  }

  updateLead(id, fields) {
    const doc = this.pipeline();
    const row = doc.rows.find((r) => r.id === id);
    if (!row) throw Object.assign(new Error(`No company with id ${id}. Refresh and try again.`), { status: 404 });
    const before = row.status;
    // Status first (it sets a default next step), then anything typed explicitly wins.
    if (fields.status && fields.status !== row.status) applyStatus(row, fields.status, localDate());
    for (const c of ['company', 'contact', 'email', 'phone', 'website', 'industry', 'city', 'channel', 'package', 'paid', 'next_date', 'next_action', 'notes']) {
      if (fields[c] != null) row[c] = String(fields[c]).trim();
    }
    if (fields.package != null) row.package = packageOf(row);
    this.write('ops/pipeline.md', renderPipeline(doc));
    return { row, movedTo: row.status !== before ? row.status : null };
  }

  /** Newest Markdown files under outputs/, for the Research tab. */
  outputs(limit = 12) {
    const base = this.resolve('outputs');
    const found = [];
    const walk = (dir) => {
      let entries = [];
      try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith('.md')) {
          const st = fs.statSync(full);
          found.push({ path: path.relative(this.root, full).split(path.sep).join('/'), name: e.name.replace(/\.md$/, ''), folder: path.basename(dir), mtime: st.mtimeMs });
        }
      }
    };
    walk(base);
    return found.sort((a, b) => b.mtime - a.mtime).slice(0, limit);
  }

  /** The newest morning-intel report, cut down to its bullet points. */
  brief() {
    const latest = this.outputs(50).find((o) => o.path.startsWith('outputs/morning-intel/'));
    if (!latest) return null;
    const md = this.read(latest.path);
    const bullets = md.split('\n').filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim()).slice(0, 6);
    return { path: latest.path, title: latest.name, bullets };
  }

  logRequest(entry) {
    const line = `- ${localTime()} · T${entry.tier} · ${entry.route} · ${String(entry.text).replace(/\s+/g, ' ').slice(0, 140)}\n`;
    this.append(`system/log/${localDate()}.md`, line);
  }
}
