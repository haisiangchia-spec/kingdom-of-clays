// Named Clays encounter regions. Enemy stats/skills are source-audited;
// roster compositions, weights and threat scores are provisional.
import {ENEMY_PROFILES} from './enemy-roster.js';
import {ENEMY_SKILLS} from './enemy-skills.js';
export const DUNGEON_REGIONS=Object.freeze({
 crypt:Object.freeze({name:'Ashen Crypt',description:'Ancient defenders and outlaws'}),
 plague:Object.freeze({name:'Blighted Warrens',description:'Butchers, drummers and disease-bearing wretches'})
});
export const PLAGUE_TEMPLATES=Object.freeze({
 plagueScouts:Object.freeze(['plagueChopper','plagueWretch','plagueDrummer']),
 plagueRaid:Object.freeze(['plagueChopper','plagueChopper','plagueWretch','plagueDrummer']),
 plagueMarch:Object.freeze(['plagueChopper','plagueChopper','plagueDrummer','plagueDrummer']),
 plagueAmbush:Object.freeze(['plagueChopper','plagueWretch','plagueWretch','plagueDrummer'])
});
export const PLAGUE_TABLES=Object.freeze({
 scout:Object.freeze([{id:'plagueScouts',weight:5},{id:'plagueRaid',weight:2}]),
 patrol:Object.freeze([{id:'plagueScouts',weight:2},{id:'plagueRaid',weight:5},{id:'plagueMarch',weight:2}]),
 gauntlet:Object.freeze([{id:'plagueRaid',weight:4},{id:'plagueMarch',weight:3},{id:'plagueAmbush',weight:3}])
});
export const PLAGUE_THREAT=Object.freeze({plagueChopper:3,plagueWretch:2,plagueDrummer:2});
export function createPlagueEncounterPlan(difficulty='patrol',random=Math.random){
 const table=PLAGUE_TABLES[difficulty];
 if(!table)throw Error('Unknown encounter difficulty: '+difficulty);
 const value=random();
 if(!Number.isFinite(value)||value<0||value>=1)throw Error('Encounter random must be in [0,1)');
 const total=table.reduce((n,e)=>n+e.weight,0);
 let roll=value*total,chosen=table[table.length-1];
 for(const entry of table){roll-=entry.weight;if(roll<0){chosen=entry;break;}}
 const profiles=[...PLAGUE_TEMPLATES[chosen.id]];
 const slots=validatePlagueFormation(profiles);
 return {difficulty,region:'plague',template:chosen.id,profiles,slots,
   threat:profiles.reduce((n,id)=>n+PLAGUE_THREAT[id],0),source:'clays-provisional-plague-encounter-table'};
}

// Region-specific room labels share a common layout and room identifiers.
// They are cosmetic; event placement, navigation, and save keys do not change.
export const REGION_ROOM_NAMES=Object.freeze({
 crypt:Object.freeze({
  entrance:'Crypt Entrance',gallery:'Ashen Gallery',watch:'Guard Post',
  vault:'Relic Vault',sanctum:'Forgotten Sanctum'
 }),
 plague:Object.freeze({
  entrance:'Warrens Entrance',gallery:'Fungal Passage',watch:'Butcher Post',
  vault:'Plague Cache',sanctum:'Rotting Shrine'
 })
});
export function regionRoomName(region,roomId){
 const rooms=REGION_ROOM_NAMES[region];
 if(!rooms)throw Error('Unknown dungeon region: '+region);
 if(!Object.hasOwn(rooms,roomId))throw Error('Unknown dungeon room: '+roomId);
 return rooms[roomId];
}

export const REGION_CURIOS=Object.freeze({
 crypt:Object.freeze({gallery:Object.freeze({name:'Abandoned Reliquary'}),vault:Object.freeze({name:'Sealed Urn'})}),
 plague:Object.freeze({gallery:Object.freeze({name:'Spore-Covered Cache'}),vault:Object.freeze({name:'Diseased Offering'})})
});
export function regionCurio(region,roomId){
 const curios=REGION_CURIOS[region];
 if(!curios)throw Error('Unknown dungeon region: '+region);
 return curios[roomId]??null;
}

// Original Clays exploration modifiers, not verified DD1 trap statistics.
export const REGION_HAZARDS=Object.freeze({
 crypt:Object.freeze({name:'Hidden Trap',damage:2,stress:5}),
 plague:Object.freeze({name:'Spore Snare',damage:2,stress:7})
});
export function regionHazard(region){
 const hazard=REGION_HAZARDS[region];
 if(!hazard)throw Error('Unknown dungeon region: '+region);
 return hazard;
}

// Check the actual formation footprint and every starting monster's legal
// action. These rank restrictions are engine ability definitions, not guessed
// region spawn probabilities.
export function validatePlagueFormation(profiles){
 if(!Array.isArray(profiles)||profiles.length<1)throw Error('Invalid plague formation');
 let slots=0;
 for(const id of profiles){
  const profile=ENEMY_PROFILES[id];
  if(!profile||!Object.hasOwn(PLAGUE_THREAT,id))throw Error('Unknown plague enemy: '+id);
  const size=profile.stats.size??1;
  if(!Number.isInteger(size)||size<1||slots+size>4)throw Error('Invalid plague formation');
  const occupied=Array.from({length:size},(_,i)=>slots+i);
  if(!profile.skills.some(key=>{
   const skill=ENEMY_SKILLS[key];
   return skill&&Array.isArray(skill.from)&&occupied.some(rank=>skill.from.includes(rank));
  }))throw Error('Plague enemy has no legal starting skill: '+id);
  slots+=size;
 }
 return slots;
}
