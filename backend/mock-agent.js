/**
 * Mock ACP Agent
 *
 * A built-in agent that simulates ACP protocol responses, allowing the
 * full UI to be tested end-to-end without a real ACP binary.
 *
 * When no ACP_COMMAND is set, the bridge uses this mock agent to handle
 * all JSON-RPC requests directly — initialize, session/new, session/prompt.
 *
 * For session/prompt, it streams back markdown responses character-by-character
 * to exercise the full streaming pipeline.
 */

const crypto = require("crypto");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let sessionId = null;
let messageHistory = [];

// ---------------------------------------------------------------------------
// Mock Responses (demonstrates various markdown features)
// ---------------------------------------------------------------------------

const RESPONSES = [
  `Hey! I'm the **Kiro Remote Bridge** mock agent. Your mobile connection is working perfectly.

I can render:
- **Bold** and *italic* text
- \`inline code\` snippets
- Code blocks with syntax highlighting

\`\`\`javascript
const greeting = "Hello from your phone!";
console.log(greeting);
\`\`\`

Try sending another message to see more streaming in action.`,

  `Here's a quick status check:

| Component | Status |
|-----------|--------|
| Bridge Server | ✅ Running |
| WebSocket | ✅ Connected |
| Mobile Client | ✅ Active |
| ACP Agent | 🔶 Mock Mode |

> The bridge is in **mock mode** because no external ACP binary is configured. Set \`ACP_COMMAND\` to connect a real agent.

Everything looks good from here!`,

  `Let me show you what a tool call looks like in the UI:

I'll pretend to read a file and run a command.

The streaming pipeline is working — each character arrives individually over the WebSocket, gets assembled by the React hook, and rendered with the markdown parser.

\`\`\`python
# Here's some Python for variety
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print([fibonacci(i) for i in range(10)])
# [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

Pretty slick for a phone interface, right?`,

  `Got it. Here's what I know about this setup:

1. **Bridge Server** — Node.js + Express + WebSocket on port 3100
2. **Frontend** — Next.js React app on port 3101
3. **Protocol** — JSON-RPC 2.0 over WebSocket (ACP-compatible framing)
4. **Transport** — NDJSON for Kiro, Content-Length for LSP-style agents

### Architecture
\`\`\`
Phone → WebSocket → Bridge → ACP Agent (mock)
                         ↕
                    JSON-RPC 2.0
\`\`\`

When a real ACP binary becomes available, just set:
\`\`\`bash
ACP_COMMAND=/path/to/kiro-cli npm start
\`\`\`

And the mock agent will be bypassed automatically.`,
];

let responseIndex = 0;

// ---------------------------------------------------------------------------
// Handle incoming JSON-RPC messages
// ---------------------------------------------------------------------------

/**
 * Process a JSON-RPC request and return responses asynchronously
 * via the provided emit callback.
 *
 * @param {object} msg - JSON-RPC message
 * @param {function} emit - Callback to emit response messages: emit(jsonRpcMessage)
 */
function handleMessage(msg, emit) {
  if (!msg || !msg.method) return;

  switch (msg.method) {
    case "initialize":
      emit({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          protocolVersion: 1,
          agentCapabilities: {
            loadSession: false,
            sessionCapabilities: { list: {} },
            promptCapabilities: {
              image: false,
              audio: false,
              embeddedContext: false,
            },
          },
          agentInfo: {
            name: "kiro-remote-bridge-mock",
            title: "Kiro Remote Bridge (Mock Agent)",
            version: "1.0.0",
          },
        },
      });
      break;

    case "session/new":
      sessionId = `mock-${crypto.randomBytes(8).toString("hex")}`;
      messageHistory = [];
      emit({
        jsonrpc: "2.0",
        id: msg.id,
        result: {
          sessionId,
          configOptions: [
            {
              id: "mode",
              name: "Session mode",
              category: "mode",
              type: "select",
              currentValue: "agent",
              options: [
                { value: "agent", name: "Agent", description: "Mock agent mode" },
              ],
            },
          ],
        },
      });
      break;

    case "session/prompt":
      handlePrompt(msg, emit);
      break;

    case "session/cancel":
      // Nothing to cancel in mock mode
      break;

    default:
      emit({
        jsonrpc: "2.0",
        id: msg.id,
        error: { code: -32601, message: `Method not found: ${msg.method}` },
      });
  }
}

// ---------------------------------------------------------------------------
// Stream a response for session/prompt
// ---------------------------------------------------------------------------

function handlePrompt(msg, emit) {
  const promptText =
    msg.params?.prompt?.[0]?.text || "Hello";

  messageHistory.push({ role: "user", content: promptText });

  // Pick response (cycle through them)
  const response = RESPONSES[responseIndex % RESPONSES.length];
  responseIndex++;

  // Simulate a plan notification
  emit({
    jsonrpc: "2.0",
    method: "session/update",
    params: {
      sessionUpdate: "plan",
      entries: [
        { content: "Process user message", priority: "high", status: "in_progress" },
        { content: "Generate response", priority: "high", status: "pending" },
      ],
    },
  });

  // Simulate a tool call
  const toolCallId = `tool-${Date.now()}`;
  setTimeout(() => {
    emit({
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionUpdate: "tool_call",
        toolCallId,
        title: "Thinking...",
        kind: "think",
        status: "in_progress",
      },
    });
  }, 100);

  setTimeout(() => {
    emit({
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionUpdate: "tool_call_update",
        toolCallId,
        status: "completed",
      },
    });

    // Update plan
    emit({
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionUpdate: "plan",
        entries: [
          { content: "Process user message", priority: "high", status: "completed" },
          { content: "Generate response", priority: "high", status: "in_progress" },
        ],
      },
    });
  }, 300);

  // Stream the response character by character (in chunks for efficiency)
  const CHUNK_SIZE = 3; // characters per chunk
  const CHUNK_DELAY = 20; // ms between chunks
  let offset = 0;

  function streamNextChunk() {
    if (offset >= response.length) {
      // Done streaming — send final plan update and prompt response
      emit({
        jsonrpc: "2.0",
        method: "session/update",
        params: {
          sessionUpdate: "plan",
          entries: [
            { content: "Process user message", priority: "high", status: "completed" },
            { content: "Generate response", priority: "high", status: "completed" },
          ],
        },
      });

      emit({
        jsonrpc: "2.0",
        id: msg.id,
        result: { stopReason: "end_turn" },
      });

      messageHistory.push({ role: "assistant", content: response });
      return;
    }

    const chunk = response.slice(offset, offset + CHUNK_SIZE);
    offset += CHUNK_SIZE;

    emit({
      jsonrpc: "2.0",
      method: "session/update",
      params: {
        sessionUpdate: "agent_message_chunk",
        content: { type: "text", text: chunk },
      },
    });

    setTimeout(streamNextChunk, CHUNK_DELAY);
  }

  // Start streaming after the tool call completes
  setTimeout(streamNextChunk, 500);
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = { handleMessage };
