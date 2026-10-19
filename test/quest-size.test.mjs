// Slice 1: quests fit in about eight minutes (≤ 16 graded pack questions, ≤ 7 stages; the publisher enforces it).
import {test} from 'node:test';import assert from 'node:assert/strict';import {validate,example,nGraded} from './helpers.mjs';
const extra=n=>Array.from({length:n},(_,i)=>({type:'mc',prompt:`Which planet is number ${i+3}?`,choices:['Earth','Mars','Venus'],answer:'Earth',hint:'Count from the Sun.',explanation:'Earth is third.'}));
test('a quest with 17 graded questions is refused as too long',()=>{const p=example();assert.equal(nGraded(p),16);p.topics[0].questions.push(...extra(1));
  const r=validate(p);assert.equal(r.status,1);assert.match(r.stderr,/too long/);});
test('a quest with 8 stages is refused',()=>{const p=example();
  // add 2 one-question stages and drop 2 graded items elsewhere, so only the stage count is over budget
  const base=p.topics[0];p.topics[1].questions.splice(1,1);p.topics[2].questions.splice(2,1);
  for(const id of ['mt_e7filQgayF','mt_SBkTGjiZjZ'])p.topics.splice(1,0,{...JSON.parse(JSON.stringify(base)),topicId:id,questions:[base.questions[0]]});
  assert.equal(p.topics.length,8);const r=validate(p);assert.equal(r.status,1);assert.match(r.stderr,/8 stages: too long/);});
test('the example quest passes with an estimate of 8 min or less',()=>{const r=validate(example());assert.equal(r.status,0,r.stderr);
  const m=r.stdout.match(/~([\d.]+) min/);assert.ok(m,r.stdout);assert.ok(+m[1]<=8,m[1]);});
test('a deep dive with 3 graded questions passes; one with 2 fails',()=>{const p=example();const dd=p.topics[1];assert.ok(dd.deepDive);
  assert.equal(dd.questions.filter(q=>!['why','fact','learn'].includes(q.type)).length,3);assert.equal(validate(p).status,0);
  dd.questions.splice(dd.questions.findIndex(q=>q.type==='match'),1);const r=validate(p);assert.equal(r.status,1);assert.match(r.stderr,/deep dive needs ≥ 3/);});
// Slice 13: spaced review runs through the app's review gates; review stages still publish but get a warning
test('a pack with a review: true stage passes with a "review gates" warning',()=>{const p=example();assert.ok(p.topics.some(t=>t.review));
  const r=validate(p);assert.equal(r.status,0,r.stderr);assert.match(r.stderr+r.stdout,/review runs through gates now/);});
test('a pack with no review stages gets no review-share warning',()=>{const p=example();p.topics=p.topics.filter(t=>!t.review);
  const r=validate(p);assert.equal(r.status,0,r.stderr);const out=r.stderr+r.stdout;assert.doesNotMatch(out,/review runs through gates|aim 15-20%|of graded questions are review/);});
