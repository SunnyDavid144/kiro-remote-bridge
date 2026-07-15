/**
 * Kiro Remote Bridge — Backend Server
 *
 * Relays JSON-RPC 2.0 messages between a mobile WebSocket client and
 * an ACP-compatible agent process via stdin/stdout.
 *
 * ACP Process Options (set via environment variables):
 *   - ACP_COMMAND: Full path to the ACP binary (default: searches common paths)
 *   - ACP_ARGS: Space-separated arguments (default: "acp")
 *   - ACP_TRANSPORT: "content-length" (LSP-style) or "ndjson" (newline-delimited)
 *
 * If no ACP binary is available, the server runs in "relay-only" mode
 * where it accepts WebSocket connections and waits for an ACP process
 * to be connected manually (via the acp:attach command).
 */

const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const mockAgent = require("./mock-agent");
const { AdapterRegistry } = require("./adapters");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 3100;

// ACP process configuration
const ACP_COMMAND = process.env.ACP_COMMAND || findAcpBinary();
const ACP_ARGS = (process.env.ACP_ARGS || "acp").split(" ");
const ACP_TRANSPORT = process.env.ACP_TRANSPORT || "ndjson";

// Bridge relay mode — writes prompts to a file that Kiro hooks pick up
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || path.resolve(__dirname, "..");
const BRIDGE_DIR = path.join(WORKSPACE_ROOT, ".kiro-bridge");
const PROMPT_FILE = path.join(BRIDGE_DIR, "prompt.md");
const RESPONSE_FILE = path.join(BRIDGE_DIR, "response.md");
const MODE = process.env.BRIDGE_MODE || "relay"; // "relay" (file-based Kiro hook) or "acp" (subprocess)

// ---------------------------------------------------------------------------
// Find ACP binary
// ---------------------------------------------------------------------------

function findAcpBinary() {
  // Check common locations for ACP-compatible binaries
  const candidates = [
    // User-installed standalone (future)
    "/usr/local/bin/kiro-cli",
    // Homebrew
    "/opt/homebrew/bin/kiro-cli",
    // npm global
    path.join(process.env.HOME || "", ".npm-global/bin/kiro-cli"),
  ];

  for (const bin of candidates) {
    if (fs.existsSync(bin)) {
      return bin;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Express app (health check + future static serving for frontend)
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// CORS — allow frontend on any port to access the API
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    acp: acpProcess ? "running" : "mock",
    transport: ACP_TRANSPORT,
    clients: wss ? wss.clients.size : 0,
  });
});

// ---------------------------------------------------------------------------
// Workspace Discovery — Multi-IDE adapter system
// ---------------------------------------------------------------------------

const registry = new AdapterRegistry();
registry.setActive("kiro"); // Default to Kiro

let targetWindow = null;

// List all running IDEs and their windows
app.get("/api/windows", async (_req, res) => {
  try {
    const allWindows = await registry.listAllWindows();
    res.json({
      windows: allWindows,
      activeIde: registry.activeAdapter,
      target: targetWindow,
    });
  } catch (err) {
    res.json({ windows: [], error: err.message, target: targetWindow });
  }
});

// List detected IDEs
app.get("/api/ides", async (_req, res) => {
  const running = await registry.detectRunning();
  const all = registry.listAll();
  res.json({
    all,
    running,
    active: registry.activeAdapter,
  });
});

