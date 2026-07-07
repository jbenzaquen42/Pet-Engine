const { app, BrowserWindow, globalShortcut, ipcMain, nativeTheme } = require("electron");
const path = require("path");

let mainWindow;
let clickThroughEnabled = false;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1220,
    height: 780,
    minWidth: 920,
    minHeight: 620,
    transparent: true,
    backgroundColor: "#00000000",
    frame: false,
    titleBarStyle: "hidden",
    hasShadow: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setAlwaysOnTop(true, "floating");
  nativeTheme.themeSource = "light";

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  clickThroughEnabled = false;
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setFocusable(true);
};

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register("Control+Alt+P", () => {
    clickThroughEnabled = false;
    if (!mainWindow) {
      return;
    }

    mainWindow.setIgnoreMouseEvents(false);
    mainWindow.setFocusable(true);
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("window:clickThroughChanged", false);
  });

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

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});

ipcMain.handle("window:alwaysOnTop", (_event, enabled) => {
  mainWindow?.setAlwaysOnTop(Boolean(enabled), enabled ? "screen-saver" : "normal");
  return mainWindow?.isAlwaysOnTop() ?? false;
});

ipcMain.handle("window:desktopMode", (_event, enabled) => {
  if (!mainWindow) {
    return false;
  }

  mainWindow.setAlwaysOnTop(Boolean(enabled), enabled ? "screen-saver" : "normal");
  mainWindow.setSkipTaskbar(Boolean(enabled));
  mainWindow.setFocusable(!enabled);
  return enabled;
});

ipcMain.handle("window:clickThrough", (_event, enabled) => {
  clickThroughEnabled = Boolean(enabled);
  mainWindow?.setIgnoreMouseEvents(clickThroughEnabled, { forward: true });
  mainWindow?.webContents.send("window:clickThroughChanged", clickThroughEnabled);
  return clickThroughEnabled;
});
