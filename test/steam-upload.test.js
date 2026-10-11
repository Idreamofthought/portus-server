import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';

const execFileAsync=promisify(execFile);
const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const prepareScript=path.join(projectRoot,'steam/prepare-upload.js');

async function makeWindowsBuild(root){
  const content=path.join(root,'Portus Windows');
  await mkdir(path.join(content,'resources'),{recursive:true});
  for(const file of ['Portus.exe','resources/app.asar','LICENSE.electron.txt','LICENSES.chromium.html']){
    await writeFile(path.join(content,file),'test');
  }
  return content;
}

test('Steam preparation writes preview-first scripts without publishing a build',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'portus-steam-'));
  try{
    const content=await makeWindowsBuild(root);
    await execFileAsync(process.execPath,[prepareScript,'12345','12346',content],{cwd:root});
    const destination=path.join(root,'dist/steam/12345');
    const preview=await readFile(path.join(destination,'app_build_12345_preview.vdf'),'utf8');
    const upload=await readFile(path.join(destination,'app_build_12345.vdf'),'utf8');
    const depot=await readFile(path.join(destination,'depot_build_12346.vdf'),'utf8');
    assert.match(preview,/"Preview" "1"/);
    assert.match(upload,/"Preview" "0"/);
    assert.doesNotMatch(`${preview}${upload}${depot}`,/SetLive/i);
    assert.match(upload,/"12346" "depot_build_12346\.vdf"/);
    assert.match(depot,/"LocalPath" "\*"/);
    assert.match(depot,/Portus Windows/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('Steam preparation refuses an incomplete Windows package',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'portus-steam-incomplete-'));
  try{
    const content=path.join(root,'incomplete');
    await mkdir(content);
    await writeFile(path.join(content,'Portus.exe'),'test');
    await assert.rejects(
      execFileAsync(process.execPath,[prepareScript,'12345','12346',content],{cwd:root}),
      error=>/Incomplete Windows package: missing resources\/app\.asar/.test(error.stderr)
    );
  }finally{await rm(root,{recursive:true,force:true});}
});
