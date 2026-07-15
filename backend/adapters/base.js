/**
 * Base IDE Adapter
 *
 * All IDE adapters implement this interface. Each adapter knows how to:
 * 1. Detect if the IDE is running
 * 2. List open windows/projects
 * 3. Inject a prompt into the IDE's chat
 * 4. Read back the response
 */

class BaseAdapter {
  constructor(config = {}) {
    this.name = "base";
    this.displayName = "Unknown IDE";
    this.icon = "💻";
    this.config = config;
  }

  /**
   * Check if this IDE is currently running.
   * @returns {Promise<boolean>}
   */
  async isRunning() {
    throw new Error("Not implemented");
  }

  /**
   * List open windows/projects in this IDE.
   * @returns {Promise<Array<{name: string, id: string}>>}
   */
  async listWindows() {
    throw new Error("Not implemented");
  }

  /**
   * Inject a prompt into the IDE's chat input.
   * @param {string} prompt - The text to inject
   * @param {string|null} windowId - Target window (null = frontmost)
   * @returns {Promise<boolean>}
   */
  async injectPrompt(prompt, windowId = null) {
    throw new Error("Not implemented");
  }

  /**
   * Get the keyboard shortcut to focus the chat input.
   * @returns {string} AppleScript keystroke command
   */
  getChatFocusShortcut() {
    throw new Error("Not implemented");
  }

  /**
   * Get the application bundle identifier or name.
   * @returns {string}
   */
  getAppIdentifier() {
    throw new Error("Not implemented");
  }
}

module.exports = BaseAdapter;
