/**
 * ACP Protocol Types — Client-Side
 *
 * TypeScript interfaces for the JSON-RPC 2.0 messages exchanged
 * between the frontend and the bridge server.
 */

// ---------------------------------------------------------------------------
// Bridge Envelope Types (WebSocket framing layer)
// ---------------------------------------------------------------------------

/** Client → Server envelope types */
export type ClientEnvelope =
  | { type: "acp:send"; data: JsonRpcRequest | JsonRpcResponse | JsonRpcNotification }
  | { type: "acp:restart" }
  | { type: "bridge:ping" };

/** Server → Client envelope types */
export type ServerEnvelope =
  | { type: "bridge:status"; acp: "running" | "stopped"; pid: number | null }
  | { type: "bridge:pong"; ts: number }
  | { type: "bridge:error"; data: string }
  | { type: "bridge:agent-status"; status: "idle" | "working" | "unknown"; queueLength: number }
  | { type: "acp:message"; data: JsonRpcMessage }
  | { type: "acp:stderr"; data: string }
  | { type: "acp:error"; data: string }
  | { type: "acp:exit"; code: number; signal: string | null }
  | { type: "acp:parse-error"; raw: string };

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 Base Types
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcNotification | JsonRpcResponse;

// ---------------------------------------------------------------------------
// ACP Session Types
// ---------------------------------------------------------------------------

export interface AcpAgentInfo {
  name: string;
  title: string;
  version: string;
}

export interface AcpConfigOption {
  id: string;
  name: string;
  description: string;
  category: string;
  type: "select";
  currentValue: string;
  options: Array<{ value: string; name: string; description: string }>;
}

export interface AcpInitializeResult {
  protocolVersion: number;
  agentCapabilities: Record<string, unknown>;
  agentInfo: AcpAgentInfo;
}

export interface AcpSessionNewResult {
  sessionId: string;
  configOptions?: AcpConfigOption[];
}

export interface AcpSessionPromptResult {
  stopReason: "end_turn" | "max_tokens" | "max_turns" | "agent_refused" | "cancelled";
}

// ---------------------------------------------------------------------------
// ACP Session Update Notification Types
// ---------------------------------------------------------------------------

export type SessionUpdateType =
  | "plan"
  | "agent_message_chunk"
  | "tool_call"
  | "tool_call_update"
  | "current_mode_update"
  | "config_option_update"
  | "available_commands_update"
  | "memory_phase"
  | "memory_message_chunk";

export interface PlanEntry {
  content: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed";
}

export interface SessionUpdatePlan {
  sessionUpdate: "plan";
  entries: PlanEntry[];
}

export interface SessionUpdateChunk {
  sessionUpdate: "agent_message_chunk";
  content: { type: "text"; text: string };
}

export interface SessionUpdateToolCall {
  sessionUpdate: "tool_call";
  toolCallId: string;
  title: string;
  kind: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
}

export interface SessionUpdateToolCallUpdate {
  sessionUpdate: "tool_call_update";
  toolCallId: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  content?: Array<{ type: string; content: { type: string; text: string } }>;
}

export interface SessionUpdateModeChange {
  sessionUpdate: "current_mode_update";
  modeId: string;
}

export type SessionUpdate =
  | SessionUpdatePlan
  | SessionUpdateChunk
  | SessionUpdateToolCall
  | SessionUpdateToolCallUpdate
  | SessionUpdateModeChange
  | { sessionUpdate: string; [key: string]: unknown };

// ---------------------------------------------------------------------------
// Permission & Question Request Types
// ---------------------------------------------------------------------------

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: "allow_once" | "allow_always" | "reject_once";
}

export interface PermissionRequest {
  sessionId: string;
  toolCall: {
    toolCallId: string;
    title: string;
    kind: string;
    status: string;
    content?: Array<{ type: string; text: string }>;
  };
  options: PermissionOption[];
}

export interface QuestionRequest {
  sessionId: string;
  requestId: string;
  toolCallId: string;
  questions: Array<{
    question: string;
    options?: Array<{ label: string }>;
  }>;
}

// ---------------------------------------------------------------------------
// Chat UI Message Types
// ---------------------------------------------------------------------------

export type ChatMessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCallInfo[];
  plan?: PlanEntry[];
  isStreaming?: boolean;
}

export interface ToolCallInfo {
  id: string;
  title: string;
  kind: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "cancelled";
  output?: string;
}

// ---------------------------------------------------------------------------
// Connection State
// ---------------------------------------------------------------------------

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";
export type AcpStatus = "running" | "stopped" | "unknown";

export interface BridgeState {
  connection: ConnectionStatus;
  acp: AcpStatus;
  pid: number | null;
  sessionId: string | null;
  initialized: boolean;
}
