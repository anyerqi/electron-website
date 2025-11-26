const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { URL } = require('url');

const sitePath = 'dist';
const indexFileName = 'index.html';

// Initialize auto-update module (may be stub if disabled)
const autoUpdate = require('./auto-update');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// disable default menu items for macOS and Windows
if (process.platform === 'darwin') {
    // Provide a minimal macOS menu without Developer Tools entries.
    const menuTemplate = [
      { role: 'appMenu' },
      { role: 'editMenu' },
      { role: 'windowMenu' },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  } else {
    // Remove the default menu bar on Windows to maximize usable space.
    Menu.setApplicationMenu(null);
  }

const resolveAppPath = (targetPath) => {
  return path.join(sitePath, targetPath);
};

// Handle opening new windows and external links
const openHandler = ({ url, disposition }) => {
    const targetDispositions = new Set(['foreground-tab', 'new-window']);
    if (!targetDispositions.has(disposition) || !url) {
      return { action: 'allow' };
    }
    if (url.startsWith('file://')) {
      const parsedUrl = new URL(url);
      let localPath = path.normalize(decodeURIComponent(parsedUrl.pathname));
      if (process.platform === 'win32' && /^\\[A-Z]\:/.test(localPath)) {
        localPath = localPath.slice(3);
      }
      console.log('Opening internal URL in new window:', localPath); 
      // append the final index.html if the path is a directory
      if (localPath.endsWith('html') === false) {
        localPath = path.join(localPath, indexFileName);
      }
      createWindow(localPath);
    } else {
      console.log('Opening external URL in default browser:', url);
      shell.openExternal(url);
    }
    return { action: 'deny' };
};

const createWindow = (filePath) => {
// Create the browser window.
  const newWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: false,
    },
  });
  // and load the index.html of the app from the packaged assets.
  const assetPath = resolveAppPath(filePath);
  newWindow.loadFile(assetPath);

  // Open the DevTools.
  //newWindow.webContents.openDevTools();

  newWindow.webContents.setWindowOpenHandler(openHandler);
  return newWindow;
}


const createMainWindow = () => {
  createWindow(indexFileName);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  createMainWindow();
  // Initialize auto-update if enabled
  if (autoUpdate.enabled) {
    autoUpdate.init();
  }
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
