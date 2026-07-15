"use client";

import { useEffect, useState } from "react";
import type { ConnectionStatus } from "../lib/types";

interface ConnectionBannerProps {
  status: ConnectionStatus;
  reconnectAttempt?: number;
  onRetry?: () => void;
}

export function ConnectionBanner({ status, reconnectAttempt = 0, onRetry }: ConnectionBannerProps) {
  const [showTip, setShowTip] = useState(false);

  // After 10 seconds disconnected, show troubleshooting tip
  useEffect(() => {
    if (status === "disconnected" || status === "error") {
      const timer = setTimeout(() => setShowTip(true), 10000);
      return () => clearTimeout(timer);
    }
    setShowTip(false);
  }, [status]);

  if (status === "connected") return null;

  return (
    <div className="mx-3 mt-2 space-y-2 animate-slide-up">
      {/* Main banner */}
      <div
        className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${getBannerStyle(status)}`}
      >
        <StatusIcon status={status} />
        <div className="flex-1 min-w-0">
          <p className={`text-[12px] font-medium ${getTextColor(status)}`}>
            {getMessage(status, reconnectAttempt)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {getSubMessage(status, reconnectAttempt)}
          </p>
        </div>

        {(status === "disconnected" || status === "error") && onRetry && (
          <button
            onClick={onRetry}
            className="press-feedback px-2.5 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-dim)] text-[10px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
          >
            Retry
          </button>
        )}
      </div>

      {/* Troubleshooting tips (shown after delay) */}
      {showTip && (
        <div className="animate-fade-in px-3.5 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-dim)]">
          <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono mb-2">
            Troubleshooting
          </p>
          <ul className="space-y-1.5">
            <TipItem text="Check that the bridge server is running on your Mac" />
            <TipItem text="Verify your Mac is on the same network (or Tailscale is active)" />
            <TipItem text="Try opening the health check in Safari: http://[bridge-ip]:3100/health" />
            <TipItem text="Restart the bridge: cd backend && npm start" />
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: ConnectionStatus }) {
  if (status === "connecting") {
    return (
      <div className="w-4 h-4 rounded-full border-2 border-[var(--warning)]/30 border-t-[var(--warning)] animate-spin flex-shrink-0" />
    );
  }
  return (
    <div className="w-3 h-3 rounded-full bg-[var(--error)] animate-pulse-dot flex-shrink-0" />
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-[11px] text-[var(--text-secondary)] leading-tight">
      <span className="text-[var(--text-muted)] mt-0.5">›</span>
      {text}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Style helpers
// ---------------------------------------------------------------------------

function getBannerStyle(status: ConnectionStatus): string {
  switch (status) {
    case "connecting":
      return "bg-[var(--warning)]/5 border-[var(--warning)]/20";
    case "disconnected":
    case "error":
      return "bg-[var(--error)]/5 border-[var(--error)]/20";
    default:
      return "bg-[var(--bg-tertiary)] border-[var(--border-dim)]";
  }
}

function getTextColor(status: ConnectionStatus): string {
  switch (status) {
    case "connecting":
      return "text-[var(--warning)]";
    case "disconnected":
    case "error":
      return "text-[var(--error)]";
    default:
      return "text-[var(--text-primary)]";
  }
}

function getMessage(status: ConnectionStatus, attempt: number): string {
  switch (status) {
    case "connecting":
      return attempt > 1 ? `Reconnecting (attempt ${attempt})...` : "Connecting to bridge...";
    case "disconnected":
      return "Connection lost";
    case "error":
      return "Connection failed";
    default:
      return "";
  }
}

function getSubMessage(status: ConnectionStatus, attempt: number): string {
  switch (status) {
    case "connecting":
      return "Establishing WebSocket connection";
    case "disconnected":
      return attempt > 3
        ? "Multiple reconnection attempts failed"
        : "Will auto-retry in a few seconds";
    case "error":
      return "Could not reach the bridge server";
    default:
      return "";
  }
}
