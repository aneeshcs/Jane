// Slice 14: coverage by area (Marble domain); an area is seen with a graded answer or a direct record with a correct answer.
import {test} from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import fs from 'node:fs';import path from 'node:path';
import {loadEngine,ROOT,tmpDir} from './helpers.mjs';import {coverage} from '../src/coverage.js';
const {E,g}=await loadEngine();const now=Date.parse('2026-02-02T18:00:00Z');const sub=(c,n)=>c.subjects.find(s=>s.name===n);
const math=g.topics.filter(t=>t.subject==='Mathematics');const dom=math[0].domain;const other=math.find(t=>t.domain!==dom);
test('blank learner: Mathematics 0/12 and Science 0/19 seen',()=>{const c=coverage(E.blank(),g,[],{age:10,now});
  assert.deepEqual([sub(c,'Mathematics').seen,sub(c,'Mathematics').total],[0,12]);assert.deepEqual([sub(c,'Science').seen,sub(c,'Science').total],[0,19]);
  assert.equal(c.untouched.length,c.total);assert.equal(c.untouched[0].subject,'Mathematics','math first');});
test('a directly mastered topic in one math area → Mathematics 1/12; an inferred-only topic does not count',()=>{const S=E.blank();
  S.ts[math[0].id]={st:'mastered',how:'direct',c:2,conf:.9,box:0,due:now+864e5};S.ts[other.id]={st:'mastered',how:'inferred',conf:.6,box:2,due:now+30*864e5};
  const c=coverage(S,g,[],{age:10,now});const m=sub(c,'Mathematics');assert.equal(m.seen,1);const d=m.domains.find(x=>x.name===dom);assert.equal(d.seen,true);assert.equal(d.mastered,1);
  assert.equal(m.domains.find(x=>x.name===other.domain).seen,false);});
test('a graded answer in the log marks its area seen; a self-check does not',()=>{const sci=g.topics.filter(t=>t.subject==='Science');const a=sci[0],b=sci.find(t=>t.domain!==a.domain);
  const logs=[{topicId:a.id,correct:false,try:1,expected:'x',given:'y'},{topicId:b.id,correct:true,try:1,expected:'(self-check)',given:'yes'},{event:'term',topicId:b.id}];
  const c=coverage(E.blank(),g,logs,{age:10,now});const s=sub(c,'Science');assert.equal(s.seen,1);
  assert.equal(s.domains.find(x=>x.name===a.domain).answered,1);assert.equal(s.domains.find(x=>x.name===b.domain).seen,false);});
test('each untouched area lists ≤ 3 starters that are ready and not below target age − 2',()=>{const S=E.blank(),age=11;const c=coverage(S,g,[],{age,now});let withStarters=0;
  for(const u of c.untouched){assert.ok(u.starters.length<=3);if(u.starters.length)withStarters++;
    for(const s of u.starters){assert.ok(s.age>=age-2,s.name);assert.equal(E.stateOf(S,g,s.id,now),'ready');}
    const ages=u.starters.map(s=>Math.abs(s.age-age));assert.deepEqual(ages,[...ages].sort((x,y)=>x-y),'closest to target age first');}
  assert.ok(withStarters>=10,String(withStarters));});
test('export-progress.mjs --local output includes coverage',()=>{const DATA=tmpDir('jane-cov-');fs.writeFileSync(path.join(DATA,'progress.json'),JSON.stringify(E.blank()));
  const out=execFileSync(process.execPath,['export-progress.mjs','--local'],{cwd:ROOT,env:{...process.env,DATA_DIR:DATA,STORAGE:'file'},encoding:'utf8'});
  const X=JSON.parse(fs.readFileSync(out.match(/wrote (\S+\.json)/)[1],'utf8'));fs.rmSync(DATA,{recursive:true,force:true});
  assert.equal(sub(X.coverage,'Mathematics').total,12);assert.ok(Array.isArray(X.coverage.untouched));});
// ---- slice 15: the publisher reports new areas (warning only, frozen decision) ----
import {validate,example} from './helpers.mjs';
const seeded=skip=>{const DATA=tmpDir('jane-covp-'),S=E.blank();for(const t of example().topics)if(t.topicId!==skip)S.ts[t.topicId]={st:'learning',how:'direct',c:1,w:0};
  fs.writeFileSync(path.join(DATA,'progress.json'),JSON.stringify(S));return DATA;};
const pub=(DATA,args=['--dry-run','--local'])=>{const r=validate(example(),{args,env:{DATA_DIR:DATA}});fs.rmSync(DATA,{recursive:true,force:true});return r;};
const SCI=example().topics.find(t=>g.byId[t.topicId].subject==='Science').topicId;
test('with seeded progress, a quest only in seen areas → warning "no new area" (still valid)',()=>{const r=pub(seeded(null));
  assert.equal(r.status,0,r.stderr);assert.match(r.stderr,/coverage: no new area/);assert.match(r.stdout,/new areas: 0/);});
test('a stage from an untouched area → summary shows "new areas: 1" and no warning',()=>{const r=pub(seeded(SCI));
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/new areas: 1 \(Science \/ /);assert.doesNotMatch(r.stderr,/no new area/);});
test('--offline skips the coverage check',()=>{const r=pub(seeded(null),['--dry-run','--offline']);
  assert.equal(r.status,0,r.stderr);assert.doesNotMatch(r.stdout+r.stderr,/new areas|no new area/);});
