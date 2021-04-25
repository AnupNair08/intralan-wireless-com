const electron = require("electron");
const {
  Menu,
  app,
  Tray,
  BrowserWindow,
  ipcMain: ipc,
  screen,
  globalShortcut,
} = electron;
const path = require("path");
require("./backend/broadcast");

let tray = null;
const isDev = require("electron-is-dev");
require("electron-reload")(__dirname, {
  electron: require(`${__dirname}/../node_modules/electron`),
});

var mainWindow = null;
app.on("ready", async (_) => {
  mainWindow = new BrowserWindow({
    width: screen.getPrimaryDisplay().size.width,
    height: screen.getPrimaryDisplay().size.height,
    resizable: true,
    webPreferences: {
      nodeIntegration: true,
    },
  });

  globalShortcut.register("CommandOrControl+E", () => {
    mainWindow.show();
  });

  // mainWindow.setAlwaysOnTop(true);
  // mainWindow.loadURL(`http://localhost:3000`);

  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  tray = new Tray(path.join(__dirname, "../assets/ic_launcher.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "IntraLANCom",
      click: function () {
        mainWindow.show();
      },
    },
    {
      label: "Quit",
      click: function () {
        app.quit();
      },
    },
  ]);
  tray.on("click", () => {
    mainWindow.show();
  });
  tray.setToolTip("IntrLAN Communication");
  tray.setContextMenu(contextMenu);

  mainWindow.on("closed", (_) => {
    mainWindow = null;
  });
  mainWindow.on("close", (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.exit(0);
  }
});

ipc.on("close", (evt) => {
  app.exit(0);
});
app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  if (mainWindow) {
    mainWindow.removeAllListeners("close");
    mainWindow.close();
  }
});
ipc.on("min", (evt) => {
  mainWindow.hide();
});