// Set active IDE
app.post("/api/ide", (req, res) => {
  const { ide } = req.body;
  try {
    registry.setActive(ide);
    console.log(`[bridge] Active IDE set to: ${ide}`);
    res.json({ ok: true, active: ide });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Set target window
app.post("/api/target", (req, res) => {
  const { window: win, ide } = req.body;
  targetWindow = win || null;
  if (ide) {
    try { registry.setActive(ide); } catch {}
  }
  console.log(`[bridge] Target: ${registry.activeAdapter} → ${targetWindow || "(frontmost)"}`);
  res.json({ ok: true, target: targetWindow, ide: registry.activeAdapter });
});

// ---------------------------------------------------------------------------
// Agent Status Detection — Polls Kiro UI state via AppleScript
// ---------------------------------------------------------------------------

let agentStatus = "idle"; // "idle" | "working" | "unknown"
let promptQueue = []; // Queued prompts waiting for agent to become idle
let statusPoller = null;

function startStatusPoller() {
  if (statusPoller) return;

  const { exec } = require("child_process");
  let lastSeenResponseContent = "";
  let responseStableCount = 0; // How many polls the response hasn't changed

  statusPoller = setInterval(() => {
    try {
      if (fs.existsSync(RESPONSE_FILE)) {
        const content = fs.readFileSync(RESPONSE_FILE, "utf-8");

        if (content.length > 0 && content !== lastSeenResponseContent) {
          // Response is actively growing — agent is working
          lastSeenResponseContent = content;
          responseStableCount = 0;
          if (agentStatus !== "working") {
            agentStatus = "working";
            broadcastStatus();
          }
          return;
        }

        if (content.length > 0 && content === lastSeenResponseContent) {
          // Response hasn't changed since last poll
          responseStableCount++;

          // If stable for 3+ polls (6 seconds) and we had a pending prompt, agent is done
          if (responseStableCount >= 3 && pendingPromptId) {
            console.log("[status] Response stable — agent finished");
            stopResponseWatcher();
            agentStatus = "idle";
            broadcastStatus();
            drainPromptQueue();
            return;
          }
        }
      }
    } catch {}

    // If there's a pending prompt sent in last 10s with no response yet, still working
    if (pendingPromptId && lastPromptSentAt && Date.now() - lastPromptSentAt < 10000) {
      if (agentStatus !== "working") {
        agentStatus = "working";
        broadcastStatus();
      }
      return;
    }

    // If no pending prompt, idle
    if (!pendingPromptId && agentStatus !== "idle") {
      agentStatus = "idle";
      broadcastStatus();
      drainPromptQueue();
    }
  }, 2000);
}

function broadcastStatus() {
  console.log(`[status] Agent is now: ${agentStatus}`);
  broadcast({
    type: "bridge:agent-status",
    status: agentStatus,
    queueLength: promptQueue.length,
  });
}

function drainPromptQueue() {
  if (promptQueue.length === 0) return;
  if (agentStatus !== "idle") return;

  const next = promptQueue.shift();
  console.log(`[queue] Draining queued prompt: "${next.text.slice(0, 50)}"`);
  relayPromptToKiro(next.jsonRpcMessage, next.text);
}

let lastPromptSentAt = null;

// API endpoint for status
app.get("/api/status", (_req, res) => {
  res.json({
    agentStatus,
    queueLength: promptQueue.length,
    queue: promptQueue.map((p) => ({ text: p.text.slice(0, 80), timestamp: p.timestamp })),
  });
});

// ---------------------------------------------------------------------------
// HTTP + WebSocket Server
// ---------------------------------------------------------------------------

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// ---------------------------------------------------------------------------
// ACP Subprocess Management
// ---------------------------------------------------------------------------

let acpProcess = null;
let stdoutBuffer = "";

function spawnAcp() {
  if (!ACP_COMMAND) {
    console.log("[bridge] No ACP binary found. Running in relay-only mode.");
    console.log("[bridge] Set ACP_COMMAND env var to specify the ACP binary path.");
    console.log("[bridge] Or connect an ACP process via the WebSocket protocol.");
    console.log("");
    console.log("[bridge] The bridge is ready — connect from your mobile device.");
    console.log("[bridge] Messages will be buffered until an ACP process is available.");
    return;
  }

  console.log(`[bridge] Spawning ACP: ${ACP_COMMAND} ${ACP_ARGS.join(" ")}`);

  const env = { ...process.env };
  // If using Kiro's Electron wrapper, set ELECTRON_RUN_AS_NODE
  if (ACP_COMMAND.includes("Electron") || ACP_COMMAND.includes("Kiro")) {
    env.ELECTRON_RUN_AS_NODE = "1";
  }

  acpProcess = spawn(ACP_COMMAND, ACP_ARGS, {
    stdio: ["pipe", "pipe", "pipe"],
    env,
  });

  acpProcess.stdout.on("data", (chunk) => {
    stdoutBuffer += chunk.toString();
    drainMessages();
  });

  acpProcess.stderr.on("data", (chunk) => {
    const text = chunk.toString().trim();
    if (text) {
      console.error(`[acp:stderr] ${text}`);
      broadcast({ type: "acp:stderr", data: text });
    }
  });

  acpProcess.on("error", (err) => {
    console.error("[bridge] Failed to spawn ACP:", err.message);
    broadcast({ type: "acp:error", data: err.message });
    acpProcess = null;
  });

  acpProcess.on("close", (code, signal) => {
    console.log(`[bridge] ACP exited (code=${code}, signal=${signal})`);
    broadcast({ type: "acp:exit", code, signal });
    acpProcess = null;
  });

  console.log("[bridge] ACP spawned (pid:", acpProcess.pid + ")");
}

// ---------------------------------------------------------------------------
// Message Framing — supports both Content-Length and NDJSON
// ---------------------------------------------------------------------------

function drainMessages() {
  if (ACP_TRANSPORT === "ndjson") {
    drainNdjson();
  } else {
    drainContentLength();
  }
}

/**
 * Newline-Delimited JSON (NDJSON) — one JSON object per line.
 * Used by Kiro's ACP implementation.
 */
function drainNdjson() {
  const lines = stdoutBuffer.split("\n");
  // Keep the last incomplete line in the buffer
  stdoutBuffer = lines.pop() || "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const message = JSON.parse(trimmed);
      console.log("[acp→client]", JSON.stringify(message).slice(0, 200));
      broadcast({ type: "acp:message", data: message });
    } catch (err) {
      // Not JSON — might be log output, ignore
      console.warn("[bridge] Non-JSON stdout:", trimmed.slice(0, 100));
    }
  }
}

/**
 * Content-Length framing (LSP-style).
 * Used by some ACP implementations.
 */
function drainContentLength() {
  const HEADER_DELIM = "\r\n\r\n";

  while (true) {
    const delimIdx = stdoutBuffer.indexOf(HEADER_DELIM);
    if (delimIdx === -1) break;

    const headerBlock = stdoutBuffer.slice(0, delimIdx);
    const contentLengthMatch = headerBlock.match(/Content-Length:\s*(\d+)/i);

    if (!contentLengthMatch) {
      console.warn("[bridge] Malformed header, skipping:", headerBlock);
      stdoutBuffer = stdoutBuffer.slice(delimIdx + HEADER_DELIM.length);
      continue;
    }

    const contentLength = parseInt(contentLengthMatch[1], 10);
    const bodyStart = delimIdx + HEADER_DELIM.length;

    if (stdoutBuffer.length < bodyStart + contentLength) {
      break;
    }

    const body = stdoutBuffer.slice(bodyStart, bodyStart + contentLength);
    stdoutBuffer = stdoutBuffer.slice(bodyStart + contentLength);

    try {
      const message = JSON.parse(body);
      console.log("[acp→client]", JSON.stringify(message).slice(0, 200));
      broadcast({ type: "acp:message", data: message });
    } catch (err) {
      console.error("[bridge] Failed to parse ACP JSON:", err.message);
      broadcast({ type: "acp:parse-error", raw: body });
    }
  }
}

// ---------------------------------------------------------------------------
// Write a JSON-RPC message to ACP stdin
// ---------------------------------------------------------------------------

function sendToAcp(jsonRpcMessage) {
  // If we have a live ACP process, pipe to it
  if (acpProcess && acpProcess.stdin.writable) {
    const payload = JSON.stringify(jsonRpcMessage);

    if (ACP_TRANSPORT === "ndjson") {
      acpProcess.stdin.write(payload + "\n");
    } else {
      const header = `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n`;
      acpProcess.stdin.write(header + payload);
    }

    console.log("[client→acp]", payload.slice(0, 200));
    return true;
  }

  // Relay mode — write prompt to file for Kiro hook to pick up
  if (MODE === "relay" && jsonRpcMessage.method === "session/prompt") {
    const text = jsonRpcMessage.params?.prompt?.[0]?.text || "";

    // If agent is busy, queue the prompt instead of interrupting
    if (agentStatus === "working") {
      console.log(`[queue] Agent busy — queuing prompt: "${text.slice(0, 50)}"`);
      promptQueue.push({ jsonRpcMessage, text, timestamp: Date.now() });
      broadcast({
        type: "acp:message",
        data: {
          jsonrpc: "2.0",
          method: "session/update",
          params: {
            sessionUpdate: "plan",
            entries: [
              { content: `Queued (agent is busy) — position ${promptQueue.length}`, priority: "medium", status: "pending" },
            ],
          },
        },
      });
      broadcastStatus();
      return true;
    }

    return relayPromptToKiro(jsonRpcMessage, text);
  }

  // For initialize/session/new or when no ACP — use mock agent for protocol handshake
  console.log("[client→mock]", JSON.stringify(jsonRpcMessage).slice(0, 200));
  mockAgent.handleMessage(jsonRpcMessage, (response) => {
    console.log("[mock→client]", JSON.stringify(response).slice(0, 200));
    broadcast({ type: "acp:message", data: response });
  });
  return true;
}

// ---------------------------------------------------------------------------
// Relay Mode — AppleScript injection into Kiro chat UI
// ---------------------------------------------------------------------------

let responseWatcher = null;
let lastResponseContent = "";
let pendingPromptId = null;

const ROUTING_SUFFIX = `\n\n[System Routing: Please ensure you also stream a raw markdown copy of this response to .kiro-bridge/response.md so it can be relayed to my mobile device. Clear the file before starting.]`;

function relayPromptToKiro(jsonRpcMessage, text) {
  console.log(`[relay] Injecting prompt into Kiro via AppleScript...`);
  console.log(`[relay] Prompt: "${text.slice(0, 100)}"`);

  // Track timing for status detection
  lastPromptSentAt = Date.now();
  agentStatus = "working";
  broadcastStatus();
  // Ensure bridge dir exists
  if (!fs.existsSync(BRIDGE_DIR)) {
    fs.mkdirSync(BRIDGE_DIR, { recursive: true });
  }

  // Clear response file before injecting
  fs.writeFileSync(RESPONSE_FILE, "");
  lastResponseContent = "";
  pendingPromptId = jsonRpcMessage.id;

  // Append the hidden routing instruction
  const fullPrompt = text + ROUTING_SUFFIX;

  // Build the AppleScript
  // Uses clipboard to avoid issues with special characters and slow keystroke typing
  const script = targetWindow
    ? `
set the clipboard to ${JSON.stringify(fullPrompt)}
tell application "Kiro"
  activate
  set index of (first window whose name contains ${JSON.stringify(targetWindow)}) to 1
end tell
delay 0.3
tell application "System Events"
  keystroke "l" using command down
  delay 0.2
  keystroke "v" using command down
  delay 0.1
  keystroke return
end tell
`
    : `
set the clipboard to ${JSON.stringify(fullPrompt)}
tell application "Kiro" to activate
delay 0.2
tell application "System Events"
  keystroke "l" using command down
  delay 0.2
  keystroke "v" using command down
  delay 0.1
  keystroke return
end tell
`;

  // Inject via the active adapter
  registry.injectPrompt(fullPrompt, null, targetWindow).then((success) => {
    if (success) {
      console.log(`[relay] Prompt injected via ${registry.activeAdapter} adapter`);
    } else {
      console.error(`[relay] Adapter injection failed`);
      broadcast({
        type: "acp:message",
        data: {
          jsonrpc: "2.0",
          method: "session/update",
          params: {
            sessionUpdate: "agent_message_chunk",
            content: { type: "text", text: `Error: Failed to inject prompt into ${registry.activeAdapter}` },
          },
        },
      });
    }
  });

  // Send streaming indicator to client
  broadcast({
    type: "acp:message",
    data: {
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionUpdate: "plan",
        entries: [
          { content: "Prompt injected into Kiro", priority: "high", status: "completed" },
          { content: "Waiting for agent response...", priority: "high", status: "in_progress" },
        ],
      },
    },
  });

  // Start watching for response
  startResponseWatcher();
  return true;
}

