// Author: 16@Xinqwq
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;
let mainWindow = null; // 记录主窗口，便于二次启动聚焦

// 单实例锁：防止用户连点打开多个实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
const BACKEND_PORT = process.env.PORT || 4001;

// function startBackend() {
//   const runPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
//   const backendPath = path.join(runPath, 'backend', 'index.js');

//   // 1) 首选：直接在主进程内启动（dev 与 prod 都走这条）
//   try {
//     process.env.PORT = String(BACKEND_PORT);
//     process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
//     require(backendPath);
//     console.log('[backend] started in main process');
//     return;
//   } catch (e) {
//     console.error('[backend] require failed, fallback to spawn:', e);
//   }

//   // 2) 兜底：spawn 子进程（极少数环境才会走到这里）
//   const nodeCmd = app.isPackaged ? process.execPath : 'node';
//   const cwd = app.isPackaged ? process.resourcesPath : app.getAppPath();
//   backendProcess = spawn(nodeCmd, [backendPath], {
//     cwd,
//     stdio: 'inherit',
//     env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: app.isPackaged ? 'production' : 'development' }
//   });
//   backendProcess.on('exit', (code) => console.log('[backend] exit', code));
//   backendProcess.on('error', (err) => console.error('[backend] start fail', err));
// }

function startBackend() {
    const runPath = app.isPackaged ? process.resourcesPath : app.getAppPath();
    const backendPath = path.join(runPath, 'backend', 'index.js');
  
    // 1) 首选：直接在主进程内启动（dev 与 prod 都走这条）
    try {
      process.env.PORT = String(BACKEND_PORT);
      process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
      require(backendPath);
      console.log('[backend] started in main process');
      return;
    } catch (e) {
      console.error('[backend] require failed, fallback to spawn:', e);
    }
  
    // 2) 兜底：spawn 子进程（极少数环境才会走到这里）
    const nodeCmd = app.isPackaged ? process.execPath : 'node';
    const cwd = app.isPackaged ? process.resourcesPath : app.getAppPath();
    backendProcess = spawn(nodeCmd, [backendPath], {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, PORT: String(BACKEND_PORT), NODE_ENV: app.isPackaged ? 'production' : 'development' }
    });
    backendProcess.on('exit', (code) => console.log('[backend] exit', code));
    backendProcess.on('error', (err) => console.error('[backend] start fail', err));
  }

async function waitForBackendReady(maxMs = 4000) {
  const start = Date.now();
  const url = `http://127.0.0.1:${BACKEND_PORT}/api/health`;
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: false }
  });

  // 统一使用同源地址加载页面，避免 file:// 渲染异常与跨源限制
  const indexUrl = `http://127.0.0.1:${BACKEND_PORT}/`;
  win.loadURL(indexUrl);
  mainWindow = win;
}

app.whenReady().then(async () => {
  startBackend();
  await waitForBackendReady(15000);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('before-quit', () => {
  try { if (backendProcess && !backendProcess.killed) backendProcess.kill(); } catch {}
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });


