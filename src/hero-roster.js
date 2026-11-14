// Kingdom of Clays persistent roster foundation.
// Classes, recruitment costs, XP and resurrection are CLAYS prototypes,
// not validated DD1 roster/economy values. Resurrection is a deliberate
// user-approved departure from ordinary DD1 permadeath.
import {makeBattle} from './engine.js';

export const ROSTER_CAPACITY=8;
export const RECRUITMENT_COST=0; // DD1 base Stage Coach recruits are free
export const RESURRECTION_COST=250; // user-authorized temple exception
export const HERO_CLASSES=Object.freeze(['Swordsman','Warrior','Hunter','Priest']);
const slots=Object.freeze(['h1','h2','h3','h4']);
const copy=value=>structuredClone(value);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
function template(className){
 const unit=makeBattle(1).units.find(u=>u.side==='hero'&&u.name===className);
 if(!unit)throw Error('Unknown hero class');
 return copy(unit);
}
export function createHeroRoster(){
 return HERO_CLASSES.map((kind,i)=>({
  rosterId:'r'+(i+1),name:kind,heroClass:kind,level:0,xp:0,
  equippedTrinket:null,unit:template(kind)
 }));
}
function checkRoster(settlement){
 if(!Array.isArray(settlement.roster)||settlement.roster.length>ROSTER_CAPACITY)throw Error('Invalid hero roster');
 const seen=new Set();
 for(const h of settlement.roster){
  if(!h||typeof h!=='object'||typeof h.rosterId!=='string'||!/^r[1-9]\d*$/.test(h.rosterId)||
     seen.has(h.rosterId)||!HERO_CLASSES.includes(h.heroClass)||typeof h.name!=='string'||h.name.length>80||
     !integer(h.level)||h.level>6||!integer(h.xp)||h.xp>100000||
     ![null,'ward-charm'].includes(h.equippedTrinket)||!h.unit||typeof h.unit!=='object'||
     !Number.isFinite(h.unit.hp)||!Number.isFinite(h.unit.maxHp)||h.unit.maxHp<1||
     !Number.isFinite(h.unit.stress)||typeof h.unit.dead!=='boolean')throw Error('Invalid hero roster');
  seen.add(h.rosterId);
 }
 if(!Array.isArray(settlement.squad)||settlement.squad.length!==4||
    new Set(settlement.squad.filter(id=>id!==null)).size!==settlement.squad.filter(id=>id!==null).length||
    settlement.squad.some(id=>id!==null&&!seen.has(id)))throw Error('Invalid selected party');
 if(!integer(settlement.nextHeroId)||settlement.nextHeroId<=Math.max(0,...settlement.roster.map(h=>Number(h.rosterId.slice(1)))))throw Error('Invalid next hero ID');
}
export function setupHeroRoster(settlement){
 settlement.roster=createHeroRoster();
 settlement.squad=settlement.roster.map(x=>x.rosterId);
 settlement.nextHeroId=5;
 return settlement;
}
export function validateHeroRoster(settlement){checkRoster(settlement);return settlement;}
export function recruitHero(settlement,className){
 if(!HERO_CLASSES.includes(className))throw Error('Unknown hero class');
 checkRoster(settlement);
 if(settlement.roster.length>=ROSTER_CAPACITY)throw Error('Roster is full');
 if(!integer(settlement.gold)||settlement.gold<RECRUITMENT_COST)throw Error('Insufficient gold to recruit');
 const hero={rosterId:'r'+settlement.nextHeroId,name:className+' '+settlement.nextHeroId,
   heroClass:className,level:0,xp:0,equippedTrinket:null,unit:template(className)};
 settlement.roster.push(hero);settlement.nextHeroId++;
 settlement.gold-=RECRUITMENT_COST;
 return hero;
}
export function dismissHero(settlement,rosterId){
 checkRoster(settlement);
 const index=settlement.roster.findIndex(h=>h.rosterId===rosterId);
 if(index<0)throw Error('Unknown hero');
 const [hero]=settlement.roster.splice(index,1);
 for(let i=0;i<settlement.squad.length;i++)if(settlement.squad[i]===rosterId)settlement.squad[i]=null;
 settlement.graveyard??=[];
 if(hero.unit.dead)settlement.graveyard.push({rosterId:hero.rosterId,name:hero.name,level:hero.level});
 // Any equipped charm is lost with a deceased hero, and returned to storage
 // when a living hero retires. This is provisional until loot recovery parity.
 if(!hero.unit.dead&&hero.equippedTrinket)settlement.trinkets.push(hero.equippedTrinket);
 return hero;
}
export function selectHero(settlement,position,rosterId){
 checkRoster(settlement);
 if(!integer(position)||position>3)throw Error('Invalid party rank');
 const hero=settlement.roster.find(h=>h.rosterId===rosterId);
 if(!hero||hero.unit.dead)throw Error('Hero is unavailable');
 const existing=settlement.squad.indexOf(rosterId);
 if(existing>=0&&existing!==position)throw Error('Hero is already selected');
 settlement.squad[position]=rosterId;
 if(new Set(settlement.squad.filter(id=>id!==null)).size!==settlement.squad.filter(id=>id!==null).length)throw Error('Hero already selected');
 return settlement;
}
export function availableParty(settlement){
 checkRoster(settlement);
 const squad=settlement.squad.map(id=>settlement.roster.find(h=>h.rosterId===id));
 if(squad.some(h=>!h||h.unit.dead))throw Error('Replace dead heroes before starting expedition');
 return squad;
}
export function prepareRosterParty(settlement,bonuses={}){
 const squad=availableParty(settlement);
 const bonus=Math.max(0,Math.min(6,Math.trunc(bonuses.heroHp??0)));
 return squad.map((hero,i)=>{
  const u=copy(hero.unit);
  u.id=slots[i];
  u.name=hero.name;
  u.rosterId=hero.rosterId;
  u.heroClass=hero.heroClass;
  u.rosterLevel=hero.level;
  u.equippedTrinket=hero.equippedTrinket;
  u.maxHp+=bonus;u.hp=Math.min(u.maxHp,u.hp+bonus);
  // No lingering short-lived combat effects or statuses across quests.
  u.dot=[];u.restoration=[];u.effects=[];u.stun=0;u.acted=false;
  u.actionsTaken=0;u.actionsRemaining=u.actionsPerRound??1;
  u.deathDoor=false;
  return u;
 });
}
export function returnPartyToRoster(settlement,expedition){
 checkRoster(settlement);
 if(!['victory','defeat'].includes(expedition.phase))throw Error('Expedition is still active');
 if(expedition.rosterReturned)return false;
 const found=new Set();
 for(const unit of expedition.party){
  const id=unit.rosterId;
  if(!id)continue; // legacy expedition compatibility
  if(found.has(id))throw Error('Repeated roster ID in expedition');
  const hero=settlement.roster.find(h=>h.rosterId===id);
  if(!hero)throw Error('Unknown expedition roster ID');
  found.add(id);
  const copyUnit=copy(unit);
  copyUnit.id=hero.unit.id;
  copyUnit.name=hero.heroClass;
  const originalMax=hero.unit.maxHp;
  const bonusHp=Math.max(0,copyUnit.maxHp-originalMax);
  copyUnit.maxHp=originalMax;
  copyUnit.hp=Math.min(originalMax,Math.max(0,copyUnit.hp-bonusHp));
  copyUnit.dot=[];copyUnit.restoration=[];copyUnit.effects=[];copyUnit.stun=0;
  copyUnit.deathDoor=false;copyUnit.acted=false;
  copyUnit.actionsTaken=0;copyUnit.actionsRemaining=copyUnit.actionsPerRound??1;
  hero.unit=copyUnit;
  if(!hero.unit.dead&&expedition.phase==='victory'){
   hero.xp+=2; // Apprentice short mission: 2 Resolve XP (DD1)
   const thresholds=[0,2,8,14,24,36,48];
   hero.level=thresholds.reduce((lvl,required,i)=>hero.xp>=required?i:lvl,0);
  }
 }
 expedition.rosterReturned=true;
 return true;
}
export function resurrectHero(settlement,rosterId){
 checkRoster(settlement);
 if((settlement.facilities?.temple??0)<1)throw Error('Temple must reach level one');
 const hero=settlement.roster.find(h=>h.rosterId===rosterId);
 if(!hero||!hero.unit.dead)throw Error('Hero is not deceased');
 if(settlement.gold<RESURRECTION_COST)throw Error('Insufficient gold for resurrection');
 settlement.gold-=RESURRECTION_COST;
 hero.unit.dead=false;hero.unit.corpse=false;
 hero.unit.hp=Math.max(1,Math.ceil(hero.unit.maxHp/2));
 hero.unit.stress=100;
 hero.unit.dot=[];hero.unit.restoration=[];hero.unit.effects=[];hero.unit.stun=0;
 hero.unit.deathDoor=false;hero.unit.affliction=null;hero.unit.virtue=null;
 return hero;
}
export function equipTrinket(settlement,rosterId){
 checkRoster(settlement);
 const hero=settlement.roster.find(h=>h.rosterId===rosterId);
 if(!hero||hero.unit.dead)throw Error('Hero cannot equip a trinket');
 if(hero.equippedTrinket)throw Error('Hero already has a trinket');
 const index=settlement.trinkets.indexOf('ward-charm');
 if(index<0)throw Error('No available trinket');
 settlement.trinkets.splice(index,1);
 hero.equippedTrinket='ward-charm';
 return hero;
}
export function unequipTrinket(settlement,rosterId){
 checkRoster(settlement);
 const hero=settlement.roster.find(h=>h.rosterId===rosterId);
 if(!hero||!hero.equippedTrinket)throw Error('Hero has no trinket');
 settlement.trinkets.push(hero.equippedTrinket);
 hero.equippedTrinket=null;
 return hero;
}
