// v0.5 slice 3: ONE active quest at a time. A newer quest pack waits hidden (no "New quest!", can't be started)
// until the current quest is finished; the Quests tab gets {current, nextUp, finished}.
import {test,before,after} from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';
import {ROOT,example,tmpDir,loadEngine} from './helpers.mjs';
const {E}=await loadEngine();
const P=d=>({date:d,quest:{title:'Q '+d},topics:[]});
const packs=(...ds)=>Object.fromEntries(ds.map(d=>[d,P(d)]));

test('lineup: the started, unfinished quest is current; a newer pack is queued, not new',()=>{
  const L=E.questLineup({quests:{'2026-01-01':{started:1}}},packs('2026-01-01','2026-01-02'),'2026-01-02');
  assert.deepEqual(L,{current:'2026-01-01',newQuest:false,queued:['2026-01-02'],finished:[]});});
test('lineup: once the current quest is finished, the newest waiting pack becomes the new quest',()=>{
  const L=E.questLineup({quests:{'2026-01-01':{started:1,done:2}}},packs('2026-01-01','2026-01-02','2026-01-03'),'2026-01-03');
  assert.equal(L.current,'2026-01-03');assert.equal(L.newQuest,true);assert.deepEqual(L.queued,[]);assert.deepEqual(L.finished,['2026-01-01']);});
test('lineup: with legacy quests going at once, the focused one is current and the others are queued',()=>{
  const S={questFocus:'2026-01-02',quests:{'2026-01-01':{started:1},'2026-01-02':{started:1}}};
  const L=E.questLineup(S,packs('2026-01-01','2026-01-02','2026-01-03'),'2026-01-03');
  assert.equal(L.current,'2026-01-02');assert.deepEqual(L.queued,['2026-01-01','2026-01-03']);assert.equal(L.newQuest,false);});
test('lineup: a pack dated after today and non-quest packs are ignored',()=>{
  const ps={...packs('2026-01-01','2026-01-05'),'2026-01-02':{date:'2026-01-02',topics:[]}};
  const L=E.questLineup({quests:{}},ps,'2026-01-02');assert.equal(L.current,'2026-01-01');assert.equal(L.newQuest,true);});

// ---- end to end on the standalone Node server ----
const DATA=tmpDir('jane-1q-');const ptd=ms=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles'}).format(new Date(ms));
const today=ptd(Date.now()),yday=ptd(Date.now()-864e5);let srv,B;
const freePort=()=>new Promise(r=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const call=async(p,body)=>{const r=await fetch(B+p,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return{status:r.status,j:await r.json()};};
const put=(d,title)=>{const p=example();p.date=d;p.quest.title=title;fs.writeFileSync(path.join(DATA,`lessons%3A${d}.json`),JSON.stringify(p));};
before(async()=>{const port=await freePort();B=`http://127.0.0.1:${port}`;
  srv=spawn(process.execPath,['server/index.mjs'],{cwd:ROOT,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:DATA,LEARNER_NAME:'Sam',LEARNER_AGE:'10'},stdio:['ignore','pipe','inherit']});
  for(let i=0;i<100;i++){try{if((await fetch(B+'/healthz')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('server did not start');});
after(()=>{srv?.kill();fs.rmSync(DATA,{recursive:true,force:true});});

test('server: a newer quest waits hidden while the current one is unfinished',async()=>{
  put(yday,'First Quest');
  let s=(await call('/api/state')).j;assert.equal(s.newQuest,true);assert.equal(s.quest.title,'First Quest');
  assert.equal((await call('/api/quest/start',{date:yday})).status,200);
  put(today,'Second Quest');
  s=(await call('/api/state')).j;assert.equal(s.newQuest,false,'no "New quest!" for the queued pack');assert.equal(s.quest.title,'First Quest');
  assert.equal(s.quests.current,yday);assert.equal(s.quests.nextUp,true);assert.equal(s.quests.cap,undefined,'no cap any more');
  const q=(await call('/api/quests')).j;assert.equal(q.current.title,'First Quest');assert.equal(q.nextUp,true);
  assert.ok(!JSON.stringify(q).includes('Second Quest'),'the next quest stays a secret');
  const st=await call('/api/quest/start',{date:today});assert.equal(st.status,409);assert.match(st.j.error,/Finish your quest/);
  // finish the first quest (as the engine records it): the second one becomes the new quest
  const prog=path.join(DATA,'progress.json'),S=JSON.parse(fs.readFileSync(prog,'utf8'));S.quests[yday].done=Date.now();S.current=null;fs.writeFileSync(prog,JSON.stringify(S));
  s=(await call('/api/state')).j;assert.equal(s.newQuest,true);assert.equal(s.quest.title,'Second Quest');assert.equal(s.quests.nextUp,false);
  const q2=(await call('/api/quests')).j;assert.equal(q2.finished.length,1);assert.equal(q2.finished[0].title,'First Quest');});
