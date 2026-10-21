import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {renderWritingArchive} from '../writing-archive.js';

test('archive rendering replaces only known temporary screenshots, retaining normal images',()=>{
  const html='<img src="/tmp/moz-screenshot-10.jpg" alt=""><img src="/DOCUME%7E1/ECOLAN%7E1/LOCALS%7E1/Temp/moz-screenshot.jpg" alt=""><img src="/images/loire.jpg" alt="Loire">';
  const rendered=renderWritingArchive(html);
  assert.equal((rendered.match(/Original image unavailable/g)||[]).length,2);
  assert.match(rendered,/<img src="\/images\/loire.jpg" alt="Loire">/);
  assert.doesNotMatch(rendered,/src="\/(tmp|DOCUME)/);
});

test('displayed source URLs replace Blogger editor destinations without inventing unknown targets',()=>{
  const html='<a href="http://www.blogger.com/blogger.g?blogID=1098931144041600650">http://solarscience.msfc.nasa.gov/predict.shtml</a>'+
    '<a href="http://www.blogger.com/blogger.g?blogID=1098931144041600650">click on sunshine</a>'+
    '<a href="https://example.com/">Normal link</a>';
  const rendered=renderWritingArchive(html);
  assert.match(rendered,/href="http:\/\/solarscience.msfc.nasa.gov\/predict.shtml"/);
  assert.doesNotMatch(rendered,/blogger\.com/);
  assert.match(rendered,/click on sunshine/);
  assert.match(rendered,/<a href="https:\/\/example.com\/">Normal link<\/a>/);
});

test('historical article repairs render through the real route and game.html keeps authentication',async()=>{
  const dir=await mkdtemp(path.join(tmpdir(),'writing-archive-'));
  Object.assign(process.env,{NODE_ENV:'test',SITE_URL:'http://localhost:8080',JWT_SECRET:'test-secret',DATABASE_PATH:path.join(dir,'test.db')});
  const {app}=await import('../server.js');const {db}=await import('../database2.js');
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    const source=new URL('../public/writing/opinions/towards-a-new-maunder-minimum-dalton-minimum-or-just-the-end-of-cycle-.html',import.meta.url);
    const raw=await readFile(source,'utf8');
    const response=await fetch(origin+'/tree/leaves/politics/towards-a-new-maunder-minimum-dalton-minimum-or-just-the-end-of-cycle-.html');
    assert.equal(response.status,200);const html=await response.text();
    assert.match(html,/Original image unavailable in the archive/);
    assert.doesNotMatch(html,/href="http:\/\/www.blogger.com\/blogger.g/);
    assert.match(raw,/moz-screenshot/);assert.equal(await readFile(source,'utf8'),raw);
    const legacy=await fetch(origin+'/game.html',{redirect:'manual'});
    assert.equal(legacy.status,301);assert.equal(legacy.headers.get('location'),'/game');
    const game=await fetch(origin+'/game',{redirect:'manual',headers:{Accept:'text/html'}});
    assert.equal(game.status,302);assert.equal(game.headers.get('location'),'/signup.html');
  }finally{await new Promise(resolve=>server.close(resolve));db.close();await rm(dir,{recursive:true,force:true});}
});
