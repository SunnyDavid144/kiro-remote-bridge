"use client";

import { useCallback, useEffect, useState } from "react";
import { tapLight } from "../lib/haptics";
import { applyTheme, getTheme, THEMES } from "../lib/themes";

interface WorkspaceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WindowInfo {
  name: string;
  id: string;
  ide: string;
  isTarget: boolean;
}

export function WorkspaceSelector({ isOpen, onClose }: WorkspaceSelectorProps) {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWindows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
      const res = await fetch(`http://${host}:3100/api/windows`);
      const data = await res.json();
      setWindows(
        (data.windows || []).map((w: { ide: string; ideDisplayName: string; ideIcon: string; window: string; windowId: string }) => ({
          name: `${w.ideIcon} ${w.ideDisplayName} — ${w.window}`,
          id: w.windowId,
          ide: w.ide,
          isTarget: w.windowId === data.target,
        }))
      );
      setTarget(data.target || null);
    } catch (err) {
      setError("Could not reach bridge server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchWindows();
  }, [isOpen, fetchWindows]);

  const selectTarget = useCallback(
    async (windowName: string | null, ide?: string) => {
      tapLight();
      try {
        const host = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
        await fetch(`http://${host}:3100/api/target`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ window: windowName, ide }),
        });
        setTarget(windowName);
        // Apply theme for the selected IDE
        if (ide && THEMES[ide]) {
          applyTheme(ide);
          localStorage.setItem("kiro-remote-active-ide", ide);
        }
      } catch {}
    },
    []
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-[var(--bg-secondary)] border-t border-[var(--border-dim)] rounded-t-2xl max-h-[70vh] overflow-y-auto pb-[env(safe-area-inset-bottom,20px)]">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-8 h-1 rounded-full bg-[var(--border-active)]" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-[var(--border-dim)]">
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Target Workspace
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Choose which Kiro window receives your prompts
              </p>
            </div>
            <button
              onClick={fetchWindows}
              className="press-feedback w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-dim)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={loading ? "animate-spin" : ""}>
                <path d="M6 1V3M6 9V11M1 6H3M9 6H11M2.17 2.17L3.58 3.58M8.42 8.42L9.83 9.83M2.17 9.83L3.58 8.42M8.42 3.58L9.83 2.17" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-3 space-y-2">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-[var(--error)]/5 border border-[var(--error)]/20 text-[11px] text-[var(--error)]">
                {error}
              </div>
            )}

            {loading && windows.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
              </div>
            )}

            {/* Auto (frontmost) option */}
            <WindowOption
              name="Auto (frontmost window)"
              subtitle="Sends to whichever Kiro window is active"
              isSelected={target === null}
              onSelect={() => selectTarget(null)}
              icon="🎯"
            />

            {/* IDE Theme Picker */}
            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 h-px bg-[var(--border-dim)]" />
              <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-mono">
                agent theme
              </span>
              <div className="flex-1 h-px bg-[var(--border-dim)]" />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {Object.values(THEMES).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => { applyTheme(theme.id); localStorage.setItem("kiro-remote-active-ide", theme.id); tapLight(); }}
                  className="press-feedback flex flex-col items-center gap-1 py-2 px-1 rounded-lg border border-[var(--border-dim)] hover:border-[var(--border-active)] transition-colors"
                >
                  <span className="text-lg">{theme.icon}</span>
                  <span className="text-[8px] text-[var(--text-muted)] font-mono">{theme.name}</span>
                </button>
              ))}
            </div>

            {/* Divider */}
            {windows.length > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-[var(--border-dim)]" />
                <span className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-mono">
                  open windows
                </span>
                <div className="flex-1 h-px bg-[var(--border-dim)]" />
              </div>
            )}

            {/* Window list */}
            {windows.map((w) => (
              <WindowOption
                key={w.id}
                name={extractProjectName(w.name)}
                subtitle={w.name}
                isSelected={target === w.id}
                onSelect={() => selectTarget(w.id, w.ide)}
                icon="📂"
              />
            ))}

            {!loading && windows.length === 0 && !error && (
              <div className="text-center py-6 text-[var(--text-muted)] text-xs">
                No Kiro windows detected.
                <br />
                Make sure Kiro is running on your Mac.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Window Option Row
// ---------------------------------------------------------------------------

function WindowOption({
  name,
  subtitle,
  isSelected,
  onSelect,
  icon,
}: {
  name: string;
  subtitle: string;
  isSelected: boolean;
  onSelect: () => void;
  icon: string;
}) {
  return (
    <button
      onClick={onSelect}
      className={`press-feedback w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${
        isSelected
          ? "bg-[var(--accent)]/8 border-[var(--accent)]/30"
          : "bg-[var(--bg-tertiary)] border-[var(--border-dim)] hover:border-[var(--border-active)]"
      }`}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-medium truncate ${isSelected ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
          {name}
        </p>
        {subtitle !== name && (
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 font-mono">
            {subtitle}
          </p>
        )}
      </div>
      {isSelected && (
        <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractProjectName(windowTitle: string): string {
  // Kiro window titles are usually like "folder — Kiro" or "file — folder — Kiro"
  if (!windowTitle || typeof windowTitle !== "string") return "Unknown";
  const parts = windowTitle.split(" — ");
  if (parts.length >= 2) {
    return parts[parts.length - 2]; // The folder/project name
  }
  return windowTitle;
}
