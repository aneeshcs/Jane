// The "I'm stuck 🤔" path, teach-before-test and fair bosses (engine unit tests + an end-to-end run on the standalone server).
import {test,before,after} from 'node:test';import assert from 'node:assert/strict';
import {spawn,execFileSync,spawnSync} from 'node:child_process';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import net from 'node:net';
const ROOT=path.resolve(import.meta.dirname,'..');
if(!fs.existsSync(path.join(ROOT,'public/tax.json')))execFileSync(process.execPath,['build.mjs'],{cwd:ROOT,stdio:'ignore'});
const E=await import('../src/engine.js');
const g=E.graph(JSON.parse(fs.readFileSync(path.join(ROOT,'public/tax.json'),'utf8')));
const DEC='mt_SBkTGjiZjZ'; // "Decimals and fractions (age 11+)": a Fractions boss topic in Play mode
const boss316=()=>{const S=E.blank();S.firstDone=true;S.placement.done=true;S.points=100;S.streak=2;S.solved=9;
  S.ts[DEC]={st:'learning',how:'direct',c:4,w:2,lvl:5,streak:1};S.focus=DEC;const now=Date.now();
  S.current={kind:'math',type:'input',q:'Write 3/16 as a decimal.',answer:'0.1875',hint:'Divide 3 by 16. Tip: 1/16 = 0.0625.',explain:'3 ÷ 16 = 0.1875.',vis:{type:'bar',parts:16,shaded:3},lvl:5,format:'boss',boss:{max:3,hp:2},id:'x',topicId:DEC,mode:'learn',tries:0,stage:'main',issued:now};return{S,now};};

test('"I don\'t know" style answers open the stuck help; real answers do not',()=>{
  for(const a of ['I do not know please do not show this question for atleast a day or two','Dunno','idk','I don\'t know','skip','help','no idea','don\'t show this','I\'m stuck','?'])assert.ok(E.isStuck(a),a);
  for(const a of ['0.1875','3/16','.1875','lion','I know it','52/100'])assert.ok(!E.isStuck(a),a);});

test('3/16 boss: hint, then a worked example, then skip costs nothing and does not fail the boss',()=>{
  const {S,now}=boss316();const before={points:S.points,streak:S.streak,solved:S.solved,hits:S.ts[DEC].streak,w:S.ts[DEC].w};
  const a=E.submit(S,g,'I do not know please do not show this question',now);
  assert.equal(a.r.stuck.step,1);assert.match(a.r.stuck.hint,/16/);assert.equal(a.r.correct,undefined);assert.equal(S.current.tries,0,'not graded');
  assert.equal(a.ev[0].event,'stuck');
  const b=E.stuck(S,g,now);assert.equal(b.r.stuck.step,2);assert.ok(b.r.stuck.canSkip);
  assert.match(b.r.stuck.example.steps.join(' '),/1\/16 = 0\.0625/);assert.match(b.r.stuck.start.join(' '),/3 × 0\.0625/);
  assert.ok(!JSON.stringify(b.r.stuck).includes('0.1875'),'help never gives away the answer');
  assert.equal(E.publicItem(S.current,g).help.step,2,'help survives a reload');
  const c=E.skip(S,g,null,now);assert.ok(c.r.skipped);assert.equal(c.ev[0].event,'skipped');assert.equal(S.current,null);
  assert.deepEqual({points:S.points,streak:S.streak,solved:S.solved,hits:S.ts[DEC].streak,w:S.ts[DEC].w},before,'no heart, point, streak or boss hit lost');
  assert.equal(S.ts[DEC].lvl,4,'scaffolds down a level');assert.ok(S.support[DEC].teachDue);assert.equal(S.requeue.length,1);assert.ok(S.requeue[0].notBefore>=now+864e5-1);
  // next: Learn-it card, then guided practice with steps visible, then the boss again (still 1 hit in, fair level)
  const l=E.next(S,g,null,now+1);assert.equal(l.type,'card');assert.equal(l.card,'learn');assert.ok(l.example.steps.length);E.submit(S,g,'ok',now+1);
  for(let i=0;i<2;i++){const p=E.next(S,g,null,now+2+i);assert.ok(p.guided&&p.steps.length,'guided');assert.notEqual(p.format,'boss');E.submit(S,g,p.answer,now+2+i);}
  const bo=E.next(S,g,null,now+9);assert.equal(bo.format,'boss');assert.ok(bo.lvl<=E.BOSS_MAX_LVL);assert.notEqual(bo.q,'Write 3/16 as a decimal.');
  // a day later the skipped item comes back guided, never as a boss
  S.current=null;const rq=E.next(S,g,null,now+2*864e5);assert.equal(rq.q,'Write 3/16 as a decimal.');assert.ok(rq.guided&&rq.steps.length);assert.equal(rq.boss,null);});

