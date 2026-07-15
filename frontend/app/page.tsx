"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBridge } from "./hooks/use-bridge";
import { usePullRefresh } from "./hooks/use-pull-refresh";
import { StatusBar } from "./components/status-bar";
import { MessageBubble } from "./components/message-bubble";
import { ChatInput } from "./components/chat-input";
import { ConnectionBanner } from "./components/connection-banner";
import { SplashScreen } from "./components/splash-screen";
import { Onboarding } from "./components/onboarding";
import { SettingsPanel } from "./components/settings-panel";
import { WorkspaceSelector } from "./components/workspace-selector";
import { applyTheme } from "./lib/themes";

export default function Home() {
  const { state, messages, sendPrompt, cancelPrompt, reconnect, clearHistory, isStreaming, reconnectAttempt, agentStatus, queueLength } =
    useBridge();

  const scrollRef = useRef<HTMLDivElement>(null);

  // Pull-to-refresh for reconnection
  const { pullDistance, isRefreshing, handlers: pullHandlers } = usePullRefresh({
    onRefresh: async () => {
      reconnect();
      await new Promise((r) => setTimeout(r, 1000));
    },
  });

  // Onboarding state
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  // Check if user has completed onboarding before
  useEffect(() => {
    if (typeof window !== "undefined") {
      const completed = localStorage.getItem("kiro-remote-onboarding-complete");
      if (completed === "true") {
        setOnboardingComplete(true);
      }
      // Apply saved theme
      const savedIde = localStorage.getItem("kiro-remote-active-ide");
      if (savedIde) {
        applyTheme(savedIde);
      }
    }
  }, []);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, [onboardingComplete]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    setOnboardingComplete(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("kiro-remote-onboarding-complete", "true");
    }
  }, []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const inputDisabled =
    state.connection !== "connected" || !state.sessionId;

  // Show splash
  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Show onboarding
  if (showOnboarding) {
    return (
      <Onboarding
        connectionStatus={state.connection}
        acpStatus={state.acp}
        sessionId={state.sessionId}
        onComplete={handleOnboardingComplete}
        onConnect={() => {}}
      />
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[var(--bg-primary)]">
      {/* Status bar */}
      <StatusBar state={state} isStreaming={isStreaming} agentStatus={agentStatus} queueLength={queueLength} onReconnect={reconnect} onSettingsOpen={() => setSettingsOpen(true)} onWorkspaceOpen={() => setWorkspaceOpen(true)} />

      {/* Settings panel */}
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        onReconnect={reconnect}
        onClearHistory={clearHistory}
      />

      {/* Workspace selector */}
      <WorkspaceSelector
        isOpen={workspaceOpen}
        onClose={() => setWorkspaceOpen(false)}
      />

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 scroll-smooth scroll-touch"
        {...pullHandlers}
        style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? "transform 0.3s ease" : "none" }}
      >
        {/* Pull indicator */}
        {pullDistance > 0 && (
          <div className="flex justify-center -mt-2 mb-2">
            <div className={`w-6 h-6 rounded-full border-2 border-[var(--accent)]/40 border-t-[var(--accent)] ${isRefreshing ? "animate-spin" : ""}`}
              style={{ opacity: Math.min(pullDistance / 80, 1), transform: `rotate(${pullDistance * 3}deg)` }}
            />
          </div>
        )}

        {/* Connection banner */}
        <ConnectionBanner status={state.connection} reconnectAttempt={reconnectAttempt} onRetry={reconnect} />

        {messages.length === 0 ? (
          <EmptyState state={state} />
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Typing indicator when streaming hasn't produced content yet */}
            {isStreaming && messages[messages.length - 1]?.role === "user" && (
              <TypingIndicator />
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <ChatInput
        onSend={sendPrompt}
        onCancel={cancelPrompt}
        isStreaming={isStreaming}
        disabled={inputDisabled}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ state }: { state: { connection: string; acp: string; sessionId: string | null } }) {
  const statusText =
    state.connection !== "connected"
      ? "Establishing bridge connection..."
      : state.acp !== "running"
        ? "Waiting for ACP agent process..."
        : !state.sessionId
          ? "Initializing session..."
          : "Ready. Send a message to begin.";

  const isReady = state.connection === "connected" && state.sessionId;

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 animate-fade-in">
      <div className="relative mb-6">
        <div
          className={`w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--accent)]/15 to-[var(--accent)]/5 border border-[var(--accent)]/20 flex items-center justify-center ${
            isReady ? "animate-glow" : ""
          }`}
        >
          <div className="text-3xl font-bold text-[var(--accent)]">K</div>
        </div>
        {!isReady && (
          <div className="absolute inset-0 rounded-2xl border border-[var(--accent)]/10 animate-ring-pulse" />
        )}
      </div>

      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2 tracking-tight">
        Kiro Remote
      </h2>

      <p className="text-sm text-[var(--text-secondary)] max-w-[260px] leading-relaxed">
        {statusText}
      </p>

      <div className="mt-6 flex items-center gap-3">
        <StatusPill active={state.connection === "connected"} label="bridge" />
        <StatusPill active={state.acp === "running"} label="acp" />
        <StatusPill active={!!state.sessionId} label="session" />
      </div>
    </div>
  );
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wider transition-all duration-300 ${
        active
          ? "border-[var(--success)]/30 text-[var(--success)] bg-[var(--success)]/5"
          : "border-[var(--border-dim)] text-[var(--text-muted)] bg-[var(--bg-tertiary)]"
      }`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
          active ? "bg-[var(--success)]" : "bg-[var(--text-muted)]"
        }`}
      />
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Typing Indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="animate-slide-up px-3 py-1.5">
      <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-dim)]">
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]/60 animate-typing-1" />
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]/60 animate-typing-2" />
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]/60 animate-typing-3" />
      </div>
    </div>
  );
}
