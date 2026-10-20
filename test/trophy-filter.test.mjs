// Trophy Case filter: tap a medal type → only that type; tap it again or "All" → everything (public/trophies.js).
import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {ROOT,loadEngine} from './helpers.mjs';
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,'public/trophies.js'),'utf8'),ctx);const TF=ctx.TrophyFilter;
const {E,g}=await loadEngine();
// made-up medals through the real /api/trophies shape (E.trophies)
const ids=g.topics.slice(0,8).map(t=>t.id),now=Date.parse('2026-02-02T18:00:00Z');
const S=E.blank();S.medals=[{id:ids[0],tier:'legendary',at:now},{id:ids[1],tier:'legendary',at:now+1},{id:ids[2],tier:'gold',at:now+2},{id:ids[3],tier:'silver',at:now+3},{id:ids[4],tier:'silver',at:now+4}];
S.questMedals=[{date:'2026-02-01',name:'Star Medal',emoji:'⭐',title:'Star Quest',at:now+5}];
const {medals:M,counts}=E.trophies(S,g);const tiers=a=>a.map(m=>m.tier);
const chip=(html,t)=>html.match(new RegExp(`<button[^>]*data-tier="${t}"[^>]*>`))?.[0];
test('tap Legendary → only legendary medals, its chip is pressed and the others are dimmed',()=>{let a=TF.next('all','legendary');assert.equal(a,'legendary');
  const f=TF.filter(M,a);assert.equal(f.length,2);assert.ok(tiers(f).every(t=>t==='legendary'));
  const h=TF.chipsHTML(M,a);assert.match(chip(h,'legendary'),/aria-pressed="true"/);assert.match(chip(h,'legendary'),/class="tc t-legendary on"/);
  for(const t of ['all','gold','silver','bronze','quest']){assert.match(chip(h,t),/aria-pressed="false"/);assert.match(chip(h,t),/ dim"/);}
  assert.equal(TF.say(a,f.length),'Showing 2 Legendary medals');});
test('tap the active chip again, or All → every medal again',()=>{assert.equal(TF.next('legendary','legendary'),'all');assert.equal(TF.next('gold','all'),'all');
  assert.equal(TF.filter(M,'all').length,M.length);const h=TF.chipsHTML(M,'all');assert.match(chip(h,'all'),/aria-pressed="true"/);assert.doesNotMatch(h,/ dim"/);
  assert.equal(TF.next('legendary','gold'),'gold','switching types goes straight to the new one');});
test('counts on the chips match the medal list; a type with 0 shows a friendly empty state',()=>{const C=TF.chips(M,'all');
  assert.equal(C.find(c=>c.tier==='all').n,M.length);for(const t of TF.TYPES)if(C.find(c=>c.tier===t))assert.equal(C.find(c=>c.tier===t).n,counts[t]||0,t);
  assert.equal(C.map(c=>c.tier).join(),'all,quest,legendary,gold,silver,bronze');assert.equal(TF.filter(M,'bronze').length,0);assert.match(TF.empty('bronze',M.length),/No Bronze medals yet/);
  assert.match(TF.empty('all',0),/No medals yet/);assert.ok(!TF.chips(M.filter(m=>m.tier!=='quest'),'all').some(c=>c.tier==='quest'),'no Quest chip before a quest medal');});
test('the chips are real, labelled buttons (keyboard and screen-reader friendly)',()=>{const h=TF.chipsHTML(M,'gold');const n=(h.match(/<button type="button"/g)||[]).length;assert.equal(n,6);
  assert.match(chip(h,'gold'),/aria-label="Gold: 1 medal"/);assert.ok(fs.readFileSync(path.join(ROOT,'public/index.html'),'utf8').includes('<script src="/trophies.js" defer></script><script src="/app.js"'));});
