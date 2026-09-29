import {cp,mkdir,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const stage=path.join(projectRoot,'desktop-build');

await rm(stage,{recursive:true,force:true});
await mkdir(stage,{recursive:true});

const copies=[
  ['desktop/discoveries.js','desktop/discoveries.js'],
  ['desktop/local-server.js','desktop/local-server.js'],
  ['desktop/main.cjs','desktop/main.cjs'],
  ['desktop/preload.cjs','desktop/preload.cjs'],
  ['desktop/save-store.js','desktop/save-store.js'],
  ['data/discovery_catalog.js','data/discovery_catalog.js'],
  ['homepage/favicon.svg','homepage/favicon.svg'],
  ['portus/codex','portus/codex'],
  ['protected/game.html','protected/game.html'],
  ['protected/css/game.css','protected/css/game.css'],
  ['protected/js','protected/js'],
  ['public/music.js','public/music.js']
];
for(const [source,destination] of copies){
  await mkdir(path.dirname(path.join(stage,destination)),{recursive:true});
  await cp(path.join(projectRoot,source),path.join(stage,destination),{recursive:true});
}

const manifest={
  name:'portus-desktop',
  version:'2.0.0',
  description:'Portus — a town by the sea',
  author:'Richard Jenkins',
  private:true,
  main:'desktop/main.cjs',
  build:{
    appId:'org.idreamofthought.portus',
    productName:'Portus',
    electronVersion:'44.4.5',
    asar:true,
    npmRebuild:false,
    files:['**/*'],
    directories:{output:'../dist/desktop'},
    win:{artifactName:'Portus-${version}-windows-${arch}.${ext}',target:['zip']}
  }
};
await writeFile(path.join(stage,'package.json'),`${JSON.stringify(manifest,null,2)}\n`);
