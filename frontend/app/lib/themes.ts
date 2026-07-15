/**
 * Per-IDE Theme System
 *
 * Each supported IDE gets a unique visual skin that applies
 * when it's selected as the active target.
 */

export interface IdeTheme {
  id: string;
  name: string;
  icon: string;
  colors: {
    accent: string;
    accentGlow: string;
    accentLight: string;
    bgPrimary: string;
    bgSecondary: string;
    bgTertiary: string;
    bgInput: string;
    borderDim: string;
    borderActive: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    success: string;
    warning: string;
    error: string;
  };
}

export const THEMES: Record<string, IdeTheme> = {
  kiro: {
    id: "kiro",
    name: "Kiro",
    icon: "🟣",
    colors: {
      accent: "#6366f1",
      accentGlow: "#818cf830",
      accentLight: "#818cf8",
      bgPrimary: "#0a0a0f",
      bgSecondary: "#12121a",
      bgTertiary: "#1a1a26",
      bgInput: "#0f0f18",
      borderDim: "#1e1e2e",
      borderActive: "#3b3b5c",
      textPrimary: "#e4e4ef",
      textSecondary: "#8888a0",
      textMuted: "#55556a",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
    },
  },

  cursor: {
    id: "cursor",
    name: "Cursor",
    icon: "⚡",
    colors: {
      accent: "#06b6d4",
      accentGlow: "#22d3ee30",
      accentLight: "#67e8f9",
      bgPrimary: "#0a0f0f",
      bgSecondary: "#0f1718",
      bgTertiary: "#152020",
      bgInput: "#0a1212",
      borderDim: "#1a2e2e",
      borderActive: "#2d5555",
      textPrimary: "#e4efef",
      textSecondary: "#88a0a0",
      textMuted: "#556a6a",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
    },
  },

  windsurf: {
    id: "windsurf",
    name: "Windsurf",
    icon: "🏄",
    colors: {
      accent: "#3b82f6",
      accentGlow: "#60a5fa30",
      accentLight: "#93c5fd",
      bgPrimary: "#080c14",
      bgSecondary: "#0c1220",
      bgTertiary: "#121a2e",
      bgInput: "#0a0e1a",
      borderDim: "#1a2744",
      borderActive: "#2e4470",
      textPrimary: "#e4eaf5",
      textSecondary: "#8899bb",
      textMuted: "#556688",
      success: "#22c55e",
      warning: "#f59e0b",
      error: "#ef4444",
    },
  },

  vscode: {
    id: "vscode",
    name: "VS Code",
    icon: "🔵",
    colors: {
      accent: "#007acc",
      accentGlow: "#0098ff30",
      accentLight: "#4db8ff",
      bgPrimary: "#1e1e1e",
      bgSecondary: "#252526",
      bgTertiary: "#2d2d2d",
      bgInput: "#1a1a1a",
      borderDim: "#3c3c3c",
      borderActive: "#555555",
      textPrimary: "#d4d4d4",
      textSecondary: "#999999",
      textMuted: "#666666",
      success: "#4ec9b0",
      warning: "#dcdcaa",
      error: "#f14c4c",
    },
  },

  codex: {
    id: "codex",
    name: "Codex",
    icon: "🤖",
    colors: {
      accent: "#22c55e",
      accentGlow: "#4ade8030",
      accentLight: "#86efac",
      bgPrimary: "#000000",
      bgSecondary: "#0a0a0a",
      bgTertiary: "#111111",
      bgInput: "#050505",
      borderDim: "#1a1a1a",
      borderActive: "#2a2a2a",
      textPrimary: "#22c55e",
      textSecondary: "#16a34a",
      textMuted: "#15803d",
      success: "#22c55e",
      warning: "#eab308",
      error: "#ef4444",
    },
  },
};

export const DEFAULT_THEME = "kiro";

/**
 * Apply a theme to the document by setting CSS custom properties.
 */
export function applyTheme(themeId: string): void {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;

  root.style.setProperty("--accent", theme.colors.accent);
  root.style.setProperty("--accent-glow", theme.colors.accentGlow);
  root.style.setProperty("--accent-light", theme.colors.accentLight);
  root.style.setProperty("--bg-primary", theme.colors.bgPrimary);
  root.style.setProperty("--bg-secondary", theme.colors.bgSecondary);
  root.style.setProperty("--bg-tertiary", theme.colors.bgTertiary);
  root.style.setProperty("--bg-input", theme.colors.bgInput);
  root.style.setProperty("--border-dim", theme.colors.borderDim);
  root.style.setProperty("--border-active", theme.colors.borderActive);
  root.style.setProperty("--text-primary", theme.colors.textPrimary);
  root.style.setProperty("--text-secondary", theme.colors.textSecondary);
  root.style.setProperty("--text-muted", theme.colors.textMuted);
  root.style.setProperty("--success", theme.colors.success);
  root.style.setProperty("--warning", theme.colors.warning);
  root.style.setProperty("--error", theme.colors.error);
}

/**
 * Get theme info for display.
 */
export function getTheme(themeId: string): IdeTheme {
  return THEMES[themeId] || THEMES[DEFAULT_THEME];
}
