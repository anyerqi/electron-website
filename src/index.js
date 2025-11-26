const { app, BrowserWindow, Menu, shell, protocol, net } = require('electron');
const path = require('path');
const { URL, pathToFileURL } = require('url');

const sitePath = 'dist';
const indexFileName = 'index.html';
const CUSTOM_SCHEME = 'webapp';

// Get the absolute path to the site directory
const getSiteBasePath = () => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, sitePath);
  }
  return path.join(__dirname, '..', sitePath);
};

// Register the custom scheme as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: CUSTOM_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

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

// Handle opening new windows and external links
const openHandler = ({ url, disposition }) => {
    const targetDispositions = new Set(['foreground-tab', 'new-window']);
    if (!targetDispositions.has(disposition) || !url) {
      return { action: 'allow' };
    }
    
    const parsedUrl = new URL(url);
    
    // Handle internal app:// protocol links
    if (parsedUrl.protocol === `${CUSTOM_SCHEME}:`) {
      let localPath = decodeURIComponent(parsedUrl.pathname);
      if (localPath.startsWith('/')) {
        localPath = localPath.slice(1);
      }
      console.log('Opening internal URL in new window:', localPath);
      // append the final index.html if the path is a directory
      if (!localPath.endsWith('html')) {
        localPath = path.join(localPath, indexFileName);
      }
      createWindow(localPath);
      return { action: 'deny' };
    } 
    // Open external URLs in default browser
    console.log('Opening external URL in default browser:', url);
    shell.openExternal(url);
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
  // Load the page using custom protocol to handle absolute paths correctly
  const appUrl = `${CUSTOM_SCHEME}://localhost/${filePath}`;
  newWindow.loadURL(appUrl);

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
  // Register custom protocol handler for serving static files
  // This fixes Next.js static export paths like /_next/static/...
  protocol.handle(CUSTOM_SCHEME, (request) => {
    const url = new URL(request.url);
    let urlPath = decodeURIComponent(url.pathname);
    
    // Remove leading slash for path.join
    if (urlPath.startsWith('/')) {
      urlPath = urlPath.slice(1);
    }
    
    const siteBasePath = getSiteBasePath();
    const filePath = path.join(siteBasePath, urlPath);
    
    // Convert to file URL and use net.fetch
    return net.fetch(pathToFileURL(filePath).toString());
  });

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
