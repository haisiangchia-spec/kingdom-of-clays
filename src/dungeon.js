// Initial Clays dungeon traversal scaffold. Room layout, event odds, and
// travel costs are original fixtures: not yet verified DD1 dungeon rules.
import {makeGeneratedEncounter,rng,status} from './engine.js';

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
 const roll=rng(encounterSeed(dungeon.seed,'hazard:'+edge.id))();
 if(roll>=chance){dungeon.log.push('The party safely passes a suspected trap');return;}
 const victim=dungeon.party.find(u=>!u.dead&&u.hp>0);
 if(!victim)return;
 victim.hp=Math.max(0,victim.hp-2);
 victim.stress=Math.min(200,victim.stress+5);
 if(victim.hp===0)victim.dead=true;
 dungeon.log.push('A hidden trap wounds '+victim.name+' (-2 HP, +5 stress)');
 if(dungeon.party.every(u=>u.dead)){
   dungeon.phase='defeat';
   dungeon.pendingTravel=null;
   dungeon.log.push('The expedition has fallen');
 }
}
const keyFor=(edge,from)=>edge.from===from?edge.to:edge.from;
const copy=x=>structuredClone(x);
function encounterSeed(seed,key){
 let h=(seed>>>0)^0x9e3779b9;
 for(let i=0;i<key.length;i++)h=Math.imul(h^key.charCodeAt(i),16777619)>>>0;
 return h||1;
}
export function createDungeon(seed=1,{difficulty='scout'}={}){
 if(!['scout','patrol','gauntlet'].includes(difficulty))throw Error('Unknown dungeon difficulty');
 const party=makeGeneratedEncounter(seed,difficulty).units.filter(u=>u.side==='hero').map(copy);
 return {seed,difficulty,room:'entrance',visited:['entrance'],cleared:[],corridors:{},party,torch:75,supplies:{torch:3,food:8},
  pendingTravel:null,pendingBattle:null,battleSerial:0,phase:'explore',log:['Entered the Crypt Entrance']};
}
export function adjacentRooms(dungeon){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel)return [];
 return DUNGEON_CORRIDORS.filter(e=>e.from===dungeon.room||e.to===dungeon.room)
  .map(e=>({room:keyFor(e,dungeon.room),corridor:e.id}));
}
export function beginCorridor(dungeon,to){
 if(dungeon.phase!=='explore'||dungeon.pendingTravel)throw Error('Exploration is blocked');
 const edge=DUNGEON_CORRIDORS.find(e=>(e.from===dungeon.room&&e.to===to)||(e.to===dungeon.room&&e.from===to));
 if(!edge)throw Error('Destination is not adjacent');
 dungeon.pendingTravel={from:dungeon.room,to,corridor:edge.id,progress:0,steps:edge.steps};
 dungeon.log.push('Travel towards '+DUNGEON_ROOMS[to].name);
 return dungeon;
}
function startBattle(dungeon,source,difficulty){
 const seed=encounterSeed(dungeon.seed,source+'|'+dungeon.battleSerial++);
 const battle=makeGeneratedEncounter(seed,difficulty);
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
 const trip=dungeon.pendingTravel;
 const edge=DUNGEON_CORRIDORS.find(e=>e.id===trip.corridor);
 trip.progress++;
 dungeon.torch=Math.max(0,dungeon.torch-1); // provisional travel torch cost
 const visited=dungeon.corridors[edge.id]??{traversals:0,encounterCleared:false};
 dungeon.corridors[edge.id]=visited;
 if(trip.progress===1)triggerHazard(dungeon,edge);
 if(dungeon.phase==='defeat')return dungeon;
 if(trip.progress===1&&!visited.encounterCleared){
   const roll=rng(encounterSeed(dungeon.seed,edge.id))();
   const danger=dungeon.torch>=75?.30:dungeon.torch>=25?.40:.55;
   if(edge.forcedEncounter||roll<danger){
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
 }
 return dungeon;
}
export function dungeonBattle(dungeon){return dungeon.pendingBattle?.battle??null;}
