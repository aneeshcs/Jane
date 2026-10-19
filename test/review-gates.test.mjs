// Slices 10 + 12: review gates between quest stages, drawn from the due Leitner queue at runtime; spot-checks of inferred topics.
import {test} from 'node:test';import assert from 'node:assert/strict';import {loadEngine} from './helpers.mjs';
const {E,g}=await loadEngine();const DAY=864e5,now=Date.parse('2026-02-02T18:00:00Z'),D='2026-02-02';
const pool=g.topics.filter(t=>t.kq&&t.subject!=='Mathematics'&&!g.boss.has(t.id)).map(t=>t.id);
const REV=pool.slice(0,8),STG=pool.slice(20,30);
const mc=i=>({type:'mc',prompt:`Stop question ${i}?`,choices:['yes','no','maybe'],answer:'yes',hint:'h',explanation:'e'});
const quest=n=>({date:D,quest:{title:'Test Quest',hook:'Go!',medal:{name:'Test Medal',emoji:'🏅'}},topics:STG.slice(0,n).map((id,i)=>({topicId:id,stage:{name:'Stop '+i,emoji:'⭐'},format:i===n-1?'boss':'quest',questions:[mc(1),mc(2),...(i===n-1?[mc(3)]:[])]}))});
function setup({due=5,inferred=0,n=3}={}){const S=E.blank();S.firstDone=true;S.placement.done=true;S.itemsServed=10;S.quests={[D]:{started:now-1e5}};S.questFocus=D;
  REV.slice(0,due).forEach((id,i)=>S.ts[id]={st:'mastered',how:'direct',conf:.9,box:1,due:now-(10-i)*DAY,at:now-20*DAY,c:3,ft:3});
  pool.slice(40,40+inferred).forEach((id,i)=>S.ts[id]={st:'mastered',how:'inferred',conf:.6+i/100,box:2,due:now+30*DAY,at:now-20*DAY});return{S,pack:quest(n)};}
const step=(S,pack,t,right=true)=>{const it=E.next(S,g,pack,t);const x=E.submit(S,g,right?it.answer:'zzz wrong',t);if(!right&&!x.r.done)E.submit(S,g,'zzz wrong',t);return{it,x};};
test('finishing stage 1 opens a gate for the most overdue direct topic before stage 2',()=>{const {S,pack}=setup();
  for(let i=0;i<2;i++){const {it}=step(S,pack,now);assert.equal(it.topicId,STG[0]);}
  const gi=E.next(S,g,pack,now);assert.equal(gi.mode,'review');assert.equal(gi.format,'gate');assert.equal(gi.topicId,REV[0],'most overdue first');assert.deepEqual([gi.gate.k,gi.gate.n,gi.gate.of],[1,1,2]);});
test('a first-try right gate answer moves the topic up a box; a missed one demotes it; the gate still opens',()=>{const {S,pack}=setup();
  for(let i=0;i<2;i++)step(S,pack,now);const a=step(S,pack,now);assert.equal(a.it.format,'gate');assert.equal(S.ts[a.it.topicId].box,2);assert.ok(S.ts[a.it.topicId].due>now+6*DAY);
  const b=step(S,pack,now,false);assert.equal(b.it.format,'gate');assert.equal(S.ts[b.it.topicId].st,'learning');
  const nx=E.next(S,g,pack,now);assert.equal(nx.topicId,STG[1],'gate open: stage 2 next');assert.equal(S.quests[D].gates[1].open,true);});
test('no due topics → no gate, the quest flows straight on',()=>{const {S,pack}=setup({due:0});for(let i=0;i<2;i++)step(S,pack,now);
  for(const r of Object.values(S.ts))r.due=now+5*DAY; // nothing due, nothing due soon
  const nx=E.next(S,g,pack,now);assert.notEqual(nx.format,'gate');assert.equal(nx.topicId,STG[1]);});
test('at most 3 gates × 2 items in a 7-stage quest, and quest total/pct do not count gates',()=>{const {S,pack}=setup({due:8,n:7});const total=E.questInfo(S,g,pack).total;
  let gates=0;for(let i=0;i<60&&!S.quests[D].done;i++){const {it}=step(S,pack,now+i);if(it.format==='gate')gates++;if(E.completeQuest(S,g,pack,now+i))break;}
  assert.ok(S.quests[D].done,'quest finished');assert.ok(gates<=6&&gates>=3,String(gates));assert.deepEqual(Object.keys(S.quests[D].gates).map(Number),E.gateStages(7));
  assert.equal(E.questInfo(S,g,pack).total,total);assert.equal(E.questInfo(S,g,pack).pct,100);});
test('outside quests, Play never serves gates and still serves its own reviews',()=>{const {S}=setup();delete S.quests;S.questFocus=null;let rev=0;
  for(let i=0;i<30;i++){const it=E.next(S,g,null,now+i);assert.notEqual(it.format,'gate');if(it.mode==='review')rev++;S.current=null;}assert.ok(rev>=1);});