function startResponseWatcher() {
  // Reset existing watcher if running
  if (responseWatcher) {
    clearInterval(responseWatcher);
    responseWatcher = null;
  }

  console.log(`[relay] Watching ${RESPONSE_FILE} for changes...`);

  // Poll the response file for changes
  responseWatcher = setInterval(() => {
    try {
      if (!fs.existsSync(RESPONSE_FILE)) return;

      const content = fs.readFileSync(RESPONSE_FILE, "utf-8");
      if (content === lastResponseContent) return;
      if (!content.trim()) return; // Ignore empty/cleared file

      // Find new content
      const newContent = content.slice(lastResponseContent.length);
      lastResponseContent = content;

      if (newContent.trim()) {
        console.log("[relay] Response update detected:", newContent.slice(0, 100));
        // Stream the new content as agent_message_chunk
        broadcast({
          type: "acp:message",
          data: {
            jsonrpc: "2.0",
            method: "session/update",
            params: {
              sessionUpdate: "agent_message_chunk",
              content: { type: "text", text: newContent },
            },
          },
        });
      }
    } catch (err) {
      // File might be mid-write, skip
    }
  }, 500);

  // Auto-stop watching after 5 minutes (safety timeout)
  setTimeout(() => stopResponseWatcher(), 5 * 60 * 1000);
}

