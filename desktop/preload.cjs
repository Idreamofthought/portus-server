const {contextBridge,ipcRenderer}=require('electron');

contextBridge.exposeInMainWorld('portusDesktopStorage',Object.freeze({
  save:state=>ipcRenderer.invoke('portus:save',state),
  load:()=>ipcRenderer.invoke('portus:load')
}));
