// Skills live in the vault at .claude/skills/<name>/SKILL.md, where Claude Code
// finds them on its own. The backbone (system/backbone.json) adds the OS metadata:
// domain, task, connectors, schedule and the router's trigger phrases.

import fs from 'node:fs';
import path from 'node:path';

function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

export function loadSkills(vault) {
  const dir = vault.resolve('.claude/skills');
  const backbone = vault.readJson('system/backbone.json', { domains: [], skills: [], rules: [] });
  const meta = new Map(backbone.skills.map((s) => [s.name, s]));
  const skills = [];
  let names = [];
  try { names = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name); } catch { /* no skills yet */ }
  for (const name of names) {
    const file = path.join(dir, name, 'SKILL.md');
    if (!fs.existsSync(file)) continue;
    const fm = frontmatter(fs.readFileSync(file, 'utf8'));
    const m = meta.get(name) || {};
    skills.push({
      name,
      description: fm.description || '',
      domain: m.domain || 'other',
      task: m.task || name.replace(/-/g, ' '),
      does: m.does || '',
      connectors: m.connectors || [],
      schedule: m.schedule || 'manual',
      quick: Boolean(m.quick),
      label: m.label || name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      triggers: m.triggers || [],
    });
  }
  const order = backbone.domains.map((d) => d.id);
  const pos = (name) => { const i = backbone.skills.findIndex((s) => s.name === name); return i < 0 ? 999 : i; };
  skills.sort((a, b) => (order.indexOf(a.domain) - order.indexOf(b.domain)) || pos(a.name) - pos(b.name));
  return { skills, domains: backbone.domains, rules: backbone.rules };
}
