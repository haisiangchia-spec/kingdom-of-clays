// Reusable, seeded dungeon-encounter composition scaffold.
// The weights, difficulty labels, groupings and threat points below are
// ORIGINAL Kingdom of Clays campaign fixtures, not verified DD1 spawn tables.
// Every combatant is from the source-audited Cutthroat/Defender/Arbalist set.
import {ENEMY_PROFILES} from './enemy-roster.js';

export const ENCOUNTER_DIFFICULTIES=Object.freeze(['scout','patrol','gauntlet']);
const TEMPLATES=Object.freeze({
  shieldline:Object.freeze(['cryptDefender','cryptDefender','cryptArbalist']),
  cutthroatRaid:Object.freeze(['duelist','cryptDefender','cryptArbalist']),
  ambush:Object.freeze(['cryptDefender','duelist','cryptArbalist']),
  shieldwall:Object.freeze(['cryptDefender','cryptDefender','cryptArbalist','cryptArbalist']),
  mixedRaid:Object.freeze(['duelist','cryptDefender','cryptArbalist','cryptArbalist']),
  vanguard:Object.freeze(['cryptDefender','duelist','cryptArbalist','cryptArbalist']),
  cutthroatPair:Object.freeze(['duelist','duelist','cryptArbalist','cryptArbalist'])
});
export const ENCOUNTER_TEMPLATES=TEMPLATES;

// Relative weights represent deliberate Clays design. Difficulty controls
// the number/composition of foes rather than silently changing DD1 stats.
export const ENCOUNTER_TABLES=Object.freeze({
  scout:Object.freeze([{id:'shieldline',weight:5},{id:'cutthroatRaid',weight:3},{id:'ambush',weight:2}]),
  patrol:Object.freeze([{id:'shieldline',weight:1},{id:'cutthroatRaid',weight:1},{id:'shieldwall',weight:4},{id:'mixedRaid',weight:3},{id:'vanguard',weight:2}]),
  gauntlet:Object.freeze([{id:'shieldwall',weight:2},{id:'mixedRaid',weight:4},{id:'vanguard',weight:3},{id:'cutthroatPair',weight:1}])
});
export const THREAT_POINTS=Object.freeze({cryptDefender:2,cryptArbalist:2,duelist:3});

function assertTemplate(template){
 if(!Array.isArray(template)||!template.length)throw Error('Encounter must have combatants');
 let slots=0;
 for(let i=0;i<template.length;i++){
   const profile=ENEMY_PROFILES[template[i]];
   if(!profile)throw Error('Unknown encounter enemy: '+template[i]);
   slots+=profile.stats.size??1;
   if(slots>4)throw Error('Encounter exceeds four formation ranks');
   // Only front-capable monsters precede ranged specialists. Every reference
   // monster must enter with at least one legal skill in its starting rank.
   if(template[i]==='cryptArbalist'&&slots<3)throw Error('Arbalist requires rear rank');
   if(template[i]==='cryptDefender'&&slots>4)throw Error('Shieldbearer exceeds formation');
 }
 return slots;
}
export function createEncounterPlan(difficulty='patrol',random=Math.random){
 const table=ENCOUNTER_TABLES[difficulty];
 if(!table)throw Error('Unknown encounter difficulty: '+difficulty);
 const total=table.reduce((sum,x)=>sum+x.weight,0);
 const value=random();
 if(!Number.isFinite(value)||value<0||value>=1)throw Error('Encounter random must be in [0,1)');
 let roll=value*total,choice=table[table.length-1];
 for(const entry of table){roll-=entry.weight;if(roll<0){choice=entry;break;}}
 const profiles=TEMPLATES[choice.id];
 const slots=assertTemplate(profiles);
 return {
   difficulty,template:choice.id,profiles:[...profiles],
   slots,threat:profiles.reduce((sum,id)=>sum+THREAT_POINTS[id],0),
   source:'clays-provisional-encounter-table'
 };
}
export function spawnEncounterPlan(unitFactory,plan){
 assertTemplate(plan.profiles);
 return plan.profiles.map((profileId,i)=>{
   const profile=ENEMY_PROFILES[profileId];
   // Temporary Champion scaling for Apprentice support monsters in the Warrens.
   // These are NOT source-verified DD1 Champion stat blocks; the Javelineer
   // already has its own Champion profile and must not be scaled again.
   // Champion stats from the official DD1 wiki.gg Swine monster pages.
   const championStats={
    plagueChopper:{hp:41,spd:5,dodge:21.25,prot:33,stunResist:65,blightResist:100,bleedResist:60,debuffResist:55,moveResist:90},
    plagueDrummer:{hp:31,spd:9,dodge:22.5,prot:0,stunResist:55,blightResist:85,bleedResist:65,debuffResist:60,moveResist:70},
    plagueWretch:{hp:25,spd:10,dodge:35,prot:0,stunResist:55,blightResist:85,bleedResist:55,debuffResist:60,moveResist:45},
    plagueSlasher:{hp:16,spd:7,dodge:30,prot:40,stunResist:55,blightResist:85,bleedResist:85,debuffResist:60,moveResist:70}
   };
   const verifiedChampion=plan.region==='plague'&&plan.tier==='champion'&&Object.hasOwn(championStats,profileId);
   const verifiedChampionChopper=verifiedChampion&&profileId==='plagueChopper';
   const championSupport=false;
   const stats=verifiedChampion?{...profile.stats,...championStats[profileId]}:profile.stats;
   const enemy=unitFactory('e'+(i+1),profile.name,'enemy',stats);
   if(verifiedChampion)enemy.tierScaling='dd1-verified-champion-stats';
   if(championSupport){
    enemy.tierScaling='clays-provisional-champion-support';
    // Explicit skill damage ranges bypass actor base DMG in the combat engine.
    enemy.skillDamageBonus=2;
   }
   enemy.enemyProfile=profileId;
   enemy.enemySkills=verifiedChampionChopper?['plague_champion_butcher_cut','plague_champion_ball_chain']:[...profile.skills];
   return enemy;
 });
}
