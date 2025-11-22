# ChadVC - Complete Project Plan

## Tech Stack Final Decision

### Frontend (Tauri Desktop App)
- **Framework**: Tauri v1.5+
- **UI**: React 18 + TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State**: Zustand
- **WebRTC**: simple-peer
- **WebSocket**: Native WebSocket API
- **HTTP**: Axios or Fetch

### Backend (Go Server)
- **Language**: Go 1.21+
- **Framework**: Gin
- **WebSocket**: gorilla/websocket
- **WebRTC Signaling**: pion/webrtc
- **Database**: PostgreSQL 15+
- **ORM**: TBD (Prisma/Drizzle/GORM)
- **Cache**: Redis 7+
- **Auth**: JWT with golang-jwt/jwt

### Infrastructure
- **Server**: Oracle Cloud Free (Germany) - 1GB RAM, 1 OCPU
- **Database**: PostgreSQL (self-hosted)
- **Cache**: Redis (self-hosted)
- **SSL**: Let's Encrypt
- **TURN**: coturn (fallback for NAT)

## Core Features

### Phase 1: MVP (2 days)
1. Text chat (WebSocket)
2. P2P voice chat (WebRTC)
3. Basic UI (no auth initially)

### Phase 2: Persistence (Week 1)
4. Database integration (Prisma/Drizzle decision)
5. Message history
6. User persistence

### Phase 3: Authentication (Week 2)
7. User registration/login
8. JWT authentication
9. Session management

### Phase 4: Advanced Features (Week 3-4)
10. File uploads (images, PDFs, voice messages)
11. Server/channel system
12. User presence
13. Desktop notifications
14. System tray

## Voice Chat Architecture

**Approach**: P2P WebRTC Mesh (for 5 users)

**Flow**:
1. Users connect to Germany server for signaling
2. WebRTC P2P connections established directly between users
3. Audio flows peer-to-peer (not through server)
4. TURN relay as fallback for strict NAT

**Expected Latency**:
- P2P (India ↔ India): 10-40ms ✓
- TURN fallback: 150-200ms

## Database Decision (Pending)

### Options:

**1. GORM (Go-native)**
```go
Pros: Native Go, simple, well-maintained
Cons: Less type-safe than Prisma
Good for: Go-first approach
```

**2. Prisma (TypeScript → Go)**
```
Pros: Great DX, type-safe, migrations
Cons: Primarily for Node.js (can use prisma-client-go)
Good for: If you like Prisma DX
```

**3. Drizzle (Alternative)**
```
Pros: Lightweight, TypeScript-first
Cons: Would need Go equivalent or bridge
Good for: Modern TypeScript approach
```

**Recommendation**: Start with GORM (native Go, simpler for Go backend)
Can always migrate to Prisma later if needed.

## Security

- End-to-end encrypted voice (WebRTC DTLS/SRTP)
- HTTPS/WSS for all connections
- JWT authentication
- Bcrypt/Argon2 password hashing
- File upload validation
- Rate limiting
- Firewall + SSH hardening

## Expected Performance

**Client (Tauri)**:
- Memory: 50-150MB
- CPU: 5-10% (voice)
- Latency: 10-40ms (voice)

**Server (Oracle 1GB)**:
- Memory: 300-400MB (5 users)
- CPU: <20%
- Supports: 5-15 concurrent users

## Next Steps

1. ✓ Create project structure
2. Set up Go server with WebSocket
3. Set up Tauri app with React
4. Implement text chat
5. Implement voice chat
6. Decide on database (GORM recommended)
7. Add persistence
8. Add authentication
9. Deploy to Oracle Cloud

## Development Notes

- Database ORM decision pending
- Start with in-memory for MVP
- Add persistence after chat/voice works
- Focus on working features first, optimize later
