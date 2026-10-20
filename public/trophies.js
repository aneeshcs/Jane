// Trophy Case filter helpers (plain script; the app uses window.TrophyFilter, the tests load it with node:vm).
// One tap on a medal-type chip shows only that type; tapping it again, or "All", shows everything.
(function(root){
  const TYPES=['quest','legendary','gold','silver','bronze'];
  const ICON={all:'🏆',quest:'🗺️',legendary:'🌈',gold:'🥇',silver:'🥈',bronze:'🥉'};
  const NAME={all:'All',quest:'Quest',legendary:'Legendary',gold:'Gold',silver:'Silver',bronze:'Bronze'};
  const counts=medals=>{const c={};for(const m of medals||[])c[m.tier]=(c[m.tier]||0)+1;return c;};
  // which chips to show: All, then every medal type (Quest only once there is a quest medal)
  const chips=(medals,active)=>{const c=counts(medals),a=active||'all';
    return ['all',...TYPES.filter(t=>t!=='quest'||c.quest)].map(t=>({tier:t,icon:ICON[t],name:NAME[t],n:t==='all'?(medals||[]).length:(c[t]||0),pressed:t===a,dim:a!=='all'&&t!==a}));};
  const filter=(medals,active)=>!active||active==='all'?(medals||[]):(medals||[]).filter(m=>m.tier===active);
  // tapping the active chip again resets to All
  const next=(active,tapped)=>tapped==='all'||tapped===active?'all':tapped;
  const empty=(active,total)=>!total?'No medals yet. Go win one! 🏅':active==='legendary'?'No Legendary medals yet. Beat a boss 3 times in a row to win one! 🌈'
    :active==='quest'?'No Quest medals yet. Finish a quest to win one! 🗺️':`No ${NAME[active]} medals yet. Keep going, you'll get one! ${ICON[active]}`;
  const say=(active,n)=>active==='all'?`Showing all ${n} medal${n===1?'':'s'}`:`Showing ${n} ${NAME[active]} medal${n===1?'':'s'}`;
  const esc=s=>String(s).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  const chipsHTML=(medals,active)=>chips(medals,active).map(c=>`<button type="button" class="tc t-${c.tier}${c.pressed?' on':''}${c.dim?' dim':''}" data-tier="${c.tier}" aria-pressed="${c.pressed}" aria-label="${esc(`${c.name}: ${c.n} medal${c.n===1?'':'s'}`)}">${c.icon} ${c.n} ${esc(c.name)}</button>`).join('');
  root.TrophyFilter={TYPES,ICON,NAME,counts,chips,filter,next,empty,say,chipsHTML};
})(typeof window!=='undefined'?window:globalThis);
