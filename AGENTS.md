# ChadVC - Agent Guidelines

## Build/Test Commands
- **Go Backend**: `cd server && go run cmd/main.go` (dev), `go build -o chadvc cmd/main.go` (prod)
- **Go Tests**: `go test ./...` (all), `go test -v ./internal/ws` (single package), `go test -v -run TestFunctionName` (single test)
- **Go Coverage**: `go test -cover ./...` or `go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out`
- **Frontend**: `cd client && bun run tauri dev` (dev), `bun run tauri build` (prod)
- **Frontend (Nvidia)**: `cd client && WEBKIT_DISABLE_DMABUF_RENDERER=1 bun run tauri dev` (for Nvidia systems with WebKitGTK issues)
- **Lint**: `golangci-lint run` (Go backend in server/), `bun run lint` (frontend if configured)
- **IMPORTANT**: Use `bun` for all frontend package management and scripts, NOT npm or node
- **DO NOT RUN**: Do not run dev servers, build commands, or the app until explicitly requested by the user

## Tech Stack
- **Backend**: Go 1.25+, Gin framework, gorilla/websocket, GORM + PostgreSQL
- **Frontend**: Tauri 2.x, React 19, TypeScript (strict mode), TailwindCSS v4, Zustand, simple-peer
- **Database**: PostgreSQL with GORM (decision finalized, no Prisma/Drizzle)

## Go Code Style
- **Formatting**: Standard `gofmt`, package comments required for all packages
- **Imports**: 3 groups with blank lines: (1) stdlib, (2) external, (3) internal project packages
- **Naming**: PascalCase (exported), camelCase (unexported/variables), lowercase packages, single-letter or abbreviated receivers
- **Constructors/Getters**: Prefix with `New*` (constructors) and `Get*` (getters)
- **Constants**: PascalCase or camelCase, NOT SCREAMING_SNAKE_CASE
- **Errors**: Use `errors.Is()` for comparison, `fmt.Errorf` with `%w` for wrapping, early returns for error handling
- **Structs**: JSON tags (`json:"field_name"`), GORM tags with constraints, `json:"-"` for sensitive fields, binding tags for validation
- **Comments**: Package-level godoc, exported functions/types documented starting with name
- **Logging**: Use `log.Printf()` with descriptive context (usernames, IDs, state changes)

## TypeScript/React Code Style
- **Components**: Functional components only, default export, PascalCase naming, hooks at top
- **Types**: Interfaces for props/state/objects, type aliases for unions/functions
- **Naming**: camelCase (vars/functions), PascalCase (components/interfaces), SCREAMING_SNAKE_CASE (constants)
- **Booleans**: Prefix with `is`, `has`, `show` (e.g., `isConnected`, `hasMessages`, `showBanner`)
- **Handlers**: Prefix with `handle` (e.g., `handleSubmit`, `handleClick`)
- **Imports**: React first, then external libs, then internal (stores/lib/components), no blank lines between groups
- **State**: Zustand for global state with persist middleware, useState for local component state
- **Errors**: Try-catch with typed checks: `error instanceof Error ? error.message : "fallback"`
- **Patterns**: Use optional chaining (`user?.name`), nullish coalescing (`value ?? default`), early returns, async/await

## TailwindCSS v4
- **Configuration**: Use `@theme` block in CSS files (index.css), NOT tailwind.config.js
- **Custom Colors**: Project uses `chad-*` prefix for custom colors defined in @theme block

## Project Structure
- `server/cmd/main.go`: Entry point only, no business logic here
- `server/internal/*`: All implementation (api, ws, models, db, middleware, auth, utils)
- `client/src/`: React components, stores (Zustand), lib utilities
- `client/src-tauri/`: Rust/Tauri backend for desktop app

## General Rules
- **No Emojis**: Do not use emojis in code, comments, or commit messages
- **No READMEs**: Do not create README.md files unless explicitly requested by the user
- **No Tests Yet**: Test infrastructure not implemented, tests can be added when requested
