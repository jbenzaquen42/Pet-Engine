const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("petEngine", {
  // Panel window controls
  minimizeToTray: () => ipcRenderer.invoke("panel:minimizeToTray"),
  close: () => ipcRenderer.invoke("panel:close"),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("panel:alwaysOnTop", enabled),
  setLaunchAtLogin: (enabled) => ipcRenderer.invoke("app:launchAtLogin", enabled),

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

  // Follow mode: cursor pump + follow toggle
  setFollow: (active) => ipcRenderer.send("follow:set", active),
  onCursor: (callback) => {
    const listener = (_event, point) => callback(point);
    ipcRenderer.on("cursor:update", listener);
    return () => ipcRenderer.removeListener("cursor:update", listener);
  },

  // Tool pop-out windows (own OS window, roam across screens, survive minimize)
  openPopout: (tab) => ipcRenderer.send("popout:open", tab),

  // Behavior commands: panel -> overlay
  pushCommand: (command) => ipcRenderer.send("command:push", command),
  onCommand: (callback) => {
    const listener = (_event, command) => callback(command);
    ipcRenderer.on("command:apply", listener);
    return () => ipcRenderer.removeListener("command:apply", listener);
  },

  // Tray-driven events
  onTrayToggleFollow: (callback) => {
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on("tray:toggleFollow", listener);
    return () => ipcRenderer.removeListener("tray:toggleFollow", listener);
  }
});
