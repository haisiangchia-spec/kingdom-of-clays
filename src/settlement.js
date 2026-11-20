// Kingdom of Clays settlement campaign scaffold.
// Upgrade quantities and unlock effects remain prototypes; DD1 town building upgrades spend heirlooms, not gold.
import {createSettlement} from './inventory.js';
import {setupHeroRoster,validateHeroRoster} from './hero-roster.js';
import {initTown,validateTown} from './town-week.js';
import {initSanitarium,validateSanitarium} from './sanitarium.js';

export const SETTLEMENT_FACILITIES=Object.freeze({
 market:Object.freeze({name:'Market',maxLevel:3,baseCost:Object.freeze({gold:0,crests:1,deeds:0}),description:'+2 starting food per level'}),
 guild:Object.freeze({name:'Guild',maxLevel:3,baseCost:Object.freeze({gold:0,crests:0,deeds:1}),description:'+2 starting HP per hero per level'}),
 temple:Object.freeze({name:'Temple',maxLevel:3,baseCost:Object.freeze({gold:0,crests:1,deeds:1}),description:'-2 hunger stress per level'}),
 abbey:Object.freeze({name:'Abbey Recovery',maxLevel:2,baseCost:Object.freeze({gold:0,crests:3,deeds:2}),description:'Cloister treatment stress relief: 45 / 56 / 70'}),
 tavern:Object.freeze({name:'Tavern Recovery',maxLevel:2,baseCost:Object.freeze({gold:0,crests:3,deeds:2}),description:'Bar treatment stress relief: 45 / 56 / 70'})
});
export const STAGE_COACH_UPGRADE_COSTS=Object.freeze({barracks:Object.freeze({gold:0,crests:2,deeds:2}),network:Object.freeze({gold:0,crests:2,deeds:1})});
export function upgradeStageCoach(settlement,track){
 if(!Object.hasOwn(STAGE_COACH_UPGRADE_COSTS,track))throw Error('Unknown Stage Coach upgrade');
 const level=settlement.stageCoach?.[track]??0;
 if(level>=5)throw Error('Stage Coach upgrade at maximum');
 const cost=Object.fromEntries(Object.entries(STAGE_COACH_UPGRADE_COSTS[track]).map(([k,v])=>[k,v*(level+1)]));
 if(Object.entries(cost).some(([k,v])=>(settlement[k]??0)<v))throw Error('Insufficient settlement resources');
 for(const [k,v] of Object.entries(cost))settlement[k]-=v;
 settlement.stageCoach??={barracks:0,network:0};settlement.stageCoach[track]=level+1;
 return {track,level:level+1,cost};
}
export const CAMPAIGN_SAVE_KEY='kingdom-of-clays-campaign-v1';
export const CAMPAIGN_SAVE_VERSION=1;
export const QUEST_TRINKET_IDS=Object.freeze(['ward-charm','ward-charm-common','ward-charm-uncommon','ward-charm-rare','ward-charm-ancestral']);
const safeNumber=x=>Number.isSafeInteger(x)&&x>=0;
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export function createCampaignSettlement(){
 return initSanitarium(initTown(setupHeroRoster({...createSettlement(),busts:0,stageCoach:{barracks:0,network:0},facilities:{market:0,guild:0,temple:0,abbey:0,tavern:0},completedExpeditions:0,campaignVictories:[]})));
}
export function normalizeCampaignSettlement(input){
 if(!isObject(input))throw Error('Invalid settlement');
 const base=createCampaignSettlement();
 for(const key of ['gold','crests','deeds']){
  if(!safeNumber(input[key]))throw Error('Invalid settlement '+key);
  base[key]=input[key];
 }
 if(!Array.isArray(input.trinkets)||input.trinkets.length>1000||input.trinkets.some(x=>!QUEST_TRINKET_IDS.includes(x)))throw Error('Invalid settlement trinkets');
 base.trinkets=[...input.trinkets];
 if(input.busts!==undefined){if(!safeNumber(input.busts))throw Error('Invalid settlement busts');base.busts=input.busts;}
 const coach=input.stageCoach??{barracks:0,network:0};
 if(!isObject(coach)||!['barracks','network'].every(k=>safeNumber(coach[k])&&coach[k]<=5))throw Error('Invalid Stage Coach upgrades');
 base.stageCoach={barracks:coach.barracks,network:coach.network};
 const fields=input.facilities??{};
 if(!isObject(fields))throw Error('Invalid settlement facilities');
 for(const [key,rule] of Object.entries(SETTLEMENT_FACILITIES)){
  const level=fields[key]??0;
  if(!safeNumber(level)||level>rule.maxLevel)throw Error('Invalid facility level');
  base.facilities[key]=level;
 }
 if(input.campaignVictories!==undefined){
  if(!Array.isArray(input.campaignVictories)||input.campaignVictories.some(x=>!['veteran-victory','champion-victory'].includes(x))||new Set(input.campaignVictories).size!==input.campaignVictories.length)throw Error('Invalid campaign victories');
  base.campaignVictories=[...input.campaignVictories];
 }
 if(input.completedExpeditions!==undefined){
  if(!safeNumber(input.completedExpeditions))throw Error('Invalid expedition count');
  base.completedExpeditions=input.completedExpeditions;
 }
 if(input.roster!==undefined){
  base.roster=structuredClone(input.roster);
  base.squad=structuredClone(input.squad);
  base.nextHeroId=input.nextHeroId;
  base.graveyard=structuredClone(input.graveyard??[]);
 }
 if(input.town!==undefined)base.town=structuredClone(input.town);
 if(input.sanitarium!==undefined)base.sanitarium=structuredClone(input.sanitarium);
 validateHeroRoster(base);
 validateTown(base);
 validateSanitarium(base);
 return base;
}
export function nextFacilityCost(settlement,id){
 const facility=SETTLEMENT_FACILITIES[id];
 if(!facility)throw Error('Unknown facility');
 const level=settlement.facilities?.[id]??0;
 if(!safeNumber(level)||level>facility.maxLevel)throw Error('Invalid facility level');
 if(level>=facility.maxLevel)return null;
 const multiplier=level+1;
 return Object.fromEntries(Object.entries(facility.baseCost).map(([kind,amount])=>[kind,amount*multiplier]));
}
export function upgradeFacility(settlement,id){
 const cost=nextFacilityCost(settlement,id);
 if(!cost)throw Error('Facility is already at maximum level');
 if(Object.keys(cost).some(k=>!safeNumber(settlement[k])||settlement[k]<cost[k]))throw Error('Insufficient settlement resources');
 for(const [key,amount] of Object.entries(cost))settlement[key]-=amount;
 settlement.facilities[id]=(settlement.facilities[id]??0)+1;
 return {id,level:settlement.facilities[id],cost};
}
export function expeditionBonuses(settlement){
 const facilities=settlement?.facilities??{};
 return {
  food:2*(facilities.market??0),
  heroHp:2*(facilities.guild??0),
  hungerStressReduction:2*(facilities.temple??0)
 };
}
export function encodeCampaignSave(settlement,expedition){
 const normalized=normalizeCampaignSettlement(settlement);
 if(expedition!==null&&(!isObject(expedition)||!['explore','combat','victory','defeat'].includes(expedition.phase)||!Array.isArray(expedition.party)||!Array.isArray(expedition.visited)||!isObject(expedition.supplies)||!safeNumber(expedition.seed)))throw Error('Invalid expedition save');
 return JSON.stringify({version:CAMPAIGN_SAVE_VERSION,settlement:normalized,expedition});
}
export function decodeCampaignSave(raw){
 let data;
 try{data=JSON.parse(raw);}catch{throw Error('Invalid campaign save JSON');}
 if(!isObject(data)||data.version!==CAMPAIGN_SAVE_VERSION)throw Error('Unsupported campaign save version');
 const settlement=normalizeCampaignSettlement(data.settlement);
 const expedition=data.expedition??null;
 if(expedition!==null){
  if(!isObject(expedition)||!['explore','combat','victory','defeat'].includes(expedition.phase)||!Array.isArray(expedition.party)||!Array.isArray(expedition.visited)||!isObject(expedition.supplies)||!safeNumber(expedition.seed)||typeof expedition.room!=='string')throw Error('Invalid expedition save');
 }
 return {settlement,expedition};
}
