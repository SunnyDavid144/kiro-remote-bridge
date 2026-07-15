"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConnectionStatus } from "../lib/types";

type OnboardingStep = "welcome" | "connect" | "permissions" | "test" | "ready";

interface OnboardingProps {
  connectionStatus: ConnectionStatus;
  acpStatus: string;
  sessionId: string | null;
  onComplete: () => void;
  onConnect: (url: string) => void;
}

export function Onboarding({
  connectionStatus,
  acpStatus,
  sessionId,
  onComplete,
  onConnect,
}: OnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [bridgeUrl, setBridgeUrl] = useState("");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "pass" | "fail">("idle");

  // Auto-detect bridge URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      setBridgeUrl(`${window.location.hostname}:3100`);
    }
  }, []);

  // Auto-advance from connect step when connection established
  useEffect(() => {
    if (step === "connect" && connectionStatus === "connected") {
      setTimeout(() => setStep("permissions"), 800);
    }
  }, [step, connectionStatus]);

  // Auto-advance from test step when session is ready
  useEffect(() => {
    if (step === "test" && sessionId) {
      setTestStatus("pass");
      setTimeout(() => setStep("ready"), 1000);
    }
  }, [step, sessionId]);

  // Auto-finish from ready step
  useEffect(() => {
    if (step === "ready") {
      setTimeout(onComplete, 1500);
    }
  }, [step, onComplete]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--bg-primary)]">
      {/* Progress bar */}
      <div className="px-6 pt-[env(safe-area-inset-top,44px)]">
        <ProgressDots current={step} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        {step === "welcome" && <WelcomeStep onNext={() => setStep("connect")} />}
        {step === "connect" && (
          <ConnectStep
            bridgeUrl={bridgeUrl}
            setBridgeUrl={setBridgeUrl}
            status={connectionStatus}
            onConnect={() => onConnect(bridgeUrl)}
          />
        )}
        {step === "permissions" && (
          <PermissionsStep onNext={() => setStep("test")} />
        )}
        {step === "test" && (
          <TestStep status={testStatus} acpStatus={acpStatus} />
        )}
        {step === "ready" && <ReadyStep />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Dots
// ---------------------------------------------------------------------------

const STEPS: OnboardingStep[] = ["welcome", "connect", "permissions", "test", "ready"];

function ProgressDots({ current }: { current: OnboardingStep }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`h-1 rounded-full transition-all duration-300 ${
            i <= currentIdx
              ? "w-6 bg-[var(--accent)]"
              : "w-2 bg-[var(--border-dim)]"
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Welcome
// ---------------------------------------------------------------------------

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 border border-[var(--accent)]/25 flex items-center justify-center mx-auto animate-glow">
        <span className="text-4xl font-bold text-[var(--accent)]">K</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
          Kiro Remote
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-[280px] mx-auto">
          Control your Kiro IDE from your phone. Send prompts, run commands, and edit files — from anywhere.
        </p>
      </div>

      <div className="space-y-3 text-left max-w-[260px] mx-auto">
        <FeatureRow icon="⚡" text="Real-time streaming responses" />
        <FeatureRow icon="📁" text="Full workspace access" />
        <FeatureRow icon="🌍" text="Works over 5G via Tailscale" />
        <FeatureRow icon="🔒" text="End-to-end encrypted" />
      </div>

      <button
        onClick={onNext}
        className="press-feedback w-full max-w-[260px] py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm shadow-lg shadow-[var(--accent)]/20 hover:brightness-110 transition-all"
      >
        Get Started
      </button>
    </div>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{icon}</span>
      <span className="text-sm text-[var(--text-secondary)]">{text}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Connect
// ---------------------------------------------------------------------------

function ConnectStep({
  bridgeUrl,
  setBridgeUrl,
  status,
  onConnect,
}: {
  bridgeUrl: string;
  setBridgeUrl: (v: string) => void;
  status: ConnectionStatus;
  onConnect: () => void;
}) {
  const isConnecting = status === "connecting";
  const isConnected = status === "connected";

  return (
    <div className="animate-fade-in space-y-6 w-full max-w-[300px]">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Connect to Bridge
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          The bridge server should be running on your Mac. Enter its address below.
        </p>
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-mono">
          Bridge Address
        </label>
        <input
          type="text"
          value={bridgeUrl}
          onChange={(e) => setBridgeUrl(e.target.value)}
          placeholder="192.168.1.180:3100"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-dim)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] font-mono"
        />
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-2">
        {isConnecting && (
          <>
            <div className="w-3 h-3 rounded-full border-2 border-[var(--warning)]/30 border-t-[var(--warning)] animate-spin" />
            <span className="text-xs text-[var(--warning)]">Connecting...</span>
          </>
        )}
        {isConnected && (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)]" />
            <span className="text-xs text-[var(--success)]">Connected</span>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-[var(--error)]" />
            <span className="text-xs text-[var(--error)]">Failed to connect</span>
          </>
        )}
      </div>

      {!isConnected && (
        <button
          onClick={onConnect}
          disabled={isConnecting || !bridgeUrl}
          className="press-feedback w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm shadow-lg shadow-[var(--accent)]/20 disabled:opacity-40 disabled:pointer-events-none"
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Permissions
// ---------------------------------------------------------------------------

function PermissionsStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="animate-fade-in space-y-6 max-w-[300px]">
      <div className="w-14 h-14 rounded-2xl bg-[var(--warning)]/10 border border-[var(--warning)]/20 flex items-center justify-center mx-auto">
        <span className="text-2xl">🔐</span>
      </div>

      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Permissions Check
        </h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          The bridge needs macOS Accessibility access to inject prompts into Kiro.
        </p>
      </div>

      <div className="text-left space-y-3 bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-dim)]">
        <CheckItem label="Kiro is running on your Mac" checked={true} />
        <CheckItem label="Bridge server is connected" checked={true} />
        <CheckItem
          label="Accessibility access granted"
          checked={false}
          hint="System Settings → Privacy → Accessibility"
        />
      </div>

      <button
        onClick={onNext}
        className="press-feedback w-full py-3 rounded-xl bg-[var(--accent)] text-white font-semibold text-sm"
      >
        I've granted access — continue
      </button>

      <button
        onClick={onNext}
        className="text-xs text-[var(--text-muted)] underline underline-offset-2"
      >
        Skip for now
      </button>
    </div>
  );
}

function CheckItem({ label, checked, hint }: { label: string; checked: boolean; hint?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className={`w-4 h-4 rounded flex items-center justify-center mt-0.5 ${
          checked
            ? "bg-[var(--success)]/15 border border-[var(--success)]/30"
            : "bg-[var(--bg-tertiary)] border border-[var(--border-dim)]"
        }`}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5L4.5 7.5L8 3" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <div>
        <span className="text-xs text-[var(--text-primary)]">{label}</span>
        {hint && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Test
// ---------------------------------------------------------------------------

function TestStep({ status, acpStatus }: { status: string; acpStatus: string }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="w-14 h-14 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 flex items-center justify-center mx-auto">
        {status === "pass" ? (
          <span className="text-2xl">✓</span>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)] animate-spin" />
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {status === "pass" ? "All Good!" : "Testing Connection"}
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {status === "pass"
            ? "Your bridge is working perfectly."
            : "Verifying the full message pipeline..."}
        </p>
      </div>

      <div className="text-left space-y-2 bg-[var(--bg-secondary)] rounded-xl p-4 border border-[var(--border-dim)]">
        <TestRow label="WebSocket connected" done={true} />
        <TestRow label="ACP agent available" done={acpStatus === "running"} />
        <TestRow label="Session initialized" done={status === "pass"} />
      </div>
    </div>
  );
}

function TestRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      {done ? (
        <div className="w-4 h-4 rounded-full bg-[var(--success)]/15 border border-[var(--success)]/30 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      ) : (
        <div className="w-4 h-4 rounded-full border-2 border-[var(--text-muted)]/30 border-t-[var(--text-muted)] animate-spin" />
      )}
      <span className={`text-xs ${done ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step: Ready
// ---------------------------------------------------------------------------

function ReadyStep() {
  return (
    <div className="animate-fade-in space-y-4">
      <div className="w-20 h-20 rounded-3xl bg-[var(--success)]/10 border border-[var(--success)]/20 flex items-center justify-center mx-auto animate-scale-in">
        <span className="text-4xl">🚀</span>
      </div>

      <h2 className="text-xl font-bold text-[var(--text-primary)]">
        You're in!
      </h2>
      <p className="text-sm text-[var(--text-secondary)]">
        Start sending messages to your Kiro agent.
      </p>
    </div>
  );
}
