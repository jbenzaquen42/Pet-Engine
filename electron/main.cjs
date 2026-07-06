const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron");
const path = require("path");

let mainWindow;

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
};

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
  mainWindow?.setIgnoreMouseEvents(Boolean(enabled), { forward: true });
  return Boolean(enabled);
});
