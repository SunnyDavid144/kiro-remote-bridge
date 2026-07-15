/**
 * Kiro IDE Adapter
 *
 * Injects prompts via AppleScript using Cmd+L to focus chat, Cmd+V to paste.
 */

const BaseAdapter = require("./base");
const { exec } = require("child_process");

class KiroAdapter extends BaseAdapter {
  constructor(config = {}) {
    super(config);
    this.name = "kiro";
    this.displayName = "Kiro";
    this.icon = "🟣";
  }

  getAppIdentifier() {
    return "Kiro";
  }

  getChatFocusShortcut() {
    return 'keystroke "l" using command down';
  }

  async isRunning() {
    return new Promise((resolve) => {
      exec(
        `osascript -e 'tell application "System Events" to (name of processes) contains "Electron"'`,
        (err, stdout) => {
          resolve(stdout.trim() === "true");
        }
      );
    });
  }

  async listWindows() {
    return new Promise((resolve) => {
      const script = `
tell application "System Events"
  try
    set kiroProcess to first process whose bundle identifier is "dev.kiro.desktop"
    set windowNames to {}
    repeat with w in windows of kiroProcess
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
    return new Promise((resolve) => {
      const activateWindow = windowId
        ? `
tell application "Kiro"
  activate
  set index of (first window whose name contains ${JSON.stringify(windowId)}) to 1
end tell
delay 0.3`
        : `tell application "Kiro" to activate
delay 0.2`;

      const script = `
set the clipboard to ${JSON.stringify(prompt)}
${activateWindow}
tell application "System Events"
  ${this.getChatFocusShortcut()}
  delay 0.2
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

module.exports = KiroAdapter;
