/**
 * OpenAI Codex CLI Adapter
 *
 * Codex runs as a terminal application. Instead of AppleScript UI injection,
 * this adapter writes the prompt to Codex's stdin via a named pipe or
 * uses the terminal to paste into the running Codex process.
 *
 * Since Codex is terminal-based, we target the Terminal/iTerm2 window
 * where it's running.
 */

const BaseAdapter = require("./base");
const { exec } = require("child_process");

class CodexAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.name = "codex";
    this.displayName = "Codex CLI";
    this.icon = "🤖";
    // Which terminal app is running Codex
    this.terminal = config.terminal || "Terminal";
  }

  getAppIdentifier() {
    return this.terminal;
  }

  getChatFocusShortcut() {
    // Terminal doesn't need a chat focus — just paste
    return "";
  }

  async isRunning() {
    // Check if codex process is running
    return new Promise((resolve) => {
      exec("pgrep -f 'codex'", (err, stdout) => {
        resolve(!!stdout.trim());
      });
    });
  }

  async listWindows() {
    const terminal = this.terminal;
    return new Promise((resolve) => {
      const script = `
tell application "System Events"
  try
    set termProcess to first process whose name is "${terminal}"
    set windowNames to {}
    repeat with w in windows of termProcess
      set end of windowNames to name of w
    end repeat
    return windowNames
  on error
    return {}
  end try
end tell`;
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err, stdout) => {
        if (err) return resolve([]);
        const names = stdout.trim().split(",").map((s) => s.trim()).filter(Boolean);
        resolve(names.map((name) => ({ name, id: name })));
      });
    });
  }

  async injectPrompt(prompt, windowId = null) {
    const terminal = this.terminal;
    return new Promise((resolve) => {
      // For terminal-based tools, we activate the terminal and paste
      const activateWindow = windowId
        ? `
tell application "${terminal}"
  activate
  set index of (first window whose name contains ${JSON.stringify(windowId)}) to 1
end tell
delay 0.2`
        : `tell application "${terminal}" to activate
delay 0.2`;

      const script = `
set the clipboard to ${JSON.stringify(prompt)}
${activateWindow}
tell application "System Events"
  keystroke "v" using command down
  delay 0.1
  keystroke return
end tell`;

      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err) => {
        if (err) {
          console.error(`[${this.name}] AppleScript error:`, err.message);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}

module.exports = CodexAdapter;
