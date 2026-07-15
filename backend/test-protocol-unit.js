/**
 * Unit verification for acp-protocol.js
 * Ensures all message builders produce valid JSON-RPC 2.0 structures.
 */

const acp = require("./acp-protocol");

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

// Reset ID counter for predictable tests
acp.resetIdCounter();

// ── initialize ──
console.log("── initialize");
const init = acp.initialize();
assert(init.jsonrpc === "2.0", "jsonrpc field");
assert(init.id === 1, "id is 1");
assert(init.method === "initialize", "method");
assert(init.params.protocolVersion === 1, "protocolVersion");
assert(init.params.clientInfo.name === "kiro-remote-bridge", "clientName");
assert(init.params.clientCapabilities.fs.readTextFile === true, "fs cap");
assert(init.params.clientCapabilities.terminal === true, "terminal cap");
console.log("  ✓ All assertions passed");

// ── session/new ──
console.log("── session/new");
const sessNew = acp.sessionNew({ cwd: "/tmp/test" });
assert(sessNew.jsonrpc === "2.0", "jsonrpc");
assert(sessNew.id === 2, "id is 2");
assert(sessNew.method === "session/new", "method");
assert(sessNew.params.cwd === "/tmp/test", "cwd");
assert(Array.isArray(sessNew.params.mcpServers), "mcpServers is array");
assert(sessNew.params.mcpServers.length === 0, "mcpServers empty");
console.log("  ✓ All assertions passed");

// ── session/prompt ──
console.log("── session/prompt");
const prompt = acp.sessionPrompt("sess_abc123", "Hello World");
assert(prompt.jsonrpc === "2.0", "jsonrpc");
assert(prompt.id === 3, "id is 3");
assert(prompt.method === "session/prompt", "method");
assert(prompt.params.sessionId === "sess_abc123", "sessionId");
assert(prompt.params.prompt[0].type === "text", "prompt content type");
assert(prompt.params.prompt[0].text === "Hello World", "prompt text");
assert(prompt.params._meta === undefined, "no meta by default");
console.log("  ✓ All assertions passed");

// ── session/prompt with meta ──
console.log("── session/prompt (with meta)");
const promptMeta = acp.sessionPrompt("sess_xyz", "Run plan", {
  meta: { "custom/key": "value" },
});
assert(promptMeta.params._meta["custom/key"] === "value", "meta passed");
console.log("  ✓ All assertions passed");

// ── session/cancel (notification) ──
console.log("── session/cancel");
const cancel = acp.sessionCancel("sess_abc123");
assert(cancel.jsonrpc === "2.0", "jsonrpc");
assert(cancel.id === undefined, "no id on notification");
assert(cancel.method === "session/cancel", "method");
assert(cancel.params.sessionId === "sess_abc123", "sessionId");
console.log("  ✓ All assertions passed");

// ── session/set_config_option ──
console.log("── session/set_config_option");
const setOpt = acp.sessionSetConfigOption("sess_abc", "permission_mode", "bypass");
assert(setOpt.method === "session/set_config_option", "method");
assert(setOpt.params.configId === "permission_mode", "configId");
assert(setOpt.params.value === "bypass", "value");
console.log("  ✓ All assertions passed");

// ── respondPermission ──
console.log("── respondPermission");
const permAllow = acp.respondPermission(10, "allow");
assert(permAllow.jsonrpc === "2.0", "jsonrpc");
assert(permAllow.id === 10, "id matches request");
assert(permAllow.result.outcome === "allow", "outcome");
assert(permAllow.result.optionId === "allow", "optionId");

const permReject = acp.respondPermission(11, "reject");
assert(permReject.result.outcome === "reject", "reject outcome");
assert(permReject.result.optionId === "reject", "reject optionId");
console.log("  ✓ All assertions passed");

// ── respondQuestion ──
console.log("── respondQuestion");
const qResp = acp.respondQuestion(12, [["Go"], ["yes"]]);
assert(qResp.id === 12, "id matches");
assert(qResp.result.answers[0][0] === "Go", "first answer");
assert(qResp.result.answers[1][0] === "yes", "second answer");
console.log("  ✓ All assertions passed");

// ── classify ──
console.log("── classify");

// Response
const resp = acp.classify({ jsonrpc: "2.0", id: 1, result: { sessionId: "s1" } });
assert(resp.kind === "response", "response kind");
assert(resp.id === 1, "response id");

// Error response
const errResp = acp.classify({ jsonrpc: "2.0", id: 2, error: { code: -32600, message: "bad" } });
assert(errResp.kind === "error_response", "error kind");

// Session update
const update = acp.classify({
  jsonrpc: "2.0",
  method: "session/update",
  params: { sessionUpdate: "agent_message_chunk", content: { type: "text", text: "hi" } },
});
assert(update.kind === "session_update", "update kind");
assert(update.updateType === "agent_message_chunk", "update type");

// Permission request
const perm = acp.classify({
  jsonrpc: "2.0",
  id: 10,
  method: "session/request_permission",
  params: { sessionId: "s1", toolCall: {} },
});
assert(perm.kind === "permission_request", "perm kind");

// Question request
const q = acp.classify({
  jsonrpc: "2.0",
  id: 11,
  method: "session/request_question",
  params: { sessionId: "s1", questions: [] },
});
assert(q.kind === "question_request", "question kind");

// FS request
const fs = acp.classify({
  jsonrpc: "2.0",
  id: 5,
  method: "fs/read_text_file",
  params: { path: "/tmp/x" },
});
assert(fs.kind === "fs_request", "fs kind");
assert(fs.method === "fs/read_text_file", "fs method");

console.log("  ✓ All assertions passed");

// ── Summary ──
console.log(`\n═══════════════════════════════════════════`);
console.log(`  ${passed} passed, ${failed} failed`);
console.log(`═══════════════════════════════════════════`);

if (failed > 0) process.exit(1);
