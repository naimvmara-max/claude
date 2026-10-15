// Tier 2: a quick answer from a small, fast model.
//
// Two backends, tried in order:
//   1. The Anthropic SDK (optional dependency) when it is installed and finds
//      credentials (ANTHROPIC_API_KEY, or an `ant auth login` profile). Fastest.
//   2. The Claude Code CLI with `--model haiku`. Uses your Claude plan, no API key.

import { spawn } from 'node:child_process';
import { engineEnv, fixesFor } from './jobs.js';

let sdk; // undefined = not tried yet, null = not installed
async function loadSdk() {
  if (sdk !== undefined) return sdk;
  try { sdk = (await import('@anthropic-ai/sdk')).default; } catch { sdk = null; }
  return sdk;
}

function systemPrompt(ctx) {
  return [
    `You are ${ctx.name}, the voice of ${ctx.owner}'s Agentic OS. Answer in at most 90 words, plain sentences, no Markdown, because the answer may be read aloud.`,
    `${ctx.owner} is 24, based in Sweden, and runs an email outreach business: finding businesses, cold emailing them, booking calls and signing clients. Skills: digital marketing, SaaS, AI. Be direct and realistic; never promise income or reply rates.`,
    'If the request needs real work (research, files, multi-step output), answer briefly and name the skill that should do it, for example /lead-research or /outreach-drafts.',
    `Today: ${ctx.date}. Directives: ${ctx.directives || 'none set'}. Pipeline: ${ctx.numbers || 'empty'}. Skills: ${ctx.skills}.`,
  ].join('\n');
}

async function viaSdk(text, ctx, model) {
  const Anthropic = await loadSdk();
  if (!Anthropic) return null;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      output_config: { effort: 'low' },
      system: systemPrompt(ctx),
      messages: [{ role: 'user', content: text }],
    });
    if (response.stop_reason === 'refusal') {
      return { answer: 'That one was declined by the model. Try rephrasing it.', backend: `sdk:${model}` };
    }
    const answer = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    return { answer, backend: `sdk:${model}` };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return null; // no usable key, fall through to the CLI
    if (error instanceof Anthropic.RateLimitError) return { answer: 'Rate limited by the API. Give it a minute.', backend: `sdk:${model}` };
    if (error instanceof Anthropic.APIError) return null;
    // Missing credentials surface as a plain Error from the client; fall through.
    return null;
  }
}

function viaCli(text, ctx, eng, model) {
  return new Promise((resolve) => {
    const prompt = `${systemPrompt(ctx)}\n\nRequest: ${text}`;
    let out = '';
    let err = '';
    // The prompt goes through stdin; the arguments never contain user text.
    const child = spawn(eng.bin, ['-p', '--model', model, '--output-format', 'json', '--max-turns', '2'], {
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: ctx.cwd,
      env: engineEnv(eng),
    });
    child.stdin.on('error', () => {});
    child.stdin.end(prompt);
    const timer = setTimeout(() => child.kill(), 90_000);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', () => { clearTimeout(timer); resolve(null); });
    child.on('close', () => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(out);
        let answer = String(parsed.result || '').trim();
        const fix = parsed.is_error ? fixesFor(answer) : [];
        if (fix.length) answer = `${answer}\n\n${fix.join('\n')}`;
        resolve({ answer, backend: `claude-cli:${model}`, costUsd: parsed.total_cost_usd ?? null });
      } catch {
        const said = err.trim() || out.trim();
        const fix = fixesFor(said);
        resolve(said ? { answer: `Claude Code said: ${said.slice(0, 300)}${fix.length ? `\n\n${fix.join('\n')}` : ''}`, backend: 'claude-cli' } : null);
      }
    });
  });
}

export async function quickAnswer(text, ctx, cfg) {
  const viaApi = await viaSdk(text, ctx, cfg.router.quickModel);
  if (viaApi) return viaApi;
  const viaCode = await viaCli(text, ctx, cfg.engines.claude, cfg.router.quickCliModel);
  if (viaCode) return viaCode;
  return {
    answer: 'No quick-answer model is reachable. Install Claude Code and log in, or run `npm install` and set ANTHROPIC_API_KEY.',
    backend: 'none',
  };
}

/**
 * Optional model-based router: the same predefined choices, picked by a small model
 * with structured output. Set "router.classifier": "haiku" in config.json.
 */
export async function modelClassify(text, choices, cfg) {
  const Anthropic = await loadSdk();
  if (!Anthropic) return null;
  try {
    const client = new Anthropic();
    const ids = choices.map((c) => c.id);
    const response = await client.messages.create({
      model: cfg.router.quickModel,
      max_tokens: 256,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              choice: { type: 'string', enum: ids },
              confidence: { type: 'number' },
              runner_up: { type: 'string', enum: ids },
            },
            required: ['choice', 'confidence', 'runner_up'],
            additionalProperties: false,
          },
        },
      },
      system: `Route the user's message to exactly one choice. Choices:\n${choices.map((c) => `- ${c.id}: ${c.hint}`).join('\n')}\nconfidence is your probability (0 to 1) that the choice is right.`,
      messages: [{ role: 'user', content: text }],
    });
    if (response.stop_reason === 'refusal') return null;
    const raw = response.content.find((b) => b.type === 'text')?.text;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
