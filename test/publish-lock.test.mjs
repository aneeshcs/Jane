// Slice 3: publishing never changes a finished quest (exit 4, nothing written; --force does not unlock it).
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {ROOT,example,tmpDir} from './helpers.mjs';
const D='2026-03-03';
const run=(dir,file,...a)=>spawnSync(process.execPath,['publish-lessons.mjs',file,'--local',...a],{cwd:ROOT,encoding:'utf8',env:{...process.env,DATA_DIR:dir}});
function setup(quest){const dir=tmpDir('jane-lock-');const f=path.join(dir,'pack.json');fs.writeFileSync(f,JSON.stringify(example()));
  assert.equal(run(dir,f,'--date',D).status,0,'first publish');fs.writeFileSync(path.join(dir,'progress.json'),JSON.stringify({v:2,ts:{},packSeen:{},quests:{[D]:quest}}));
  return{dir,f,lessons:path.join(dir,`lessons%3A${D}.json`)};}
test('republishing a finished quest exits 4 and leaves the stored pack unchanged',()=>{const {dir,f,lessons}=setup({started:1,done:2});const before=fs.readFileSync(lessons);
  const p=example();p.topics[0].questions[0].prompt='Changed after the fact?';fs.writeFileSync(f,JSON.stringify(p));
  const r=run(dir,f,'--date',D);assert.equal(r.status,4);assert.match(r.stderr,/finished and locked/);assert.deepEqual(fs.readFileSync(lessons),before);
  assert.equal(run(dir,f,'--date',D,'--dry-run').status,4,'dry run reports the lock too');fs.rmSync(dir,{recursive:true,force:true});});
test('a boost for a finished quest exits 4',()=>{const {dir}=setup({started:1,done:2});const b=path.join(dir,'boost.json');
  fs.writeFileSync(b,JSON.stringify({boostFor:D,message:'You can do it!'}));const r=run(dir,b);assert.equal(r.status,4);assert.ok(!fs.existsSync(path.join(dir,`boost%3A${D}.json`)));fs.rmSync(dir,{recursive:true,force:true});});
test('--force does not unlock a finished quest',()=>{const {dir,f}=setup({started:1,done:2});assert.equal(run(dir,f,'--date',D,'--force').status,4);fs.rmSync(dir,{recursive:true,force:true});});
test('republishing a started, unfinished quest with an answered stage changed exits 6 (v0.5: reached stages are locked; see refresh.test)',()=>{const {dir,f}=setup({started:1});
  const P=JSON.parse(fs.readFileSync(path.join(dir,'progress.json')));const p=example();P.packSeen[`${D}:${p.topics[0].topicId}:0`]=1;fs.writeFileSync(path.join(dir,'progress.json'),JSON.stringify(P));
  p.topics[0].questions[1].prompt='Speed round! Spot the safe links!';fs.writeFileSync(f,JSON.stringify(p));
  const r=run(dir,f,'--date',D);assert.equal(r.status,6,r.stderr);assert.match(r.stderr,/already reached/);fs.rmSync(dir,{recursive:true,force:true});});
