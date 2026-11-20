// Deterministic weekly town activity. Source-backed foundations:
// free, weekly-refreshing Stage Coach candidates; a week of stress treatment
// and 5 idle stress recovery. Offer class odds/slot count and incomplete town
// activity side effects are Clays campaign fixtures.
import {HERO_CLASSES,recruitHero,validateHeroRoster} from './hero-roster.js';
import {sanitariumUnavailable,completeSanitariumWeek,applyQuestTraitRolls} from './sanitarium.js';

// DD1's three Abbey and three Tavern activities are separate treatment slots.
// The original 'abbey' and 'tavern' keys are retained for existing campaign saves.
// Costs, relief amounts and facility-wide upgrades are still Clays fixtures.
export const TREATMENTS=Object.freeze({
 abbey:Object.freeze({name:'Abbey Cloister',facility:'abbey',gold:1000,stressRelief:45}),
 abbeyTransept:Object.freeze({name:'Abbey Transept',facility:'abbey',gold:1000,stressRelief:45}),
 abbeyPenance:Object.freeze({name:'Abbey Penance Hall',facility:'abbey',gold:1000,stressRelief:45}),
 tavern:Object.freeze({name:'Tavern Bar',facility:'tavern',gold:1000,stressRelief:45}),
 tavernGambling:Object.freeze({name:'Tavern Gambling Hall',facility:'tavern',gold:1000,stressRelief:45}),
 tavernBrothel:Object.freeze({name:'Tavern Brothel',facility:'tavern',gold:1000,stressRelief:45})
});
// New campaigns may upgrade each activity independently. Older saves without
// recoveryTracks continue to use their existing Abbey/Tavern building levels.
export const RECOVERY_TRACKS=Object.freeze(Object.keys(TREATMENTS));
export function upgradeRecoveryActivity(settlement,service){
 if(!RECOVERY_TRACKS.includes(service))throw Error('Unknown stress treatment');
 const level=treatmentConfig(settlement,service).level;
 if(level>=2)throw Error('Recovery activity is already at maximum level');
 const cost={crests:3*(level+1),deeds:2*(level+1)};
 if(Object.entries(cost).some(([key,amount])=>!Number.isSafeInteger(settlement[key])||settlement[key]<amount))throw Error('Insufficient settlement resources');
 for(const [key,amount] of Object.entries(cost))settlement[key]-=amount;
 settlement.recoveryTracks??=Object.fromEntries(RECOVERY_TRACKS.map(key=>[key,settlement.facilities?.[TREATMENTS[key].facility]??0]));
 settlement.recoveryTracks[service]=level+1;
 return {service,level:level+1,cost};
}
// Vanilla DD1 forced and prohibited activity quirks. Contradictory quirks
// deliberately leave no valid treatment until a quirk is removed.
const FORCED_ACTIVITIES=Object.freeze({
 enlightened:'abbey',godFearing:'abbeyTransept',flagellant:'abbeyPenance',
 tippler:'tavern',gambler:'tavernGambling',loveInterest:'tavernBrothel'
});
const BLOCKED_ACTIVITIES=Object.freeze({
 unquietMind:['abbey'],witness:['abbeyTransept'],
 faithless:['abbeyTransept','abbeyPenance'],resolution:['tavern'],
 knownCheat:['tavernGambling'],deviantTastes:['tavernBrothel']
});
export function stressTreatmentRestriction(hero,service){
 if(!TREATMENTS[service])return 'Unknown stress treatment';
 const ids=new Set((hero?.quirks?.negative??[]).map(q=>q.id));
 for(const [id,required] of Object.entries(FORCED_ACTIVITIES))
  if(ids.has(id)&&service!==required)return id+' requires '+TREATMENTS[required].name;
 for(const [id,blocked] of Object.entries(BLOCKED_ACTIVITIES))
  if(ids.has(id)&&blocked.includes(service))return id+' prohibits '+TREATMENTS[service].name;
 return null;
}
export function canUseStressTreatment(hero,service){
 return stressTreatmentRestriction(hero,service)===null;
}
export function treatmentConfig(settlement,service){
 const base=TREATMENTS[service];
 if(!base)throw Error('Unknown stress treatment');
 const legacy=settlement.facilities?.[base.facility]??0;
 const independent=settlement.recoveryTracks?.[service];
 const level=independent===undefined?legacy:independent;
 if(!Number.isInteger(level)||level<0||level>2)throw Error('Invalid recovery upgrade');
 return {...base,level,stressRelief:[45,56,70][level],capacity:level===2?2:1};
}
const goodInt=n=>Number.isSafeInteger(n)&&n>=0;
const names=Object.keys(TREATMENTS);
export function stageCoachOffers(week,roster=[],network=0){
 if(!goodInt(week)||week<1)throw Error('Invalid town week');
 const living=roster.filter(h=>!h.unit.dead).length;
 if(!goodInt(network)||network>5)throw Error('Invalid Stage Coach network');
 const count=Math.min(7,Math.max(2,4-living)+network);
 let seed=(Math.imul(week,2654435761)^0xa2c79f13)>>>0;
 const offers=[];
 for(let i=0;i<count;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const heroClass=HERO_CLASSES[seed%HERO_CLASSES.length];
  offers.push({offerId:'w'+week+'-o'+(i+1),heroClass});
 }
 return offers;
}
export function initTown(settlement){
 settlement.town={week:1,offers:stageCoachOffers(1,settlement.roster,settlement.stageCoach?.network??0),treatments:[]};
 return settlement;
}
export function validateTown(settlement){
 const town=settlement.town;
 if(!town||typeof town!=='object'||!goodInt(town.week)||town.week<1||
   !Array.isArray(town.offers)||town.offers.length>7||
   !Array.isArray(town.treatments)||town.treatments.length>names.reduce((sum,name)=>sum+treatmentConfig(settlement,name).capacity,0))throw Error('Invalid town state');
 const offerIds=new Set();
 for(const offer of town.offers){
  if(!offer||typeof offer.offerId!=='string'||!new RegExp('^w'+town.week+'-o[1-7]'+String.fromCharCode(36)).test(offer.offerId)||
    offerIds.has(offer.offerId)||!HERO_CLASSES.includes(offer.heroClass))throw Error('Invalid Stage Coach offer');
  offerIds.add(offer.offerId);
 }
 const serviceCounts=new Map(),usedHeroes=new Set();
 for(const t of town.treatments){
  if(!t||!names.includes(t.service)||(serviceCounts.get(t.service)??0)>=treatmentConfig(settlement,t.service).capacity||usedHeroes.has(t.rosterId)||sanitariumUnavailable(settlement,t.rosterId)||
    !settlement.roster.some(h=>h.rosterId===t.rosterId&&!h.unit.dead&&canUseStressTreatment(h,t.service)))throw Error('Invalid treatment reservation');
  serviceCounts.set(t.service,(serviceCounts.get(t.service)??0)+1);usedHeroes.add(t.rosterId);
 }
 return town;
}
export function recruitFromCoach(settlement,offerId){
 validateHeroRoster(settlement);
 const town=validateTown(settlement);
 const index=town.offers.findIndex(o=>o.offerId===offerId);
 if(index<0)throw Error('No such Stage Coach candidate');
 const recruited=recruitHero(settlement,town.offers[index].heroClass);
 town.offers.splice(index,1);
 return recruited;
}
export function bookStressTreatment(settlement,rosterId,service){
 validateHeroRoster(settlement);
 const town=validateTown(settlement),config=treatmentConfig(settlement,service);
 if(!config)throw Error('Unknown stress treatment');
 const hero=settlement.roster.find(h=>h.rosterId===rosterId);
 if(!hero||hero.unit.dead)throw Error('Hero is unavailable');
 if(hero.unit.stress<=0)throw Error('Hero has no stress to treat');
 if(!canUseStressTreatment(hero,service))throw Error('Hero quirk forbids this stress treatment');
 if(town.treatments.some(t=>t.rosterId===rosterId)||sanitariumUnavailable(settlement,rosterId))throw Error('Hero is already receiving treatment');
 if(town.treatments.filter(t=>t.service===service).length>=config.capacity)throw Error('Treatment room is occupied');
 if(settlement.gold<config.gold)throw Error('Insufficient gold for treatment');
 settlement.gold-=config.gold;
 town.treatments.push({rosterId,service});
 return hero;
}
export function townUnavailable(settlement,rosterId){
 return !!settlement.town?.treatments?.some(t=>t.rosterId===rosterId)||sanitariumUnavailable(settlement,rosterId);
}
export function advanceTownWeek(settlement,expedition){
 validateHeroRoster(settlement);
 const town=validateTown(settlement);
 if(!expedition||!['victory','defeat'].includes(expedition.phase))throw Error('Expedition has not ended');
 if(!expedition.rosterReturned)throw Error('Return the expedition party to the roster first');
 if(expedition.townWeekProcessed)return false;
 if(expedition.phase==='victory'&&!expedition.traitsProcessed)applyQuestTraitRolls(settlement,expedition);
 const deployed=new Set(expedition.party.map(u=>u.rosterId).filter(Boolean));
 const treated=new Set([...town.treatments.map(t=>t.rosterId),...['quirkWard','medicalWard'].map(w=>settlement.sanitarium?.[w]?.rosterId),...(settlement.sanitarium?.extraQuirkWards??[]).map(t=>t.rosterId),...(settlement.sanitarium?.extraMedicalWards??[]).map(t=>t.rosterId)].filter(Boolean));
 for(const t of town.treatments){
  const hero=settlement.roster.find(h=>h.rosterId===t.rosterId);
  if(!hero||hero.unit.dead)continue;
  hero.unit.stress=Math.max(0,hero.unit.stress-treatmentConfig(settlement,t.service).stressRelief);
  if(hero.unit.stress<100)hero.unit.affliction=null;
 }
 for(const hero of settlement.roster){
  if(hero.unit.dead||deployed.has(hero.rosterId)||treated.has(hero.rosterId))continue;
  hero.unit.stress=Math.max(0,hero.unit.stress-5);
 }
 completeSanitariumWeek(settlement);
 town.week++;
 town.offers=stageCoachOffers(town.week,settlement.roster,settlement.stageCoach?.network??0);
 town.treatments=[];
 expedition.townWeekProcessed=true;
 return true;
}
