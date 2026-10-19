// Slices 6-7: honest medals. Mastery needs real graded answers; a medal needs 3 first-try rights; legendary needs a real boss fight.
import {test} from 'node:test';import assert from 'node:assert/strict';import {loadEngine} from './helpers.mjs';
const {E,g}=await loadEngine();const DAY=864e5,now=Date.parse('2026-02-02T18:00:00Z');
const Q='mt_AzTrT5ySCx'; // a non-math topic with a kid MCQ
const fresh=()=>{const S=E.blank();S.firstDone=true;S.placement.done=true;return S;};
const answerRight=(S,id,mode,at)=>{S.current=E.buildItem(S,g,id,mode,null,at);return E.submit(S,g,S.current.answer,at);};
test('self-check "yes": stays learning, nothing inferred, no medal, and a graded check comes next',()=>{const S=fresh();
  S.current={kind:'self',type:'self',q:'Could you explain it?',choices:['👍 Got it!','🤔 Sort of','🌱 Not yet'],id:'s',topicId:Q,mode:'learn',tries:0,stage:'main',issued:now,format:'quest'};
  const x=E.submit(S,g,'yes',now);assert.equal(S.ts[Q].st,'learning');assert.ok(!x.ev.some(e=>e.event==='inferred'||e.event==='mastered'));assert.equal(S.medals.length,0);
  const nx=E.next(S,g,null,now+1);assert.equal(nx.topicId,Q);assert.equal(nx.kind,'quiz');assert.equal(nx.type,'mc');});
test('kid MCQ: one right is not mastery, the same question again that day does not count, a right answer on another day masters',()=>{const S=fresh();
  answerRight(S,Q,'learn',now);assert.notEqual(S.ts[Q].st,'mastered');answerRight(S,Q,'learn',now+60e3);assert.notEqual(S.ts[Q].st,'mastered','same question, same day');
  const x=answerRight(S,Q,'learn',now+DAY);assert.equal(S.ts[Q].st,'mastered');assert.ok(x.r.mastered);assert.equal(x.r.medal,undefined,'mastery is not a medal yet');});
test('a medal comes with the 3rd first-try correct graded answer, not before',()=>{const S=fresh();for(let d=0;d<2;d++)answerRight(S,Q,'learn',now+d*DAY);
  assert.equal(S.medals.length,0);const x=answerRight(S,Q,'learn',now+2*DAY);assert.ok(x.r.medal);assert.equal(S.medals.length,1);assert.equal(S.ts[Q].ft,3);});
test('a placement (diagnostic) first-try right masters for placement but awards no medal',()=>{const S=fresh();S.placement.done=false;
  const x=answerRight(S,Q,'diagnostic',now);assert.equal(S.ts[Q].st,'mastered');assert.ok(S.ts[Q].placed);assert.equal(x.r.medal,undefined);assert.equal(S.medals.length,0);});
// ---- Slice 7: legendary medals come from a real boss fight ----
import {validate,example} from './helpers.mjs';
const NM_BOSS='mt__LiAEHt9nk',DEC='mt_SBkTGjiZjZ';
test('a non-math boss topic built in Play is never a boss',()=>{assert.ok(g.boss.has(NM_BOSS));const S=fresh();S.ts[NM_BOSS]={st:'learning',how:'direct',c:3,w:0,streak:1};
  for(let i=0;i<30;i++){const it=E.buildItem(S,g,NM_BOSS,'learn',null,now);assert.notEqual(it.format,'boss');assert.equal(it.boss,undefined);}});
test('a pack boss stage won with 1 graded question awards the normal tier, not legendary',()=>{const S=fresh();S.ts[DEC]={st:'learning',how:'direct',c:4,w:0,ft:2,streak:1,lvl:4};
  const pack={date:'2026-02-02',topics:[{topicId:DEC,format:'boss',questions:[{type:'numeric',prompt:'Write 1/4 as a decimal.',answer:'0.25',hint:'h',explanation:'e'}]}]};
  S.packSeen['2026-02-02:'+DEC+':powerup']=1;S.current=E.buildItem(S,g,DEC,'learn',pack,now);assert.equal(S.current.format,'boss');
  const x=E.submit(S,g,'0.25',now);assert.equal(S.ts[DEC].st,'mastered');assert.ok(x.r.medal);assert.notEqual(x.r.medal.tier,'legendary');});
test('a Play math boss won with 3 first-try hits awards legendary',()=>{const S=fresh();S.ts[DEC]={st:'learning',how:'direct',c:4,w:0,ft:2,lvl:4,streak:0};S.teach={[DEC]:{left:0,power:now}};S.focus=DEC;
  let x;for(let i=0;i<3;i++){S.current=E.buildItem(S,g,DEC,'learn',null,now+i);assert.equal(S.current.format,'boss');x=E.submit(S,g,S.current.answer,now+i);if(S.current?.stage==='bonus')S.current=null;}
  assert.equal(S.ts[DEC].st,'mastered');assert.equal(S.medals.length,1);assert.equal(S.medals[0].tier,'legendary');});
test('validator: a boss stage with 2 graded questions fails',()=>{const p=example();const b=p.topics.at(-1);b.questions=b.questions.filter(q=>q.type!=='mc').slice(0,2);
  const r=validate(p);assert.equal(r.status,1);assert.match(r.stderr,/boss stage needs ≥ 3 graded/);});
