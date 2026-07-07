const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");

let overlayWindow;
let panelWindow;
let tray;
let cursorTimer = null;
let latestSnapshot = { companions: [], settings: {} };

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

function boundsFilePath() {
  return path.join(app.getPath("userData"), "panel-bounds.json");
}

function readSavedBounds() {
  try {
    return JSON.parse(fs.readFileSync(boundsFilePath(), "utf-8"));
  } catch {
    return null;
  }
}

function saveBounds(bounds) {
  try {
    fs.writeFileSync(boundsFilePath(), JSON.stringify(bounds));
  } catch {
    // Position memory is a convenience; ignore write failures.
  }
}

function loadPage(win, page) {
  if (isDev) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}/${page}`);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", page));
  }
}

function createOverlayWindow() {
  const primary = screen.getPrimaryDisplay();
  const { x, y, width, height } = primary.workArea;

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  loadPage(overlayWindow, "overlay.html");
}

function createPanelWindow() {
  const saved = readSavedBounds();
  panelWindow = new BrowserWindow({
    width: saved?.width ?? 420,
    height: saved?.height ?? 620,
    x: saved?.x,
    y: saved?.y,
    minWidth: 380,
    minHeight: 520,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    titleBarStyle: "hidden",
    hasShadow: true,
    resizable: true,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  panelWindow.setAlwaysOnTop(true, "floating");
  loadPage(panelWindow, "index.html");

  const persist = () => saveBounds(panelWindow.getBounds());
  panelWindow.on("moved", persist);
  panelWindow.on("resized", persist);

  panelWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      persist();
      panelWindow.hide();
    }
  });
}

function showPanel() {
  if (!panelWindow) {
    createPanelWindow();
    return;
  }
  panelWindow.show();
  panelWindow.focus();
}

function createTray() {
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip("Pet Engine");
  const menu = Menu.buildFromTemplate([
    { label: "Show panel", click: showPanel },
    {
      label: "Follow mode",
      type: "checkbox",
      checked: false,
      click: (item) => {
        // Keep the pump in sync immediately; the panel mirrors the setting.
        if (item.checked) {
          startCursorPump();
        } else {
          stopCursorPump();
        }
        panelWindow?.webContents.send("tray:toggleFollow", item.checked);
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on("double-click", showPanel);
}

app.whenReady().then(() => {
  nativeTheme.themeSource = "light";
  createOverlayWindow();
  createPanelWindow();
  createTray();

  globalShortcut.register("Control+Alt+P", () => {
    showPanel();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createOverlayWindow();
      createPanelWindow();
    } else {
      showPanel();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  app.isQuiting = true;
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  if (cursorTimer) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }
});

// Cursor pump: only runs while follow mode is on. Sends overlay-relative
// coordinates so the overlay can compare against pet positions directly.
function startCursorPump() {
  if (cursorTimer) {
    return;
  }
  cursorTimer = setInterval(() => {
    if (!overlayWindow) {
      return;
    }
    const point = screen.getCursorScreenPoint();
    const wb = overlayWindow.getBounds();
    overlayWindow.webContents.send("cursor:update", { x: point.x - wb.x, y: point.y - wb.y });
  }, 33);
}

function stopCursorPump() {
  if (cursorTimer) {
    clearInterval(cursorTimer);
    cursorTimer = null;
  }
  overlayWindow?.webContents.send("cursor:update", null);
}

ipcMain.on("follow:set", (_event, active) => {
  if (active) {
    startCursorPump();
  } else {
    stopCursorPump();
  }
});

// Panel -> main -> overlay: behavior commands.
ipcMain.on("command:push", (_event, command) => {
  overlayWindow?.webContents.send("command:apply", command);
});

// Panel -> main -> overlay: state snapshot.
ipcMain.on("snapshot:push", (_event, snapshot) => {
  latestSnapshot = snapshot;
  overlayWindow?.webContents.send("snapshot:update", snapshot);
});

// Overlay startup -> main -> panel: request a fresh snapshot.
ipcMain.on("snapshot:request", () => {
  overlayWindow?.webContents.send("snapshot:update", latestSnapshot);
  panelWindow?.webContents.send("snapshot:requested");
});

// Overlay hit-test -> main: only capture the mouse while it is over a pet.
ipcMain.on("overlay:setInteractive", (_event, interactive) => {
  overlayWindow?.setIgnoreMouseEvents(!interactive, { forward: true });
});

ipcMain.handle("panel:minimizeToTray", () => {
  panelWindow?.hide();
});

ipcMain.handle("panel:close", () => {
  panelWindow?.hide();
});

ipcMain.handle("panel:alwaysOnTop", (_event, enabled) => {
  panelWindow?.setAlwaysOnTop(Boolean(enabled), enabled ? "floating" : "normal");
  return panelWindow?.isAlwaysOnTop() ?? false;
});
