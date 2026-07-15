<div align="center">

<br />

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   📱  K I R O   R E M O T E   B R I D G E                      ║
║                                                                  ║
║   Control any AI coding agent from your phone.                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**Send prompts from the couch. Get streaming responses from your IDE.**

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-4A154B?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

<br />

[Features](#-features) · [How It Works](#-how-it-works) · [Quick Start](#-quick-start) · [Supported IDEs](#-supported-ides) · [Architecture](#-architecture)

<br />

</div>

---

## The Problem

You're on the couch. Your Mac is at your desk running Kiro with full workspace context. You think of something — a refactor, a bug fix, a question about your codebase. You don't want to walk over. You don't want to open a separate AI app that doesn't have your files.

**Kiro Remote Bridge** turns your phone into a remote control for your AI coding agent. Same agent, same workspace, same tools — just a different screen.

---

## How It Works

```
┌─────────────┐                              ┌─────────────┐                              ┌─────────────┐
│             │         WebSocket             │             │        AppleScript            │             │
│  📱 Phone   │◄════════════════════════════►│  🖥  Bridge  │══════════════════════════════►│  🤖 IDE     │
│  (PWA)      │     ws://mac:3100/ws          │  Server     │    Cmd+L → Paste → Enter      │  Agent      │
│             │                               │             │                               │             │
└─────────────┘                              └──────┬──────┘                              └─────────────┘
                                                    │
                                              polls response.md
                                              streams deltas back
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │  Real-time       │
                                           │  Markdown Stream │
                                           │  → Your Phone    │
                                           └─────────────────┘
```

1. **You type** a message on your phone
2. **Bridge injects** it into your IDE's chat via AppleScript (clipboard paste, not slow keystrokes)
3. **The AI agent processes** it with full workspace context — files, terminal, tools, everything
4. **Bridge watches** for the response file and **streams it back** to your phone in real-time
5. **You see** formatted markdown, syntax-highlighted code, and tool call indicators — live

> Your AI agent runs locally with full access to your codebase. Your phone is just the remote.

---

## Supported IDEs

| IDE | Shortcut | Status | Theme |
|:---:|:--------:|:------:|:-----:|
| 🟣 **Kiro** | `Cmd+L` | Full support | Purple gradient |
| ⚡ **Cursor** | `Cmd+L` | Full support | Blue neon |
| 🏄 **Windsurf** | `Cmd+L` | Full support | Teal wave |
| 🔵 **VS Code** | `Cmd+Shift+I` | Copilot Chat | Classic blue |
| 🤖 **Codex CLI** | Terminal paste | Full support | Green terminal |

The bridge **auto-detects** which IDEs are running. Switch between them from the workspace selector on your phone. Each IDE gets its own color theme on the mobile UI.

---

## Features

### Mobile-First Chat UI
Console-inspired dark interface built for thumbs. Streaming markdown with syntax highlighting, copy-able code blocks, and tool call indicators that show what your agent is doing.

### Smart Agent Detection
Knows when your agent is busy vs. idle. Queues prompts automatically when the agent is working — sends them the moment it's free. No accidental interruptions.

### Multi-IDE Workspace Selector
See all open IDE windows across every supported editor. Target a specific project. Switch IDEs mid-conversation. All from a dropdown on your phone.

### Real-Time Streaming
Responses stream in as the agent types — not after it finishes. Watch your agent think, plan, read files, and write code in real-time. 500ms polling with delta detection.

### Image Attachments
Take a photo of a whiteboard sketch, screenshot an error, or snap a design mockup — attach it directly to your prompt. The bridge pastes it into your IDE's chat as a native image.

### PWA / Installable
Add to your home screen for a native app feel. Custom splash screen, app icon, standalone mode. Cached messages work offline.

### Per-IDE Themes
The entire mobile UI shifts color to match your active IDE — purple for Kiro, blue neon for Cursor, teal for Windsurf. Feels intentional, not generic.

### Haptic Feedback
Vibration on send. Audio cues on receive. Pull-to-refresh with spring physics. Feels like a real app, not a web page.

### Global Access via Tailscale
Works from anywhere — not just your home WiFi. Install Tailscale on your Mac and phone, and you get encrypted WireGuard access to your bridge from any network on Earth.

---

## Quick Start

### Prerequisites

- **macOS** (AppleScript is used for IDE injection)
- **Node.js 18+**
- An AI coding IDE (Kiro, Cursor, Windsurf, VS Code, or Codex CLI)
- **Accessibility permissions** granted for the bridge

### Setup (2 minutes)

```bash
# Clone
git clone https://github.com/SunnyDavid144/kiro-remote-bridge.git
cd kiro-remote-bridge

# Install everything
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start both servers
npm run dev
```

The bridge runs on `:3100`, the frontend on `:3101`.

### Connect Your Phone

**Same WiFi:**
```
http://<your-mac-ip>:3101
```

**From anywhere (5G, remote, coffee shop):**
1. Install [Tailscale](https://tailscale.com) on your Mac + phone
2. Sign in with the same account
3. Open `http://<tailscale-ip>:3101` on your phone

### Grant Permissions

macOS will prompt you once for:
- **Accessibility** access (System Settings → Privacy & Security → Accessibility)

This lets the bridge paste into your IDE via `Cmd+V`.

---

## Architecture

```
kiro-remote-bridge/
├── backend/
│   ├── server.js                # Express + WebSocket server + file relay
│   ├── adapters/
│   │   ├── base.js              # Abstract adapter interface
│   │   ├── kiro.js              # Kiro-specific AppleScript
│   │   ├── cursor.js            # Cursor adapter
│   │   ├── windsurf.js          # Windsurf adapter
│   │   ├── vscode.js            # VS Code (Copilot) adapter
│   │   ├── codex.js             # Codex CLI adapter
│   │   └── index.js             # Registry + auto-detection
│   ├── mock-agent.js            # Built-in test agent (no IDE needed)
│   └── acp-protocol.js          # JSON-RPC 2.0 framing helpers
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx             # Main chat interface
│   │   ├── components/          # StatusBar, MessageBubble, ChatInput, etc.
│   │   ├── hooks/               # use-bridge (WebSocket + state machine)
│   │   └── lib/                 # Types, storage, haptics, themes
│   └── public/
│       ├── manifest.json        # PWA manifest
│       └── icons/               # App icons (all sizes)
│
└── .kiro-bridge/                # Runtime directory (gitignored)
    ├── prompt.md                # Incoming prompts (bridge writes)
    └── response.md              # Agent responses (bridge reads + streams)
```

### The Response Loop

The bridge appends a hidden system instruction to each prompt telling the agent to stream its response to `.kiro-bridge/response.md`. The bridge polls this file every 500ms, detects new content (delta), and pushes it to your phone via WebSocket. When the file stops changing for 6+ seconds, the response is marked complete.

No custom IDE plugins. No API keys. No cloud relay. Everything stays on your machine.

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Server status + client count |
| `GET` | `/api/ides` | All supported + currently running IDEs |
| `GET` | `/api/windows` | Open windows across all running IDEs |
| `GET` | `/api/status` | Agent status (idle/working) + queue |
| `POST` | `/api/ide` | Set active IDE |
| `POST` | `/api/target` | Target a specific window |
| `POST` | `/api/upload-image` | Upload image attachment |
| `POST` | `/api/paste-image` | Paste image into IDE chat |
| `POST` | `/response-complete` | Manually signal response done |

WebSocket endpoint: `ws://<host>:3100/ws`

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Bind address (use `127.0.0.1` to restrict to localhost) |
| `PORT` | `3100` | Bridge server port |
| `BRIDGE_MODE` | `relay` | `relay` (file-based) or `acp` (subprocess) |
| `WORKSPACE_ROOT` | `..` | Root workspace directory |
| `ACP_COMMAND` | — | Path to ACP binary (for subprocess mode) |
| `ACP_TRANSPORT` | `ndjson` | `ndjson` or `content-length` (LSP-style) |

---

## Adding a New IDE

Create `backend/adapters/your-ide.js`:

```javascript
const BaseAdapter = require("./base");

class YourIDEAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = "your-ide";
    this.displayName = "Your IDE";
    this.icon = "🎯";
  }

  getAppIdentifier() { return "YourApp"; }
  getChatFocusShortcut() { return 'keystroke "l" using command down'; }

  async isRunning() { /* check if process is alive */ }
  async listWindows() { /* AppleScript to list windows */ }
  async injectPrompt(prompt, windowId) { /* clipboard + paste */ }
}

module.exports = YourIDEAdapter;
```

Register it in `backend/adapters/index.js` and it's live.

---

## Security

| Concern | How it's handled |
|---------|-----------------|
| Network exposure | Binds to LAN by default; use `HOST=127.0.0.1` for localhost-only |
| Remote access | [Tailscale](https://tailscale.com) provides encrypted WireGuard tunnel — no port forwarding |
| Data privacy | Everything runs locally. No external APIs. No cloud relay. |
| AI credentials | Uses your IDE's own AI subscription — nothing leaves your machine |
| Clipboard | Only used transiently for prompt injection; original clipboard is not persisted |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Bridge Server | Node.js, Express, WebSocket (`ws`) |
| IDE Integration | AppleScript, clipboard injection |
| Markdown Rendering | react-markdown, rehype-highlight, remark-gfm |
| Remote Access | Tailscale (WireGuard) |
| PWA | Web App Manifest, Service Worker |

---

## Roadmap

- [ ] Push notifications when long tasks complete
- [ ] Voice input via Web Speech API
- [ ] Quick action buttons (run tests, git status, deploy)
- [ ] File browser with syntax highlighting
- [ ] Terminal output streaming
- [ ] One-command installer (`npx kiro-remote-bridge`)
- [ ] macOS menu bar status indicator
- [ ] QR code pairing (scan from phone to connect)
- [ ] Auth token for multi-user setups
- [ ] Session history timeline with branching

---

## Why This Exists

Every AI coding agent today is tethered to your desk. The agent has full context — your files, your terminal, your git history — but you can only talk to it from the same screen it's running on.

This bridge decouples the **interface** from the **intelligence**. Your agent keeps its full workspace context. You get a mobile-native way to interact with it from anywhere.

Built in a weekend. Works today. No cloud, no subscription, no waiting list.

---

<div align="center">

**Built by [David Obajemu](https://davidobajemu.com)**

MIT License

</div>
