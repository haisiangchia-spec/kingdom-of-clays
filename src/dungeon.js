// Initial Clays dungeon traversal scaffold. Room layout, event odds, and
// travel costs are original fixtures: not yet verified DD1 dungeon rules.
import {makeGeneratedEncounter,makeUndeadEncounter,rng,status} from './engine.js';
import {offerLoot,collectLoot,leaveLoot} from './inventory.js';
import {regionCurio,regionRoomName} from './dungeon-regions.js';

export const DUNGEON_ROOMS=Object.freeze({
 entrance:Object.freeze({name:'Crypt Entrance',x:0,y:1,encounter:false}),
 gallery:Object.freeze({name:'Ashen Gallery',x:1,y:1,encounter:false}),
 watch:Object.freeze({name:'Guard Post',x:2,y:0,encounter:true}),
 vault:Object.freeze({name:'Relic Vault',x:2,y:2,encounter:true}),
 sanctum:Object.freeze({name:'Forgotten Sanctum',x:3,y:1,encounter:true,objective:true})
});
export const DUNGEON_CORRIDORS=Object.freeze([
 Object.freeze({id:'entrance-gallery',from:'entrance',to:'gallery',steps:2,forcedEncounter:true}),
 Object.freeze({id:'gallery-watch',from:'gallery',to:'watch',steps:2}),
 Object.freeze({id:'gallery-vault',from:'gallery',to:'vault',steps:2}),
 Object.freeze({id:'watch-sanctum',from:'watch',to:'sanctum',steps:2}),
 Object.freeze({id:'vault-sanctum',from:'vault',to:'sanctum',steps:2})
]);
// Expedition supplies and hazards are Clays scaffolding, NOT DD1 parity data.
export const EXPEDITION_SUPPLIES=Object.freeze({
 torch:Object.freeze({start:3,light:25}),
 food:Object.freeze({start:8,heal:2})
});
export function torchBand(value){
 if(value>=75)return 'radiant';
 if(value>=50)return 'dim';
 if(value>=25)return 'dark';
 return 'pitch-black';
}
export function useProvision(dungeon,type,heroId=null){
 if(dungeon.phase!=='explore')throw Error('Provisions cannot be used during combat');
 if(!EXPEDITION_SUPPLIES[type])throw Error('Unknown provision');
 if((dungeon.supplies?.[type]??0)<=0)throw Error('No '+type+' provisions remaining');
 if(type==='torch'){
   if(dungeon.torch>=100)throw Error('Torchlight is already full');
   dungeon.supplies.torch--;
   dungeon.torch=Math.min(100,dungeon.torch+EXPEDITION_SUPPLIES.torch.light);
   dungeon.log.push('A torch brightens the path');
 }else{
   const hero=dungeon.party.find(u=>u.id===heroId&&!u.dead);
   if(!hero)throw Error('Choose a living hero');
   if(hero.hp>=hero.maxHp)throw Error('Hero is already at full health');
   dungeon.supplies.food--;
   hero.hp=Math.min(hero.maxHp,hero.hp+EXPEDITION_SUPPLIES.food.heal);
   dungeon.log.push(hero.name+' eats food and recovers health');
 }
 return dungeon;
}
function triggerHazard(dungeon,edge){
 // A single deterministic trap check on the first forward passage through
 // each late-stage corridor, with darker light raising its probability.
 if(!['watch-sanctum','vault-sanctum'].includes(edge.id))return;
 const corridor=dungeon.corridors[edge.id];
 if(corridor.hazardChecked)return;
 corridor.hazardChecked=true;
 const chance=dungeon.torch>=75?.15:dungeon.torch>=25?.30:.50;
 const present=corridor.scouted?corridor.trapRevealed:rng(encounterSeed(dungeon.seed,'hazard:'+edge.id))()<chance;
 if(!present){dungeon.log.push('The party safely passes a suspected trap');return;}
 const victim=dungeon.party.find(u=>!u.dead&&u.hp>0);
 if(victim)applyTrapDamage(dungeon,victim);
}
// Optional event-choice layer for expedition clients; original Clays fixtures.
// Scouting previews the existing seeded encounter/trap rolls (not DD1 odds).
export function scoutCorridor(dungeon,to){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel)throw Error('Scouting requires a free room');
 const edge=DUNGEON_CORRIDORS.find(e=>(e.from===dungeon.room&&e.to===to)||(e.to===dungeon.room&&e.from===to));
 if(!edge)throw Error('Destination is not adjacent');
 const record=dungeon.corridors[edge.id]??{traversals:0,encounterCleared:false};
 if(record.scouted)throw Error('Corridor already scouted');
 dungeon.corridors[edge.id]=record;
 dungeon.torch=Math.max(0,dungeon.torch-2); // provisional scouting light cost
 const chance=dungeon.torch>=75?.30:dungeon.torch>=25?.40:.55;
 const trapChance=dungeon.torch>=75?.15:dungeon.torch>=25?.30:.50;
 record.scouted=true;
 record.encounterRevealed=!record.encounterCleared&&(edge.forcedEncounter||rng(encounterSeed(dungeon.seed,edge.id))()<chance);
 record.trapRevealed=['watch-sanctum','vault-sanctum'].includes(edge.id)&&!record.hazardChecked&&rng(encounterSeed(dungeon.seed,'hazard:'+edge.id))()<trapChance;
 dungeon.log.push('Scouted '+edge.id+': '+(record.encounterRevealed?'enemy signs':'no enemy signs')+(record.trapRevealed?', trap detected':''));
 return record;
}
export function disarmTrap(dungeon,heroId){
 const trip=dungeon.pendingTravel;
 if(dungeon.phase!=='explore'||!trip||trip.progress!==0)throw Error('Disarm before moving along the corridor');
 const record=dungeon.corridors[trip.corridor];
 if(!record?.scouted||!record.trapRevealed||record.hazardChecked)throw Error('No revealed trap to disarm');
 const hero=dungeon.party.find(u=>u.id===heroId&&!u.dead);
 if(!hero)throw Error('Choose a living hero');
 const chance=Math.min(.95,.55+Math.max(0,hero.spd??0)*.04);
 const success=rng(encounterSeed(dungeon.seed,'disarm:'+trip.corridor+':'+hero.id))()<chance;
 record.hazardChecked=true;record.trapDisarmed=success;record.trapRevealed=false;
 if(success){
   hero.stress=Math.max(0,hero.stress-3);
   dungeon.log.push(hero.name+' disarms a discovered trap');
 }else{
   applyTrapDamage(dungeon,hero);
   dungeon.log.push(hero.name+' fails to disarm the trap');
 }
 return success;
}
function applyTrapDamage(dungeon,victim){
 victim.hp=Math.max(0,victim.hp-2);
 victim.stress=Math.min(200,victim.stress+5);
 if(victim.hp===0)victim.dead=true;
 dungeon.log.push('A hidden trap wounds '+victim.name+' (-2 HP, +5 stress)');
 if(dungeon.party.every(u=>u.dead)){
   dungeon.phase='defeat';dungeon.pendingTravel=null;
   dungeon.log.push('The expedition has fallen');
 }
}
export function resolveHunger(dungeon,choice){
 if(dungeon.phase!=='explore'||!dungeon.pendingHunger)throw Error('No hunger check pending');
 if(choice!=='eat'&&choice!=='skip')throw Error('Choose eat or skip');
 if(choice==='eat'){
   if((dungeon.supplies.food??0)<4)throw Error('Four food required to feed the party');
   dungeon.supplies.food-=4;
   dungeon.log.push('The party eats four rations and marches onward');
 }else{
   for(const hero of dungeon.party.filter(u=>!u.dead)){
     hero.hp=Math.max(0,hero.hp-3);
     hero.stress=Math.min(200,hero.stress+Math.max(0,15-(dungeon.hungerStressReduction??0)));
     if(hero.hp===0)hero.dead=true;
   }
   dungeon.log.push('The party goes hungry (-3 HP, +15 stress each)');
   if(dungeon.party.every(u=>u.dead)){
     dungeon.phase='defeat';dungeon.pendingTravel=null;
     dungeon.log.push('The expedition has fallen');
   }
 }
 dungeon.pendingHunger=false;
 return dungeon;
}
export const DUNGEON_CURIOS=Object.freeze({
 gallery:Object.freeze({name:'Abandoned Reliquary'}),
 vault:Object.freeze({name:'Sealed Urn'})
});
export function interactCurio(dungeon,choice){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel||dungeon.pendingHunger||dungeon.pendingLoot)throw Error('Cannot inspect curio now');
 const curio=regionCurio(dungeon.region??'crypt',dungeon.room);
 if(!curio||dungeon.curiosUsed.includes(dungeon.room))throw Error('No untouched curio in this room');
 if(!['leave','touch','purify'].includes(choice))throw Error('Unknown curio choice');
 if(choice==='purify'){
   if(dungeon.curioSupplies.holyWater<1)throw Error('No holy water remaining');
   dungeon.curioSupplies.holyWater--;
 }
 dungeon.curiosUsed.push(dungeon.room);
 if(choice==='leave'){dungeon.log.push('The party leaves '+curio.name+' untouched');return dungeon;}
 const safe=choice==='purify'||rng(encounterSeed(dungeon.seed,'curio:'+dungeon.room))()<.50;
 if(safe){
   const amount=choice==='purify'?175:100;
   if(dungeon.interactiveEvents&&dungeon.room==='vault'&&choice==='purify')offerLoot(dungeon,'trinket',1);
   else offerLoot(dungeon,'gold',amount);
   if(!dungeon.interactiveEvents)collectLoot(dungeon); // keep test/API compatibility
   dungeon.log.push(curio.name+' yields treasure');
 }
 else{
   const hero=dungeon.party.find(u=>!u.dead);
   if(hero){hero.stress=Math.min(200,hero.stress+12);dungeon.log.push(curio.name+' causes '+hero.name+' distress (+12 stress)');}
 }
 return dungeon;
}
const keyFor=(edge,from)=>edge.from===from?edge.to:edge.from;
const copy=x=>structuredClone(x);
function encounterSeed(seed,key){
 let h=(seed>>>0)^0x9e3779b9;
 for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619)>>>0;
 return h||1;
}
export function createDungeon(seed=1,{difficulty='scout',region='crypt',interactiveEvents=false,bonuses={},party:rosterParty=null}={}){
 if(!['scout','patrol','gauntlet'].includes(difficulty))throw Error('Unknown dungeon difficulty');
 if(!['crypt','plague'].includes(region))throw Error('Unknown dungeon region');
 const party=rosterParty?rosterParty.map(copy):makeGeneratedEncounter(seed,difficulty,region).units.filter(u=>u.side==='hero').map(copy);
 if(party.length!==4||party.some((u,i)=>u.id!=='h'+(i+1)||u.dead))throw Error('Expedition needs four living ranked heroes');
 const bonusHp=Math.max(0,Math.min(6,Math.trunc(bonuses.heroHp??0)));
 if(!rosterParty)for(const hero of party){hero.maxHp+=bonusHp;hero.hp+=bonusHp;} // roster party already includes Guild bonus
 const bonusFood=Math.max(0,Math.min(6,Math.trunc(bonuses.food??0)));
 const hungerStressReduction=Math.max(0,Math.min(6,Math.trunc(bonuses.hungerStressReduction??0)));
 return {seed,difficulty,region,room:'entrance',visited:['entrance'],cleared:[],corridors:{},party,torch:75,supplies:{torch:3,food:8+bonusFood},hungerStressReduction,
  pendingTravel:null,pendingBattle:null,pendingHunger:false,interactiveEvents,stepsTaken:0,curiosUsed:[],curioSupplies:{holyWater:1},loot:0,inventory:[],pendingLoot:null,battleSerial:0,phase:'explore',log:['Entered '+regionRoomName(region,'entrance')]};
}
export function adjacentRooms(dungeon){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel)return [];
 return DUNGEON_CORRIDORS.filter(e=>e.from===dungeon.room||e.to===dungeon.room)
  .map(e=>({room:keyFor(e,dungeon.room),corridor:e.id}));
}
export function beginCorridor(dungeon,to){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel||dungeon.pendingHunger||dungeon.pendingLoot)throw Error('Exploration is blocked');
 const edge=DUNGEON_CORRIDORS.find(e=>(e.from===dungeon.room&&e.to===to)||(e.to===dungeon.room&&e.from===to));
 if(!edge)throw Error('Destination is not adjacent');
 dungeon.pendingTravel={from:dungeon.room,to,corridor:edge.id,progress:0,steps:edge.steps};
 dungeon.log.push('Travel towards '+DUNGEON_ROOMS[to].name);
 return dungeon;
}
function startBattle(dungeon,source,difficulty){
 const seed=encounterSeed(dungeon.seed,source+'|'+dungeon.battleSerial++);
 const battle=dungeon.region==='plague'?makeGeneratedEncounter(seed,difficulty,'plague'):(source==='room:vault'?makeUndeadEncounter(seed,'blightWretch'):makeGeneratedEncounter(seed,difficulty));
 battle.expeditionEncounter=true; // guards extra disease rolls outside the combat lab
 const enemyUnits=battle.units.filter(u=>u.side==='enemy');
 battle.units=[...dungeon.party.map(copy),...enemyUnits];
 battle.torch=dungeon.torch;
 battle.log.unshift('Dungeon encounter: '+source);
 dungeon.pendingBattle={source,battle};
 dungeon.phase='combat';
 dungeon.log.push('An encounter blocks the way: '+source);
 return dungeon;
}
export function advanceCorridor(dungeon){
 if(dungeon.phase!=='explore'||!dungeon.pendingTravel)throw Error('No traversable corridor');
 if(dungeon.pendingHunger)throw Error('Resolve hunger before advancing');
 if(dungeon.pendingLoot)throw Error('Resolve loot before advancing');
 if(dungeon.interactiveEvents&&dungeon.stepsTaken>0&&dungeon.stepsTaken%4===0&&dungeon.lastHungerStep!==dungeon.stepsTaken){
   dungeon.pendingHunger=true;dungeon.lastHungerStep=dungeon.stepsTaken;
   dungeon.log.push('Hunger: eat four food or risk the consequences');
   return dungeon;
 }
 const trip=dungeon.pendingTravel;
 const edge=DUNGEON_CORRIDORS.find(e=>e.id===trip.corridor);
 trip.progress++;
 dungeon.stepsTaken++;
 dungeon.torch=Math.max(0,dungeon.torch-1); // provisional travel torch cost
 const visited=dungeon.corridors[edge.id]??{traversals:0,encounterCleared:false};
 dungeon.corridors[edge.id]=visited;
 if(trip.progress===1)triggerHazard(dungeon,edge);
 if(dungeon.phase==='defeat')return dungeon;
 if(trip.progress===1&&!visited.encounterCleared){
   const roll=rng(encounterSeed(dungeon.seed,edge.id))();
   const danger=dungeon.torch>=75?.30:dungeon.torch>=25?.40:.55;
   if(visited.scouted?visited.encounterRevealed:(edge.forcedEncounter||roll<danger)){
     startBattle(dungeon,'corridor:'+edge.id,dungeon.difficulty);
     return dungeon;
   }
   visited.encounterCleared=true;
 }
 if(trip.progress>=trip.steps){
   dungeon.room=trip.to;
   dungeon.pendingTravel=null;
   visited.traversals++;
   if(!dungeon.visited.includes(dungeon.room))dungeon.visited.push(dungeon.room);
   dungeon.log.push('Arrived at '+DUNGEON_ROOMS[dungeon.room].name);
   if(DUNGEON_ROOMS[dungeon.room].encounter&&!dungeon.cleared.includes(dungeon.room)){
     startBattle(dungeon,'room:'+dungeon.room,dungeon.difficulty);
   }
 }
 return dungeon;
}
export function resolveDungeonBattle(dungeon){
 if(dungeon.phase!=='combat'||!dungeon.pendingBattle)throw Error('No dungeon combat');
 const result=status(dungeon.pendingBattle.battle);
 if(result==='ongoing')throw Error('Combat has not ended');
 const {source,battle}=dungeon.pendingBattle;
 dungeon.party=battle.units.filter(u=>u.side==='hero').map(copy);
 dungeon.torch=battle.torch;
 dungeon.pendingBattle=null;
 if(result==='defeat'){
   dungeon.phase='defeat';dungeon.log.push('The expedition has fallen');
 }else{
   if(source.startsWith('corridor:')){
     const id=source.slice(9);
     dungeon.corridors[id].encounterCleared=true;
   }else{
     const room=source.slice(5);
     if(!dungeon.cleared.includes(room))dungeon.cleared.push(room);
   }
   dungeon.phase=dungeon.cleared.includes('sanctum')?'victory':'explore';
   dungeon.log.push('Encounter cleared: '+source);
   if(dungeon.interactiveEvents&&dungeon.phase==='explore'){
     // Distinct source-specific rewards; all provisional Clays amounts.
     const drops={
       'room:watch':['crest',3],
       'corridor:gallery-watch':['bust',3],
       'corridor:gallery-vault':['bust',3],
       'room:vault':['gem',2],
       'corridor:watch-sanctum':['deed',2],
       'corridor:vault-sanctum':['deed',2]
     };
     const [kind,quantity]=drops[source]??['gold',50];
     offerLoot(dungeon,kind,quantity);
   }

 }
 return dungeon;
}
export function dungeonBattle(dungeon){return dungeon.pendingBattle?.battle??null;}
