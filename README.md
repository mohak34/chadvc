# ChadVC

A lightweight Discord-like chat app with text and voice support.

## What is this?

ChadVC is a simple real-time communication app built with Tauri (React frontend) and Go (backend). It supports text chat via WebSocket and peer-to-peer voice chat via WebRTC.

## Tech Stack

- **Frontend**: Tauri 2.x, React 19, TypeScript, TailwindCSS, Zustand
- **Backend**: Go, Gin, gorilla/websocket, GORM, PostgreSQL
- **Voice**: WebRTC using simple-peer

## Known Limitations

**WebRTC does not work on Linux with Tauri.** The WebKitGTK backend used by Tauri on Linux does not support WebRTC. Voice chat will only work on Windows and macOS.

To properly support voice on Linux, the WebRTC implementation needs to be moved to Rust using a native WebRTC client library (like `webrtc-rs`) instead of relying on the browser's WebRTC API. This is planned for a future update.

## Running

**Backend:**
```bash
cd server
go run cmd/main.go
```

**Frontend:**
```bash
cd client
bun run tauri dev
```

For Nvidia systems with WebKitGTK issues:
```bash
WEBKIT_DISABLE_DMABUF_RENDERER=1 bun run tauri dev
```

## License

MIT
