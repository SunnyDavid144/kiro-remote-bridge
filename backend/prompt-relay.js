/**
 * Prompt Relay — Bridges mobile prompts into the running Kiro session.
 *
 * This works by writing prompts to a file that can be picked up by Kiro,
 * and reading responses from a response file that Kiro writes to.
 *
 * The bridge server watches the response file and streams updates back
 * to the mobile client.
 *
 * Flow:
 *   Phone → Bridge → writes prompt to ~/.kiro-bridge/prompt.json
 *   Kiro Hook reads prompt → processes → writes response chunks to ~/.kiro-bridge/response.jsonl
 *   Bridge watches response file → streams to phone
 */

const fs = require("fs");
const path = require("path");

const BRIDGE_DIR = path.join(process.env.HOME || "/tmp", ".kiro-bridge");
const PROMPT_FILE = path.join(BRIDGE_DIR, "prompt.json");
const RESPONSE_FILE = path.join(BRIDGE_DIR, "response.jsonl");

// Ensure directory exists
if (!fs.existsSync(BRIDGE_DIR)) {
  fs.mkdirSync(BRIDGE_DIR, { recursive: true });
}

/**
 * Write a prompt for Kiro to pick up.
 */
function writePrompt(sessionId, text) {
  const payload = {
    sessionId,
    text,
    timestamp: Date.now(),
  };
  fs.writeFileSync(PROMPT_FILE, JSON.stringify(payload, null, 2));
  return true;
}

/**
 * Check if there's a pending prompt.
 */
function readPrompt() {
  try {
    if (!fs.existsSync(PROMPT_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(PROMPT_FILE, "utf-8"));
    return data;
  } catch {
    return null;
  }
}

/**
 * Clear the prompt file after it's been consumed.
 */
function clearPrompt() {
  try {
    fs.unlinkSync(PROMPT_FILE);
  } catch {}
}

/**
 * Write a response line (append).
 */
function writeResponseLine(data) {
  fs.appendFileSync(RESPONSE_FILE, JSON.stringify(data) + "\n");
}

/**
 * Clear the response file.
 */
function clearResponse() {
  try {
    fs.writeFileSync(RESPONSE_FILE, "");
  } catch {}
}

module.exports = {
  BRIDGE_DIR,
  PROMPT_FILE,
  RESPONSE_FILE,
  writePrompt,
  readPrompt,
  clearPrompt,
  writeResponseLine,
  clearResponse,
};
