# 📱 Kiro Remote Bridge

**Control any AI coding agent from your phone.** Send prompts, receive streaming responses, and manage your workspace — from the coffee shop, the couch, or anywhere with signal.

Works with **Kiro**, **Cursor**, **Windsurf**, **VS Code** (Copilot/Cline), and **Codex CLI**.

---

## How It Works

```
┌──────────────┐         WebSocket          ┌──────────────┐       AppleScript       ┌──────────────┐
│  Your Phone  │◄─────────────────────────►│    Bridge     │─────────────────────────►│  IDE Agent   │
│  (PWA)       │    ws://mac:3100/ws        │    Server     │    Cmd+L → Paste → ⏎    │  (Kiro, etc) │
└──────────────┘                            └──────────────┘                          └──────────────┘
                                                   │
                                            polls response.md
                                                   │
                                            streams back to phone
```

1. You type a message on your phone
2. Bridge injects it into your IDE's chat via AppleScript
3. The AI agent processes it (with full workspace context)
4. Bridge watches for the response file and streams it back to your phone

Your AI agent runs locally with full access to your files, terminal, and tools. Your phone is just the remote control.

---

## Quick Start

### Prerequisites

- macOS (AppleScript is used for IDE injection)
- Node.js 18+
- An AI coding IDE (Kiro, Cursor, Windsurf, VS Code, or Codex CLI)
- Accessibility permissions granted for the bridge

### Setup (2 minutes)

```bash
# Clone the repo
git clone https://github.com/SunnyDavid144/kiro-remote-bridge.git
cd kiro-remote-bridge

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start both servers
cd backend && npm start &
cd frontend && npm run dev -- -p 3101 &
```

### Connect Your Phone

**Same WiFi:**
Open `http://<your-mac-ip>:3101` on your phone.

**From anywhere (5G, remote):**
1. Install [Tailscale](https://tailscale.com) on Mac + phone
2. Sign in with the same account
3. Open `http://<tailscale-ip>:3101` on your phone

### Grant Permissions

The bridge uses AppleScript to paste prompts into your IDE. macOS will ask for:
- **Accessibility** access (System Settings → Privacy → Accessibility)

---

## Supported IDEs

| IDE | Chat Shortcut | Status |
|-----|--------------|--------|
| 🟣 Kiro | `Cmd+L` | Full support |
| ⚡ Cursor | `Cmd+L` | Full support |
| 🏄 Windsurf | `Cmd+L` | Full support |
| 🔵 VS Code | `Cmd+Shift+I` | Copilot Chat |
| 🤖 Codex CLI | Terminal paste | Full support |

The bridge auto-detects which IDEs are running. Switch between them from the workspace selector on your phone.

---

## Features

### Mobile-First Chat UI
- Console-inspired dark interface
- Streaming markdown with syntax highlighting
- Code blocks with copy button
- Tool call indicators and execution plans

### Smart Agent Detection
- Shows when your agent is busy vs. idle
- Queues prompts when agent is working (auto-sends when idle)
- Won't accidentally interrupt ongoing tasks

### Workspace Selector
- See all open IDE windows across all supported IDEs
- Target a specific project/window
- Switch IDEs on the fly

### PWA / Installable
- Add to home screen for native app feel
- Splash screen, app icon, standalone mode
- Works offline for cached messages

### Session Persistence
- Messages survive page refreshes
- Onboarding wizard for first-time setup
- Settings panel with connection info

### Haptic Feedback
- Vibration on send/receive
- Audio cues (send whoosh, receive pop, connection chime)
- Pull-to-refresh gesture

---

## Architecture

```
kiro-remote-bridge/
├── backend/
│   ├── server.js              # Express + WebSocket + file relay
│   ├── adapters/              # Per-IDE adapters
│   │   ├── base.js            # Abstract adapter interface
│   │   ├── kiro.js            # Kiro adapter
│   │   ├── cursor.js          # Cursor adapter
│   │   ├── windsurf.js        # Windsurf adapter
│   │   ├── vscode.js          # VS Code adapter
│   │   ├── codex.js           # Codex CLI adapter
│   │   └── index.js           # Registry + auto-detection
│   ├── mock-agent.js          # Built-in test agent
│   └── acp-protocol.js        # JSON-RPC 2.0 helpers
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Main chat interface
│   │   ├── components/        # UI components
│   │   ├── hooks/             # WebSocket + state management
│   │   └── lib/               # Types, storage, haptics
│   └── public/
│       ├── manifest.json      # PWA manifest
│       └── icons/             # App icons
└── .kiro-bridge/
    ├── prompt.md              # Incoming prompts (written by bridge)
    └── response.md            # Agent responses (read by bridge)
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Server status |
| GET | `/api/ides` | List all + running IDEs |
| GET | `/api/windows` | List windows across all IDEs |
| POST | `/api/ide` | Set active IDE |
| POST | `/api/target` | Set target window |
| POST | `/response-complete` | Signal response done |

---

## How the Response Loop Works

The bridge appends a hidden instruction to each prompt:

> `[System Routing: Please ensure you also stream a raw markdown copy of this response to .kiro-bridge/response.md so it can be relayed to my mobile device.]`

The AI agent writes its response to `response.md`. The bridge polls this file every 500ms and streams new content to your phone via WebSocket. When the file stops changing for 6+ seconds, the bridge marks the response as complete.

---

## Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `HOST` | `0.0.0.0` | Bridge bind address |
| `PORT` | `3100` | Bridge port |
| `BRIDGE_MODE` | `relay` | `relay` (file-based) or `acp` (subprocess) |
| `ACP_COMMAND` | — | Path to ACP binary (when available) |
| `WORKSPACE_ROOT` | `..` | Root of the workspace |

---

## Adding a New IDE

Create a file in `backend/adapters/your-ide.js`:

```javascript
const BaseAdapter = require("./base");
const { exec } = require("child_process");

class YourIDEAdapter extends BaseAdapter {
  constructor() {
    super();
    this.name = "your-ide";
    this.displayName = "Your IDE";
    this.icon = "🎯";
  }

  getAppIdentifier() { return "YourApp"; }
  getChatFocusShortcut() { return 'keystroke "l" using command down'; }

  async isRunning() { /* ... */ }
  async listWindows() { /* ... */ }
  async injectPrompt(prompt, windowId) { /* ... */ }
}

module.exports = YourIDEAdapter;
```

Then register it in `backend/adapters/index.js`.

---

## Security

- Bridge binds to `0.0.0.0` by default for LAN access
- Set `HOST=127.0.0.1` to restrict to localhost only
- Use [Tailscale](https://tailscale.com) for encrypted remote access (WireGuard)
- No data leaves your machine — everything runs locally
- No external API calls — your IDE's own AI subscription handles the intelligence

---

## Roadmap

- [ ] Push notifications when long tasks complete
- [ ] Voice input (Web Speech API)
- [ ] Quick action buttons (run tests, git status, deploy)
- [ ] File browser with syntax highlighting
- [ ] Terminal output streaming
- [ ] One-command installer (`npx kiro-remote-bridge`)
- [ ] macOS menu bar status app
- [ ] QR code pairing
- [ ] Auth token for multi-user security
- [ ] Session history timeline

---

## License

MIT
