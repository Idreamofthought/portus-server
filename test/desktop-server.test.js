import test from 'node:test';
import assert from 'node:assert/strict';
import { startDesktopServer } from '../desktop/local-server.js';
import {saveLocalGame,loadLocalGame} from '../desktop/save-store.js';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
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
    assert.equal((await fetch(`${origin}/desktop/discoveries.js`)).status,200);
    assert.equal((await fetch(`${origin}/data/discovery_catalog.js`)).status,200);
    const codex=await fetch(`${origin}/codex/artifacts/star-reader.md`);
    assert.equal(codex.status,200);
    assert.match(await codex.text(),/^# /);
    for(const path of ['/api/me','/server.js','/game-assets/../server.js']){
      assert.equal((await fetch(`${origin}${path}`)).status,404);
    }
    assert.equal((await fetch(`${origin}/codex/rituals/not-allowlisted.md`)).status,404);
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

test('desktop saves preserve and recover the previous valid save',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'portus-desktop-backup-'));
  const file=path.join(dir,'portus-save.json');
  try{
    const first={v:1,captain:'Aster',buildings:[{id:'hut',x:1,y:1}]};
    const second={v:1,captain:'Bran',buildings:[{id:'house',x:2,y:3}]};
    await saveLocalGame(file,first);
    await saveLocalGame(file,second);
    assert.deepEqual(JSON.parse(await readFile(`${file}.backup`,'utf8')),first);
    await writeFile(file,'not valid json');
    assert.deepEqual(await loadLocalGame(file),first);
  }finally{await rm(dir,{recursive:true,force:true});}
});
