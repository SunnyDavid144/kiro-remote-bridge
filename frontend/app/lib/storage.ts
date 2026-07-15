/**
 * Local Storage Manager — Persists chat messages and session state
 * across page refreshes and app restarts.
 */

import type { ChatMessage } from "./types";

const KEYS = {
  messages: "kiro-remote-messages",
  sessionId: "kiro-remote-session-id",
  onboardingComplete: "kiro-remote-onboarding-complete",
  bridgeUrl: "kiro-remote-bridge-url",
  theme: "kiro-remote-theme",
  connectedAt: "kiro-remote-connected-at",
} as const;

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

const MAX_STORED_MESSAGES = 200;

export function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(KEYS.messages);
    if (!raw) return [];
    const messages = JSON.parse(raw) as ChatMessage[];
    // Strip streaming flag from restored messages
    return messages.map((m) => ({ ...m, isStreaming: false }));
  } catch {
    return [];
  }
}

export function saveMessages(messages: ChatMessage[]): void {
  try {
    // Only persist the most recent messages
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(KEYS.messages, JSON.stringify(toStore));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

export function clearMessages(): void {
  localStorage.removeItem(KEYS.messages);
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export function loadSessionId(): string | null {
  return localStorage.getItem(KEYS.sessionId);
}

export function saveSessionId(sessionId: string): void {
  localStorage.setItem(KEYS.sessionId, sessionId);
}

export function clearSession(): void {
  localStorage.removeItem(KEYS.sessionId);
  localStorage.removeItem(KEYS.connectedAt);
}

// ---------------------------------------------------------------------------
// Connection Timestamp
// ---------------------------------------------------------------------------

export function saveConnectedAt(): void {
  localStorage.setItem(KEYS.connectedAt, Date.now().toString());
}

export function loadConnectedAt(): number | null {
  const raw = localStorage.getItem(KEYS.connectedAt);
  return raw ? parseInt(raw, 10) : null;
}

// ---------------------------------------------------------------------------
// Onboarding
// ---------------------------------------------------------------------------

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(KEYS.onboardingComplete) === "true";
}

export function setOnboardingComplete(): void {
  localStorage.setItem(KEYS.onboardingComplete, "true");
}

export function resetOnboarding(): void {
  localStorage.removeItem(KEYS.onboardingComplete);
}

// ---------------------------------------------------------------------------
// Bridge URL
// ---------------------------------------------------------------------------

export function loadBridgeUrl(): string | null {
  return localStorage.getItem(KEYS.bridgeUrl);
}

export function saveBridgeUrl(url: string): void {
  localStorage.setItem(KEYS.bridgeUrl, url);
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type Theme = "dark" | "light" | "system";

export function loadTheme(): Theme {
  return (localStorage.getItem(KEYS.theme) as Theme) || "dark";
}

export function saveTheme(theme: Theme): void {
  localStorage.setItem(KEYS.theme, theme);
}

// ---------------------------------------------------------------------------
// Full Reset
// ---------------------------------------------------------------------------

export function resetAll(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
