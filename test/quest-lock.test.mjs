// Slice 2: a finished quest stays finished (completion snapshot; a done quest's pack serves nothing).
import {test} from 'node:test';import assert from 'node:assert/strict';import {example,loadEngine} from './helpers.mjs';
const {E,g}=await loadEngine();const PR=await import('../src/parent.js');
const D='2026-01-01',now=Date.parse('2026-01-02T18:00:00Z');
function finished(){const S=E.blank();S.firstDone=true;S.placement.done=true;const pack=example();S.quests={[D]:{started:now-1e6}};
  pack.topics.forEach(t=>t.questions.forEach((q,j)=>S.packSeen[`${D}:${t.topicId}:${j}`]=1));const m=E.completeQuest(S,g,pack,now);return{S,pack,m};}
const extraStage=()=>({topicId:'mt_e7filQgayF',stage:{name:'Late Addition',emoji:'➕'},questions:[{type:'mc',prompt:'Pick one',choices:['a','b','c'],answer:'a',hint:'a',explanation:'a'}]});
test('finish a quest, then append a stage: questInfo stays 100% with only the original stages',()=>{const {S,pack,m}=finished();
  assert.ok(m&&m.name);assert.ok(S.quests[D].done&&S.quests[D].snap);const n0=pack.topics.length;pack.topics.push(extraStage());
  const qi=E.questInfo(S,g,pack);assert.equal(qi.pct,100);assert.ok(qi.completed);assert.equal(qi.stages.length,n0);assert.equal(qi.done,qi.total);
  assert.equal(E.completeQuest(S,g,pack,now+1),null,'completes once');assert.equal(S.questMedals.length,1);});
test('a finished quest never serves an item from the appended stage',()=>{const {S,pack}=finished();pack.topics.push(extraStage());
  for(let i=0;i<20;i++){S.current=null;const it=E.next(S,g,pack,now+i);assert.ok(!String(it.packKey||'').startsWith(D+':'),it.q);}});
test('a quest finished before snapshots (no snap) still reports 100%',()=>{const {S,pack}=finished();delete S.quests[D].snap;E.migrate(S,g);assert.ok(S.quests[D].legacy);
  pack.topics.push(extraStage());const qi=E.questInfo(S,g,pack);assert.equal(qi.pct,100);assert.equal(qi.stages.length,pack.topics.length-1);});
test('the parent report quest list shows the same 100%',()=>{const {S,pack}=finished();pack.topics.push(extraStage());
  const d=PR.parentData({S,g,now,today:'2026-01-02',logs:{'2026-01-02':[]},packs:{[D]:pack},tomorrowPack:null,boosts:{}});
  assert.equal(d.quests[0].pct,100);assert.equal(d.quests[0].stages.length,pack.topics.length-1);assert.ok(d.quests[0].questMedal);});
