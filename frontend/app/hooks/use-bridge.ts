"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BridgeState,
  ChatMessage,
  ClientEnvelope,
  JsonRpcMessage,
  JsonRpcRequest,
  JsonRpcResponse,
  PlanEntry,
  ServerEnvelope,
  ToolCallInfo,
} from "../lib/types";
import * as acp from "../lib/acp-client";
import * as storage from "../lib/storage";
import { tapMedium, tapSuccess, tapError, soundPop, soundConnect } from "../lib/haptics";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const WS_URL =
  typeof window !== "undefined"
    ? `ws://${window.location.hostname}:3100/ws`
    : "ws://127.0.0.1:3100/ws";

// Note: The backend must also listen on the network interface (not just 127.0.0.1)
// when accessed from another device. We'll bind to the same host the frontend uses.

const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseBridgeReturn {
  state: BridgeState;
  messages: ChatMessage[];
  sendPrompt: (text: string) => void;
  cancelPrompt: () => void;
  respondToPermission: (requestId: number, optionId: string) => void;
  reconnect: () => void;
  clearHistory: () => void;
  isStreaming: boolean;
  reconnectAttempt: number;
  agentStatus: "idle" | "working" | "unknown";
  queueLength: number;
}

export function useBridge(): UseBridgeReturn {
  const [state, setState] = useState<BridgeState>({
    connection: "connecting",
    acp: "unknown",
    pid: null,
    sessionId: null,
    initialized: false,
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [];
    return storage.loadMessages();
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"idle" | "working" | "unknown">("unknown");
  const [queueLength, setQueueLength] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRequests = useRef<Map<number, string>>(new Map());
  const streamingMessageRef = useRef<string>("");
  const initializedRef = useRef(false);

  // ─── Persist messages to localStorage ──────────────────────────────────

  useEffect(() => {
    // Only save when not actively streaming (avoid excessive writes)
    if (!isStreaming && messages.length > 0) {
      storage.saveMessages(messages);
    }
  }, [messages, isStreaming]);

  // Save session ID when it changes
  useEffect(() => {
    if (state.sessionId) {
      storage.saveSessionId(state.sessionId);
    }
  }, [state.sessionId]);

  // Save connected timestamp
  useEffect(() => {
    if (state.connection === "connected") {
      storage.saveConnectedAt();
    }
  }, [state.connection]);

  // ─── Helpers ───────────────────────────────────────────────────────────

  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random()}`,
        role: "system",
        content,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const send = useCallback((envelope: ClientEnvelope) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(envelope));
    }
  }, []);

  const sendAcp = useCallback(
    (msg: JsonRpcRequest | JsonRpcResponse) => {
      send({ type: "acp:send", data: msg });
      if ("id" in msg && "method" in msg) {
        pendingRequests.current.set(msg.id, (msg as JsonRpcRequest).method);
      }
    },
    [send]
  );

  // ─── ACP Flow ──────────────────────────────────────────────────────────

  const startInitialize = useCallback(() => {
    const msg = acp.initialize();
    sendAcp(msg);
  }, [sendAcp]);

  const startSessionNew = useCallback(() => {
    const msg = acp.sessionNew();
    sendAcp(msg);
  }, [sendAcp]);

  // ─── Message Handlers ──────────────────────────────────────────────────

  const handleAcpMessage = useCallback(
    (msg: JsonRpcMessage) => {
      // Response to our request
      if ("id" in msg && !("method" in msg)) {
        const method = pendingRequests.current.get(msg.id as number);
        pendingRequests.current.delete(msg.id as number);

        if ("error" in msg && msg.error) {
          addSystemMessage(`Error in ${method}: ${msg.error.message}`);
          return;
        }

        const result = (msg as JsonRpcResponse).result as Record<string, unknown>;

        switch (method) {
          case "initialize":
            initializedRef.current = true;
            setState((s) => ({ ...s, initialized: true }));
            startSessionNew();
            break;
          case "session/new":
            setState((s) => {
              // Only show system message on first session creation
              if (!s.sessionId) {
                addSystemMessage("Session ready. Send a message to begin.");
              }
              return { ...s, sessionId: result?.sessionId as string };
            });
            break;
          case "session/prompt":
            setIsStreaming(false);
            tapMedium();
            soundPop();
            // Finalize the streaming message — mark as not streaming
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, isStreaming: false },
                ];
              }
              return prev;
            });
            streamingMessageRef.current = "";
            break;
        }
        return;
      }

      // Notification from agent
      if ("method" in msg && msg.method === "session/update" && msg.params) {
        const params = msg.params as Record<string, unknown>;
        const updateType = params.sessionUpdate as string;

        switch (updateType) {
          case "agent_message_chunk": {
            const content = params.content as { type: string; text: string };
            const text = content?.text || "";
            streamingMessageRef.current += text;

            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: streamingMessageRef.current },
                ];
              }
              // Start a new assistant message
              return [
                ...prev,
                {
                  id: `ast-${Date.now()}`,
                  role: "assistant",
                  content: streamingMessageRef.current,
                  timestamp: Date.now(),
                  isStreaming: true,
                },
              ];
            });
            break;
          }

          case "plan": {
            const entries = params.entries as PlanEntry[];
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return [...prev.slice(0, -1), { ...last, plan: entries }];
              }
              // Create assistant message to hold the plan
              return [
                ...prev,
                {
                  id: `ast-${Date.now()}`,
                  role: "assistant",
                  content: "",
                  timestamp: Date.now(),
                  isStreaming: true,
                  plan: entries,
                },
              ];
            });
            break;
          }

          case "tool_call": {
            const toolInfo: ToolCallInfo = {
              id: params.toolCallId as string,
              title: params.title as string,
              kind: params.kind as string,
              status: params.status as ToolCallInfo["status"],
            };
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                const toolCalls = [...(last.toolCalls || []), toolInfo];
                return [...prev.slice(0, -1), { ...last, toolCalls }];
              }
              // Create assistant message to hold tool calls
              return [
                ...prev,
                {
                  id: `ast-${Date.now()}`,
                  role: "assistant",
                  content: "",
                  timestamp: Date.now(),
                  isStreaming: true,
                  toolCalls: [toolInfo],
                },
              ];
            });
            break;
          }

          case "tool_call_update": {
            const callId = params.toolCallId as string;
            const status = params.status as ToolCallInfo["status"];
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && last.toolCalls) {
                const toolCalls = last.toolCalls.map((tc) =>
                  tc.id === callId ? { ...tc, status } : tc
                );
                return [...prev.slice(0, -1), { ...last, toolCalls }];
              }
              return prev;
            });
            break;
          }
        }
        return;
      }

      // Permission request from agent (always has id)
      if ("method" in msg && "id" in msg && msg.method === "session/request_permission") {
        const params = msg.params as Record<string, unknown>;
        const toolCall = params.toolCall as { title: string; kind: string };
        addSystemMessage(`⚠️ Permission requested: ${toolCall?.title || "Unknown action"}`);
        // Auto-allow for now (we'll add UI for this in Step 4)
        const response = acp.respondPermission(msg.id, "allow");
        sendAcp(response);
        return;
      }

      // Question request from agent (always has id)
      if ("method" in msg && "id" in msg && msg.method === "session/request_question") {
        const params = msg.params as Record<string, unknown>;
        const questions = params.questions as Array<{ question: string }>;
        addSystemMessage(`❓ Agent asks: ${questions?.[0]?.question || "Unknown"}`);
        // Auto-answer for now
        const response = acp.respondQuestion(msg.id, [["yes"]]);
        sendAcp(response);
        return;
      }
    },
    [addSystemMessage, sendAcp, startSessionNew]
  );

  const handleEnvelope = useCallback(
    (envelope: ServerEnvelope) => {
      switch (envelope.type) {
        case "bridge:status":
          setState((s) => ({
            ...s,
            acp: envelope.acp,
            pid: envelope.pid,
          }));
          // Auto-initialize when ACP is running
          if (envelope.acp === "running" && !initializedRef.current) {
            startInitialize();
          }
          break;

        case "acp:message":
          handleAcpMessage(envelope.data);
          break;

        case "acp:stderr":
          // Log but don't clutter the chat
          console.warn("[acp:stderr]", envelope.data);
          break;

        case "acp:error":
          setState((s) => ({ ...s, acp: "stopped" }));
          addSystemMessage(`ACP error: ${envelope.data}`);
          break;

        case "acp:exit":
          setState((s) => ({ ...s, acp: "stopped", pid: null }));
          addSystemMessage(`ACP process exited (code: ${envelope.code})`);
          break;

        case "bridge:error":
          addSystemMessage(`Bridge error: ${envelope.data}`);
          break;

        case "bridge:pong":
          // Latency check — could display in UI
          break;

        case "bridge:agent-status":
          if ("status" in envelope) {
            const e = envelope as { status: "idle" | "working" | "unknown"; queueLength: number };
            setAgentStatus(e.status);
            setQueueLength(e.queueLength);
          }
          break;
      }
    },
    [addSystemMessage, handleAcpMessage, startInitialize]
  );

  // ─── WebSocket Connection ──────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState((s) => ({ ...s, connection: "connecting" }));
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((s) => ({ ...s, connection: "connected" }));
      reconnectAttempts.current = 0;
      tapSuccess();
      soundConnect();
    };

    ws.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data) as ServerEnvelope;
        handleEnvelope(envelope);
      } catch (err) {
        console.error("[ws] Failed to parse message:", err);
      }
    };

    ws.onerror = () => {
      setState((s) => ({ ...s, connection: "error" }));
      tapError();
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, connection: "disconnected" }));
      wsRef.current = null;

      // Auto-reconnect
      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };
  }, [handleEnvelope]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Public API ────────────────────────────────────────────────────────

  const sendPrompt = useCallback(
    (text: string) => {
      if (!state.sessionId) {
        addSystemMessage("No active session. Waiting for ACP connection...");
        return;
      }

      // Add user message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: `usr-${Date.now()}`,
          role: "user",
          content: text,
          timestamp: Date.now(),
        },
      ]);

      // Reset streaming state
      streamingMessageRef.current = "";
      setIsStreaming(true);

      // Send to ACP
      const msg = acp.sessionPrompt(state.sessionId, text);
      sendAcp(msg);
    },
    [state.sessionId, sendAcp, addSystemMessage]
  );

  const cancelPrompt = useCallback(() => {
    if (state.sessionId) {
      send({ type: "acp:send", data: acp.sessionCancel(state.sessionId) });
      setIsStreaming(false);
    }
  }, [state.sessionId, send]);

  const respondToPermission = useCallback(
    (requestId: number, optionId: string) => {
      const response = acp.respondPermission(requestId, optionId);
      sendAcp(response);
    },
    [sendAcp]
  );

  const reconnect = useCallback(() => {
    reconnectAttempts.current = 0;
    wsRef.current?.close();
    setTimeout(connect, 100);
  }, [connect]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    storage.clearMessages();
  }, []);

  return {
    state,
    messages,
    sendPrompt,
    cancelPrompt,
    respondToPermission,
    reconnect,
    clearHistory,
    isStreaming,
    reconnectAttempt: reconnectAttempts.current,
    agentStatus,
    queueLength,
  };
}
