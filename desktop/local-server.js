import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {ARTIFACTS, ARCHAEOLOGICAL_FINDS, FOUNDATION_CODEX_ENTRIES} from '../data/discovery_catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentTypes = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const codexIds=new Set([...ARTIFACTS,...ARCHAEOLOGICAL_FINDS].map(item=>item.codexEntry)
  .concat(FOUNDATION_CODEX_ENTRIES));

export function desktopAsset(requestPath){
  if(requestPath==='/game' || requestPath==='/') return path.join(root,'protected/game.html');
  if(requestPath==='/music.js') return path.join(root,'public/music.js');
  if(requestPath==='/favicon.svg') return path.join(root,'homepage/favicon.svg');
  if(requestPath==='/desktop/discoveries.js') return path.join(root,'desktop/discoveries.js');
  if(requestPath==='/data/discovery_catalog.js') return path.join(root,'data/discovery_catalog.js');
  const codex=/^\/codex\/([a-z0-9_/-]+)\.md$/.exec(requestPath);
  if(codex && codexIds.has(codex[1])) return path.join(root,'portus/codex',`${codex[1]}.md`);
  const match=/^\/game-assets\/([a-z0-9-]+\.(?:js|css))$/.exec(requestPath);
  if(!match) return null;
  return path.join(root,'protected',match[1].endsWith('.css')?'css':'js',match[1]);
}

export async function startDesktopServer(){
  const server=http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const asset=desktopAsset(pathname);
    if(req.method!=='GET' || !asset){res.writeHead(404).end();return;}
    try{
      let content=await readFile(asset);
      if(pathname==='/game' || pathname==='/'){
        const html=content.toString('utf8').replace(
          '<script type="module" src="/game-assets/game.js"></script>',
          '<script>window.PORTUS_DESKTOP=true;</script>\n<script type="module" src="/game-assets/game.js"></script>');
        content=Buffer.from(html);
      }
      res.writeHead(200,{'Content-Type':contentTypes[path.extname(asset)],
        'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'",
        'Cache-Control':'no-store'}).end(content);
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  return {server,url:`http://127.0.0.1:${server.address().port}/game`};
}
