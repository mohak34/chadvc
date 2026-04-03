# ChadVC

A lightweight Discord-like chat app with text and voice support.

## What is this?

ChadVC is a simple real-time communication app built with Electron + Svelte (frontend) and Go (backend). It supports text chat via WebSocket and peer-to-peer voice chat via WebRTC.

## Tech Stack

- **Frontend**: Electron, Svelte 5, TypeScript, TailwindCSS v4
- **Backend**: Go, Gin, gorilla/websocket, GORM, PostgreSQL
- **Voice**: WebRTC using simple-peer

## Why Electron

The desktop client was migrated from Tauri to Electron to get full Chromium WebRTC support on Linux while keeping low runtime overhead through a minimal main process, strict window security settings, and an optimized renderer.

## Running

**Backend:**
```bash
cd server
go run cmd/main.go
```

**Frontend:**
```bash
cd client
bun run electron:dev
```

## Build

```bash
bun run electron:build
```

## License

MIT
