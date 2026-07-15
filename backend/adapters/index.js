/**
 * Adapter Registry
 *
 * Manages all IDE adapters, detects which are running,
 * and provides a unified interface for the bridge server.
 */

const KiroAdapter = require("./kiro");
const CursorAdapter = require("./cursor");
const WindsurfAdapter = require("./windsurf");
const VSCodeAdapter = require("./vscode");
const CodexAdapter = require("./codex");

// All known adapters
const ADAPTERS = {
  kiro: KiroAdapter,
  cursor: CursorAdapter,
  windsurf: WindsurfAdapter,
  vscode: VSCodeAdapter,
  codex: CodexAdapter,
};

class AdapterRegistry {
  constructor() {
    this.adapters = new Map();
    this.activeAdapter = null;

    // Initialize all adapters
    for (const [name, AdapterClass] of Object.entries(ADAPTERS)) {
      this.adapters.set(name, new AdapterClass());
    }
  }

  /**
   * Get a specific adapter by name.
   */
  get(name) {
    return this.adapters.get(name);
  }

  /**
   * List all registered adapters with their info.
   */
  listAll() {
    return Array.from(this.adapters.values()).map((a) => ({
      name: a.name,
      displayName: a.displayName,
      icon: a.icon,
    }));
  }

  /**
   * Detect which IDEs are currently running.
   * @returns {Promise<Array<{name, displayName, icon, running}>>}
   */
  async detectRunning() {
    const results = await Promise.all(
      Array.from(this.adapters.values()).map(async (adapter) => ({
        name: adapter.name,
        displayName: adapter.displayName,
        icon: adapter.icon,
        running: await adapter.isRunning(),
      }))
    );
    return results.filter((r) => r.running);
  }

  /**
   * Get the active adapter (or default to first running one).
   */
  getActive() {
    return this.activeAdapter
      ? this.adapters.get(this.activeAdapter)
      : null;
  }

  /**
   * Set the active adapter by name.
   */
  setActive(name) {
    if (!this.adapters.has(name)) {
      throw new Error(`Unknown adapter: ${name}`);
    }
    this.activeAdapter = name;
    return this.adapters.get(name);
  }

  /**
   * List windows across all running IDEs.
   * @returns {Promise<Array<{ide, window}>>}
   */
  async listAllWindows() {
    const running = await this.detectRunning();
    const results = [];

    for (const ide of running) {
      const adapter = this.adapters.get(ide.name);
      const windows = await adapter.listWindows();
      for (const win of windows) {
        results.push({
          ide: ide.name,
          ideDisplayName: ide.displayName,
          ideIcon: ide.icon,
          window: win.name,
          windowId: win.id,
        });
      }
    }

    return results;
  }

  /**
   * Inject a prompt using the active adapter (or a specific one).
   */
  async injectPrompt(prompt, adapterName = null, windowId = null) {
    const name = adapterName || this.activeAdapter;
    if (!name) {
      throw new Error("No active adapter set. Call setActive() first.");
    }
    const adapter = this.adapters.get(name);
    if (!adapter) {
      throw new Error(`Adapter not found: ${name}`);
    }
    return adapter.injectPrompt(prompt, windowId);
  }
}

module.exports = { AdapterRegistry, ADAPTERS };
