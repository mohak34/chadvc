import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("chadvc", {
  platform: process.platform,
});
