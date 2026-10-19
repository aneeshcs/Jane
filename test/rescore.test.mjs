// Slice 9: existing medals re-earned under the new rules (E.rescore + migrate-medals.mjs). Synthetic fixture only.
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {spawnSync} from 'node:child_process';
import {ROOT,loadEngine,tmpDir} from './helpers.mjs';
const {E,g}=await loadEngine();const F=JSON.parse(fs.readFileSync(path.join(ROOT,'test/fixtures/rescore-progress.json'),'utf8')),T=F.ids;
const now=Date.parse('2026-01-12T18:00:00Z'),logs=Object.values(F.logs).flat();
const run=()=>E.rescore(F.progress,g,logs,now);
const medal=(S,id)=>S.medals.find(m=>m.id===id);
test('a self-check-only mastery loses mastery and its medal, and is due now for review',()=>{const {S2}=run();const r=S2.ts[T.self];
  assert.equal(r.how,'inferred');assert.ok(r.reverify);assert.equal(r.due,now);assert.equal(r.box,0);assert.ok(!medal(S2,T.self));
  const nx=E.stateOf(S2,g,T.self,now);assert.equal(nx,'review','back in the review queue');});
test('1 first-try right → loses mastery; 2 → stays mastered without a medal; 3 → keeps the medal',()=>{const {S2}=run();
  assert.equal(S2.ts[T.one].how,'inferred');assert.ok(!medal(S2,T.one));assert.equal(S2.ts[T.two].how,'direct');assert.ok(!medal(S2,T.two));
  assert.equal(S2.ts[T.three].how,'direct');assert.equal(medal(S2,T.three).tier,'gold');assert.equal(S2.ts[T.three].ft,3,'"Hey {name}!" repeat of the same question that day counts once');});
test('a legendary medal from a 1-question boss drops to the topic\'s normal tier',()=>{const {S2}=run();assert.equal(medal(S2,T.leg).tier,g.byId[T.leg].tier);});
test('duplicate topic and quest medals collapse; quest medals are kept',()=>{const {S2,duplicates}=run();assert.equal(S2.medals.filter(m=>m.id===T.three).length,1);
  assert.equal(S2.questMedals.length,1);assert.ok(duplicates>=1);});
test('placement mastery stays without a medal; inferred topics are untouched; a self-check topic with 2 graded rights is kept as direct',()=>{const {S2}=run();
  assert.equal(S2.ts[T.place].how,'direct');assert.ok(!medal(S2,T.place));assert.deepEqual(S2.ts[T.inf],F.progress.ts[T.inf]);assert.equal(S2.ts[T.selfEarned].how,'direct');});
test('a topic without log history falls back to its counts and is reported',()=>{const {S2,fallback}=run();assert.ok(fallback.includes(T.old));assert.equal(medal(S2,T.old).tier,'silver');});
test('re-scoring twice changes nothing the second time',()=>{const {S2}=run();assert.equal(S2.rules,2);const again=E.rescore(S2,g,logs,now+1);assert.ok(again.already);assert.equal(JSON.stringify(again.S2),JSON.stringify(S2));assert.equal(again.changes.length,0);});
// ---- the script, on --local storage seeded from the fixture ----
function seed(){const dir=tmpDir('jane-rescore-');fs.writeFileSync(path.join(dir,'progress.json'),JSON.stringify(F.progress));for(const [d,l] of Object.entries(F.logs))fs.writeFileSync(path.join(dir,`log%3A${d}.json`),JSON.stringify(l));return dir;}
const mig=(dir,...a)=>spawnSync(process.execPath,['migrate-medals.mjs','--local',...a],{cwd:ROOT,encoding:'utf8',env:{...process.env,DATA_DIR:dir}});
test('migrate-medals.mjs --local --dry-run prints before/after counts and writes nothing',()=>{const dir=seed(),p=path.join(dir,'progress.json'),m0=fs.statSync(p).mtimeMs,b0=fs.readFileSync(p);
  const r=mig(dir,'--dry-run');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/DRY RUN/);assert.match(r.stdout,/topic medals\s+8 →\s+3/);assert.match(r.stdout,/mastery removed: 2/);
  assert.equal(fs.statSync(p).mtimeMs,m0);assert.deepEqual(fs.readFileSync(p),b0);fs.rmSync(dir,{recursive:true,force:true});});
test('a real run needs a matching backup (exit 5 otherwise), then writes the re-scored record',()=>{const dir=seed(),p=path.join(dir,'progress.json'),b0=fs.readFileSync(p);
  assert.equal(mig(dir).status,5,'no --backup');const bad=path.join(dir,'bad.json');fs.writeFileSync(bad,'{"v":2}');assert.equal(mig(dir,'--backup',bad).status,5,'mismatch');
  assert.deepEqual(fs.readFileSync(p),b0,'nothing written');
  const bk=spawnSync(process.execPath,['backup-progress.mjs','--local'],{cwd:ROOT,encoding:'utf8',env:{...process.env,DATA_DIR:dir}});assert.match(bk.stdout,/sha256 [0-9a-f]{64}/);
  const file=bk.stdout.match(/: (\S+\.json)/)[1];const r=mig(dir,'--backup',file);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(fs.readFileSync(p)).rules,2);
  assert.match(mig(dir,'--dry-run').stdout,/already re-scored/);fs.rmSync(dir,{recursive:true,force:true});});
