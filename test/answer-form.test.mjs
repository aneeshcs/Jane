// Slice 4 (+5): answer in the asked form. The right value in another form gets a gentle nudge, never a miss.
import {test} from 'node:test';import assert from 'node:assert/strict';import {loadEngine,validate,example} from './helpers.mjs';
const {E,g}=await loadEngine();const DEC='mt_SBkTGjiZjZ';const now=Date.parse('2026-02-02T18:00:00Z');
function withItem(it){const S=E.blank();S.firstDone=true;S.placement.done=true;S.ts[DEC]={st:'learning',how:'direct',c:1,w:0,lvl:3,streak:0};
  S.current={kind:'math',type:'input',hint:'Think.',explain:'Because.',lvl:3,format:'quest',id:'x',topicId:DEC,mode:'learn',tries:0,stage:'main',issued:now,...it};return S;}
const nudge=(S,a)=>{const x=E.submit(S,g,a,now);assert.equal(x.r.formNudge,true,a+': '+x.r.jane);assert.equal(x.r.retry,true);assert.equal(S.current.tries,0,'no try used');return x;};
test('"as a percent": 0.27 is nudged without using a try, then 27% is right on the first try',()=>{const S=withItem({q:'What is 27/100 as a percent? (like 50%)',answer:'27%'});
  const n=nudge(S,'0.27');assert.match(n.r.jane,/Right value! Now write it as a percent/);nudge(S,'27');
  const pts=S.points,ok=E.submit(S,g,'27%',now);assert.equal(ok.r.correct,true);assert.ok(S.points-pts>=10,'full first-try points');assert.equal(S.streak,1);});
test('"as a decimal": 52/100 is nudged, 0.52 is right',()=>{const S=withItem({q:'Write 13/25 as a decimal.',answer:'0.52'});nudge(S,'52/100');assert.equal(E.submit(S,g,'0.52',now).r.correct,true);});
test('a whole-number answer: 12/4 is nudged, 3 is right',()=>{const S=withItem({q:'What is 12 ÷ 4?',answer:'3'});nudge(S,'12/4');assert.equal(E.submit(S,g,'3',now).r.correct,true);});
test('the decimal bonus: 3/8 is nudged, 0.375 is right',()=>{const S=withItem({q:'What fraction is left?',answer:'3/8',bonus:{q:'Bonus ⭐: write 3/8 as a decimal!',a:'0.375'}});
  assert.equal(E.submit(S,g,'3/8',now).r.correct,true);assert.equal(S.current.stage,'bonus');nudge(S,'3/8');assert.equal(E.submit(S,g,'0.375',now).r.correct,true);});
test('fractions are unchanged: an unsimplified fraction still gets the simplify retry',()=>{const S=withItem({q:'Simplify 6/8 to lowest terms.',answer:'3/4',needSimplest:true});
  const x=E.submit(S,g,'6/8',now);assert.match(x.r.jane,/simplify/i);assert.equal(x.r.formNudge,undefined);assert.equal(E.submit(S,g,'3/4',now).r.correct,true);});
test('a nudge is logged as a formNudge event, not as an answer or a first-try miss; the 3rd nudge shows the asked form',()=>{const S=withItem({q:'What is 27/100 as a percent? (like 50%)',answer:'27%'});
  const a=nudge(S,'0.27');assert.equal(a.ev.length,1);assert.equal(a.ev[0].event,'formNudge');assert.equal(a.ev[0].formNudge,true);assert.equal(a.ev[0].correct,undefined);
  nudge(S,'0.27');const c=nudge(S,'0.27');assert.match(c.r.jane,/27%/);assert.equal(S.streak,0);assert.equal(S.ts[DEC].w,0,'not a miss');});
