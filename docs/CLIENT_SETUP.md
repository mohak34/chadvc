# Client Setup

## Create Tauri App

```bash
cd client
npm create tauri-app
# Choose: React, TypeScript, npm
```

## Install Dependencies

```bash
npm install simple-peer zustand axios
npm install -D tailwindcss postcss autoprefixer
```

## Running the Client

```bash
npm run tauri dev
```

## Building for Production

```bash
npm run tauri build
```

This will create `.deb` and `.AppImage` files in `src-tauri/target/release/bundle/`
