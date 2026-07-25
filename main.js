const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 820,
    minWidth: 380,
    minHeight: 680,
    title: 'MBTI Cocktail',
    icon: fs.existsSync(path.join(__dirname, 'assets', 'icon.png')) ? path.join(__dirname, 'assets', 'icon.png') : undefined,
    backgroundColor: '#1A1A2E',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 开发时打开 DevTools
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC: 收藏管理（持久化到本地文件）
const userDataPath = path.join(app.getPath('userData'), 'favorites.json');

ipcMain.handle('load-favorites', () => {
  try {
    if (fs.existsSync(userDataPath)) {
      return JSON.parse(fs.readFileSync(userDataPath, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return [];
});

ipcMain.handle('save-favorites', (event, favorites) => {
  try {
    fs.writeFileSync(userDataPath, JSON.stringify(favorites), 'utf-8');
    return true;
  } catch (e) {
    return false;
  }
});

// IPC: 获取用户数据路径
ipcMain.handle('get-user-data-path', () => {
  return app.getPath('userData');
});
