// Coverage by area (LESSONS.md "Coverage"): an area is a Marble domain. It is "seen" when it has at least 1 graded
// answer in the given logs (not a self-check) or a topic with a direct record and at least 1 correct answer.
// Inferred-only topics don't count. Shared by the export, the validator, Play and the parent report.
import {stateOf} from './engine.js';
export const AREA_ORDER=['Mathematics','Science']; // untouched areas: math and science first, then the rest
const graded=l=>l&&!l.event&&l.topicId&&l.expected!=='(self-check)'&&l.regraded!=='neutral';
export function seenAreas(S,g,logs=[]){const seen=new Map();const k=t=>t.subject+'|'+t.domain;
  for(const l of logs)if(graded(l)){const t=g.byId[l.topicId];if(t){const x=seen.get(k(t))||{answered:0};x.answered++;seen.set(k(t),x);}}
  for(const [id,r] of Object.entries(S.ts||{})){const t=g.byId[id];if(t&&r.how==='direct'&&(r.c||0)>=1&&!seen.has(k(t)))seen.set(k(t),{answered:0});}
  return seen;}
export function coverage(S,g,logs=[],{age=10,now=Date.now(),starters=3}={}){const seen=seenAreas(S,g,logs);const subj=new Map();
  for(const t of g.topics){const s=subj.get(t.subject)||subj.set(t.subject,{name:t.subject,domains:new Map()}).get(t.subject);
    const d=s.domains.get(t.domain)||s.domains.set(t.domain,{name:t.domain,topics:[]}).get(t.domain);d.topics.push(t);}
  const subjects=[...subj.values()].map(s=>{const domains=[...s.domains.values()].map(d=>{const key=s.name+'|'+d.name,x=seen.get(key);
      const mastered=d.topics.filter(t=>{const r=S.ts?.[t.id];return r&&r.st==='mastered'&&r.how==='direct';}).length;
      const st=x?[]:d.topics.filter(t=>t.ageRangeStart>=age-2&&stateOf(S,g,t.id,now)==='ready').sort((a,b)=>Math.abs(a.ageRangeStart-age)-Math.abs(b.ageRangeStart-age)||a.ageRangeStart-b.ageRangeStart)
        .slice(0,starters).map(t=>({id:t.id,name:t.sn||t.name,age:t.ageRangeStart}));
      return{name:d.name,seen:!!x,answered:x?.answered||0,mastered,topics:d.topics.length,starters:st};});
    return{name:s.name,total:domains.length,seen:domains.filter(d=>d.seen).length,domains};});
  const rank=n=>{const i=AREA_ORDER.indexOf(n);return i<0?AREA_ORDER.length:i;};
  const untouched=subjects.slice().sort((a,b)=>rank(a.name)-rank(b.name)).flatMap(s=>s.domains.filter(d=>!d.seen).map(d=>({subject:s.name,domain:d.name,starters:d.starters})));
  return{subjects,untouched,seen:subjects.reduce((a,s)=>a+s.seen,0),total:subjects.reduce((a,s)=>a+s.total,0)};}
