# Kiro Remote Bridge

A local development tool that lets you control a Kiro IDE session from your mobile phone via a secure web interface.

## Architecture

```
┌─────────────┐       WebSocket        ┌──────────────┐      stdin/stdout      ┌──────────────┐
│   Mobile    │◄──────────────────────►│  Bridge      │◄───────────────────────►│  kiro-cli    │
│   Browser   │   ws://127.0.0.1:3100  │  Server      │   Content-Length framed │  acp         │
└─────────────┘                        └──────────────┘   JSON-RPC 2.0         └──────────────┘
```

## Quick Start

### 1. Start the Bridge Server

```bash
cd backend
npm install
npm start
```

The server binds to `127.0.0.1:3100` — it is **not** exposed on `0.0.0.0`.

### 2. Start the Frontend

```bash
cd frontend
npm install
npm run dev -- -p 3101
```

Open `http://localhost:3101` on your phone (via Tailscale) or browser.

### 3. Or Start Both at Once

```bash
npm run dev    # from the kiro-remote-bridge root
```

### 4. Verify It Works

In a second terminal:

```bash
cd backend
npm run test:client
```

You should see:
```
[test] Connected!
[test] Sending bridge:ping...
[test] Received: { type: "bridge:status", acp: "running", pid: ... }
[test] Received: { type: "bridge:pong", ts: ... }
[test] ✓ Bridge is alive and responding.
[test] ✓ WebSocket relay is functional.
```

### 3. Health Check

```bash
curl http://127.0.0.1:3100/health
```

Returns:
```json
{ "status": "ok", "acp": "running", "clients": 0 }
```

## Mobile Access via Tailscale

Since the server only listens on localhost, use [Tailscale](https://tailscale.com) to securely route your mobile traffic:

1. Install Tailscale on both your Mac and phone.
2. From your phone's browser, connect to `http://<your-mac-tailscale-ip>:3100`.

## WebSocket Protocol

Connect to `ws://127.0.0.1:3100/ws`. Messages are JSON envelopes:

### Client → Server

| `type`        | Description                              |
|---------------|------------------------------------------|
| `acp:send`    | Relay `msg.data` (JSON-RPC 2.0) to ACP   |
| `acp:restart` | Kill and respawn the ACP subprocess       |
| `bridge:ping` | Latency check                            |

### Server → Client

| `type`            | Description                              |
|-------------------|------------------------------------------|
| `bridge:status`   | Sent on connect — current ACP state      |
| `bridge:pong`     | Response to ping                         |
| `acp:message`     | A parsed JSON-RPC message from ACP       |
| `acp:stderr`      | Stderr output from the ACP process       |
| `acp:error`       | Spawn/connection error                   |
| `acp:exit`        | ACP process terminated                   |
| `bridge:error`    | Client-side protocol error               |

## Project Structure

```
kiro-remote-bridge/
├── README.md
├── package.json               # Root workspace scripts (npm run dev)
├── backend/
│   ├── package.json
│   ├── server.js              # Bridge server (Express + WebSocket + ACP spawn)
│   ├── acp-protocol.js        # JSON-RPC 2.0 message builders
│   ├── test-client.js         # Basic connectivity test
│   ├── test-acp-flow.js       # Full ACP lifecycle test
│   └── test-protocol-unit.js  # Unit tests for protocol module
└── frontend/
    ├── package.json
    ├── next.config.ts
    └── app/
        ├── page.tsx            # Main chat page
        ├── layout.tsx
        ├── globals.css
        ├── components/
        │   ├── status-bar.tsx
        │   ├── message-bubble.tsx
        │   └── chat-input.tsx
        ├── hooks/
        │   └── use-bridge.ts   # WebSocket + ACP state management
        └── lib/
            ├── types.ts        # TypeScript type definitions
            └── acp-client.ts   # Browser-side protocol builders
```

## Development

```bash
cd backend
npm run dev    # Starts with --watch for auto-reload
```
