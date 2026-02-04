const { app, BrowserWindow, ipcMain, Menu, globalShortcut, shell } = require("electron");
const path = require("path");

let mainWindow = null;
let normalBounds = null;
let normalMinSize = null;
const compactSize = { width: 540, height: 520 };

app.setPath("userData", path.join(app.getPath("appData"), "BibleApp"));
app.setPath("cache", path.join(app.getPath("appData"), "BibleApp", "Cache"));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: "#f2f2f2",
    frame: false,
    titleBarStyle: "hidden",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "desktop", "index.html"));
  normalBounds = mainWindow.getBounds();
  normalMinSize = mainWindow.getMinimumSize();

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
    mainWindow.setAlwaysOnTop(true, "screen-saver");
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 600);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function watchForReload() {
  if (app.isPackaged || process.env.NODE_ENV !== "development") return;
  // Lazy load so packaged builds don't require dev deps.
  const chokidar = require("chokidar");
  const watcher = chokidar.watch(
    [
      path.join(__dirname, "desktop", "index.html"),
      path.join(__dirname, "desktop", "styles.css"),
      path.join(__dirname, "desktop", "app.js"),
      path.join(__dirname, "index.html")
    ],
    { ignoreInitial: true }
  );
  let reloadTimer = null;
  watcher.on("change", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      mainWindow.webContents.reloadIgnoringCache();
      reloadTimer = null;
    }, 150);
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  watchForReload();
  globalShortcut.register("Ctrl+Shift+I", () => {
    if (mainWindow) mainWindow.webContents.openDevTools({ mode: "detach" });
  });
  globalShortcut.register("F12", () => {
    if (mainWindow) mainWindow.webContents.openDevTools({ mode: "detach" });
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

ipcMain.on("app:close", () => {
  if (mainWindow) {
    mainWindow.close();
  } else {
    app.quit();
  }
});

ipcMain.on("app:minimize", () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on("app:maximize-toggle", () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on("app:startup-mode", (_event, payload) => {
  if (!mainWindow) return;
  const mode = typeof payload === "string" ? payload : payload?.mode;
  if (mode === "compact") {
    normalBounds = mainWindow.getBounds();
    normalMinSize = mainWindow.getMinimumSize() || [0, 0];
    const target = payload && typeof payload === "object" && payload.width && payload.height
      ? { width: payload.width, height: payload.height }
      : compactSize;
    mainWindow.setResizable(false);
    mainWindow.setMinimumSize(target.width, target.height);
    mainWindow.setSize(target.width, target.height, true);
    mainWindow.center();
  } else {
    mainWindow.setResizable(true);
    if (normalMinSize) {
      mainWindow.setMinimumSize(normalMinSize[0], normalMinSize[1]);
    }
    if (payload && typeof payload === "object" && payload.width && payload.height) {
      mainWindow.setSize(payload.width, payload.height, true);
      if (payload.center) {
        mainWindow.center();
      }
      normalBounds = mainWindow.getBounds();
    } else if (normalBounds) {
      mainWindow.setBounds(normalBounds);
    }
  }
});

ipcMain.on("app:open-external", (_event, payload) => {
  const url = typeof payload === "string" ? payload : payload?.url;
  if (!url) return;
  const browser = typeof payload === "object" ? payload.browser : null;
  if (browser === "edge" && process.platform === "win32") {
    shell.openExternal(`microsoft-edge:${url}`);
    return;
  }
  shell.openExternal(url);
});
