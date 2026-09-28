const {app,BrowserWindow,shell}=require('electron');
const {ipcMain}=require('electron');
const path=require('node:path');

let localServer;
app.whenReady().then(async()=>{
  const {startDesktopServer}=await import('./local-server.js');
  const {saveLocalGame,loadLocalGame}=await import('./save-store.js');
  const {server,url}=await startDesktopServer();
  localServer=server;
  const origin=new URL(url).origin;
  const saveFile=path.join(app.getPath('userData'),'portus-save.json');
  const trusted=event=>new URL(event.senderFrame.url).origin===origin;
  ipcMain.handle('portus:save',async(event,state)=>{
    if(!trusted(event)) throw new Error('Untrusted window');
    await saveLocalGame(saveFile,state);
    return true;
  });
  ipcMain.handle('portus:load',async event=>{
    if(!trusted(event)) throw new Error('Untrusted window');
    return loadLocalGame(saveFile);
  });
  const win=new BrowserWindow({width:1280,height:850,minWidth:960,minHeight:650,
    title:'Portus',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,
      preload:path.join(__dirname,'preload.cjs')}});
  win.webContents.setWindowOpenHandler(({url:target})=>{
    if(target.startsWith('https://')) shell.openExternal(target);
    return {action:'deny'};
  });
  win.webContents.on('will-navigate',(event,target)=>{
    if(new URL(target).origin!==origin) event.preventDefault();
  });
  await win.loadURL(url);
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>localServer?.close());
