const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const path = require("path");

let win;

app.whenReady().then(() => {
  win = new BrowserWindow({
    width: 380,
    height: 68,
    x: 20,
    y: 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Start as click-through; the renderer toggles on mouse enter/leave
  win.setIgnoresMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, "overlay.html"));

  ipcMain.on("set-ignore-mouse", (_e, ignore) => {
    win.setIgnoresMouseEvents(ignore, { forward: true });
  });

  // Cmd+Shift+T toggles visibility
  globalShortcut.register("CommandOrControl+Shift+T", () => {
    if (win.isVisible()) win.hide();
    else win.show();
  });
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());
