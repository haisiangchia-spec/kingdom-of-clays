// DD1-inspired Sanitarium: one quirk ward and one medical ward, unlocked week 4.
// Apprentice base prices from darkestdungeon.wiki.gg/wiki/Sanitarium.
// Trait pool/quest acquisition below are Kingdom of Clays provisional fixtures.
export const QUIRKS=Object.freeze({
 sturdy:{name:'Sturdy',kind:'positive'},eagleEye:{name:'Eagle Eye',kind:'positive'},
 nervous:{name:'Nervous',kind:'negative'},slowReflexes:{name:'Slow Reflexes',kind:'negative'}
});
export const DISEASES=Object.freeze({
 creepingCough:{name:'Creeping Cough'},ashenFever:{name:'Ashen Fever'}
});
export const SANITARIUM_COSTS=Object.freeze({negative:1500,lockedNegative:5000,lockPositive:7500,disease:750});
const copy=x=>structuredClone(x);
const positive=['sturdy','eagleEye'],negative=['nervous','slowReflexes'],diseases=Object.keys(DISEASES);
function goodTrait(entry,kind){
 return !!entry&&typeof entry.id==='string'&&!!QUIRKS[entry.id]&&QUIRKS[entry.id].kind===kind&&typeof entry.locked==='boolean';
}
export function initSanitarium(settlement){
 settlement.sanitarium={quirkWard:null,medicalWard:null};
 for(const hero of settlement.roster)ensureTraits(hero);
 return settlement;
}
export function ensureTraits(hero){
 hero.quirks??={positive:[],negative:[]};hero.diseases??=[];
 return hero;
}
export function validateSanitarium(settlement){
 const state=settlement.sanitarium;
 if(!state||typeof state!=='object')throw Error('Invalid Sanitarium');
 for(const hero of settlement.roster){
  ensureTraits(hero);
  for(const kind of ['positive','negative']){
   const entries=hero.quirks[kind];
   if(!Array.isArray(entries)||entries.length>5||new Set(entries.map(x=>x.id)).size!==entries.length||
      entries.some(x=>!goodTrait(x,kind)))throw Error('Invalid hero quirks');
  }
  if(hero.quirks.positive.filter(x=>x.locked).length>3)throw Error('Too many locked positive quirks');
  if(!Array.isArray(hero.diseases)||hero.diseases.length>3||new Set(hero.diseases).size!==hero.diseases.length||
    hero.diseases.some(x=>!DISEASES[x]))throw Error('Invalid hero diseases');
 }
 for(const [ward,modes] of [['quirkWard',['negative','lockPositive']],['medicalWard',['disease']]]){
  const booking=state[ward];if(booking===null)continue;
  if(!booking||!modes.includes(booking.mode)||typeof booking.rosterId!=='string'||
     typeof booking.target!=='string'||!settlement.roster.some(h=>h.rosterId===booking.rosterId&&!h.unit.dead))
    throw Error('Invalid Sanitarium booking');
 }
 if(state.quirkWard&&state.medicalWard&&state.quirkWard.rosterId===state.medicalWard.rosterId)throw Error('Duplicate Sanitarium patient');
 return state;
}
export function sanitariumUnavailable(settlement,id){
 return !!(settlement.sanitarium?.quirkWard?.rosterId===id||settlement.sanitarium?.medicalWard?.rosterId===id);
}
export function bookSanitarium(settlement,rosterId,mode,target){
 validateSanitarium(settlement);
 if(settlement.town?.week<4)throw Error('Sanitarium unlocks in week 4');
 if(!['negative','lockPositive','disease'].includes(mode))throw Error('Invalid treatment mode');
 const ward=mode==='disease'?'medicalWard':'quirkWard';
 if(settlement.sanitarium[ward])throw Error('Sanitarium ward is occupied');
 if(sanitariumUnavailable(settlement,rosterId)||settlement.town?.treatments?.some(t=>t.rosterId===rosterId))
  throw Error('Hero already undergoing treatment');
 const hero=settlement.roster.find(h=>h.rosterId===rosterId);
 if(!hero||hero.unit.dead)throw Error('Hero is unavailable');
 const record=mode==='negative'?hero.quirks.negative.find(x=>x.id===target):
  mode==='lockPositive'?hero.quirks.positive.find(x=>x.id===target):null;
 if(mode==='disease'&&!hero.diseases.includes(target))throw Error('Disease is not present');
 if(mode!=='disease'&&!record)throw Error('Quirk is not present');
 if(mode==='lockPositive'&&(record.locked||hero.quirks.positive.filter(x=>x.locked).length>=3))throw Error('Cannot lock more positive quirks');
 const cost=mode==='negative'?(record.locked?SANITARIUM_COSTS.lockedNegative:SANITARIUM_COSTS.negative):
   mode==='lockPositive'?SANITARIUM_COSTS.lockPositive:SANITARIUM_COSTS.disease;
 if(settlement.gold<cost)throw Error('Insufficient gold for Sanitarium');
 settlement.gold-=cost;
 settlement.sanitarium[ward]={rosterId,mode,target};
 return {ward,cost};
}
export function completeSanitariumWeek(settlement){
 validateSanitarium(settlement);
 for(const ward of ['quirkWard','medicalWard']){
  const booking=settlement.sanitarium[ward];if(!booking)continue;
  const hero=settlement.roster.find(h=>h.rosterId===booking.rosterId);
  if(hero&&!hero.unit.dead){
   if(booking.mode==='disease')hero.diseases=hero.diseases.filter(x=>x!==booking.target);
   if(booking.mode==='negative')hero.quirks.negative=hero.quirks.negative.filter(x=>x.id!==booking.target);
   if(booking.mode==='lockPositive'){
    const quirk=hero.quirks.positive.find(x=>x.id===booking.target);if(quirk)quirk.locked=true;
   }
  }
  settlement.sanitarium[ward]=null;
 }
}
function hash(seed,key){
 let value=seed>>>0;
 for(let i=0;i<key.length;i++)value=Math.imul(value^key.charCodeAt(i),16777619)>>>0;
 return value;
}
// One deterministic, modest chance per completed expedition. No randomness on
// screen redraw or save/restore; each hero rolls at most once per expedition.
export function applyQuestTraitRolls(settlement,expedition){
 if(expedition.traitsProcessed)return false;
 if(expedition.phase!=='victory'||!expedition.rosterReturned)throw Error('Quest trait roll requires completed victory');
 for(const u of expedition.party){
  const hero=settlement.roster.find(h=>h.rosterId===u.rosterId);
  if(!hero||hero.unit.dead)continue;
  ensureTraits(hero);
  const r=hash(expedition.seed,hero.rosterId+':'+(settlement.town?.week??1));
  const roll=r%100;
  if(roll<20){
   const id=positive[r%positive.length];
   if(!hero.quirks.positive.some(q=>q.id===id)&&hero.quirks.positive.length<5)
    hero.quirks.positive.push({id,locked:false});
  }else if(roll<40){
   const id=negative[r%negative.length];
   if(!hero.quirks.negative.some(q=>q.id===id)&&hero.quirks.negative.length<5)
    hero.quirks.negative.push({id,locked:false});
  }else if(roll<50){
   const id=diseases[r%diseases.length];
   if(!hero.diseases.includes(id)&&hero.diseases.length<3)hero.diseases.push(id);
  }
 }
 expedition.traitsProcessed=true;
 return true;
}
