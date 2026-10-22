// School alignment (docs/SCHOOL.md): the shipped profile and local topics are valid, grade/month windows work, Play and
// placement follow the learner's age and school units, and the export and validator report school units.
import {test} from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';
import {loadEngine,ROOT,tmpDir,validate,example} from './helpers.mjs';
import {gradeKey,unitsFor,schoolTopicIds,schoolView,validateProfile,pickProfile,SCHOOL_YEAR} from '../src/school.js';
const {E,g}=await loadEngine();const now=Date.parse('2026-10-15T18:00:00Z');
const bundle=JSON.parse(fs.readFileSync(path.join(ROOT,'public/school.json'),'utf8'));const prof=pickProfile(bundle,'bvsd-high-peaks');
const grade2=()=>JSON.parse(fs.readFileSync(path.join(ROOT,'packs/examples/example-quest-grade2.json'),'utf8'));
const stub=f=>{const r=Math.random;Math.random=()=>0;try{return f();}finally{Math.random=r;}};

test('the BVSD / High Peaks profile is valid: every unit has months and known topic ids, every school month has units',()=>{
  assert.ok(prof,'profile bundled');assert.deepEqual(validateProfile(prof,g.byId),[]);const U=prof.grades['2'].units;assert.ok(U.length>=30,String(U.length));
  for(const m of SCHOOL_YEAR)assert.ok(U.some(u=>u.months.includes(m)),'month '+m);
  for(const s of ['Mathematics','English','Science','History','Personal & Social Development'])assert.ok(U.some(u=>u.subject===s),s);
  assert.ok(validateProfile({id:'x',name:'x',grades:{2:{units:[{id:'a',subject:'S',title:'T',months:[13],topics:['nope']}]}}},g.byId).length>=2);});
test('local topics are in the taxonomy with a kid question, an area icon and prerequisites that lock and unlock',()=>{const lt=g.topics.filter(t=>t.id.startsWith('lt_'));assert.equal(lt.length,21);
  for(const t of lt){assert.ok(t.local,t.id);assert.ok(t.kq&&t.ka&&t.kw?.length===2,t.id+' kid question');assert.ok(t.ic&&t.ic!=='⭐',t.id+' icon');assert.ok(t.kq.split(/\s+/).length<=15,t.id+' ≤ 15 words');}
  const S=E.blank();assert.equal(E.stateOf(S,g,'lt_contine0003',now),'ready');assert.equal(E.stateOf(S,g,'lt_equator0004',now),'locked','needs continents first');
  S.ts['lt_contine0003']={st:'mastered',how:'direct',c:2,w:0,box:1,due:now+3*864e5};assert.equal(E.stateOf(S,g,'lt_equator0004',now),'ready');
  assert.equal(E.stateOf(S,g,'lt_earthmg0021',now),'locked','a local topic can depend on a Marble one (magnetic poles)');});
test('gradeKey parses the LEARNER_GRADE setting',()=>{assert.equal(gradeKey('2nd grade'),'2');assert.equal(gradeKey('Grade 3'),'3');assert.equal(gradeKey('5th'),'5');assert.equal(gradeKey('kindergarten'),'K');assert.equal(gradeKey('K'),'K');
  assert.equal(gradeKey('upper elementary'),null);assert.equal(gradeKey(''),null);assert.equal(gradeKey(undefined),null);});
test('unitsFor: October runs the Constitution unit, November is next; July is a break with August next; December wraps to January',()=>{const U=unitsFor(prof,'2',10);
  assert.ok(U.now.some(u=>u.id==='ss-constitution'));assert.ok(U.now.every(u=>u.months.includes(10)));assert.equal(U.nextMonth,11);assert.ok(U.next.some(u=>u.id==='sc-matter'));assert.ok(!U.next.some(u=>U.now.includes(u)),'next excludes units still running');
  const J=unitsFor(prof,'2',7);assert.equal(J.now.length,0);assert.equal(J.nextMonth,8);assert.ok(J.next.some(u=>u.id==='ma-u1'));
  assert.equal(unitsFor(prof,'2',12).nextMonth,1);const X=unitsFor(prof,'5',10);assert.equal(X.now.length,0);assert.equal(X.label,null);assert.equal(unitsFor(null,'2',10).now.length,0);});
test('schoolView reports states, counts and up to 3 open starters per unit',()=>{const S=E.blank();S.ts['lt_constit0007']={st:'mastered',how:'direct',c:3,w:0,box:1,due:now+3*864e5};
  const V=schoolView(prof,'2',S,g,now,10);assert.ok(V.aligned);assert.equal(V.monthName,'Oct');assert.equal(V.nextMonthName,'Nov');
  const u=V.now.find(u=>u.id==='ss-constitution');assert.equal(u.counts.mastered,1);assert.ok(u.starters.length>=1&&u.starters.length<=3);
  assert.ok(u.starters.every(s=>['ready','learning','review'].includes(s.state)));assert.ok(!u.starters.some(s=>s.id==='lt_constit0007'),'mastered topics are not starters');
  assert.ok(V.next.length);assert.ok(V.year.length>=30);assert.equal(schoolView(prof,'7',S,g,now,10).aligned,false);assert.equal(schoolView(null,'2',S,g,now,10),null);});
