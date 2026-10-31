// Bundle the HUD into one self-contained HTML file that runs in demo mode with no
// Bridge: for sharing a preview or opening on a phone.
//
//   node tools/build-demo.mjs                       -> dist/jarvis-demo.html (full page)
//   node tools/build-demo.mjs --fragment out.html   -> body-only fragment (for hosts that add their own <head>)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = (p) => path.join(root, 'public', p);
const args = process.argv.slice(2);
const fragIdx = args.indexOf('--fragment');
const fragmentOut = fragIdx >= 0 ? path.resolve(args[fragIdx + 1]) : null;

const html = fs.readFileSync(pub('index.html'), 'utf8');
const body = html.split('<!--BODY-START-->')[1].split('<!--BODY-END-->')[0].trim();
const title = html.match(/<title>(.*?)<\/title>/)[1];
const fonts = html.match(/<link rel="stylesheet" href="(https:\/\/fonts[^"]+)">/)[1];
const css = fs.readFileSync(pub('css/os.css'), 'utf8');
const backbone = fs.readFileSync(path.join(root, 'vault/system/backbone.json'), 'utf8');
const texts = Object.fromEntries(['wiki/objections.md', 'wiki/product-cards.md']
  .map((p) => [p, fs.readFileSync(path.join(root, 'vault', p), 'utf8')]));

// Each module becomes an IIFE that returns its exports; imports become destructuring.
const order = ['classify', 'pipeline', 'calls', 'rules', 'cards', 'ics', 'core', 'live', 'dialer', 'leadfinder', 'demo', 'app'];
const parts = order.map((name) => {
  let src = fs.readFileSync(pub(`js/${name}.js`), 'utf8');
  const exported = new Set();
  // `import { a as b }` becomes `const { a: b }`.
  src = src.replace(/^import\s*\{([^}]+)\}\s*from\s*'\.\/([\w-]+)\.js';\s*$/gm, (_m, names, mod) => `const {${names.replace(/\s+as\s+/g, ': ')}} = __mod_${mod};`);
  src = src.replace(/^export\s+(async\s+function|function|class|const|let)\s+([A-Za-z0-9_$]+)/gm, (_m, kind, id) => { exported.add(id); return `${kind} ${id}`; });
  src = src.replace(/^export\s*\{([^}]+)\};?\s*$/gm, (_m, names) => { names.split(',').map((n) => n.trim()).filter(Boolean).forEach((n) => exported.add(n)); return ''; });
  if (name === 'demo') src = src.replace('/*__BACKBONE__*/ null', backbone.trim()).replace('/*__TEXTS__*/ null', () => JSON.stringify(texts).replace(/<\//g, '<\\/'));
  return `const __mod_${name} = (() => {\n${src}\nreturn { ${[...exported].join(', ')} };\n})();`;
});
const bundle = parts.join('\n\n');

const head = `<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>
<script>window.__AOS_DEMO__ = true;</script>`;

const fragment = `${head}\n${body}\n<script type="module">\n${bundle}\n</script>\n`;

if (fragmentOut) {
  fs.mkdirSync(path.dirname(fragmentOut), { recursive: true });
  fs.writeFileSync(fragmentOut, fragment);
  console.log(`fragment -> ${fragmentOut} (${(fragment.length / 1024).toFixed(0)} KB)`);
} else {
  const out = path.join(root, 'dist/jarvis-demo.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}\n</head>\n<body>\n${body}\n<script type="module">\n${bundle}\n</script>\n</body>\n</html>\n`);
  console.log(`demo -> ${out}`);
}
