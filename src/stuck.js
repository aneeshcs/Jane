// "I'm stuck" help, Learn-it cards and guided steps. Everything here is deterministic code: no live AI, ever.
// solve(q) recognises common question shapes (fraction → decimal, fraction of a number, ...) and returns
// worked steps for that exact question plus a similar, easier question to model first.
import {gcd} from './gen.js';
const nice=x=>String(+(+x).toFixed(4));
const pow2=d=>d>1&&(d&(d-1))===0&&d<=64;
// how to get 1/d as a decimal, kid style
function unit(d){
  if([10,100,1000].includes(d))return{v:1/d,how:[`1/${d} is one ${d===10?'tenth':d===100?'hundredth':'thousandth'}: ${nice(1/d)}`]};
  if(pow2(d)){const ch=[];for(let k=2;k<=d;k*=2)ch.push(`1/${k} = ${nice(1/k)}`);return{v:1/d,how:[`Halve, and halve again: ${ch.join(' → ')}`]};}
  if(100%d===0)return{v:1/d,how:[`1/${d} of a dollar is ${100/d}¢, so 1/${d} = ${nice(1/d)}`]};
  if(1000%d===0)return{v:1/d,how:[`1/${d} = ${1000/d}/1000 = ${nice(1/d)}`]};
  return{v:1/d,how:[`1 ÷ ${d} = ${nice(1/d)}`]};}
function fracDec(n,d,pct){const u=unit(d),v=n/d,out=pct?`${nice(100*v)}%`:nice(v);
  const steps=[...u.how];if(n!==1)steps.push(`${n}/${d} = ${n} × ${nice(1/d)} = ${nice(v)}`);if(pct)steps.push(`Move the point 2 places right: ${nice(v)} → ${out}`);steps.push(`So ${n}/${d} = ${out} ✅`);return{steps,answer:out};}
