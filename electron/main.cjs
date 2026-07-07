const { app, BrowserWindow, Menu, Tray, globalShortcut, ipcMain, nativeImage, screen, nativeTheme } = require("electron");
const path = require("path");
const fs = require("fs");

let overlayWindow;
let panelWindow;
let tray;
let cursorTimer = null;
let latestSnapshot = { companions: [], settings: {} };
const popoutWindows = new Map();

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

// Icon lives in build/ during dev and in resources/ once packaged.
const iconPath = isDev
  ? path.join(__dirname, "..", "build", "icon.png")
  : path.join(process.resourcesPath, "icon.png");

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

function loadPopout(win, tab) {
  if (isDev) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}/index.html?popout=${tab}`);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"), { search: `popout=${tab}` });
  }
}

function popoutBoundsPath(tab) {
  return path.join(app.getPath("userData"), `popout-${tab}.json`);
}

// A tool pop-out is a standalone frameless window: it can be dragged to any
// display and stays open when the main panel is minimized/hidden to the tray.
function openPopout(tab) {
  const existing = popoutWindows.get(tab);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return;
  }

  let saved = null;
  try {
    saved = JSON.parse(fs.readFileSync(popoutBoundsPath(tab), "utf-8"));
  } catch {
    saved = null;
  }

  const win = new BrowserWindow({
    width: saved?.width ?? 300,
    height: saved?.height ?? 400,
    x: saved?.x,
    y: saved?.y,
    icon: iconPath,
    minWidth: 240,
    minHeight: 260,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    hasShadow: true,
    resizable: true,
    skipTaskbar: false,
    title: `Pet Engine — ${tab}`,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setAlwaysOnTop(true, "floating");
  loadPopout(win, tab);

  const persist = () => {
    try {
      fs.writeFileSync(popoutBoundsPath(tab), JSON.stringify(win.getBounds()));
    } catch {
      // Pop-out position memory is a convenience; ignore write failures.
    }
  };
  win.on("moved", persist);
  win.on("resized", persist);
  win.on("closed", () => popoutWindows.delete(tab));

  popoutWindows.set(tab, win);
}

// Union of connected displays so companions can roam across all screens.
// A single transparent always-on-top window spanning a DPI boundary is a
// known Electron/Chromium-on-Windows compositor bug: the window (and, since
// windows share a GPU process, sibling windows too) can render blank or
// flicker. So we only span displays that share the primary's scale factor;
// a mismatched-DPI secondary monitor is left out rather than corrupting
// everything.
function getOverlayBounds() {
  const displays = screen.getAllDisplays();
  const primaryScale = screen.getPrimaryDisplay().scaleFactor;
  const compatible = displays.filter((display) => display.scaleFactor === primaryScale);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const display of compatible) {
    const b = display.workArea;
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  if (!Number.isFinite(minX)) {
    const primary = screen.getPrimaryDisplay().workArea;
    return { x: primary.x, y: primary.y, width: primary.width, height: primary.height };
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function updateOverlayBounds() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.setBounds(getOverlayBounds());
  }
}

function createOverlayWindow() {
  const { x, y, width, height } = getOverlayBounds();

  overlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    icon: iconPath,
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
    icon: iconPath,
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
  let trayImage = nativeImage.createFromPath(iconPath);
  if (!trayImage.isEmpty()) {
    trayImage = trayImage.resize({ width: 18, height: 18 });
  }
  tray = new Tray(trayImage.isEmpty() ? nativeImage.createEmpty() : trayImage);
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

  // Keep the overlay spanning every compatible screen as monitors are
  // plugged/unplugged. display-metrics-changed is intentionally not watched
  // here: it can fire as a side effect of resizing a window near a DPI
  // boundary, which would otherwise retrigger setBounds in a loop.
  screen.on("display-added", updateOverlayBounds);
  screen.on("display-removed", updateOverlayBounds);

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

// Panel -> main: open a tool in its own pop-out window.
ipcMain.on("popout:open", (_event, tab) => {
  if (tab === "notes" || tab === "tasks" || tab === "timer") {
    openPopout(tab);
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

ipcMain.handle("app:launchAtLogin", (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
  return app.getLoginItemSettings().openAtLogin;
});
