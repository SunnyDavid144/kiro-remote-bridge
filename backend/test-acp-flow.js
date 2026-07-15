/**
 * Kiro Remote Bridge — Full ACP Flow Test Client
 *
 * Demonstrates the complete lifecycle:
 *   1. Connect to the bridge WebSocket
 *   2. Send `initialize` to negotiate capabilities
 *   3. Send `session/new` to create a session
 *   4. Send `session/prompt` with "Hello World"
 *   5. Stream and display all incoming session/update notifications
 *   6. Handle permission requests with auto-allow
 *
 * Usage:
 *   node test-acp-flow.js [prompt]
 *
 * Examples:
 *   node test-acp-flow.js
 *   node test-acp-flow.js "List the files in this directory"
 */

const WebSocket = require("ws");
const acp = require("./acp-protocol");

const WS_URL = "ws://127.0.0.1:3100/ws";
const USER_PROMPT = process.argv[2] || "Hello World! Please respond with a brief greeting.";

// Track state
let sessionId = null;
let pendingRequests = new Map(); // id → { method, resolve, reject }
let phase = "connecting"; // connecting → initializing → creating_session → prompting → streaming → done

// ---------------------------------------------------------------------------
// WebSocket Connection
// ---------------------------------------------------------------------------

console.log(`\n╔══════════════════════════════════════════════════╗`);
console.log(`║   Kiro Remote Bridge — ACP Flow Test            ║`);
console.log(`╚══════════════════════════════════════════════════╝\n`);
console.log(`[flow] Connecting to ${WS_URL}...`);

const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log(`[flow] ✓ Connected\n`);
  startInitialize();
});

ws.on("message", (raw) => {
  const envelope = JSON.parse(raw.toString());
  handleEnvelope(envelope);
});

ws.on("error", (err) => {
  console.error(`[flow] ✗ Connection error: ${err.message}`);
  console.error(`[flow]   Is the bridge server running? → npm start`);
  process.exit(1);
});

ws.on("close", () => {
  console.log(`\n[flow] Disconnected.`);
  process.exit(0);
});

// ---------------------------------------------------------------------------
// Protocol Flow
// ---------------------------------------------------------------------------

function sendAcp(message) {
  const envelope = { type: "acp:send", data: message };
  ws.send(JSON.stringify(envelope));

  // Track requests (messages with an id)
  if (message.id !== undefined) {
    pendingRequests.set(message.id, { method: message.method });
  }
}

function startInitialize() {
  phase = "initializing";
  console.log(`── Step 1: initialize ──────────────────────────────`);
  console.log(`[flow] Sending initialize request...`);

  const msg = acp.initialize({
    clientName: "kiro-remote-bridge",
    clientVersion: "1.0.0",
  });

  console.log(`[flow] →`, JSON.stringify(msg, null, 2));
  sendAcp(msg);
}

function startSessionNew() {
  phase = "creating_session";
  console.log(`\n── Step 2: session/new ─────────────────────────────`);
  console.log(`[flow] Creating new session...`);

  const msg = acp.sessionNew({ cwd: process.cwd() });

  console.log(`[flow] →`, JSON.stringify(msg, null, 2));
  sendAcp(msg);
}

function startPrompt() {
  phase = "prompting";
  console.log(`\n── Step 3: session/prompt ──────────────────────────`);
  console.log(`[flow] Sending prompt: "${USER_PROMPT}"`);

  const msg = acp.sessionPrompt(sessionId, USER_PROMPT);

  console.log(`[flow] →`, JSON.stringify(msg, null, 2));
  sendAcp(msg);
  phase = "streaming";
  console.log(`\n── Streaming Response ──────────────────────────────`);
}

// ---------------------------------------------------------------------------
// Message Handling
// ---------------------------------------------------------------------------

function handleEnvelope(envelope) {
  switch (envelope.type) {
    case "bridge:status":
      console.log(
        `[bridge] ACP status: ${envelope.acp} (pid: ${envelope.pid})`
      );
      if (envelope.acp === "stopped") {
        console.error(`[flow] ✗ ACP process is not running.`);
        console.error(`[flow]   The kiro-cli binary may not be on PATH.`);
        console.error(`[flow]   Bridge will still relay messages (useful for protocol testing).\n`);
      }
      break;

    case "acp:message":
      handleAcpMessage(envelope.data);
      break;

    case "acp:stderr":
      console.log(`[acp:stderr] ${envelope.data}`);
      break;

    case "acp:error":
      console.error(`[acp:error] ${envelope.data}`);
      break;

    case "acp:exit":
      console.log(`[acp:exit] code=${envelope.code} signal=${envelope.signal}`);
      break;

    case "bridge:error":
      console.error(`[bridge:error] ${envelope.data}`);
      break;

    default:
      console.log(`[?] Unknown envelope:`, envelope);
  }
}

function handleAcpMessage(msg) {
  const classified = acp.classify(msg);

  switch (classified.kind) {
    case "response":
      handleResponse(classified);
      break;

    case "error_response":
      handleErrorResponse(classified);
      break;

    case "session_update":
      handleSessionUpdate(classified);
      break;

    case "permission_request":
      handlePermissionRequest(classified);
      break;

    case "question_request":
      handleQuestionRequest(classified);
      break;

    case "fs_request":
      handleFsRequest(classified);
      break;

    default:
      console.log(`[acp] Unhandled:`, JSON.stringify(msg, null, 2));
  }
}

// ---------------------------------------------------------------------------
// Response Handlers
// ---------------------------------------------------------------------------

