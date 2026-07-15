"use client";

import type { ChatMessage, ToolCallInfo } from "../lib/types";
import { MarkdownRenderer } from "./markdown-renderer";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  // ── System Messages ──────────────────────────────────────────────────
  if (isSystem) {
    return (
      <div className="animate-slide-up flex justify-center px-4 py-1">
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-3 py-1.5 rounded-full border border-[var(--border-dim)] backdrop-blur-sm">
          <span className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
          {message.content}
        </div>
      </div>
    );
  }

  // ── User Messages ────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="animate-slide-up flex justify-end px-4 py-1">
        <div className="max-w-[85%] relative">
          {/* Outer bezel — tactile hardware feel */}
          <div className="rounded-2xl rounded-br-md bg-gradient-to-b from-[var(--accent)] to-[#4f46e5] p-[1px] shadow-lg shadow-[var(--accent)]/10">
            <div className="rounded-2xl rounded-br-md bg-gradient-to-b from-[var(--accent)] to-[#4f46e5] px-4 py-2.5">
              <p className="text-sm leading-relaxed text-white whitespace-pre-wrap break-words">
                {message.content}
              </p>
              <div className="text-[10px] mt-1.5 text-white/40 text-right font-mono">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Assistant Messages ───────────────────────────────────────────────
  return (
    <div className="animate-slide-up px-3 py-1.5">
      <div className="max-w-[95%] relative">
        {/* Console panel frame */}
        <div className="rounded-xl border border-[var(--border-dim)] bg-[var(--bg-secondary)] overflow-hidden shadow-md shadow-black/20">
          {/* Panel header — instrument-style */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] border-b border-[var(--border-dim)]">
            <div className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${message.isStreaming ? "bg-[var(--accent)] animate-pulse-dot" : "bg-[var(--success)]"}`} />
              <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-mono">
                {message.isStreaming ? "streaming" : "response"}
              </span>
            </div>
            <div className="flex-1" />
            <span className="text-[9px] text-[var(--text-muted)] font-mono">
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Content area */}
          <div className="px-3 py-2.5 text-[var(--text-primary)]">
            <MarkdownRenderer content={message.content} isStreaming={message.isStreaming} />
          </div>

          {/* Tool calls — stacked indicators */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="px-3 pb-2.5 space-y-1">
              {message.toolCalls.map((tc) => (
                <ToolCallIndicator key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}

          {/* Plan entries */}
          {message.plan && message.plan.length > 0 && (
            <div className="px-3 pb-2.5 border-t border-[var(--border-dim)] pt-2">
              <div className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-mono mb-1.5">
                execution plan
              </div>
              <div className="space-y-1">
                {message.plan.map((entry, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <PlanIcon status={entry.status} />
                    <span className="text-[12px] text-[var(--text-secondary)] leading-tight">
                      {entry.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tool Call Indicator — Mini hardware gauge
// ---------------------------------------------------------------------------

function ToolCallIndicator({ toolCall }: { toolCall: ToolCallInfo }) {
  const statusConfig = getToolStatusConfig(toolCall.status);

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-dim)]">
      {/* Status LED */}
      <div className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.animate ? "animate-pulse-dot" : ""}`} />

      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-[var(--text-secondary)] truncate font-mono">
          {toolCall.title}
        </div>
      </div>

      {/* Kind badge */}
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-dim)]">
        {toolCall.kind}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan Status Icon
// ---------------------------------------------------------------------------

function PlanIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <div className="w-3.5 h-3.5 rounded flex items-center justify-center bg-[var(--success)]/15 border border-[var(--success)]/30 mt-0.5">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      );
    case "in_progress":
      return (
        <div className="w-3.5 h-3.5 rounded flex items-center justify-center bg-[var(--accent)]/15 border border-[var(--accent)]/30 mt-0.5 animate-pulse-dot">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        </div>
      );
    default:
      return (
        <div className="w-3.5 h-3.5 rounded flex items-center justify-center bg-[var(--bg-tertiary)] border border-[var(--border-dim)] mt-0.5">
          <div className="w-1 h-1 rounded-full bg-[var(--text-muted)]" />
        </div>
      );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToolStatusConfig(status: string) {
  switch (status) {
    case "completed":
      return { color: "bg-[var(--success)]", animate: false };
    case "failed":
      return { color: "bg-[var(--error)]", animate: false };
    case "in_progress":
      return { color: "bg-[var(--warning)]", animate: true };
    case "cancelled":
      return { color: "bg-[var(--text-muted)]", animate: false };
    default:
      return { color: "bg-[var(--text-muted)]", animate: true };
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
