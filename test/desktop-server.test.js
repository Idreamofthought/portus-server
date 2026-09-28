import test from 'node:test';
import assert from 'node:assert/strict';
import { startDesktopServer } from '../desktop/local-server.js';
import {saveLocalGame,loadLocalGame} from '../desktop/save-store.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

test('desktop entry loads game assets without exposing web API or server secrets', async()=>{
  const {server,url}=await startDesktopServer();
  try{
    const page=await fetch(url);
    assert.equal(page.status,200);
    assert.match(await page.text(),/window\.PORTUS_DESKTOP=true/);
    const origin=new URL(url).origin;
    const module=await fetch(`${origin}/game-assets/game.js`);
    assert.equal(module.status,200);
    assert.match(await module.text(),/desktopMode/);
    assert.equal((await fetch(`${origin}/music.js`)).status,200);
    for(const path of ['/api/me','/server.js','/game-assets/../server.js']){
      assert.equal((await fetch(`${origin}${path}`)).status,404);
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
});

test('desktop saves survive a reload and reject oversized data',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'portus-desktop-'));
  const file=path.join(dir,'portus-save.json');
  try{
    assert.equal(await loadLocalGame(file),null);
    const state={v:1,captain:'Portus',buildings:[{id:'house',x:2,y:3}]};
    await saveLocalGame(file,state);
    assert.deepEqual(await loadLocalGame(file),state);
    await assert.rejects(saveLocalGame(file,{oversized:'x'.repeat(512*1024)}),/too large/);
    assert.deepEqual(await loadLocalGame(file),state);
  }finally{await rm(dir,{recursive:true,force:true});}
});
