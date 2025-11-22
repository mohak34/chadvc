# Server Setup

## Install Dependencies

```bash
cd server
go mod init chadvc
go get github.com/gin-gonic/gin
go get github.com/gorilla/websocket
go get github.com/pion/webrtc/v3
```

## Database Setup (TBD)

Options being considered:
- Prisma (popular, great DX)
- Drizzle (lightweight, TypeScript-first)
- GORM (Go-native ORM)

Decision pending...

## Running the Server

```bash
cd server
go run cmd/main.go
```

Server will start on `http://localhost:8080`
