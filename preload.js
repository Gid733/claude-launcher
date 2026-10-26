const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  list: () => ipcRenderer.invoke('profiles:list'),
  add: (name) => ipcRenderer.invoke('profiles:add', name),
  rename: (id, name) => ipcRenderer.invoke('profiles:rename', id, name),
  remove: (id) => ipcRenderer.invoke('profiles:remove', id),
  open: (id) => ipcRenderer.invoke('profiles:open', id),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  // The main process pushes a fresh snapshot after each background refresh.
  onSnapshot: (callback) => ipcRenderer.on('snapshot', (_event, snap) => callback(snap)),
});