const P=[
 // fraction → decimal / percent
 [/(\d+)\s*\/\s*(\d+)\s+as a (decimal|percent)/i,m=>{const n=+m[1],d=+m[2],pct=/percent/i.test(m[3]);const s=fracDec(n,d,pct);
   const sn=n===1?(d>2&&pow2(d)?null:2):1;const sim=sn?`Write ${sn}/${d} as a ${pct?'percent':'decimal'}.`:`Write 1/${d/2} as a ${pct?'percent':'decimal'}.`;
   const start=n===1?[`1/${d} is half of 1/${d/2}.`, `Or divide: 1 ÷ ${d}`]:[`You know 1/${d} = ${nice(1/d)}`,`So ${n}/${d} = ${n} × ${nice(1/d)}. Or divide ${n} ÷ ${d}.`];
   return{...s,similar:sim,start};}],
 // n/d of w
 [/(\d+)\s*\/\s*(\d+) of (\d+)/i,m=>{const n=+m[1],d=+m[2],w=+m[3],one=w/d;return{steps:[`Split ${w} into ${d} equal groups: ${w} ÷ ${d} = ${nice(one)}`,`Take ${n} of them: ${n} × ${nice(one)} = ${nice(one*n)}`,`So ${n}/${d} of ${w} = ${nice(one*n)} ✅`],answer:nice(one*n),
   similar:`What is ${n}/${d} of ${d*2}?`,start:[`Find 1/${d} of ${w} first: ${w} ÷ ${d} = ?`]};}],
 // a/b + c/d
 [/(\d+)\s*\/\s*(\d+)\s*\+\s*(\d+)\s*\/\s*(\d+)/,m=>{const [a,b,c,d]=m.slice(1,5).map(Number),D=b*d/gcd(b,d),N=a*D/b+c*D/d,g=gcd(N,D);const ans=D/g===1?`${N/g}`:`${N/g}/${D/g}`;
   const steps=b===d?[`Same bottoms! Add the tops: ${a} + ${c} = ${a+c}`,`Keep the bottom: ${a+c}/${b}`]:[`Make the bottoms match: both go into ${D}`,`${a}/${b} = ${a*D/b}/${D} and ${c}/${d} = ${c*D/d}/${D}`,`Add the tops: ${N}/${D}`];
   if(g>1)steps.push(`Simplify: ${N}/${D} = ${ans}`);steps.push(`So the answer is ${ans} ✅`);
   return{steps,answer:ans,similar:b===d?`What is 1/${b} + 1/${b}?`:(a===1&&b===2&&c===1&&d===4?'What is 1/3 + 1/6?':'What is 1/2 + 1/4?'),start:steps.slice(0,b===d?1:2)};}],
 // a/b × c/d   or   w × n/d
 [/(\d+)\s*\/\s*(\d+)\s*[×x*]\s*(\d+)\s*\/\s*(\d+)/,m=>{const [a,b,c,d]=m.slice(1,5).map(Number),g=gcd(a*c,b*d),ans=b*d/g===1?`${a*c/g}`:`${a*c/g}/${b*d/g}`;
   return{steps:[`Top × top: ${a} × ${c} = ${a*c}`,`Bottom × bottom: ${b} × ${d} = ${b*d}`,`${a*c}/${b*d}${g>1?` = ${ans}`:''} ✅`],answer:ans,similar:'What is 1/2 × 1/3?',start:[`Top × top: ${a} × ${c} = ?`]};}],
 [/(\d+)\s*[×x*]\s*(\d+)\s*\/\s*(\d+)/,m=>{const [w,n,d]=m.slice(1,4).map(Number),g=gcd(w*n,d),ans=d/g===1?`${w*n/g}`:`${w*n/g}/${d/g}`;
   return{steps:[`Multiply the top: ${w} × ${n} = ${w*n}`,`Keep the bottom: ${w*n}/${d}${g>1?` = ${ans}`:''} ✅`],answer:ans,similar:'What is 2 × 1/3?',start:[`Multiply the top: ${w} × ${n} = ?`]};}],
 // a/b ÷ c/d
 [/(\d+)\s*\/\s*(\d+)\s*÷\s*(\d+)\s*\/\s*(\d+)/,m=>{const [a,b,c,d]=m.slice(1,5).map(Number),g=gcd(a*d,b*c),ans=b*c/g===1?`${a*d/g}`:`${a*d/g}/${b*c/g}`;
   return{steps:[`Keep ${a}/${b}, change ÷ to ×, flip ${c}/${d} to ${d}/${c}`,`${a}/${b} × ${d}/${c} = ${a*d}/${b*c}`,`= ${ans} ✅`],answer:ans,similar:'What is 1/2 ÷ 1/4?',start:[`Keep, change, flip: ${a}/${b} × ${d}/${c}`]};}],
 // simplify / missing number
 [/Simplify (\d+)\s*\/\s*(\d+)/i,m=>{const a=+m[1],b=+m[2],g=gcd(a,b);return{steps:[`What number goes into ${a} AND ${b}? ${g}!`,`${a} ÷ ${g} = ${a/g}, ${b} ÷ ${g} = ${b/g}`,`So ${a/g}/${b/g} ✅`],answer:`${a/g}/${b/g}`,similar:'Simplify 2/4.',start:[`Find a number that goes into ${a} and ${b}. Try 2, 3, 5…`]};}],
 [/(\d+)\s*\/\s*(\d+)\s*=\s*\?\s*\/\s*(\d+)/,m=>{const n=+m[1],d=+m[2],D=+m[3],k=D/d;return{steps:[`${d} × ${k} = ${D}`,`Do the same to the top: ${n} × ${k} = ${n*k} ✅`],answer:String(n*k),similar:'1/2 = ?/4',start:[`What times ${d} makes ${D}?`]};}],
 // pizza left
 [/has (\d+) slices\. You eat (\d+), your friend eats (\d+)/i,m=>{const [d,a,b]=m.slice(1,4).map(Number),l=d-a-b,g=gcd(l,d);return{steps:[`Slices left: ${d} − ${a} − ${b} = ${l}`,`Put it over all the slices: ${l}/${d}${g>1?` = ${l/g}/${d/g}`:''} ✅`],answer:g>1?`${l/g}/${d/g}`:`${l}/${d}`,similar:'Your pizza has 4 slices. You eat 1, your friend eats 1. What fraction is left?',start:[`Count what's left: ${d} − ${a} − ${b} = ?`]};}],
 // whole-number ops
 [/What is (\d+) × (\d+)\?/,m=>{const a=+m[1],b=+m[2];const t=a>10?[`Break it up: ${Math.floor(a/10)*10} × ${b} = ${Math.floor(a/10)*10*b}`,`and ${a%10} × ${b} = ${(a%10)*b}`,`Add: ${a*b} ✅`]:[`Count by ${b}s, ${a} times`,`${a} × ${b} = ${a*b} ✅`];return{steps:t,answer:String(a*b),similar:'What is 12 × 3?',start:t.slice(0,1)};}],
 [/What is (\d+) ÷ (\d+)\?/,m=>{const a=+m[1],b=+m[2];return{steps:[`What times ${b} makes ${a}?`,`${a/b} × ${b} = ${a}, so ${a/b} ✅`],answer:String(a/b),similar:'What is 12 ÷ 3?',start:[`Count by ${b}s until you reach ${a}.`]};}],
 [/What is (\d+) \+ (\d+)\?/,m=>{const a=+m[1],b=+m[2];return{steps:[`Line up the ones, tens, hundreds`,`Add each column, right to left`,`${a} + ${b} = ${a+b} ✅`],answer:String(a+b),similar:'What is 45 + 38?',start:[`Ones first: ${a%10} + ${b%10} = ?`]};}],
 [/What is (\d+) − (\d+)\?/,m=>{const a=+m[1],b=+m[2];return{steps:[`Count up from ${b} to ${a}`,`${a} − ${b} = ${a-b} ✅`],answer:String(a-b),similar:'What is 52 − 18?',start:[`Count up from ${b} to the next ten.`]};}],
 [/In ([\d,]+), what is the digit (\d) worth\? \((\S+) place\)/,m=>{const PL={ones:1,tens:10,hundreds:100,thousands:1000,'ten-thousands':1e4,'hundred-thousands':1e5}[m[3]]||1;return{steps:[`The ${m[3]} place means × ${PL}`,`${m[2]} × ${PL} = ${+m[2]*PL} ✅`],answer:String(+m[2]*PL),similar:'In 352, what is the digit 5 worth? (tens place)',start:[`${m[3]} place means × ${PL}.`]};}],
];
export function solve(q){q=String(q||'');for(const [re,f] of P){const m=q.match(re);if(m)try{return f(m);}catch{}}return null;}
// Typing these into a fill-in opens the stuck help instead of grading the answer wrong.
const STUCK=/^(i\s*(do\s*not|dont|don'?t|do\s*nt)\s*(know|get( it)?|understand)|idk+|dunno|no\s*(idea|clue)|not\s*sure|i'?m\s*stuck|stuck|help( me)?|hint|skip( it| this)?|pass|i\s*give\s*up|give\s*up|\?+|i\s*can'?t( do (it|this))?|(please\s*)?(do\s*not|don'?t)\s*show\s*(me\s*)?this.*)$/i;
export function isStuck(a){const s=String(a??'').toLowerCase().normalize('NFKD').replace(/[\u2018\u2019]/g,"'").replace(/[^a-z0-9'?\s]/g,' ').replace(/\s+/g,' ').trim();
  if(!s)return false;if(STUCK.test(s))return true;
  return /\b(i\s*(do\s*not|dont|don'?t)\s*know|idk|dunno|no idea|(do\s*not|don'?t)\s*show\s*(me\s*)?this|i'?m stuck|i give up)\b/.test(s)&&!/\d/.test(s);}
// a similar question, solved, then how to start the real one
export function scaffold(it){const q=it.stage==='bonus'?it.bonus?.q:it.q;const s=solve(q),hint=it.stage==='bonus'?'Divide the top number by the bottom number.':(it.hint||'Read it again slowly. What is it asking?');
  if(it.steps?.length||it.example){const ex=it.example||null;return{hint,example:ex?{title:ex.prompt||ex.title||'Watch me do one',steps:ex.steps||[]}:null,start:it.steps?.length?[it.steps[0]]:(s?.start||[])};}
  if(s){const sim=solve(s.similar);return{hint,example:sim?{title:s.similar,steps:sim.steps}:null,start:s.start};}
  // by question type: one honest nudge that doesn't give the whole thing away
  const T=it.type,ch=it.choices||[];
  if(T==='mc'||T==='picture'){const w=ch.find(c=>c!==it.answer);return{hint,example:w?{title:'Let\'s cross one out',steps:[`"${w}" is not it ❌`]}:null,start:['Pick from the ones left!']};}
  if(T==='order'){const f=String(it.answer).split('|');return{hint,example:{title:'Here\'s the first one',steps:[`1️⃣ ${f[0]}`]},start:['Now, what comes next?']};}
  if(T==='match'&&it.pairs?.length){return{hint,example:{title:'Here\'s one pair',steps:[`${it.pairs[0][0]} = ${it.pairs[0][1]}`]},start:['Match the rest the same way!']};}
  if(T==='truefalse'&&it.statements?.length){return{hint,example:{title:'Here\'s the first one',steps:[`"${it.statements[0]}" → ${it.tf[0]==='T'?'True ✅':'False ❌'}`]},start:['Use the same rule for the rest!']};}
  if(T==='numberline'){const a=+it.answer,st=it.line?.step||1,lo=Math.max(it.line.min,a-2*st),hi=Math.min(it.line.max,a+2*st);return{hint,example:{title:'Close in on it',steps:[`It's between ${lo} and ${hi}`]},start:['Drag the flag into that zone!']};}
  if(T==='fracbar'){return{hint,example:{title:'Count the pieces',steps:[`The bar has ${it.parts} pieces. Each piece is 1/${it.parts}.`]},start:['Shade one piece at a time!']};}
  if(it.creative)return{hint,example:{title:'Any good idea works!',steps:[`Like: "${it.answer}"`]},start:['Now try your own!']};
  if(T==='input'&&it.answer&&!/\d/.test(it.answer)){const a=String(it.answer);return{hint,example:{title:'A clue',steps:[`It starts with "${a[0].toUpperCase()}" and has ${a.replace(/\s/g,'').length} letters`]},start:['What word fits?']};}
  return{hint,example:null,start:[]};}
// Learn-it cards for generated (Play) math: one idea + one worked example
export const IDEA={fracdec:'A fraction is a division! 3/4 means 3 ÷ 4. Trick: halve your way down (1/2, 1/4, 1/8…), or think of money.',
  pizza:'The bottom number is ALL the pieces. The top is the pieces you have.',fracadd:'Same bottoms? Add the tops. Different bottoms? Make them match first.',
  equiv:'Multiply or divide the top AND the bottom by the same number. Same amount, new look!',compare:'Make them the same kind (same bottom, or decimals). Then compare.',
  fracof:'To find 3/4 of 20: split 20 into 4 groups, then take 3 of them.',fracmul:'Multiply fractions: top × top, bottom × bottom.',fracdiv:'Dividing fractions: keep, change, flip!',
  muldiv:'Break big numbers into tens and ones. Division is multiplication backwards.',addsub:'Line up the ones, tens and hundreds. Work right to left.',place:'Each place is worth 10 times the one to its right.'};
