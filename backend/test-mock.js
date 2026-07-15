/**
 * Quick test of the mock agent round-trip.
 */
const WebSocket = require("ws");
const ws = new WebSocket("ws://127.0.0.1:3100/ws");

let sessionId = null;
let chunks = "";

ws.on("open", () => {
  console.log("Connected. Sending initialize...");
  ws.send(JSON.stringify({
    type: "acp:send",
    data: {
      jsonrpc: "2.0", id: 1, method: "initialize",
      params: { protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: "test", title: "Test", version: "1.0.0" } }
    }
  }));
});

ws.on("message", (raw) => {
  const envelope = JSON.parse(raw.toString());

  if (envelope.type === "bridge:status") {
    console.log("Bridge status:", envelope.acp);
    return;
  }

  if (envelope.type !== "acp:message") return;
  const msg = envelope.data;

  // Response to initialize
  if (msg.id === 1 && msg.result) {
    console.log("Initialize OK:", msg.result.agentInfo.name);
    ws.send(JSON.stringify({
      type: "acp:send",
      data: { jsonrpc: "2.0", id: 2, method: "session/new", params: { cwd: "/tmp", mcpServers: [] } }
    }));
    return;
  }

  // Response to session/new
  if (msg.id === 2 && msg.result) {
    sessionId = msg.result.sessionId;
    console.log("Session:", sessionId);
    console.log("Sending prompt...");
    ws.send(JSON.stringify({
      type: "acp:send",
      data: { jsonrpc: "2.0", id: 3, method: "session/prompt", params: { sessionId, prompt: [{ type: "text", text: "Hello!" }] } }
    }));
    return;
  }

  // Streaming updates
  if (msg.method === "session/update" && msg.params) {
    const u = msg.params.sessionUpdate;
    if (u === "agent_message_chunk") {
      chunks += msg.params.content.text;
      process.stdout.write(msg.params.content.text);
    } else if (u === "tool_call") {
      console.log("\n[tool]", msg.params.title, "-", msg.params.status);
    } else if (u === "plan") {
      // skip
    }
    return;
  }

  // Response to session/prompt (done)
  if (msg.id === 3 && msg.result) {
    console.log("\n\n--- DONE ---");
    console.log("Stop reason:", msg.result.stopReason);
    console.log("Total streamed:", chunks.length, "chars");
    ws.close();
  }
});

ws.on("close", () => process.exit(0));
ws.on("error", (e) => { console.error("Error:", e.message); process.exit(1); });
setTimeout(() => { console.log("\nTIMEOUT"); process.exit(1); }, 15000);
