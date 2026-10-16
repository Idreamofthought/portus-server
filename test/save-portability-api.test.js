import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validSave} from './fixtures/valid-save.js';

test('portable saves survive authenticated cloud round trips; invalid updates preserve the saved town',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'portus-portable-api-'));
  Object.assign(process.env,{NODE_ENV:'test',SITE_URL:'http://localhost:8080',
    DATABASE_PATH:path.join(dir,'test.db'),JWT_SECRET:'test-secret',
    MIGRATION_READ_ONLY:'0',FREE_ACCESS_EMAILS:'portable@example.com'});
  const {app}=await import('../server.js');
  const {db}=await import('../database2.js');
  const {issueAuthCookie}=await import('../auth.js');
  const {Session}=await import('./integration/helpers.js');
  const server=app.listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try{
    const uid=db.prepare('INSERT INTO users(email,password_hash,email_verified,created_at) VALUES (?,?,1,?)')
      .run('portable@example.com','unused-test-hash',Date.now()).lastInsertRowid;
    const session=new Session(`http://127.0.0.1:${server.address().port}`);
    issueAuthCookie({cookie:(name,value)=>session.cookies.set(name,value)},Number(uid));
    const save=validSave();
    save.marketPolicy={autoSell:false,foodReserveTurns:96,generalReserve:20};
    save.offlineDiscoveries={rolls:['mining:1'],artifacts:['star_reader'],fragments:{old_tablet:1},unlocked:['artifacts/star-reader']};
    const upload=await session.postCsrf('/api/save',{state:JSON.stringify(save)});
    assert.equal(upload.status,200);
    const loaded=await session.request('GET','/api/save');
    assert.deepEqual(loaded.body.state,save);
    const invalid={...save,grid:[]};
    assert.equal((await session.postCsrf('/api/save',{state:JSON.stringify(invalid)})).status,400);
    assert.deepEqual((await session.request('GET','/api/save')).body.state,save);
    const asset=await session.request('GET','/game-assets/save-validation.js');
    assert.equal(asset.status,200);assert.match(asset.text,/export function validateSave/);
    // Length in JS characters is below the limit; UTF-8 bytes exceed it.
    const multibyte='é'.repeat(300000);
    assert.equal((await session.postCsrf('/api/save',{state:multibyte})).status,413);
  }finally{
    await new Promise(resolve=>server.close(resolve));db.close();
    await rm(dir,{recursive:true,force:true});
  }
});