test('Play bosses stay fair: never past thousandths, capped level, and they pause after 2 misses',()=>{
  for(let i=0;i<300;i++){const {S,now}=boss316();S.current=null;S.teach={[DEC]:{left:0,power:now}};const it=E.buildItem(S,g,DEC,'learn',null,now);
    assert.equal(it.format,'boss');assert.ok(it.lvl<=E.BOSS_MAX_LVL);assert.ok(E.bossFair(it),it.q+' = '+it.answer);}
  const {S,now}=boss316();S.teach={[DEC]:{left:0,power:now}};S.current=E.buildItem(S,g,DEC,'learn',null,now);
  for(let k=0;k<2;k++){if(!S.current||S.current.format!=='boss')S.current=E.buildItem(S,g,DEC,'learn',null,now);E.submit(S,g,'0',now);E.submit(S,g,'0',now);}
  assert.ok(S.support[DEC].bossOff>now,'boss paused');S.current=null;assert.notEqual(E.buildItem(S,g,DEC,'learn',null,now).format,'boss');
  const fresh=E.blank();assert.equal(E.buildItem(fresh,g,DEC,'learn',null,now).card,'learn','a new skill is taught before it is tested');});

test('pack validator: bosses only test taught skills and never 4-decimal answers',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jane-pack-'));const f=path.join(dir,'p.json');
  const pack=JSON.parse(fs.readFileSync(path.join(ROOT,'packs/examples/example-quest.json'),'utf8'));
  const run=()=>{fs.writeFileSync(f,JSON.stringify(pack));return spawnSync(process.execPath,['publish-lessons.mjs',f,'--dry-run','--offline'],{cwd:ROOT,encoding:'utf8'});};
  assert.equal(run().status,0,'example quest follows teach → guided → graded → boss');
  const train=pack.topics.splice(pack.topics.length-2,1)[0];let r=run();assert.equal(r.status,1);assert.match(r.stderr,/no earlier stage taught or practised/);
  pack.topics.splice(pack.topics.length-1,0,train);pack.topics.at(-1).questions.push({type:'numeric',prompt:'Write 3/16 as a decimal.',answer:'0.1875',hint:'Divide.',explanation:'3 ÷ 16.'});
  r=run();assert.equal(r.status,1);assert.match(r.stderr,/too hard for a boss/);pack.topics.at(-1).questions.pop();
  delete pack.topics[1].questions[1].guided;r=run();assert.equal(r.status,1);assert.match(r.stderr,/guided practice/);
  fs.rmSync(dir,{recursive:true,force:true});});

// ---- end to end on the standalone server ----
const DATA=fs.mkdtempSync(path.join(os.tmpdir(),'jane-stuck-'));let srv,B;
const freePort=()=>new Promise(r=>{const s=net.createServer().listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
const api=async(p,body)=>{const r=await fetch(B+p,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200,p);return r.json();};
before(async()=>{const port=await freePort();B=`http://127.0.0.1:${port}`;
  srv=spawn(process.execPath,['server/index.mjs'],{cwd:ROOT,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:DATA,LEARNER_NAME:'Sam'},stdio:['ignore','pipe','inherit']});
  for(let i=0;i<100;i++){try{if((await fetch(B+'/healthz')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('server did not start');});
after(()=>{srv?.kill();fs.rmSync(DATA,{recursive:true,force:true});});
test('server: idk → hint → worked example → skip, with nothing lost and both events logged',async()=>{
  const s=await api('/api/state');assert.equal(s.item.type,'input');const q=s.item.q;
  const a=await api('/api/answer',{answer:'idk'});assert.equal(a.stuck.step,1);assert.equal(a.state.points,0);assert.equal(a.state.item.q,q);
  const b=await api('/api/stuck',{});assert.equal(b.stuck.step,2);assert.ok(b.stuck.canSkip);assert.ok(b.stuck.start.length);
  const c=await api('/api/skip',{});assert.ok(c.skipped);assert.equal(c.state.points,0);assert.equal(c.state.streak,0);assert.notEqual(c.state.item.q,q);
  const P=JSON.parse(fs.readFileSync(path.join(DATA,'progress.json'),'utf8'));assert.equal(P.requeue.length,1);
  const log=fs.readdirSync(DATA).find(f=>f.startsWith('log%3A'));const L=JSON.parse(fs.readFileSync(path.join(DATA,log),'utf8'));
  assert.ok(L.some(e=>e.event==='stuck')&&L.some(e=>e.event==='skipped'));
  const html=await (await fetch(B+'/')).text();assert.match(html,/I'm stuck 🤔/);});
