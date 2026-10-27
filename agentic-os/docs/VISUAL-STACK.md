# Visual stack: what was checked and what to use

Checked on 2026-10-11 for the look of the HUD and for connectors that make it more useful.
Nothing in the shipped build depends on any of these. The HUD is plain HTML, CSS and
Canvas with no libraries.

## Design references (GitHub and the web)

| Project | What to take from it |
| --- | --- |
| [jincocodev/openclaw-jarvis-ui](https://github.com/jincocodev/openclaw-jarvis-ui) | Three.js orb with idle / thinking / responding states, audio-reactive particles. Closest match to the Claude core. |
| [cam-hm/jarvis](https://github.com/cam-hm/jarvis) | Three.js arc-reactor HUD in vanilla JS with Piper TTS (the voice model is not licensed for commercial use). |
| Linuxthecoder/JARVIS | Voice-reactive particle sphere with a wake word (Python + WebView). |
| [AgenticOS Workbench](https://mcpmarket.com/server/agenticos-workbench) | Claude Code + Codex memory in an Obsidian vault with a live HUD for activity and cost. Same idea as the Bridge's run log. |
| [Claudian](https://community.obsidian.md/plugins/realclaudian) | Obsidian plugin that runs Claude Code inside the vault. An alternative to this repo's iframe plugin if you want a chat pane in Obsidian. |
| [agentic-os-setup skill](https://www.claudepluginhub.com/skills/naveedharri-all-skills-plugins-all-skills/agentic-os-setup) | Sets up an Obsidian or Next.js dashboard. Useful to compare structure. |

Chase AI's own repo for the "jev + claude OS" video could not be found. The structure here
was rebuilt from the screenshots: two front doors, the Bridge, the tiered router, the skill
backbone and the vault.

## The router idea: Jev

Jev is TypeSafe AI's "System One" decision model, released in early access on 2026-09-15.
It returns one of your predefined choices with a probability instead of generated text,
with yes/no, choice and score primitives. Vercel added it to its AI Gateway the day after
launch, according to coverage. A hands-on test found that a forced choice can still be
confidently wrong when no option fits, which is why this router falls back to the cheapest
tier below 45 percent.
Sources: [The Register](https://www.theregister.com/devops/2026/09/23/shut-up-and-calculate-jevs-new-ai-primitives-for-coders/5298431),
[MindStudio test](https://www.mindstudio.ai/blog/jev-system-one-model-classification),
[Towards Data Science](https://towardsdatascience.com/jev-vs-llms-when-ai-moves-from-generation-to-decision-making/).

## Plugins (Claude plugin directory)

| Plugin | Publisher | Use it for |
| --- | --- | --- |
| frontend-design | Anthropic | Next UI iterations of the HUD. Install this one first. |
| Superdesign | Superdesign (partner) | Branching UI drafts and marketing graphics on a canvas. Good for brand posters too. |
| audit-suite | community | Includes web-animation-design and make-interfaces-feel-better: a polish pass on motion and micro-interactions. |
| designs-drift | community | Locks a design system with hooks so later edits do not drift from it. |

## MCP connectors (updated for the sales job)

Already connected on your claude.ai account: **Gmail, Google Calendar, Google Drive**. Gmail
and Calendar cover the email, inbox, sync and demo skills. Company data for Norway comes from
brreg.no's open API and public sites through web fetch, so no connector is needed for it.

| Connector | Status | Why |
| --- | --- | --- |
| The employer's CRM | ask the employer | So deals are not tracked twice; /sync-pipeline could read it. |
| A sending tool (Instantly, Smartlead, Lemlist) | not connected | Only if you send volume from it instead of Gmail; then sent and reply counts come from it. |
| A dialer | not connected | Only if you call a lot and want calls logged without typing. |
| Figma, Canva | not connected / needs reconnect | Only for designing the HUD further. |

Outside the claude.ai directory, for building UI in Claude Code:
[21st.dev Magic MCP](https://www.augmentcode.com/mcp/21st-dev-magic-mcp-server),
[shadcn/ui MCP servers](https://images.glama.ai/mcp/servers/integrations/shadcn-ui), and Magic UI.

## Recommendation

1. Make Gmail and Calendar work inside Claude Code (see `vault/wiki/connectors.md`). That turns
   the email skills from "drafts in a file" into "drafts in your Gmail" and makes the numbers sync.
2. Ask the employer what CRM and sending rules they use before adding a tool of your own.
3. For the next HUD iteration, install the **frontend-design** plugin.
