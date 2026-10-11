const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('focusWidgets', Object.freeze({
  snapshot: () => ipcRenderer.invoke('widget:snapshot'),
  action: value => ipcRenderer.send('widget:action', value),
  pin: enabled => ipcRenderer.send('widget:pin', enabled),
  close: () => ipcRenderer.send('widget:close'),
  onFeedback: callback => ipcRenderer.on('widget:feedback', (_event, value) => callback(value)),
  onUpdate: callback => ipcRenderer.on('widget:update', (_event, snapshot) => callback(snapshot)),
}));
