const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petEngine", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  close: () => ipcRenderer.invoke("window:close"),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("window:alwaysOnTop", enabled),
  setDesktopMode: (enabled) => ipcRenderer.invoke("window:desktopMode", enabled),
  setClickThrough: (enabled) => ipcRenderer.invoke("window:clickThrough", enabled)
});
