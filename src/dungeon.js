// Initial Clays dungeon traversal scaffold. Room layout, event odds, and
// travel costs are original fixtures: not yet verified DD1 dungeon rules.
import {makeGeneratedEncounter,makeUndeadEncounter,rng,status} from './engine.js';
import {offerLoot,collectLoot,leaveLoot,inventoryUsed,INVENTORY_CAPACITY} from './inventory.js';
import {regionCurio,regionRoomName,regionHazard} from './dungeon-regions.js';

export const DUNGEON_ROOMS=Object.freeze({
 entrance:Object.freeze({name:'Crypt Entrance',x:0,y:1,encounter:false}),
 gallery:Object.freeze({name:'Ashen Gallery',x:1,y:1,encounter:false}),
 watch:Object.freeze({name:'Guard Post',x:2,y:0,encounter:true}),
 vault:Object.freeze({name:'Relic Vault',x:2,y:2,encounter:true}),
 sanctum:Object.freeze({name:'Forgotten Sanctum',x:3,y:1,encounter:true,objective:true}),
 outpost:Object.freeze({name:'Forsaken Outpost',x:1,y:3,encounter:true}),
 catacomb:Object.freeze({name:'Collapsed Catacomb',x:3,y:3,encounter:true})
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
 food:Object.freeze({start:8,heal:2}),
 antivenom:Object.freeze({start:4}),
 bandage:Object.freeze({start:3}),
 medicinalHerbs:Object.freeze({start:2}),
 laudanum:Object.freeze({start:2})
});
export function torchBand(value){
 if(value>=75)return 'radiant';
 if(value>=50)return 'dim';
 if(value>=25)return 'dark';
 return 'pitch-black';
}
export function useProvision(dungeon,type,heroId=null){
 if(dungeon.camp)throw Error('Finish camping before exploring');
 if(dungeon.phase!=='explore')throw Error('Provisions cannot be used during combat');
 if(!EXPEDITION_SUPPLIES[type])throw Error('Unknown provision');
 if((dungeon.supplies?.[type]??0)<=0)throw Error('No '+type+' provisions remaining');
 if(type==='torch'){
   if(dungeon.torch>=100)throw Error('Torchlight is already full');
   dungeon.supplies.torch--;
   dungeon.torch=Math.min(100,dungeon.torch+EXPEDITION_SUPPLIES.torch.light);
   dungeon.log.push('A torch brightens the path');
 }else if(type==='food'){
   const hero=dungeon.party.find(u=>u.id===heroId&&!u.dead);
   if(!hero)throw Error('Choose a living hero');
   if(hero.hp>=hero.maxHp)throw Error('Hero is already at full health');
   dungeon.supplies.food--;
   hero.hp=Math.min(hero.maxHp,hero.hp+EXPEDITION_SUPPLIES.food.heal);
   dungeon.log.push(hero.name+' eats food and recovers health');
 }else{
   const hero=dungeon.party.find(u=>u.id===heroId&&!u.dead);
   if(!hero)throw Error('Choose a living hero');
   const status=type==='antivenom'?'blight':type==='bandage'?'bleed':type==='laudanum'?'horror':null;
   const dot=Array.isArray(hero.dot)?hero.dot:[];
   const effects=Array.isArray(hero.effects)?hero.effects:[];
   const matching=status?dot.filter(x=>x.type===status||x.kind===status):effects.filter(x=>x.kind==='debuff');
   if(!matching.length)throw Error('Hero has no matching condition');
   if(status)hero.dot=dot.filter(x=>x.type!==status&&x.kind!==status);
   else hero.effects=effects.filter(x=>x.kind!=='debuff');
   dungeon.supplies[type]--;
   dungeon.log.push(hero.name+' uses '+type+' to remove '+(status??'debuffs'));
 }
 return dungeon;
}
// Expedition purchases are permitted only at the entrance, before moving.
// Prices are provisional Clays values, not verified DD1 shop prices.
export const PROVISION_PRICES=Object.freeze({antivenom:150,bandage:150,medicinalHerbs:200,laudanum:100,torch:75,food:75});
export function purchaseProvision(dungeon,settlement,type,quantity=1){
 if(dungeon.phase!=='explore'||dungeon.room!=='entrance'||dungeon.stepsTaken!==0||dungeon.pendingTravel||dungeon.pendingBattle)
  throw Error('Provisions can only be purchased before departure');
 if(!Object.hasOwn(PROVISION_PRICES,type)||!Number.isInteger(quantity)||quantity<1)
  throw Error('Invalid provision purchase');
 const cost=PROVISION_PRICES[type]*quantity;
 if(!settlement||!Number.isFinite(settlement.gold)||settlement.gold<cost)throw Error('Insufficient gold');
 const old=dungeon.supplies[type]??0;
 dungeon.supplies[type]=old+quantity;
 if(inventoryUsed(dungeon)>INVENTORY_CAPACITY){dungeon.supplies[type]=old;throw Error('Inventory full');}
 settlement.gold-=cost;
 dungeon.log.push('Purchased '+quantity+' '+type+' for '+cost+' gold');
 return dungeon;
}
// DD1-inspired meal and firewood rules. Camping skills and ambushes remain
// separate future mechanics; this API does not claim complete camping parity.
export function campMeal(dungeon,food=4){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel||dungeon.pendingBattle||
    dungeon.room==='entrance'||(!dungeon.cleared.includes(dungeon.room)&&DUNGEON_ROOMS[dungeon.room]?.encounter!==false))
  throw Error('Camping requires a cleared room outside the entrance');
 if(dungeon.pendingLoot||dungeon.pendingHunger||dungeon.camp)throw Error('Resolve pending expedition event or camp before camping');
 if((dungeon.firewood??0)<1)throw Error('No firewood remaining');
 if(![0,2,4,8].includes(food))throw Error('Choose a valid camping meal');
 const living=dungeon.party.filter(hero=>!hero.dead);
 const cost=Math.ceil(food*living.length/4);
 if((dungeon.supplies.food??0)<cost)throw Error('Not enough food for camping');
 dungeon.supplies.food-=cost;
 dungeon.firewood--;
 for(const hero of living){
  if(food===0){hero.hp=Math.max(0,hero.hp-Math.ceil(hero.maxHp*.2));hero.stress=Math.min(200,(hero.stress??0)+15);}
  if(food===4)hero.hp=Math.min(hero.maxHp,hero.hp+Math.ceil(hero.maxHp*.1));
  if(food===8){hero.hp=Math.min(hero.maxHp,hero.hp+Math.ceil(hero.maxHp*.25));hero.stress=Math.max(0,(hero.stress??0)-10);}
 }
 dungeon.torch=100;
 dungeon.camp={respite:12,preventAmbush:false};
 dungeon.log.push('The party camps and consumes '+cost+' food');
 return dungeon;
}
// Camping respite is a separate resource from the meal. Original Clays
// abilities until individual DD1 class camping kits are implemented.
export const CAMP_SKILLS=Object.freeze({
 fieldDressing:Object.freeze({name:'Field Dressing',cost:2,healPercent:15}),
 encouragement:Object.freeze({name:'Encouragement',cost:2,stressHeal:15}),
 sanctuary:Object.freeze({name:'Sanctuary',cost:4,preventAmbush:true}),
});
export function useCampSkill(dungeon,skillId,heroId=null){
 if(!dungeon.camp||dungeon.phase!=='explore')throw Error('No active camp');
 const skill=CAMP_SKILLS[skillId];
 if(!skill)throw Error('Unknown camping skill');
 if(dungeon.camp.respite<skill.cost)throw Error('Not enough respite');
 const target=dungeon.party.find(h=>h.id===heroId&&!h.dead);
 if(!target&&!skill.preventAmbush)throw Error('Choose a living hero');
 if(skill.healPercent)target.hp=Math.min(target.maxHp,target.hp+Math.ceil(target.maxHp*skill.healPercent/100));
 if(skill.stressHeal)target.stress=Math.max(0,(target.stress??0)-skill.stressHeal);
 if(skill.preventAmbush)dungeon.camp.preventAmbush=true;
 dungeon.camp.respite-=skill.cost;
 dungeon.log.push('Camp skill: '+skill.name);
 return dungeon;
}
export function finishCamp(dungeon){
 if(!dungeon.camp||dungeon.phase!=='explore')throw Error('No active camp');
 const camp=dungeon.camp;
 dungeon.camp=null;
 const ambushed=!camp.preventAmbush&&rng(encounterSeed(dungeon.seed,'camp:'+dungeon.room+':'+dungeon.firewood))()<1/3;
 if(ambushed){
  dungeon.log.push('The camp is ambushed in the night');
  startBattle(dungeon,'camp:'+dungeon.room,dungeon.difficulty==='gauntlet'?'patrol':'scout');
 }else dungeon.log.push('The camp rests undisturbed');
 return {ambushed};
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
 if(dungeon.camp)throw Error('Finish camping before exploring');
 if(dungeon.phase!=='explore'||dungeon.pendingTravel)throw Error('Scouting requires a free room');
 const edge=dungeonCorridors(dungeon).find(e=>(e.from===dungeon.room&&e.to===to)||(e.to===dungeon.room&&e.from===to));
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
 if(dungeon.camp)throw Error('Finish camping before exploring');
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
 const hazard=regionHazard(dungeon.region??'crypt');
 victim.hp=Math.max(0,victim.hp-hazard.damage);
 victim.stress=Math.min(200,victim.stress+hazard.stress);
 if(victim.hp===0)victim.dead=true;
 dungeon.log.push(hazard.name+' wounds '+victim.name+' (-'+hazard.damage+' HP, +'+hazard.stress+' stress)');
 if(dungeon.party.every(u=>u.dead)){
   dungeon.phase='defeat';dungeon.pendingTravel=null;
   dungeon.log.push('The expedition has fallen');
 }
}
export function resolveHunger(dungeon,choice){
 if(dungeon.camp)throw Error('Finish camping before exploring');
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
 if(dungeon.camp)throw Error('Finish camping before exploring');
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
// Seeded optional branch: keeps every room connected and the Sanctum reachable.
// The reference five-room map remains unchanged when procedural mode is off.
// Seeded encounter variants for the new side rooms. Deterministic per expedition
// and room, so reloads cannot reroll the encounter tier.
// Clays-original optional room loot, seeded independently from encounter selection.
// A given expedition always awards the same resource type and quantity for each room.
export function optionalRoomReward(dungeon,room){
 if(!['outpost','catacomb'].includes(room))throw Error('Not an optional reward room');
 const roll=rng(encounterSeed(dungeon.seed,'room-loot:'+room))();
 if(room==='outpost')return roll<.5?{kind:'crest',quantity:4}:{kind:'bust',quantity:3};
 return roll<.5?{kind:'gem',quantity:3}:{kind:'deed',quantity:4};
}
export function optionalRoomDifficulty(dungeon,room){
 if(!['outpost','catacomb'].includes(room))throw Error('Not an optional encounter room');
 const roll=rng(encounterSeed(dungeon.seed,'room-variant:'+room))();
 if(room==='outpost')return roll<.25?'gauntlet':'patrol';
 return roll<.25?'patrol':'gauntlet';
}
export function dungeonCorridors(dungeon){
 if(!dungeon.proceduralBranches)return DUNGEON_CORRIDORS;
 // Four connected five-room topologies, selected reproducibly by seed.
 // The entrance-gallery route always exists; both side rooms and the Sanctum remain reachable.
 const alternatives=[
  {id:'entrance-vault',from:'entrance',to:'vault',steps:2},
  {id:'gallery-sanctum',from:'gallery',to:'sanctum',steps:2},
  {id:'entrance-watch',from:'entrance',to:'watch',steps:2},
  DUNGEON_CORRIDORS.find(edge=>edge.id==='vault-sanctum')
 ];
 const choice=alternatives[Math.abs(dungeon.seed)%alternatives.length];
 const edges=DUNGEON_CORRIDORS.filter(edge=>edge.id!=='vault-sanctum').concat([Object.freeze(choice)]);
 if(dungeon.tier==='veteran'||dungeon.tier==='champion')edges.push(Object.freeze({id:'gallery-outpost',from:'gallery',to:'outpost',steps:2}));
 if(dungeon.tier==='champion')edges.push(Object.freeze({id:'outpost-catacomb',from:'outpost',to:'catacomb',steps:2}));
 return Object.freeze(edges);
}
export function createDungeon(seed=1,{difficulty='scout',region='crypt',tier='apprentice',interactiveEvents=false,variableCorridors=false,proceduralBranches=false,bonuses={},party:rosterParty=null}={}){
 if(!['scout','patrol','gauntlet'].includes(difficulty))throw Error('Unknown dungeon difficulty');
 if(!['crypt','plague'].includes(region))throw Error('Unknown dungeon region');
 if(!['apprentice','veteran','champion'].includes(tier))throw Error('Unknown dungeon tier');
 if(region!=='plague'&&tier!=='apprentice')throw Error('Veteran and Champion expeditions are supported only in Blighted Warrens');
 const party=rosterParty?rosterParty.map(copy):makeGeneratedEncounter(seed,difficulty,region,tier).units.filter(u=>u.side==='hero').map(copy);
 if(party.length!==4||party.some((u,i)=>u.id!=='h'+(i+1)||u.dead))throw Error('Expedition needs four living ranked heroes');
 const bonusHp=Math.max(0,Math.min(6,Math.trunc(bonuses.heroHp??0)));
 if(!rosterParty)for(const hero of party){hero.maxHp+=bonusHp;hero.hp+=bonusHp;} // roster party already includes Guild bonus
 const bonusFood=Math.max(0,Math.min(6,Math.trunc(bonuses.food??0)));
 const hungerStressReduction=Math.max(0,Math.min(6,Math.trunc(bonuses.hungerStressReduction??0)));
 const layout=proceduralBranches?dungeonCorridors({seed,proceduralBranches,tier}):DUNGEON_CORRIDORS;
 const lengthBonus=tier==='champion'?2:tier==='veteran'?1:0;
 const corridorSteps=variableCorridors?Object.fromEntries(layout.map(edge=>[edge.id,2+lengthBonus+Math.floor(rng(encounterSeed(seed,'length:'+edge.id))()*3)])):null;
 return {seed,difficulty,region,tier,proceduralBranches,corridorSteps,room:'entrance',visited:['entrance'],cleared:[],corridors:{},party,torch:75,firewood:difficulty==='scout'?0:difficulty==='patrol'?1:2,supplies:{torch:3,food:8+bonusFood,antivenom:0,bandage:0,medicinalHerbs:0,laudanum:0},hungerStressReduction,
  pendingTravel:null,pendingBattle:null,pendingHunger:false,interactiveEvents,stepsTaken:0,curiosUsed:[],curioSupplies:{holyWater:1},loot:0,inventory:[],pendingLoot:null,battleSerial:0,phase:'explore',log:['Entered '+regionRoomName(region,'entrance')]};
}
export function adjacentRooms(dungeon){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel)return [];
 return dungeonCorridors(dungeon).filter(e=>e.from===dungeon.room||e.to===dungeon.room)
  .map(e=>({room:keyFor(e,dungeon.room),corridor:e.id}));
}
export function beginCorridor(dungeon,to){
 if(dungeon.camp)throw Error('Finish camping before exploring');
 if(dungeon.phase!=='explore'||dungeon.pendingTravel||dungeon.pendingHunger||dungeon.pendingLoot)throw Error('Exploration is blocked');
 const edge=dungeonCorridors(dungeon).find(e=>(e.from===dungeon.room&&e.to===to)||(e.to===dungeon.room&&e.from===to));
 if(!edge)throw Error('Destination is not adjacent');
 dungeon.pendingTravel={from:dungeon.room,to,corridor:edge.id,progress:0,steps:dungeon.corridorSteps?.[edge.id]??edge.steps};
 dungeon.log.push('Travel towards '+DUNGEON_ROOMS[to].name);
 return dungeon;
}
function startBattle(dungeon,source,difficulty){
 const seed=encounterSeed(dungeon.seed,source+'|'+dungeon.battleSerial++);
 const roomDanger=source==='room:catacomb'||source==='room:outpost'?optionalRoomDifficulty(dungeon,source.slice(5)):difficulty;
 const battle=dungeon.region==='plague'?makeGeneratedEncounter(seed,roomDanger,'plague',dungeon.tier??'apprentice'):(source==='room:vault'?makeUndeadEncounter(seed,'blightWretch'):makeGeneratedEncounter(seed,roomDanger));
 battle.expeditionEncounter=true; // guards extra disease rolls outside the combat lab
 const enemyUnits=battle.units.filter(u=>u.side==='enemy');
 battle.units=[...dungeon.party.map(copy),...enemyUnits];
 battle.torch=dungeon.torch;
 battle.log.unshift('Dungeon encounter: '+source+(source==='room:outpost'||source==='room:catacomb'?' ('+roomDanger+' encounter)':''));
 dungeon.pendingBattle={source,battle};
 dungeon.phase='combat';
 dungeon.log.push('An encounter blocks the way: '+source);
 return dungeon;
}
export function advanceCorridor(dungeon){
 if(dungeon.camp)throw Error('Finish camping before exploring');
 if(dungeon.phase!=='explore'||!dungeon.pendingTravel)throw Error('No traversable corridor');
 if(dungeon.pendingHunger)throw Error('Resolve hunger before advancing');
 if(dungeon.pendingLoot)throw Error('Resolve loot before advancing');
 if(dungeon.interactiveEvents&&dungeon.stepsTaken>0&&dungeon.stepsTaken%4===0&&dungeon.lastHungerStep!==dungeon.stepsTaken){
   dungeon.pendingHunger=true;dungeon.lastHungerStep=dungeon.stepsTaken;
   dungeon.log.push('Hunger: eat four food or risk the consequences');
   return dungeon;
 }
 const trip=dungeon.pendingTravel;
 const edge=dungeonCorridors(dungeon).find(e=>e.id===trip.corridor);
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
// Ordered checklist for the active contract; safe for older saves without questId.
export function questObjectiveProgress(dungeon){
 const required=['crypt-purge','warrens-containment'].includes(dungeon.questId)?['watch','vault']:
  ['warrens-veteran','warrens-champion'].includes(dungeon.questId)
  ?['watch','vault','sanctum']:['sanctum'];
 return required.map(room=>({room,complete:dungeon.cleared.includes(room)}));
}
// Optional room objectives are tracked separately from the required quest contract.
// They remain optional, so clearing the Sanctum can still finish the expedition.
export function bonusObjectiveProgress(dungeon){
 if(!dungeon.proceduralBranches)return [];
 const rooms=dungeon.tier==='champion'?['outpost','catacomb']:
  dungeon.tier==='veteran'?['outpost']:[];
 return rooms.map(room=>({room,complete:dungeon.cleared.includes(room),
  reward:optionalRoomReward(dungeon,room)}));
}
// Veteran and Champion contracts require clearing the two outposts as well as the shrine.
// Earlier and standalone expeditions retain their original Sanctum victory condition.
export function questObjectiveComplete(dungeon){
 return questObjectiveProgress(dungeon).every(goal=>goal.complete);
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
   if(source.startsWith('camp:')){
     dungeon.log.push('The party survives the nighttime ambush');
   }else if(source.startsWith('corridor:')){
     const id=source.slice(9);
     dungeon.corridors[id].encounterCleared=true;
   }else{
     const room=source.slice(5);
     if(!dungeon.cleared.includes(room))dungeon.cleared.push(room);
   }
   dungeon.phase=questObjectiveComplete(dungeon)?'victory':'explore';
   dungeon.log.push('Encounter cleared: '+source);
   if(dungeon.interactiveEvents&&!source.startsWith('camp:')){
     // Distinct source-specific rewards, including the final victory encounter.
     // All amounts are provisional Clays balancing values.
     const drops={
       'room:watch':['crest',3],
       'corridor:gallery-watch':['bust',3],
       'corridor:gallery-vault':['bust',3],
       'room:vault':['gem',2],
       'corridor:watch-sanctum':['deed',2],
       'corridor:vault-sanctum':['deed',2]
     };
     const reward=source==='room:outpost'||source==='room:catacomb'
      ?optionalRoomReward(dungeon,source.slice(5)):null;
     const [kind,quantity]=reward?[reward.kind,reward.quantity]:(drops[source]??['gold',50]);
     offerLoot(dungeon,kind,quantity);
   }

 }
 return dungeon;
}
export function dungeonBattle(dungeon){return dungeon.pendingBattle?.battle??null;}
