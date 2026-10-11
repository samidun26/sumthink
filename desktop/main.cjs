const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, protocol, net, Notification, dialog, shell, session, powerSaveBlocker } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { StudioStorage, atomicWrite, MAX_BYTES } = require('./storage.cjs');

app.setName('Focus Studio');
if (process.env.FOCUS_STUDIO_TEST_DATA && !app.isPackaged) {
  fs.mkdirSync(process.env.FOCUS_STUDIO_TEST_DATA, { recursive: true });
  app.setPath('userData', process.env.FOCUS_STUDIO_TEST_DATA);
}
protocol.registerSchemesAsPrivileged([{ scheme: 'focus', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
const rendererRoot = path.join(__dirname, 'renderer');
const permittedFiles = new Set(['index.html', 'app.mjs', 'core.mjs', 'tasks.mjs', 'style.css', 'favicon.svg']);
let window, tray, storage, parseState, quitting = false;
let focusBlocker = null;
let latestTimer = { phase: 'idle', remaining: 1500, title: '' };

function trusted(event) {
  if (!window || event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) return false;
  try { const url = new URL(event.senderFrame.url); return url.protocol === 'focus:' && url.hostname === 'app' && url.pathname === '/index.html'; }
  catch { return false; }
}
function showWindow() { if (!storage || !app.isReady()) return; if (!window) createWindow(); if (window.isMinimized()) window.restore(); window.show(); window.focus(); }
function command(name) { showWindow(); window.webContents.send('studio:command', name); }
function trayMenu() {
  const minutes = Math.floor(latestTimer.remaining / 60), seconds = String(latestTimer.remaining % 60).padStart(2, '0');
  return Menu.buildFromTemplate([
    { label: latestTimer.phase === 'idle' ? 'A little room for focus' : `${minutes}:${seconds} · ${latestTimer.phase}`, enabled: false },
    { label: 'Open today’s plan', click: () => command('tasks') },
    { label: 'Start / pause focus', click: () => command('timer') },
    { label: 'New task', click: () => command('task') },
    { type: 'separator' }, { label: 'Quit Focus Studio', role: 'quit' },
  ]);
}
function createWindow() {
  window = new BrowserWindow({
    width: 1320, height: 920, minWidth: 850, minHeight: 650, show: false,
    title: 'Focus Studio', backgroundColor: '#f8f7f3', titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 13, y: 7 }, icon: path.join(__dirname, 'assets', 'app.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.on('close', event => {
    if (process.platform === 'darwin' && !quitting) { event.preventDefault(); window.hide(); }
  });
  window.on('closed', () => { window = null; });
  window.loadURL('focus://app/index.html#tasks');
}
function installMenu() {
  const template = [
    { label: 'Focus Studio', submenu: [
      { role: 'about' }, { type: 'separator' }, { label: 'Preferences…', accelerator: 'CmdOrCtrl+,', click: () => command('settings') },
      { type: 'separator' }, { role: 'services' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' },
    ] },
    { label: 'File', submenu: [
      { label: 'New Task', accelerator: 'CmdOrCtrl+N', click: () => command('task') },
      { label: 'Capture an Idea', accelerator: 'CmdOrCtrl+Shift+J', click: () => command('capture') },
      { type: 'separator' },
      { label: 'Export Backup…', accelerator: 'CmdOrCtrl+Shift+E', click: () => command('export') },
      { label: 'Import Backup…', accelerator: 'CmdOrCtrl+Shift+I', click: () => command('import') },
      { type: 'separator' }, { role: 'close' },
    ] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [
      { label: 'Focus Studio', accelerator: 'CmdOrCtrl+1', click: () => command('studio') },
      { label: 'To-dos', accelerator: 'CmdOrCtrl+2', click: () => command('tasks') },
      { label: 'Idea Inbox', accelerator: 'CmdOrCtrl+3', click: () => command('ideas') },
      { label: 'Session Journal', accelerator: 'CmdOrCtrl+4', click: () => command('journal') },
      { type: 'separator' }, { label: 'Immersive Focus', accelerator: 'CmdOrCtrl+Shift+F', click: () => command('immerse') },
      { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
    ] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { label: 'Show Focus Studio', click: showWindow }, { role: 'front' }] },
    { label: 'Help', submenu: [
      { label: 'Getting Started', click: () => dialog.showMessageBox(window, { type: 'info', title: 'A clearer kind of busy', message: 'Capture → plan → focus → reflect', detail: 'Add tasks with Command N. Choose a few high priorities for Today. Use Focus on a task to begin a session, then save your reflection and optionally complete it. Closing the window keeps the menu-bar timer running. Command Q quits. Export a backup from File whenever you like.' }) },
      { label: 'Show Local Data in Finder', click: () => shell.showItemInFolder(storage.file) },
      { label: 'Open Development Documentation', click: () => shell.openPath(path.join(app.isPackaged ? process.resourcesPath : path.dirname(__dirname), 'docs', 'macos-app.md')) },
    ] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
function installIPC() {
  ipcMain.on('studio:pending-tasks', (event, count) => {
    if (trusted(event) && process.platform === 'darwin' && Number.isInteger(count) && count >= 0 && count <= 100000) app.dock.setBadge(count ? String(count) : '');
  });
  ipcMain.on('studio:load', event => { event.returnValue = trusted(event) ? storage.load() : { error: 'Untrusted window' }; });
  ipcMain.handle('studio:save', (event, raw) => {
    if (!trusted(event)) return { ok: false, error: 'Untrusted window' };
    try {
      const value = storage.save(raw);
      if (process.platform === 'darwin') {
        const state = parseState(value); const today = new Date();
        const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const count = state.tasks.filter(t => !t.done && (t.plannedDate === day || (t.dueDate && t.dueDate <= day))).length;
        app.dock.setBadge(count ? String(count) : '');
      }
      return { ok: true };
    } catch (error) { return { ok: false, error: error.message }; }
  });
  ipcMain.handle('studio:export', async (event, raw) => {
    if (!trusted(event)) return { error: 'Untrusted window' };
    try {
      const value = JSON.stringify(parseState(raw), null, 2);
      const result = await dialog.showSaveDialog(window, { title: 'Export your studio', defaultPath: 'Focus Studio Backup.json', filters: [{ name: 'Studio backup', extensions: ['json'] }] });
      if (result.canceled) return { canceled: true };
      atomicWrite(result.filePath, value); return { ok: true };
    } catch (error) { return { error: error.message }; }
  });
  ipcMain.handle('studio:import', async event => {
    if (!trusted(event)) return { error: 'Untrusted window' };
    try {
      const confirmation = await dialog.showMessageBox(window, { type: 'question', buttons: ['Cancel', 'Choose Backup'], defaultId: 0, cancelId: 0, message: 'Replace this studio with a backup?', detail: 'This replaces tasks, ideas, preferences, and sessions. Export your current studio first if you want to keep it. The previous valid saved state is also retained locally.' });
      if (confirmation.response !== 1) return { canceled: true };
      const result = await dialog.showOpenDialog(window, { title: 'Import studio backup', properties: ['openFile'], filters: [{ name: 'Studio backup', extensions: ['json'] }] });
      if (result.canceled) return { canceled: true };
      if (fs.statSync(result.filePaths[0]).size > MAX_BYTES) throw new Error('Backup exceeds the 10 MB limit.');
      const raw = storage.save(fs.readFileSync(result.filePaths[0], 'utf8'), { replace: true });
      return { raw };
    } catch (error) { return { error: error.message }; }
  });
  ipcMain.on('studio:timer', (event, status) => {
    if (!trusted(event) || !['idle', 'running', 'paused', 'complete'].includes(status?.phase) || !Number.isInteger(status.remaining) || status.remaining < 0 || status.remaining > 3600) return;
    const changed = latestTimer.remaining !== status.remaining || latestTimer.phase !== status.phase;
    const finished = latestTimer.phase === 'running' && status.phase === 'complete';
    if (status.phase === 'running' && focusBlocker === null) focusBlocker = powerSaveBlocker.start('prevent-app-suspension');
    else if (status.phase !== 'running' && focusBlocker !== null) { powerSaveBlocker.stop(focusBlocker); focusBlocker = null; }
    latestTimer = { phase: status.phase, remaining: status.remaining, title: typeof status.title === 'string' ? status.title.slice(0, 140) : '' };
    if (changed && tray) {
      tray.setContextMenu(trayMenu());
      tray.setToolTip(status.phase === 'idle' ? 'Focus Studio' : `${Math.floor(status.remaining / 60)}:${String(status.remaining % 60).padStart(2, '0')} · ${latestTimer.title || 'Focus Studio'}`);
      if (process.platform === 'darwin') tray.setTitle(status.phase === 'running' ? `${Math.floor(status.remaining / 60)}:${String(status.remaining % 60).padStart(2, '0')}` : '');
    }
    if (finished && Notification.isSupported()) {
      const notice = new Notification({ title: 'A little further along.', body: 'Your focus session is complete. Leave a reflection and a next step.', silent: true });
      notice.on('click', () => command('studio')); notice.show();
    }
  });
}
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', showWindow);
  app.on('before-quit', () => { quitting = true; if (focusBlocker !== null) powerSaveBlocker.stop(focusBlocker); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', showWindow);
  app.whenReady().then(async () => {
    ({ parseState } = await import(pathToFileURL(path.join(rendererRoot, 'core.mjs')).href));
    const dataRoot = process.env.FOCUS_STUDIO_TEST_DATA && !app.isPackaged ? process.env.FOCUS_STUDIO_TEST_DATA : app.getPath('userData');
    storage = new StudioStorage(dataRoot, parseState);
    const loaded = storage.load(); if (loaded.raw) latestTimer = parseState(loaded.raw).timer;
    protocol.handle('focus', async request => {
      const url = new URL(request.url);
      const filename = url.pathname.slice(1);
      if (url.hostname !== 'app' || !permittedFiles.has(filename)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(path.join(rendererRoot, filename)).href);
    });
    // The app is entirely local; network requests and permission prompts are unnecessary.
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (_details, callback) => callback({ cancel: true }));
    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    session.defaultSession.setPermissionCheckHandler(() => false);
    installIPC(); installMenu();
    app.setAboutPanelOptions({ applicationName: 'Focus Studio', applicationVersion: app.getVersion(), copyright: 'Your personal space for intentional work.' });
    if (process.platform === 'darwin') {
      const image = nativeImage.createFromPath(path.join(__dirname, 'assets', 'trayTemplate.png')); image.setTemplateImage(true);
      tray = new Tray(image); tray.setToolTip('Focus Studio'); tray.setContextMenu(trayMenu()); tray.on('click', showWindow);
    }
    createWindow();
  }).catch(error => { console.error('Focus Studio could not start:', error.message); app.quit(); });
}
