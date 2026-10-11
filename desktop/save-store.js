import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import path from 'node:path';

export async function saveLocalGame(saveFile,state){
  const content=JSON.stringify(state);
  if(!content || Buffer.byteLength(content)>512*1024) throw new Error('Save is too large');
  await mkdir(path.dirname(saveFile),{recursive:true});
  let previous;
  try{
    previous=await readFile(saveFile,'utf8');
    JSON.parse(previous);
  }catch(error){
    if(error.code!=='ENOENT' && !(error instanceof SyntaxError)) throw error;
    previous=null;
  }
  if(previous!==null){
    await writeFile(`${saveFile}.backup.tmp`,previous,{mode:0o600});
    await rename(`${saveFile}.backup.tmp`,`${saveFile}.backup`);
  }
  await writeFile(`${saveFile}.tmp`,content,{mode:0o600});
  await rename(`${saveFile}.tmp`,saveFile);
}

export async function loadLocalGame(saveFile){
  try{return JSON.parse(await readFile(saveFile,'utf8'));}
  catch(primaryError){
    try{return JSON.parse(await readFile(`${saveFile}.backup`,'utf8'));}
    catch{
      if(primaryError.code==='ENOENT') return null;
      throw primaryError;
    }
  }
}
