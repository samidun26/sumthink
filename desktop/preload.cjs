const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('focusDesktop', Object.freeze({
  loadState: () => ipcRenderer.sendSync('studio:load'),
  saveState: raw => ipcRenderer.invoke('studio:save', raw),
  exportState: raw => ipcRenderer.invoke('studio:export', raw),
  importState: () => ipcRenderer.invoke('studio:import'),
  timerStatus: status => ipcRenderer.send('studio:timer', status),
  pendingTasks: count => ipcRenderer.send('studio:pending-tasks', count),
  widgetFeedback: value => ipcRenderer.send('studio:widget-feedback', value),
  openCompanion: () => ipcRenderer.send('studio:companion'),
  onCommand: callback => { ipcRenderer.on('studio:command', (_event, command) => callback(command)); },
}));
