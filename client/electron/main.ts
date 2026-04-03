import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const isDev = !app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#0e0f14",
    webPreferences: {
      preload: join(__dirname, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
      devTools: isDev,
      backgroundThrottling: true,
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (isDev) {
    void mainWindow.loadURL("http://localhost:1420");
  } else {
    void mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }

  return mainWindow;
}

function setupPerformanceFlags(): void {
  app.commandLine.appendSwitch("disable-spell-checking");
  app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaRouter");
  app.commandLine.appendSwitch("js-flags", "--max-old-space-size=256");
}

setupPerformanceFlags();

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
