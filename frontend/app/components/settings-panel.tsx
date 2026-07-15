"use client";

import { useCallback, useState } from "react";
import type { BridgeState } from "../lib/types";
import * as storage from "../lib/storage";
import { tapLight } from "../lib/haptics";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  state: BridgeState;
  onReconnect: () => void;
  onClearHistory: () => void;
}

export function SettingsPanel({
  isOpen,
  onClose,
  state,
  onReconnect,
  onClearHistory,
}: SettingsPanelProps) {
  const [confirmClear, setConfirmClear] = useState(false);

  const connectedAt = storage.loadConnectedAt();
  const uptime = connectedAt ? formatUptime(Date.now() - connectedAt) : "—";

  const handleClearHistory = useCallback(() => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    tapLight();
    onClearHistory();
    setConfirmClear(false);
  }, [confirmClear, onClearHistory]);

  const handleResetOnboarding = useCallback(() => {
    tapLight();
    storage.resetOnboarding();
    window.location.reload();
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel — slides up from bottom */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-dim)] rounded-t-2xl max-h-[85vh] overflow-y-auto pb-[env(safe-area-inset-bottom,20px)]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-8 h-1 rounded-full bg-[var(--border-active)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-[var(--border-dim)]">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Settings</h2>
            <button
              onClick={onClose}
              className="press-feedback w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-dim)] flex items-center justify-center text-[var(--text-muted)]"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Connection Info */}
          <Section title="Connection">
            <InfoRow label="Status" value={state.connection} color={state.connection === "connected" ? "var(--success)" : "var(--error)"} />
            <InfoRow label="ACP Agent" value={state.acp} color={state.acp === "running" ? "var(--success)" : "var(--text-muted)"} />
            <InfoRow label="Session" value={state.sessionId ? state.sessionId.slice(0, 16) + "..." : "None"} />
            <InfoRow label="Uptime" value={uptime} />

            <button
              onClick={() => { tapLight(); onReconnect(); }}
              className="press-feedback w-full mt-3 py-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-dim)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors"
            >
              Reconnect
            </button>
          </Section>

          {/* Workspace */}
          <Section title="Workspace">
            <InfoRow label="Bridge URL" value={`${typeof window !== "undefined" ? window.location.hostname : "—"}:3100`} />
            <InfoRow label="Mode" value="Relay (AppleScript)" />
          </Section>

          {/* Data */}
          <Section title="Data">
            <button
              onClick={handleClearHistory}
              className={`press-feedback w-full py-2.5 rounded-lg border text-xs font-mono transition-colors ${
                confirmClear
                  ? "bg-[var(--error)]/10 border-[var(--error)]/30 text-[var(--error)]"
                  : "bg-[var(--bg-tertiary)] border-[var(--border-dim)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {confirmClear ? "Tap again to confirm" : "Clear message history"}
            </button>

            <button
              onClick={handleResetOnboarding}
              className="press-feedback w-full mt-2 py-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-dim)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Re-run onboarding
            </button>
          </Section>

          {/* About */}
          <Section title="About">
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Protocol" value="ACP / JSON-RPC 2.0" />
            <InfoRow label="Transport" value="WebSocket + File Relay" />
          </Section>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-[var(--border-dim)]">
      <h3 className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <span className="text-xs font-mono" style={{ color: color || "var(--text-primary)" }}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours}h ${remainingMins}m`;
}
