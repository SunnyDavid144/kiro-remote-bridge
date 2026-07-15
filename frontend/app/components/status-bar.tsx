"use client";

import type { BridgeState } from "../lib/types";

interface StatusBarProps {
  state: BridgeState;
  isStreaming: boolean;
  onReconnect: () => void;
  onSettingsOpen: () => void;
  onWorkspaceOpen: () => void;
}

export function StatusBar({ state, isStreaming, onReconnect, onSettingsOpen, onWorkspaceOpen }: StatusBarProps) {
  return (
    <header className="animate-bar-slide-in flex items-center justify-between px-4 py-3 border-b border-[var(--border-dim)] bg-[var(--bg-secondary)]/95 backdrop-blur-md">
      {/* Left: Logo + Connection */}
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#4f46e5] flex items-center justify-center text-[11px] font-bold text-white shadow-md shadow-[var(--accent)]/20">
            K
          </div>
          <span className="text-xs font-bold tracking-[0.2em] text-[var(--text-primary)] uppercase">
            Remote
          </span>
        </div>

        {/* Connection indicator */}
        <ConnectionIndicator status={state.connection} />
      </div>

      {/* Right: ACP status + streaming */}
      <div className="flex items-center gap-2">
        {isStreaming && <StreamingBadge />}

        {/* Workspace selector button */}
        <button
          onClick={onWorkspaceOpen}
          className="press-feedback flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-dim)] hover:border-[var(--border-active)] transition-colors"
        >
          <span className="text-[9px]">📂</span>
          <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--text-muted)] font-mono max-w-[60px] truncate">
            auto
          </span>
        </button>

        <AcpIndicator status={state.acp} />

        {state.connection === "disconnected" && (
          <button
            onClick={onReconnect}
            className="press-feedback animate-scale-in text-[10px] px-2.5 py-1 rounded-md border border-[var(--error)]/40 text-[var(--error)] bg-[var(--error)]/5 hover:bg-[var(--error)]/10 transition-colors font-mono uppercase tracking-wider"
          >
            retry
          </button>
        )}

        {/* Settings gear */}
        <button
          onClick={onSettingsOpen}
          className="press-feedback w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-dim)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M6 1V2.5M6 9.5V11M1 6H2.5M9.5 6H11M2.17 2.17L3.23 3.23M8.77 8.77L9.83 9.83M2.17 9.83L3.23 8.77M8.77 3.23L9.83 2.17" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ConnectionIndicator({ status }: { status: string }) {
  const config = {
    connected: { color: "bg-[var(--success)]", label: "live", pulse: false },
    connecting: { color: "bg-[var(--warning)]", label: "sync", pulse: true },
    disconnected: { color: "bg-[var(--error)]", label: "off", pulse: false },
    error: { color: "bg-[var(--error)]", label: "err", pulse: true },
  }[status] || { color: "bg-[var(--text-muted)]", label: "?", pulse: false };

  return (
    <div className="flex items-center gap-1.5 ml-1">
      <div className="relative flex items-center justify-center">
        <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? "animate-pulse-dot" : ""}`} />
        {status === "connected" && (
          <div className="absolute w-2 h-2 rounded-full bg-[var(--success)] animate-ring-pulse" />
        )}
      </div>
      <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono">
        {config.label}
      </span>
    </div>
  );
}

function AcpIndicator({ status }: { status: string }) {
  const isRunning = status === "running";

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-dim)]">
      <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"}`} />
      <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono">
        acp
      </span>
    </div>
  );
}

function StreamingBadge() {
  return (
    <div className="animate-scale-in flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--accent)]/10 border border-[var(--accent)]/25">
      <div className="flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-typing-1" />
        <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-typing-2" />
        <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-typing-3" />
      </div>
      <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--accent)] font-mono">
        live
      </span>
    </div>
  );
}