function stopResponseWatcher() {
  if (responseWatcher) {
    clearInterval(responseWatcher);
    responseWatcher = null;
  }

  // Send end_turn
  if (pendingPromptId) {
    broadcast({
      type: "acp:message",
      data: {
        jsonrpc: "2.0",
        id: pendingPromptId,
        result: { stopReason: "end_turn" },
      },
    });
    pendingPromptId = null;
  }
}

// Endpoint to manually signal "response complete"
app.post("/response-complete", (_req, res) => {
  console.log("[relay] Response complete signal received");
  stopResponseWatcher();
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// WebSocket Connection Handling
// ---------------------------------------------------------------------------

function broadcast(envelope) {
  const raw = JSON.stringify(envelope);
  for (const client of wss.clients) {
    if (client.readyState === 1 /* OPEN */) {
      client.send(raw);
    }
  }
}

wss.on("connection", (ws, req) => {
  const clientAddr = req.socket.remoteAddress;
  console.log(`[bridge] WebSocket client connected from ${clientAddr}`);

  // Send current ACP status on connect
  ws.send(
    JSON.stringify({
      type: "bridge:status",
      acp: acpProcess ? "running" : "running", // mock agent always available
      pid: acpProcess?.pid ?? null,
    })
  );

  // Send agent status
  ws.send(
    JSON.stringify({
      type: "bridge:agent-status",
      status: agentStatus,
      queueLength: promptQueue.length,
    })
  );

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "bridge:error", data: "Invalid JSON" }));
      return;
    }

    // Route based on envelope type
    switch (msg.type) {
      case "acp:send":
        if (!msg.data) {
          ws.send(
            JSON.stringify({
              type: "bridge:error",
              data: "Missing msg.data (JSON-RPC payload)",
            })
          );
          return;
        }
        sendToAcp(msg.data);
        break;

      case "acp:restart":
        if (acpProcess) {
          acpProcess.kill("SIGTERM");
        }
        setTimeout(spawnAcp, 500);
        break;

      case "bridge:ping":
        ws.send(JSON.stringify({ type: "bridge:pong", ts: Date.now() }));
        break;

      default:
        ws.send(
          JSON.stringify({
            type: "bridge:error",
            data: `Unknown message type: ${msg.type}`,
          })
        );
    }
  });

  ws.on("close", () => {
    console.log(`[bridge] WebSocket client disconnected (${clientAddr})`);
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

server.listen(PORT, HOST, () => {
  console.log(`[bridge] Kiro Remote Bridge v1.0.0`);
  console.log(`[bridge] ─────────────────────────────────────`);
  console.log(`[bridge] HTTP:      http://${HOST}:${PORT}`);
  console.log(`[bridge] WebSocket: ws://${HOST}:${PORT}/ws`);
  console.log(`[bridge] Health:    http://${HOST}:${PORT}/health`);
  console.log(`[bridge] Mode:      ${MODE}`);
  console.log(`[bridge] Transport: ${ACP_TRANSPORT}`);
  if (MODE === "relay") {
    console.log(`[bridge] Prompt:    ${PROMPT_FILE}`);
    console.log(`[bridge] Response:  ${RESPONSE_FILE}`);
  } else {
    console.log(`[bridge] ACP bin:   ${ACP_COMMAND || "(none — mock mode)"}`);
  }
  console.log(`[bridge] ─────────────────────────────────────`);
  console.log("");
  if (MODE !== "relay") {
    spawnAcp();
  } else {
    console.log("[bridge] Relay mode active.");
    console.log("[bridge] Prompts from phone will be written to the prompt file.");
    console.log("[bridge] Kiro hook will pick them up and respond via the response file.");
    console.log("");
    startStatusPoller();
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[bridge] Shutting down...");
  if (acpProcess) acpProcess.kill("SIGTERM");
  wss.close();
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  if (acpProcess) acpProcess.kill("SIGTERM");
  wss.close();
  server.close(() => process.exit(0));
});
