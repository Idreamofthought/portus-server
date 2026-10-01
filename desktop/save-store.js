import {copyFile,readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';

export async function saveLocalGame(saveFile,state){
  const content=JSON.stringify(state);
  if(!content || Buffer.byteLength(content)>512*1024) throw new Error('Save is too large');
  await mkdir(path.dirname(saveFile),{recursive:true});
  await writeFile(`${saveFile}.tmp`,content,{mode:0o600});
  try{await copyFile(saveFile,`${saveFile}.backup`);}
  catch(error){if(error.code!=='ENOENT') throw error;}
  await rename(`${saveFile}.tmp`,saveFile);
}

export async function loadLocalGame(saveFile){
  try{return JSON.parse(await readFile(saveFile,'utf8'));}
  catch(primaryError){
    if(primaryError.code==='ENOENT') return null;
    try{return JSON.parse(await readFile(`${saveFile}.backup`,'utf8'));}
    catch{throw primaryError;}
  }
}
