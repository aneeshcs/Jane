// School curriculum alignment (docs/SCHOOL.md). A school profile (data/school/*.json, bundled into public/school.json by
// build.mjs) lists, per grade, the units a learner meets at school over the year: each unit names a subject, a program,
// the months it runs, the standards it covers and the taxonomy topics (Marble mt_ ids or local lt_ ids) that teach it.
// Shared by the engine (Play bonus), the export, the pack validator and the parent report. No learner data lives here.
import {stateOf} from './engine.js';
export const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const SCHOOL_YEAR=[8,9,10,11,12,1,2,3,4,5]; // Aug → May (US school year)
// "2nd grade" → "2", "Grade 3" → "3", "K" / "kindergarten" → "K", "upper elementary" → null (no grade: no alignment)
export function gradeKey(grade){const s=String(grade||'').trim().toLowerCase();if(!s)return null;if(/^(k|kg|kinder|kindergarten)\b/.test(s))return 'K';
  const m=s.match(/(\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?/)||s.match(/grade\s*(\d{1,2})/);return m?String(+m[1]):null;}
// Pick a profile from the bundle: by id, else the only/first one.
export function pickProfile(bundle,id){const P=bundle?.profiles||{};if(id&&P[id])return P[id];const ks=Object.keys(P);return ks.length?P[id&&P[id]?id:ks[0]]:null;}
export const ptMonth=(ms=Date.now())=>+new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',month:'numeric'}).format(new Date(ms));
const nextMonth=m=>m===12?1:m+1;
// Units running this month and next month for a grade. Outside the school year (Jun/Jul) nothing runs and "next" is August.
export function unitsFor(profile,grade,month){const G=profile?.grades?.[grade];if(!G)return{grade,label:null,month,now:[],next:[],nextMonth:null,units:[]};
  const units=G.units||[];const inYear=SCHOOL_YEAR.includes(month);const nm=inYear?nextMonth(month):8;
  const now=inYear?units.filter(u=>(u.months||[]).includes(month)):[];
  const next=units.filter(u=>(u.months||[]).includes(nm)&&!now.includes(u));
  return{grade,label:G.label||`grade ${grade}`,age:G.age,month,now,next,nextMonth:nm,units};}
// All topic ids in the units running this month (Play gives them a bonus; the export marks them).
export function schoolTopicIds(profile,grade,month){return new Set(unitsFor(profile,grade,month).now.flatMap(u=>u.topics||[]));}
// A unit with the learner's state per topic (read-only).
export function unitStatus(u,S,g,now){const topics=(u.topics||[]).filter(id=>g.byId[id]).map(id=>{const t=g.byId[id],r=S.ts?.[id];
    return{id,name:t.sn||t.name,subject:t.subject,domain:t.domain,age:t.ageRangeStart,state:stateOf(S,g,id,now),how:r?.how||null,c:r?.c||0,w:r?.w||0};});
  const counts={mastered:0,review:0,learning:0,ready:0,locked:0};for(const t of topics)counts[t.state]++;
  const open=topics.filter(t=>['ready','learning','review'].includes(t.state)).sort((a,b)=>({learning:0,review:1,ready:2}[a.state]-{learning:0,review:1,ready:2}[b.state])||a.age-b.age);
  return{id:u.id,subject:u.subject,title:u.title,program:u.program||null,months:u.months||[],monthNames:(u.months||[]).map(m=>MONTHS[m-1]),standards:u.standards||[],note:u.note||null,
    topics,counts,starters:open.slice(0,3).map(t=>({id:t.id,name:t.name,age:t.age,state:t.state}))};}
// The whole picture for the export and the parent report.
export function schoolView(profile,grade,S,g,now,month=ptMonth(now)){if(!profile)return null;const U=unitsFor(profile,grade,month);
  const st=u=>unitStatus(u,S,g,now);
  return{profile:profile.id,school:profile.name,district:profile.district||null,grade:U.grade,gradeLabel:U.label,aligned:!!profile.grades?.[grade],month,monthName:MONTHS[month-1],
    nextMonth:U.nextMonth,nextMonthName:U.nextMonth?MONTHS[U.nextMonth-1]:null,programs:profile.programs||[],now:U.now.map(st),next:U.next.map(st),
    year:U.units.map(u=>({id:u.id,subject:u.subject,title:u.title,program:u.program||null,months:u.months||[],monthNames:(u.months||[]).map(m=>MONTHS[m-1])}))};}
// Validation (build.mjs and tests): every unit has an id, subject, title, months 1-12 and known topic ids.
export function validateProfile(p,byId){const errs=[];if(!p?.id)errs.push('profile.id required');if(!p?.name)errs.push('profile.name required');
  for(const [gk,G] of Object.entries(p?.grades||{})){if(!Array.isArray(G.units)||!G.units.length){errs.push(`grades.${gk}.units: non-empty array`);continue;}const ids=new Set();
    G.units.forEach((u,i)=>{const P=`grades.${gk}.units[${i}]`;if(!u.id)errs.push(P+'.id required');else if(ids.has(u.id))errs.push(P+'.id duplicate '+u.id);ids.add(u.id);
      if(!u.subject)errs.push(P+'.subject required');if(!u.title)errs.push(P+'.title required');
      if(!Array.isArray(u.months)||!u.months.length||!u.months.every(m=>Number.isInteger(m)&&m>=1&&m<=12))errs.push(P+'.months: array of month numbers 1-12');
      if(!Array.isArray(u.topics)||!u.topics.length)errs.push(P+'.topics: non-empty array of topic ids');else for(const id of u.topics)if(byId&&!byId[id])errs.push(`${P}.topics: unknown topic id "${id}"`);
      if(u.standards!=null&&!(Array.isArray(u.standards)&&u.standards.every(s=>typeof s==='string')))errs.push(P+'.standards: array of strings');});}
  return errs;}
