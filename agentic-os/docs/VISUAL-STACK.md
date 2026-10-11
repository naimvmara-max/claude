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

## MCP connectors

Already connected on your claude.ai account: **Gmail, Google Calendar, Google Drive,
Shopify, Higgsfield**. **Canva needs reconnecting.**

| Connector | Status | Why |
| --- | --- | --- |
| Metricool | not connected | Real TikTok and Instagram numbers for the vitals, plus best posting times. Read only. |
| vidIQ | not connected | Research, outliers and channel stats for YouTube, Instagram and TikTok. |
| Supermetrics | not connected | Pulls TikTok, Instagram and ad data into one place, if you start running ads. |
| Figma | not connected | Read designs into code and generate diagrams. Pair it with one component source. |
| Canva | needs reconnect | Carousels and story templates for /content-cascade. |
| Adobe, Moda | not connected | Heavier design and motion tools. Skip until Canva and Higgsfield are not enough. |
| TikTok for Business, AfterShip TikTok Shop | not connected | Only once you run TikTok ads or sell on TikTok Shop. |

Outside the claude.ai directory, for building UI in Claude Code:
[21st.dev Magic MCP](https://www.augmentcode.com/mcp/21st-dev-magic-mcp-server) (generates components from a prompt, needs a free key),
[shadcn/ui MCP servers](https://images.glama.ai/mcp/servers/integrations/shadcn-ui), and Magic UI for animated marketing components.
Roundups such as [mcp.directory](https://mcp.directory/blog/best-mcp-servers-for-design-2026) recommend two
servers rather than nine: one that reads your design source and one component library.

## Recommendation

1. Connect **Metricool** (or vidIQ) so the vitals show real numbers. This matters more than any visual tweak.
2. Reconnect **Canva**; keep **Higgsfield** for mockups and AI model shots.
3. For the next HUD iteration, install the **frontend-design** plugin. Add Figma only if you start designing in Figma.
