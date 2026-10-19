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
