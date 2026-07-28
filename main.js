const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const SpotifyAuth = require('./auth');

const store = new Store();
const spotifyAuth = new SpotifyAuth(store);

let mainWindow = null;
let tray = null;
let isDocked = false;
let isMovingLock = false;
let userIntentionalMinimize = false;
let isLyricsModeActive = false;

function createWindow() {
  const appIconPath = path.join(__dirname, 'icon.png');

  mainWindow = new BrowserWindow({
    width: 380,
    height: 145,
    minWidth: 160,
    minHeight: 28,
    frame: false,
    transparent: true,
    thickFrame: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    icon: appIconPath,
    title: 'SpotiGlass - Desktop Spotify Widget (BETA)',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  if (mainWindow.setVisibleOnAllWorkspaces) {
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  mainWindow.loadFile('index.html');

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed() && !userIntentionalMinimize) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      mainWindow.showInactive();
    }
  });

  mainWindow.on('minimize', (event) => {
    if (!userIntentionalMinimize) {
      event.preventDefault();
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.restore();
          mainWindow.showInactive();
          mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        }
      }, 1);
    } else {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('hide', (event) => {
    if (!userIntentionalMinimize) {
      event.preventDefault();
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.showInactive();
          mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
        }
      }, 1);
    }
  });

  mainWindow.on('moved', () => {
    if (!mainWindow || isMovingLock || !mainWindow.isVisible()) return;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { workArea, bounds } = primaryDisplay;
    const [x, y] = mainWindow.getPosition();
    const [w, h] = mainWindow.getSize();

    let clampedX = Math.max(0, Math.min(x, bounds.width - w));
    let clampedY = Math.max(0, Math.min(y, bounds.height - h));

    if (clampedX !== x || clampedY !== y) {
      mainWindow.setPosition(clampedX, clampedY);
    }

    const taskbarTop = workArea.height;

    if (!isDocked && y >= taskbarTop - 25) {
      dockToTaskbar();
    } else if (isDocked && y < taskbarTop - 40) {
      undockFromTaskbar();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !userIntentionalMinimize) {
      if (!mainWindow.isVisible()) {
        mainWindow.showInactive();
      }
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  }, 400);
}

function createSystemTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  let rawIcon = nativeImage.createFromPath(iconPath);
  const trayIcon = rawIcon.resize({ width: 16, height: 16 });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('SpotiGlass - v1.0.0-BETA');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🟢 Mostrar SpotiGlass',
      click: () => {
        showWindow();
      }
    },
    {
      label: '📌 Acoplar a la Barra de Tareas',
      click: () => {
        if (isDocked) {
          undockFromTaskbar();
        } else {
          dockToTaskbar();
        }
      }
    },
    { type: 'separator' },
    {
      label: '🌐 Desarrollador: Yastin Vasquez (GitHub)',
      click: () => {
        shell.openExternal('https://github.com/yastinvasquezzz');
      }
    },
    {
      label: '🚪 Cerrar Sesión (Cambiar Cuenta)',
      click: () => {
        spotifyAuth.logout();
        if (mainWindow && !mainWindow.isDestroyed()) {
          showWindow();
          mainWindow.webContents.send('logout-event');
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ Salir Completamente',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.focus();
    } else {
      showWindow();
    }
  });
}

function showWindow() {
  if (!mainWindow) return;
  mainWindow.show();
  mainWindow.restore();
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
}

function dockToTaskbar() {
  if (!mainWindow || isMovingLock) return;
  isMovingLock = true;
  isDocked = true;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea, bounds } = primaryDisplay;
  const taskbarHeight = Math.max(bounds.height - workArea.height, 40);

  const dockWidth = isLyricsModeActive ? 310 : 230;
  const dockHeight = taskbarHeight - 6;
  const dockX = 4;
  const dockY = bounds.height - taskbarHeight + 3;

  mainWindow.setSize(dockWidth, dockHeight);
  mainWindow.setPosition(dockX, dockY);
  showWindow();

  mainWindow.webContents.send('taskbar-dock-status', { isDocked: true });

  setTimeout(() => { isMovingLock = false; }, 300);
}

function undockFromTaskbar() {
  if (!mainWindow || isMovingLock) return;
  isMovingLock = true;
  isDocked = false;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  const restoreX = 20;
  const restoreY = Math.max(20, workArea.height - 180);

  mainWindow.setSize(380, 145);
  mainWindow.setPosition(restoreX, restoreY);
  showWindow();

  mainWindow.webContents.send('taskbar-dock-status', { isDocked: false });

  setTimeout(() => { isMovingLock = false; }, 300);
}

app.whenReady().then(() => {
  // Servicio de Arranque Automático con Windows (Pestaña 'Aplicaciones de arranque' en Administrador de Tareas)
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false,
      path: app.getPath('exe')
    });
  } catch (e) {
    console.log('Error configurando arranque automático:', e.message);
  }

  createWindow();
  createSystemTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-client-id', () => {
  return spotifyAuth.getClientId();
});

ipcMain.handle('save-client-id', (event, clientId) => {
  spotifyAuth.setClientId(clientId);
  return { success: true };
});

ipcMain.handle('has-valid-session', () => {
  return spotifyAuth.hasValidSession();
});

ipcMain.handle('start-login', async (event, clientId) => {
  try {
    if (clientId) {
      spotifyAuth.setClientId(clientId);
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      userIntentionalMinimize = true;
      mainWindow.hide();
    }

    await spotifyAuth.login(
      () => {
        userIntentionalMinimize = false;
        if (mainWindow && !mainWindow.isDestroyed()) {
          showWindow();
          mainWindow.webContents.send('auth-success');
        }
      },
      (error) => {
        console.error('Error durante autenticación:', error);
        userIntentionalMinimize = false;
        if (mainWindow && !mainWindow.isDestroyed()) {
          showWindow();
        }
      }
    );
    return { success: true };
  } catch (error) {
    userIntentionalMinimize = false;
    if (mainWindow && !mainWindow.isDestroyed()) {
      showWindow();
    }
    return { success: false, error: error.message };
  }
});

ipcMain.handle('toggle-taskbar-dock', () => {
  if (isDocked) {
    undockFromTaskbar();
  } else {
    dockToTaskbar();
  }
  return { isDocked };
});

ipcMain.handle('set-dock-lyrics-mode', (event, isLyricsActive) => {
  isLyricsModeActive = isLyricsActive;
  if (isDocked) {
    dockToTaskbar();
  }
  return { success: true, isLyricsModeActive };
});

ipcMain.handle('get-currently-playing', async () => {
  return await spotifyAuth.getCurrentlyPlaying();
});

ipcMain.handle('toggle-play-pause', async (event, isPlaying) => {
  return await spotifyAuth.togglePlayPause(isPlaying);
});

ipcMain.handle('search-tracks', async (event, query) => {
  return await spotifyAuth.searchTracks(query);
});

ipcMain.handle('play-track-uri', async (event, uri) => {
  return await spotifyAuth.playTrackUri(uri);
});

ipcMain.handle('next-track', async () => {
  return await spotifyAuth.nextTrack();
});

ipcMain.handle('previous-track', async () => {
  return await spotifyAuth.previousTrack();
});

ipcMain.handle('logout', () => {
  spotifyAuth.logout();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('logout-event');
  }
  return { success: true };
});

ipcMain.on('minimize-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    userIntentionalMinimize = true;
    mainWindow.hide();
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});
