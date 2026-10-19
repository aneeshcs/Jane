// Shared test helpers: run the pack validator on a JSON object, load the example quest.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';
export const ROOT=path.resolve(import.meta.dirname,'..');
if(!fs.existsSync(path.join(ROOT,'public/tax.json'))||!fs.existsSync(path.join(ROOT,'src/gen.js')))execFileSync(process.execPath,['build.mjs'],{cwd:ROOT,stdio:'ignore'});
export const example=()=>JSON.parse(fs.readFileSync(path.join(ROOT,'packs/examples/example-quest.json'),'utf8'));
// validate(pack, {args, env}) → {status, stdout, stderr}. Default: --dry-run --offline (no progress lookup).
export function validate(pack,{args=['--dry-run','--offline'],env={}}={}){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jane-pack-'));const f=path.join(dir,'p.json');
  fs.writeFileSync(f,JSON.stringify(pack));const r=spawnSync(process.execPath,['publish-lessons.mjs',f,...args],{cwd:ROOT,encoding:'utf8',env:{...process.env,...env}});fs.rmSync(dir,{recursive:true,force:true});return r;}
export const graded=q=>!['why','fact','learn'].includes(q.type);
export const nGraded=p=>p.topics.reduce((a,t)=>a+t.questions.filter(graded).length,0);
export const tmpDir=(p='jane-')=>fs.mkdtempSync(path.join(os.tmpdir(),p));
export async function loadEngine(){const E=await import('../src/engine.js');const g=E.graph(JSON.parse(fs.readFileSync(path.join(ROOT,'public/tax.json'),'utf8')));return{E,g};}
