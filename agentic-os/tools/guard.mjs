// Keeps customer data out of git and shows where personal data sits in the vault.
//
//   node tools/guard.mjs --install   point git at .githooks/ (npm start runs this; never fails)
//   node tools/guard.mjs --check     the pre-commit hook: refuse commits with customer data
//   node tools/guard.mjs --report    npm run gdpr: where personal data is, and the GDPR mode
//
// Customer data is GDPR data, and the employment contract (10.1-10.2) says it may only be kept
// in systems the employer points to. .gitignore keeps the data folders out; ops/pipeline.md is
// committed as an empty template, so this hook stops a commit that would add rows to it.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePipeline, isGenericEmail, privacyMode } from '../public/js/pipeline.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

/** Paths under agentic-os/ that hold customer data. Placeholders may be committed. */
export const DATA_PATHS = [
  /^vault\/samtal\/(?!README\.md$)/,
  /^vault\/outputs\/(?!\.gitkeep$)/,
  /^vault\/daily-notes\/(?!\.gitkeep$)/,
  /^vault\/inbox\/(?!README\.md$)/,
  /^vault\/ops\/calls\.md$/,
];

/** Why a staged file must not be committed, or null. `read` returns the staged content. */
export function blockReason(rel, read) {
  if (DATA_PATHS.some((re) => re.test(rel))) return 'kunddata (samtal, rapporter, dagsanteckningar, inkorg eller samtalslogg)';
  if (rel === 'vault/ops/pipeline.md') {
    const n = parsePipeline(read()).rows.length;
    if (n) return `pipelinen har ${n} företag; den committas bara som tom mall`;
  }
  return null;
}

function install() {
  try {
    const top = git(['rev-parse', '--show-toplevel']);
    const want = path.relative(top, path.join(root, '.githooks')).split(path.sep).join('/');
    let current = '';
    try { current = git(['config', '--get', 'core.hooksPath']); } catch { /* not set */ }
    if (current !== want) execFileSync('git', ['config', 'core.hooksPath', want], { cwd: root, stdio: 'ignore' });
  } catch {
    // Not a git checkout (a downloaded zip) or no git installed: nothing to protect here.
  }
}

function check() {
  const prefix = git(['rev-parse', '--show-prefix']);
  const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR']).split('\n').filter(Boolean);
  const blocked = [];
  for (const file of staged) {
    if (!file.startsWith(prefix)) continue;
    const rel = file.slice(prefix.length);
    const why = blockReason(rel, () => git(['show', `:${file}`]));
    if (why) blocked.push(`  ${rel}: ${why}`);
  }
  if (!blocked.length) return 0;
  console.error([
    '',
    'Stopp: den här commiten innehåller kunddata, som inte får ligga i git (GDPR och anställningsavtalet 10.2):',
    ...blocked,
    '',
    'Ta bort filerna ur commiten:  git restore --staged <fil>',
    '',
  ].join('\n'));
  return 1;
}

function report() {
  const vault = path.join(root, 'vault');
  const read = (rel) => { try { return fs.readFileSync(path.join(vault, rel), 'utf8'); } catch { return ''; } };
  let business = {};
  try { business = JSON.parse(read('system/business.json')); } catch { /* defaults */ }
  const rows = parsePipeline(read('ops/pipeline.md')).rows;
  const named = rows.filter((r) => r.contact);
  const direct = rows.filter((r) => r.email && !isGenericEmail(r.email));
  const count = (dir) => { try { return fs.readdirSync(path.join(vault, dir)).filter((f) => f.endsWith('.md') && f !== 'README.md').length; } catch { return 0; } };
  const mode = privacyMode(business);
  console.log([
    `GDPR-läge: ${mode === 'full' ? 'full (kontaktpersoner får sparas)' : 'company-only (bara företagsuppgifter)'}`,
    `${business.privacy?.approved_by ? `Godkänt av ${business.privacy.approved_by} ${business.privacy.approved_date || ''}`.trim() : 'Inget skriftligt godkännande inlagt (privacy.approved_by i system/business.json).'}`,
    '',
    `Pipelinen: ${rows.length} företag, ${named.length} med kontaktperson, ${direct.length} med personlig e-postadress.`,
    ...named.slice(0, 20).map((r) => `  ${r.id} ${r.company}: ${r.contact}`),
    ...direct.slice(0, 20).map((r) => `  ${r.id} ${r.company}: ${r.email}`),
    `Samtalsanteckningar (samtal/): ${count('samtal')} filer. De kan innehålla namn, läs igenom vid radering.`,
    `Dagsanteckningar (daily-notes/): ${count('daily-notes')} filer.`,
    '',
    mode !== 'full' && (named.length || direct.length)
      ? 'Obs: GDPR-läget är company-only men pipelinen har personuppgifter från tidigare. Ta bort dem i Kommando → Pipeline eller i ops/pipeline.md.'
      : 'Radering: ta bort raden i ops/pipeline.md och företagets filer i samtal/ och outputs/.',
  ].join('\n'));
  return 0;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const arg = process.argv[2];
  if (arg === '--install') { install(); process.exit(0); }
  if (arg === '--check') process.exit(check());
  if (arg === '--report') process.exit(report());
  console.log('Användning: node tools/guard.mjs --install | --check | --report');
}
