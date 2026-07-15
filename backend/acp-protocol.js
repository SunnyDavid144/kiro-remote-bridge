/**
 * ACP Protocol Helper
 *
 * Structures JSON-RPC 2.0 messages for the Agent Client Protocol lifecycle:
 *   initialize → session/new → session/prompt
 *
 * Also handles agent-to-client requests (permissions, questions) and
 * provides utilities for parsing streaming session/update notifications.
 *
 * Reference: https://agentclientprotocol.com/protocol/v1/overview
 */

// ---------------------------------------------------------------------------
// Request ID Generator
// ---------------------------------------------------------------------------

let _nextId = 1;

function nextId() {
  return _nextId++;
}

function resetIdCounter() {
  _nextId = 1;
}

// ---------------------------------------------------------------------------
// Core JSON-RPC 2.0 Envelope
// ---------------------------------------------------------------------------

function rpcRequest(method, params) {
  return {
    jsonrpc: "2.0",
    id: nextId(),
    method,
    params,
  };
}

function rpcNotification(method, params) {
  return {
    jsonrpc: "2.0",
    method,
    params,
  };
}

function rpcResponse(id, result) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

// ---------------------------------------------------------------------------
// Step 1: initialize
// ---------------------------------------------------------------------------

/**
 * Build the `initialize` request.
 *
 * @param {object} [opts]
 * @param {string} [opts.clientName]    - Client identifier
 * @param {string} [opts.clientVersion] - Client version
 * @param {object} [opts.capabilities]  - Override client capabilities
 * @returns {object} JSON-RPC request
 */
function initialize(opts = {}) {
  const {
    clientName = "kiro-remote-bridge",
    clientVersion = "1.0.0",
    capabilities = null,
  } = opts;

  const defaultCapabilities = {
    fs: {
      readTextFile: true,
      writeTextFile: true,
    },
    terminal: true,
  };

  return rpcRequest("initialize", {
    protocolVersion: 1,
    clientCapabilities: capabilities || defaultCapabilities,
    clientInfo: {
      name: clientName,
      title: "Kiro Remote Bridge",
      version: clientVersion,
    },
  });
}

// ---------------------------------------------------------------------------
// Step 2: session/new
// ---------------------------------------------------------------------------

/**
 * Build the `session/new` request.
 *
 * @param {object} [opts]
 * @param {string} [opts.cwd]         - Working directory for the session
 * @param {Array}  [opts.mcpServers]   - MCP server configurations
 * @returns {object} JSON-RPC request
 */
function sessionNew(opts = {}) {
  const { cwd = process.cwd(), mcpServers = [] } = opts;

  return rpcRequest("session/new", {
    cwd,
    mcpServers,
  });
}

// ---------------------------------------------------------------------------
// Step 3: session/prompt
// ---------------------------------------------------------------------------

/**
 * Build the `session/prompt` request.
 *
 * @param {string} sessionId - The session ID from session/new response
 * @param {string} text      - The user's message text
 * @param {object} [opts]
 * @param {Array}  [opts.images]   - Image content blocks
 * @param {object} [opts.meta]     - Optional _meta field
 * @returns {object} JSON-RPC request
 */
function sessionPrompt(sessionId, text, opts = {}) {
  const { images = [], meta = null } = opts;

  const prompt = [{ type: "text", text }];

  // Add image blocks if provided
  for (const img of images) {
    prompt.push({ type: "image", data: img.data, mimeType: img.mimeType });
  }

  const params = { sessionId, prompt };

  if (meta) {
    params._meta = meta;
  }

  return rpcRequest("session/prompt", params);
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

/**
 * Build a `session/cancel` notification (stops an ongoing prompt).
 */
function sessionCancel(sessionId) {
  return rpcNotification("session/cancel", { sessionId });
}

/**
 * Build a `session/set_config_option` request.
 *
 * @param {string} sessionId
 * @param {string} configId  - "mode" | "model" | "permission_mode"
 * @param {string} value     - The new value
 */
function sessionSetConfigOption(sessionId, configId, value) {
  return rpcRequest("session/set_config_option", {
    sessionId,
    configId,
    value,
  });
}

/**
 * Build a `session/load` request (resume a persisted session).
 */
function sessionLoad(sessionId, opts = {}) {
  const { cwd = process.cwd(), mcpServers = [] } = opts;

  return rpcRequest("session/load", {
    sessionId,
    cwd,
    mcpServers,
  });
}

// ---------------------------------------------------------------------------
// Agent-to-Client Response Helpers (for permissions & questions)
// ---------------------------------------------------------------------------

/**
 * Build a permission response.
 *
 * @param {number} requestId   - The JSON-RPC id from the agent's request
 * @param {string} optionId    - "allow" | "allow_always" | "reject"
 */
function respondPermission(requestId, optionId) {
  return rpcResponse(requestId, {
    outcome: optionId === "reject" ? "reject" : "allow",
    optionId,
  });
}

/**
 * Build a question response.
 *
 * @param {number} requestId   - The JSON-RPC id from the agent's request
 * @param {Array<Array<string>>} answers - Array of answer arrays
 */
function respondQuestion(requestId, answers) {
  return rpcResponse(requestId, { answers });
}

// ---------------------------------------------------------------------------
// Message Classification Helpers
// ---------------------------------------------------------------------------

/**
 * Classify an incoming JSON-RPC message from the agent.
 *
 * @param {object} msg - Parsed JSON-RPC message
 * @returns {object} Classified message with `kind` and relevant data
 */
function classify(msg) {
  // It's a response to one of our requests
  if (msg.id !== undefined && !msg.method) {
    if (msg.error) {
      return { kind: "error_response", id: msg.id, error: msg.error };
    }
    return { kind: "response", id: msg.id, result: msg.result };
  }

  // It's a notification from the agent
  if (msg.method === "session/update" && msg.params) {
    const update = msg.params.sessionUpdate || msg.params.type;
    return {
      kind: "session_update",
      updateType: update,
      params: msg.params,
    };
  }

  // It's a request FROM the agent (needs our response)
  if (msg.method === "session/request_permission") {
    return {
      kind: "permission_request",
      id: msg.id,
      params: msg.params,
    };
  }

  if (msg.method === "session/request_question") {
    return {
      kind: "question_request",
      id: msg.id,
      params: msg.params,
    };
  }

  // Filesystem requests from agent
  if (msg.method === "fs/read_text_file" || msg.method === "fs/write_text_file") {
    return {
      kind: "fs_request",
      id: msg.id,
      method: msg.method,
      params: msg.params,
    };
  }

  return { kind: "unknown", raw: msg };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // Core
  rpcRequest,
  rpcNotification,
  rpcResponse,
  nextId,
  resetIdCounter,

  // ACP Lifecycle
  initialize,
  sessionNew,
  sessionPrompt,
  sessionCancel,
  sessionSetConfigOption,
  sessionLoad,

  // Response helpers
  respondPermission,
  respondQuestion,

  // Classification
  classify,
};
