// Deterministic weekly town activity. Source-backed foundations:
// free, weekly-refreshing Stage Coach candidates; a week of stress treatment
// and 5 idle stress recovery. Offer class odds/slot count and incomplete town
// activity side effects are Clays campaign fixtures.
import {HERO_CLASSES,recruitHero,validateHeroRoster} from './hero-roster.js';
import {sanitariumUnavailable,completeSanitariumWeek,applyQuestTraitRolls} from './sanitarium.js';

export const TREATMENTS=Object.freeze({
 abbey:Object.freeze({name:'Abbey Cloister',gold:1000,stressRelief:45}),
 tavern:Object.freeze({name:'Tavern Bar',gold:1000,stressRelief:45})
});
const goodInt=n=>Number.isSafeInteger(n)&&n>=0;
const names=Object.keys(TREATMENTS);
export function stageCoachOffers(week,roster=[]){
 if(!goodInt(week)||week<1)throw Error('Invalid town week');
 const living=roster.filter(h=>!h.unit.dead).length;
 const count=Math.min(4,Math.max(2,4-living));
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
 settlement.town={week:1,offers:stageCoachOffers(1,settlement.roster),treatments:[]};
 return settlement;
}
export function validateTown(settlement){
 const town=settlement.town;
 if(!town||typeof town!=='object'||!goodInt(town.week)||town.week<1||
   !Array.isArray(town.offers)||town.offers.length>4||
   !Array.isArray(town.treatments)||town.treatments.length>names.length)throw Error('Invalid town state');
 const offerIds=new Set();
 for(const offer of town.offers){
  if(!offer||typeof offer.offerId!=='string'||!new RegExp('^w'+town.week+'-o[1-4]$').test(offer.offerId)||
    offerIds.has(offer.offerId)||!HERO_CLASSES.includes(offer.heroClass))throw Error('Invalid Stage Coach offer');
  offerIds.add(offer.offerId);
 }
 const usedServices=new Set(),usedHeroes=new Set();
 for(const t of town.treatments){
  if(!t||!names.includes(t.service)||usedServices.has(t.service)||usedHeroes.has(t.rosterId)||
    !settlement.roster.some(h=>h.rosterId===t.rosterId&&!h.unit.dead))throw Error('Invalid treatment reservation');
  usedServices.add(t.service);usedHeroes.add(t.rosterId);
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
 const town=validateTown(settlement),config=TREATMENTS[service];
 if(!config)throw Error('Unknown stress treatment');
 const hero=settlement.roster.find(h=>h.rosterId===rosterId);
 if(!hero||hero.unit.dead)throw Error('Hero is unavailable');
 if(hero.unit.stress<=0)throw Error('Hero has no stress to treat');
 if(town.treatments.some(t=>t.service===service))throw Error('Treatment room is occupied');
 if(town.treatments.some(t=>t.rosterId===rosterId)||sanitariumUnavailable(settlement,rosterId))throw Error('Hero is already receiving treatment');
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
 const treated=new Set([...town.treatments.map(t=>t.rosterId),...['quirkWard','medicalWard'].map(w=>settlement.sanitarium?.[w]?.rosterId).filter(Boolean)]);
 for(const t of town.treatments){
  const hero=settlement.roster.find(h=>h.rosterId===t.rosterId);
  if(!hero||hero.unit.dead)continue;
  hero.unit.stress=Math.max(0,hero.unit.stress-TREATMENTS[t.service].stressRelief);
  if(hero.unit.stress<100)hero.unit.affliction=null;
 }
 for(const hero of settlement.roster){
  if(hero.unit.dead||deployed.has(hero.rosterId)||treated.has(hero.rosterId))continue;
  hero.unit.stress=Math.max(0,hero.unit.stress-5);
 }
 completeSanitariumWeek(settlement);
 town.week++;
 town.offers=stageCoachOffers(town.week,settlement.roster);
 town.treatments=[];
 expedition.townWeekProcessed=true;
 return true;
}