test('Play: topics in this month\'s school units get +SCHOOL_BONUS; nothing changes with no profile',()=>stub(()=>{const S=E.blank(),id='lt_constit0007';
  E.setSchoolTopics([]);const base=E.focusScore(S,g,id);E.setSchoolTopics(schoolTopicIds(prof,'2',10));assert.ok(E.schoolTopics().has(id));
  assert.equal(E.focusScore(S,g,id),base+E.SCHOOL_BONUS);const other=g.topics.find(t=>t.subject==='Science'&&!E.schoolTopics().has(t.id));
  const b2=E.focusScore(S,g,other.id);E.setSchoolTopics([]);assert.equal(E.focusScore(S,g,other.id),b2);}));
test('a learner aged 8: whole-number first question, placement probes near age 8, no penalty for age-7 topics',async()=>{const E2=await import('../src/engine.js?age=8');
  E2.configure({LEARNER_AGE:'8',LEARNER_GRADE:'2nd grade'});assert.equal(E2.learner().age,8);const S=E2.blank();
  const first=E2.next(S,g,null,now);assert.equal(first.answer,'3');assert.match(first.q,/How many slices/);assert.equal(g.byId[first.topicId].ageRangeStart,7);
  E2.submit(S,g,'3',now);const seen=new Set();for(let i=0;i<12;i++){const it=E2.next(S,g,null,now+i*1000);if(it.mode==='diagnostic')seen.add(it.topicId);E2.submit(S,g,'0',now+i*1000+500);}
  assert.ok(seen.size>=3,'placement probes served: '+seen.size);for(const id of seen)assert.ok(Math.abs(g.byId[id].ageRangeStart-8)<=3,`${g.byId[id].name} starts at ${g.byId[id].ageRangeStart}`);
  // a probe seeded for an older learner is dropped from the queue
  const S2=E2.blank();S2.firstDone=true;const old=g.topics.find(t=>t.ageRangeStart>=11);S2.placement.queue=[old.id];S2.placement.seeded=true;
  const nxt=E2.next(S2,g,null,now);assert.notEqual(nxt.topicId,old.id);
  stub(()=>{const a=g.topics.find(t=>t.ageRangeStart===7&&t.subject==='Science'),b=g.topics.find(t=>t.ageRangeStart===9&&t.subject===a.subject&&t.domain===a.domain);
    if(b){const S3=E2.blank();assert.ok(E2.focusScore(S3,g,a.id)>=E2.focusScore(S3,g,b.id),'age 7 is not penalised below age 9 for an 8-year-old');}});});
test('the default learner (age 10) still gets the fraction first question',()=>{const S=E.blank();const it=E.next(S,g,null,now);assert.equal(it.answer,'3/8');});
test('export-progress.mjs --local: school.now for October 2nd grade, frontier school topics first',()=>{const DATA=tmpDir('jane-school-');fs.writeFileSync(path.join(DATA,'progress.json'),JSON.stringify(E.blank()));
  const out=execFileSync(process.execPath,['export-progress.mjs','--local','--date','2026-10-15'],{cwd:ROOT,env:{...process.env,DATA_DIR:DATA,STORAGE:'file',LEARNER_AGE:'8',LEARNER_GRADE:'2nd grade'},encoding:'utf8'});
  const X=JSON.parse(fs.readFileSync(out.match(/wrote (\S+\.json)/)[1],'utf8'));fs.rmSync(DATA,{recursive:true,force:true});
  assert.match(out,/🏫 school \(2nd grade, Oct\)/);assert.ok(X.school.aligned);assert.ok(X.school.now.some(u=>u.id==='ss-constitution'));assert.ok(X.school.next.length);
  assert.equal(X.frontier[0].school,true);const ids=schoolTopicIds(prof,'2',10);let i=0;while(X.frontier[i]?.school)i++;assert.ok(i>=5);assert.ok(!X.frontier.slice(i).some(t=>ids.has(t.id)),'school topics sorted first');});
test('export without a grade: school section present but not aligned',()=>{const DATA=tmpDir('jane-school2-');fs.writeFileSync(path.join(DATA,'progress.json'),JSON.stringify(E.blank()));
  const out=execFileSync(process.execPath,['export-progress.mjs','--local','--date','2026-10-15'],{cwd:ROOT,env:{...process.env,DATA_DIR:DATA,STORAGE:'file',LEARNER_GRADE:'upper elementary'},encoding:'utf8'});
  const X=JSON.parse(fs.readFileSync(out.match(/wrote (\S+\.json)/)[1],'utf8'));fs.rmSync(DATA,{recursive:true,force:true});assert.equal(X.school.aligned,false);assert.match(out,/has no units for grade/);});
test('validator: the grade-2 example quest is valid and reports its school units; the generic example warns',()=>{const env={LEARNER_AGE:'8',LEARNER_GRADE:'2nd grade'};
  const r=validate(grade2(),{env});assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/school units: \d+ \(.*Constitution/);
  const r2=validate(example(),{args:['--dry-run','--offline','--date','2026-10-15'],env});assert.equal(r2.status,0,r2.stderr);assert.match(r2.stderr,/school: no stage from this month's school units/);
  const r3=validate(example(),{args:['--dry-run','--offline','--date','2026-10-15'],env:{LEARNER_GRADE:'upper elementary'}});assert.doesNotMatch(r3.stdout+r3.stderr,/school units|school:/);});
test('local topic ids are accepted by the validator; an unknown id names both kinds',()=>{const p=grade2();p.topics[0].topicId='lt_nope000000';const r=validate(p,{env:{LEARNER_AGE:'8',LEARNER_GRADE:'2nd grade'}});
  assert.equal(r.status,1);assert.match(r.stderr,/unknown topic id "lt_nope000000" \(a Marble mt_ id or a local lt_ id/);});