function handleResponse(classified) {
  const pending = pendingRequests.get(classified.id);
  pendingRequests.delete(classified.id);

  const method = pending?.method || "unknown";

  switch (method) {
    case "initialize":
      console.log(`[flow] ✓ Initialize successful`);
      if (classified.result?.agentInfo) {
        const info = classified.result.agentInfo;
        console.log(`[flow]   Agent: ${info.name} v${info.version}`);
      }
      if (classified.result?.agentCapabilities) {
        console.log(`[flow]   Capabilities:`, JSON.stringify(classified.result.agentCapabilities, null, 4));
      }
      startSessionNew();
      break;

    case "session/new":
      sessionId = classified.result?.sessionId;
      console.log(`[flow] ✓ Session created: ${sessionId}`);
      if (classified.result?.configOptions) {
        console.log(`[flow]   Config options available:`);
        for (const opt of classified.result.configOptions) {
          console.log(`[flow]     ${opt.id}: ${opt.currentValue}`);
        }
      }
      startPrompt();
      break;

    case "session/prompt":
      const reason = classified.result?.stopReason || "unknown";
      console.log(`\n────────────────────────────────────────────────────`);
      console.log(`[flow] ✓ Prompt complete (stopReason: ${reason})`);
      console.log(`\n[flow] Full ACP lifecycle test complete!`);
      ws.close();
      break;

    default:
      console.log(`[acp] Response (id=${classified.id}):`, classified.result);
  }
}

function handleErrorResponse(classified) {
  const pending = pendingRequests.get(classified.id);
  pendingRequests.delete(classified.id);
  const method = pending?.method || "unknown";

  console.error(`[flow] ✗ Error in ${method} (id=${classified.id}):`);
  console.error(`[flow]   Code: ${classified.error.code}`);
  console.error(`[flow]   Message: ${classified.error.message}`);

  // Don't abort on error — continue to show the full picture
}

// ---------------------------------------------------------------------------
// Streaming Update Handlers
// ---------------------------------------------------------------------------

function handleSessionUpdate(classified) {
  const { updateType, params } = classified;

  switch (updateType) {
    case "agent_message_chunk":
      // Stream text content inline
      const text = params.content?.text || params.content?.data || "";
      process.stdout.write(text);
      break;

    case "plan":
      console.log(`\n[plan] Agent execution plan:`);
      if (params.entries) {
        for (const entry of params.entries) {
          const icon = entry.status === "completed" ? "✓" : "○";
          console.log(`[plan]   ${icon} ${entry.content}`);
        }
      }
      break;

    case "tool_call":
      console.log(
        `\n[tool] ${params.title || params.toolCallId} (${params.kind || "unknown"}) — ${params.status}`
      );
      break;

    case "tool_call_update":
      const status = params.status || "unknown";
      const icon = status === "completed" ? "✓" : status === "failed" ? "✗" : "…";
      console.log(`[tool] ${icon} ${params.toolCallId} → ${status}`);
      if (params.content) {
        for (const block of params.content) {
          if (block.content?.text) {
            const preview = block.content.text.slice(0, 100);
            console.log(`[tool]   ${preview}${block.content.text.length > 100 ? "..." : ""}`);
          }
        }
      }
      break;

    case "current_mode_update":
      console.log(`[mode] Switched to: ${params.modeId}`);
      break;

    case "config_option_update":
      console.log(`[config] Options updated`);
      break;

    case "available_commands_update":
      if (params.availableCommands?.length) {
        console.log(`[commands] Available: ${params.availableCommands.map((c) => "/" + c.name).join(", ")}`);
      }
      break;

    default:
      console.log(`[update:${updateType}]`, JSON.stringify(params).slice(0, 120));
  }
}

// ---------------------------------------------------------------------------
// Permission & Question Handlers (Auto-allow for testing)
// ---------------------------------------------------------------------------

function handlePermissionRequest(classified) {
  const { id, params } = classified;
  const tool = params.toolCall;

  console.log(`\n[permission] Agent requests: ${tool?.title || "unknown action"}`);
  console.log(`[permission]   Kind: ${tool?.kind}`);
  console.log(`[permission]   Auto-allowing for test...`);

  // Auto-allow in test mode
  const response = acp.respondPermission(id, "allow");
  sendAcp(response);
}

function handleQuestionRequest(classified) {
  const { id, params } = classified;

  console.log(`\n[question] Agent asks:`);
  for (const q of params.questions || []) {
    console.log(`[question]   "${q.question}"`);
    if (q.options?.length) {
      console.log(`[question]   Options: ${q.options.map((o) => o.label).join(", ")}`);
    }
  }

  // Auto-pick first option for testing
  const answers = (params.questions || []).map((q) => {
    return q.options?.length ? [q.options[0].label] : ["yes"];
  });

  console.log(`[question]   Auto-answering: ${JSON.stringify(answers)}`);
  const response = acp.respondQuestion(id, answers);
  sendAcp(response);
}

function handleFsRequest(classified) {
  const { id, method, params } = classified;
  console.log(`\n[fs] Agent requests: ${method}`);
  console.log(`[fs]   Path: ${params?.path}`);

  // For testing, we can respond with a simple error or stub
  if (method === "fs/read_text_file") {
    const fs = require("fs");
    try {
      const content = fs.readFileSync(params.path, "utf-8");
      sendAcp(acp.rpcResponse(id, { content }));
      console.log(`[fs]   ✓ Served file (${content.length} bytes)`);
    } catch (err) {
      sendAcp({
        jsonrpc: "2.0",
        id,
        error: { code: -32000, message: err.message },
      });
      console.log(`[fs]   ✗ ${err.message}`);
    }
  } else if (method === "fs/write_text_file") {
    // Don't auto-write in test mode
    console.log(`[fs]   ✗ Refusing write in test mode`);
    sendAcp({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: "Write refused in test mode" },
    });
  }
}

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

setTimeout(() => {
  console.log(`\n[flow] Timeout (60s) — closing connection.`);
  ws.close();
}, 60000);
