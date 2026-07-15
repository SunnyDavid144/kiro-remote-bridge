/**
 * VS Code Adapter (with Copilot Chat / Cline / Continue / etc.)
 *
 * Works with any VS Code extension that uses the chat panel.
 * Cmd+Shift+I opens Copilot Chat. Cmd+L focuses inline chat.
 * App identifier: "Code" (VS Code) or "Code - Insiders"
 */

const BaseAdapter = require("./base");
const { exec } = require("child_process");

class VSCodeAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.name = "vscode";
    this.displayName = "VS Code";
    this.icon = "🔵";
    // Default to Copilot Chat shortcut; can be overridden for Cline/Continue
    this.chatShortcut = config.chatShortcut || 'keystroke "i" using {command down, shift down}';
  }

  getAppIdentifier() {
    return this.config.insiders ? "Code - Insiders" : "Code";
  }

  getChatFocusShortcut() {
    return this.chatShortcut;
  }

  async isRunning() {
    const appName = this.getAppIdentifier();
    return new Promise((resolve) => {
      exec(
        `osascript -e 'tell application "System Events" to (name of processes) contains "${appName}"'`,
        (err, stdout) => {
          resolve(stdout.trim() === "true");
        }
      );
    });
  }

  async listWindows() {
    const appName = this.getAppIdentifier();
    return new Promise((resolve) => {
      const script = `
tell application "System Events"
  try
    set vsProcess to first process whose name is "${appName}"
    set windowNames to {}
    repeat with w in windows of vsProcess
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
    const appName = this.getAppIdentifier();
    return new Promise((resolve) => {
      const activateWindow = windowId
        ? `
tell application "${appName}"
  activate
  set index of (first window whose name contains ${JSON.stringify(windowId)}) to 1
end tell
delay 0.3`
        : `tell application "${appName}" to activate
delay 0.2`;

      const script = `
set the clipboard to ${JSON.stringify(prompt)}
${activateWindow}
tell application "System Events"
  ${this.getChatFocusShortcut()}
  delay 0.3
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

module.exports = VSCodeAdapter;
