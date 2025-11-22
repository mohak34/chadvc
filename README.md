# ChadVC - Lightweight Discord Clone

A lightweight Discord alternative built with Tauri, React, and Go.

## Project Structure

```
chadvc/
├── client/              # Tauri + React frontend (to be created)
├── server/              # Go backend
│   ├── cmd/            # Entry point
│   ├── internal/
│   │   ├── api/        # REST API handlers
│   │   ├── ws/         # WebSocket hub and handlers
│   │   ├── webrtc/     # WebRTC signaling
│   │   ├── models/     # Data models
│   │   ├── db/         # Database connection (Prisma/Drizzle TBD)
│   │   ├── middleware/ # Auth, CORS, rate limiting
│   │   └── utils/      # Helper functions
└── docs/               # Documentation
```

## Features (MVP)

- Real-time text chat (WebSocket)
- P2P voice chat (WebRTC)
- Database persistence (Prisma/Drizzle - TBD)
- Low latency (<100ms for India users)

## Tech Stack

### Frontend
- Tauri 1.5+
- React 18 + TypeScript
- TailwindCSS + shadcn/ui
- simple-peer (WebRTC)
- Zustand (state management)

### Backend
- Go 1.21+
- Gin (web framework)
- gorilla/websocket
- pion/webrtc
- PostgreSQL (database)
- Redis (cache)

### Infrastructure
- Oracle Cloud Free Tier (Germany)
- 1GB RAM, 1 OCPU AMD
- Let's Encrypt SSL

## Getting Started

Coming soon...

## Development Roadmap

- [ ] Day 1-2: Text chat + Voice chat MVP
- [ ] Week 1: Add database persistence
- [ ] Week 2: Add authentication
- [ ] Week 3: Add file uploads
- [ ] Week 4: Polish and deploy

## License

MIT
