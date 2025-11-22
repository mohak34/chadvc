# ChadVC - Agent Guidelines

## Build/Test Commands
- **Go Backend**: `cd server && go run cmd/main.go` (dev), `go build -o chadvc cmd/main.go` (prod)
- **Go Tests**: `go test ./...` (all), `go test -v ./internal/ws` (single package)
- **Frontend**: `cd client && bun run tauri dev` (dev), `bun run tauri build` (prod)
- **Lint**: `golangci-lint run` (Go), `bun run lint` (frontend)
- **IMPORTANT**: Use `bun` for all frontend package management and scripts, NOT npm or node
- **DO NOT RUN**: Do not run dev servers, build commands, or the app until explicitly requested by the user

## Tech Stack
- **Backend**: Go 1.21+, Gin framework, gorilla/websocket, pion/webrtc
- **Frontend**: Tauri 1.5+, React 18, TypeScript, TailwindCSS, simple-peer
- **Database**: PostgreSQL + GORM (decision finalized from Prisma/Drizzle/GORM options)

## Code Style
- **Go**: Standard Go formatting (`gofmt`), package comments required, error handling with explicit checks
- **Imports**: Group stdlib, external, internal with blank lines between
- **Naming**: camelCase (Go private), PascalCase (Go public), lowercase packages
- **Types**: Explicit struct tags for JSON, use pointers for optional fields
- **Errors**: Always check and propagate with context, use `fmt.Errorf` for wrapping
- **Comments**: Package-level godoc, exported functions documented
- **No Emojis**: Do not use emojis in code, comments, or commit messages
- **No READMEs**: Do not create README.md files unless explicitly requested

## Project Structure
- `server/cmd/main.go`: Entry point, no business logic here
- `server/internal/*`: All implementation (api, ws, webrtc, models, db, middleware, utils)
- `client/`: Tauri + React app
