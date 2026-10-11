// Agentic OS HUD for Obsidian: the same HUD as the browser, docked inside the vault.
// The Bridge (npm start in the agentic-os folder) must be running.
const { Plugin, ItemView, Notice, requestUrl } = require('obsidian');

const VIEW_TYPE = 'agentic-os-hud';
const URL = 'http://127.0.0.1:3217/?embed=1';

class HudView extends ItemView {
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Agentic OS'; }
  getIcon() { return 'sparkles'; }

  async onOpen() {
    const root = this.containerEl.children[1];
    root.empty();
    root.style.padding = '0';
    root.style.overflow = 'hidden';
    const frame = root.createEl('iframe', { attr: { src: URL, title: 'Agentic OS HUD', allow: 'microphone' } });
    frame.style.cssText = 'width:100%;height:100%;border:0;background:#050807';
    try {
      // requestUrl is Obsidian's own HTTP client; a plain fetch would be blocked by CORS.
      const res = await requestUrl({ url: 'http://127.0.0.1:3217/api/health', throw: false });
      if (res.status !== 200) throw new Error();
    } catch {
      new Notice('Agentic OS: the Bridge is not running. Run "npm start" in the agentic-os folder.');
    }
  }
}

module.exports = class AgenticOsHud extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new HudView(leaf));
    this.addRibbonIcon('sparkles', 'Open Agentic OS', () => this.open());
    this.addCommand({ id: 'open-hud', name: 'Open HUD', callback: () => this.open() });
  }

  async open() {
    const { workspace } = this.app;
    let leaf = workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    workspace.revealLeaf(leaf);
  }
};
