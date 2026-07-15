/**
 * ACP Client — Browser-side protocol message builders
 *
 * Mirrors the backend acp-protocol.js but in TypeScript for the frontend.
 */

import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from "./types";

let _nextId = 1;

export function nextId(): number {
  return _nextId++;
}

export function resetIdCounter(): void {
  _nextId = 1;
}

// ---------------------------------------------------------------------------
// JSON-RPC Builders
// ---------------------------------------------------------------------------

export function rpcRequest(method: string, params: Record<string, unknown>): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: nextId(),
    method,
    params,
  };
}

export function rpcResponse(id: number, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

// ---------------------------------------------------------------------------
// ACP Lifecycle Messages
// ---------------------------------------------------------------------------

export function initialize(): JsonRpcRequest {
  return rpcRequest("initialize", {
    protocolVersion: 1,
    clientCapabilities: {
      fs: { readTextFile: true, writeTextFile: true },
      terminal: true,
    },
    clientInfo: {
      name: "kiro-remote-bridge",
      title: "Kiro Remote Bridge",
      version: "1.0.0",
    },
  });
}

export function sessionNew(cwd?: string): JsonRpcRequest {
  return rpcRequest("session/new", {
    cwd: cwd || "/",
    mcpServers: [],
  });
}

export function sessionPrompt(sessionId: string, text: string): JsonRpcRequest {
  return rpcRequest("session/prompt", {
    sessionId,
    prompt: [{ type: "text", text }],
  });
}

export function sessionCancel(sessionId: string): JsonRpcNotification {
  return {
    jsonrpc: "2.0",
    method: "session/cancel",
    params: { sessionId },
  };
}

// ---------------------------------------------------------------------------
// Agent-to-Client Response Builders
// ---------------------------------------------------------------------------

export function respondPermission(requestId: number, optionId: string): JsonRpcResponse {
  return rpcResponse(requestId, {
    outcome: optionId === "reject" ? "reject" : "allow",
    optionId,
  });
}

export function respondQuestion(requestId: number, answers: string[][]): JsonRpcResponse {
  return rpcResponse(requestId, { answers });
}
