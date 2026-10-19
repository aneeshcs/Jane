// Slice 8: one trophy per achievement (one per topic, one per quest); stored duplicates collapse on migrate.
import {test} from 'node:test';import assert from 'node:assert/strict';import {loadEngine,example} from './helpers.mjs';
const {E,g}=await loadEngine();const PR=await import('../src/parent.js');const A='mt_AzTrT5ySCx',B='mt_SBkTGjiZjZ',now=Date.parse('2026-02-02T18:00:00Z');
const dupes=()=>{const S=E.blank();S.medals=[{id:A,tier:'bronze',at:5},{id:B,tier:'gold',at:7},{id:A,tier:'bronze',at:9}];
  S.questMedals=[{date:'2026-01-01',title:'Q',name:'Q medal',emoji:'💎',at:10},{date:'2026-01-01',title:'Q',name:'Q medal',emoji:'💎',at:12}];return S;};
test('a topic medal and a quest medal stored twice are listed once each, and the counts match',()=>{const T=E.trophies(dupes(),g);
  assert.equal(T.medals.length,3);assert.equal(new Set(T.medals.map(m=>m.id)).size,3);assert.deepEqual(T.counts,{bronze:1,gold:1,quest:1});});
test('migrate collapses stored duplicates and keeps the earliest',()=>{const S=E.migrate(dupes(),g);assert.equal(S.medals.length,2);assert.equal(S.medals.find(m=>m.id===A).at,5);
  assert.equal(S.questMedals.length,1);assert.equal(S.questMedals[0].at,10);});
test('the parent report medal count equals the trophy list',()=>{const S=dupes();const d=PR.parentData({S,g,now,today:'2026-02-02',logs:{'2026-02-02':[]},packs:{},tomorrowPack:null,boosts:{}});
  assert.equal(d.head.medals,E.trophies(S,g).medals.length);assert.equal(d.medals.length,3);});
test('completing the same quest twice adds one quest medal',()=>{const S=E.blank();const p=example();S.quests={[p.date]:{started:1}};
  p.topics.forEach(t=>t.questions.forEach((q,j)=>S.packSeen[`${p.date}:${t.topicId}:${j}`]=1));assert.ok(E.completeQuest(S,g,p,now));
  delete S.quests[p.date].done;E.completeQuest(S,g,p,now+1);assert.equal(S.questMedals.length,1);});
