const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petEngine", {
  // Panel window controls
  minimizeToTray: () => ipcRenderer.invoke("panel:minimizeToTray"),
  close: () => ipcRenderer.invoke("panel:close"),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("panel:alwaysOnTop", enabled),

  // Snapshot sync
  pushSnapshot: (snapshot) => ipcRenderer.send("snapshot:push", snapshot),
  requestSnapshot: () => ipcRenderer.send("snapshot:request"),
  onSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on("snapshot:update", listener);
    return () => ipcRenderer.removeListener("snapshot:update", listener);
  },
  onSnapshotRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("snapshot:requested", listener);
    return () => ipcRenderer.removeListener("snapshot:requested", listener);
  },

  // Overlay hit-test click-through
  setOverlayInteractive: (interactive) => ipcRenderer.send("overlay:setInteractive", interactive),

  // Tray-driven events
  onTrayToggleFollow: (callback) => {
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on("tray:toggleFollow", listener);
    return () => ipcRenderer.removeListener("tray:toggleFollow", listener);
  }
});
