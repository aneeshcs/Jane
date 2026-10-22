#!/usr/bin/env node
// Standalone Node server for the full Jane app: runs the same Worker code (src/worker.js + src/engine.js) with
// static files from public/ and file-based storage in DATA_DIR. No runtime dependencies.
//   npm start          (builds first)      or   node server/index.mjs   (after npm run build)
// Env: PORT (8787), HOST (127.0.0.1; use 0.0.0.0 to reach it from other devices), DATA_DIR (./local-data),
//      LEARNER_NAME, LEARNER_AGE, LEARNER_GRADE, SCHOOL_PROFILE (docs/SCHOOL.md).
import http from 'http';import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
import {fileStore} from './file-kv.mjs';import {assets} from './assets.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PUBLIC=path.join(ROOT,'public');
if(!fs.existsSync(path.join(PUBLIC,'tax.json'))||!fs.existsSync(path.join(ROOT,'src/gen.js'))){
  console.error('public/tax.json or src/gen.js is missing: run `npm run build` first (npm start does this for you).');process.exit(1);}
const {default:worker}=await import('../src/worker.js');
const VERSION=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version;
const PORT=+(process.env.PORT||8787),HOST=process.env.HOST||'127.0.0.1';
const DATA_DIR=path.resolve(process.env.DATA_DIR||path.join(ROOT,'local-data'));
const env={ASSETS:assets(PUBLIC),JANE_KV:fileStore(DATA_DIR)};
for(const k of ['LEARNER_NAME','LEARNER_AGE','LEARNER_GRADE','SCHOOL_PROFILE'])if(process.env[k])env[k]=process.env[k];
// One request at a time touches storage (the Worker does read-modify-write on the progress record).
let chain=Promise.resolve();const serial=fn=>{const r=chain.then(fn,fn);chain=r.catch(()=>{});return r;};
const MAX_BODY=1<<20;
const server=http.createServer(async(req,res)=>{
  try{
    const host=req.headers.host||`localhost:${PORT}`;const url=new URL(req.url,`http://${host}`);
    if(url.pathname==='/healthz'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify({ok:true,version:VERSION}));}
    const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>MAX_BODY){res.writeHead(413);return res.end('Payload too large');}chunks.push(c);}
    const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v!=null)headers.set(k,Array.isArray(v)?v.join(', '):v);
    const request=new Request(url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
    const isApi=url.pathname.startsWith('/api/')||url.pathname==='/parent';
    const r=await (isApi?serial(()=>worker.fetch(request,env)):worker.fetch(request,env));
    const out={};r.headers.forEach((v,k)=>{if(k!=='set-cookie')out[k]=v;});const sc=r.headers.getSetCookie();if(sc.length)out['set-cookie']=sc;
    res.writeHead(r.status,out);res.end(req.method==='HEAD'||!r.body?undefined:Buffer.from(await r.arrayBuffer()));
  }catch(e){console.error(e);if(!res.headersSent)res.writeHead(500,{'content-type':'text/plain'});res.end('Internal error');}
});
server.listen(PORT,HOST,()=>console.log(`Jane ${VERSION} on http://${HOST==='0.0.0.0'?'localhost':HOST}:${PORT}  (data: ${DATA_DIR}; parent report: /parent)`));
for(const s of ['SIGINT','SIGTERM'])process.on(s,()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),3000).unref();});
