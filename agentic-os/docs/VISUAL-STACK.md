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

## MCP connectors (updated for the outreach business)

Already connected on your claude.ai account: **Gmail, Google Calendar, Google Drive**. Those
three cover the email skills. Shopify and Higgsfield are connected too but no skill uses them now.

| Connector | Status | Why |
| --- | --- | --- |
| Vibe Prospecting | not connected | Find companies and enrich published contacts for /lead-research. |
| Pipedrive or HubSpot | not connected | Only if the pipeline outgrows one Markdown table. /sync-pipeline could then read the CRM. |
| Outreach | not connected | Only if you move sending onto the Outreach platform. |
| Figma, Canva | not connected / needs reconnect | Only for designing the HUD further; not needed for the business. |

Your sending tool, if you move off Gmail (Instantly, Smartlead, Lemlist), is the next thing
worth connecting: then sent and reply counts can come from it directly.

Outside the claude.ai directory, for building UI in Claude Code:
[21st.dev Magic MCP](https://www.augmentcode.com/mcp/21st-dev-magic-mcp-server),
[shadcn/ui MCP servers](https://images.glama.ai/mcp/servers/integrations/shadcn-ui), and Magic UI.

## Recommendation

1. Make Gmail and Calendar work inside Claude Code (see `vault/wiki/connectors.md`). That turns
   the email skills from "drafts in a file" into "drafts in your Gmail" and makes the numbers sync.
2. Add a prospecting data source only once you know your niche converts.
3. For the next HUD iteration, install the **frontend-design** plugin.
