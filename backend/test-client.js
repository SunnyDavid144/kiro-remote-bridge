/**
 * Kiro Remote Bridge — Test WebSocket Client
 *
 * A quick-and-dirty CLI client to verify the bridge server is running,
 * the WebSocket connection works, and messages relay correctly.
 *
 * Usage:
 *   node test-client.js
 */

const WebSocket = require("ws");

const WS_URL = "ws://127.0.0.1:3100/ws";

console.log(`[test] Connecting to ${WS_URL}...`);
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("[test] Connected!\n");

  // 1. Ping the bridge
  console.log("[test] Sending bridge:ping...");
  ws.send(JSON.stringify({ type: "bridge:ping" }));
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log("[test] Received:", JSON.stringify(msg, null, 2));

  // After receiving pong, we know the bridge is healthy
  if (msg.type === "bridge:pong") {
    console.log("\n[test] ✓ Bridge is alive and responding.");
    console.log("[test] ✓ WebSocket relay is functional.");
    console.log(
      "\n[test] You can now send ACP messages with type: 'acp:send'."
    );
    console.log("[test] Closing connection.\n");
    ws.close();
  }
});

ws.on("error", (err) => {
  console.error("[test] Connection error:", err.message);
  console.error("[test] Is the bridge server running? Try: npm start");
  process.exit(1);
});

ws.on("close", () => {
  console.log("[test] Disconnected.");
  process.exit(0);
});
