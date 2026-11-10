// Verified DD1 base-game skill progression, keyed by locked Kingdom of Clays IDs.
// Full data is deliberately sparse: only researched levels are usable.
// A patch is merged over its level-one definition without changing ranks or names.
// Sources:
// https://darkestdungeon.wiki.gg/wiki/Man-at-Arms
// https://darkestdungeon.wiki.gg/wiki/Crusader
// https://darkestdungeon.wiki.gg/wiki/Vestal
export const SKILL_UPGRADES = Object.freeze({
  heavy_slash: {
    2:{acc:90,crit:6},3:{acc:95,crit:7},4:{acc:100,crit:8},5:{acc:105,crit:9}
  },
  countering_advance:{
    2:{acc:95,crit:6,status:{chance:110},moveTarget:{chance:110}},
    3:{acc:100,crit:7,status:{chance:120},moveTarget:{chance:120}},
    4:{acc:105,crit:8,status:{chance:130},moveTarget:{chance:130}},
    5:{acc:110,crit:9,status:{chance:140},moveTarget:{chance:140}}
  },
  crushing_strike:{
    2:{acc:90,crit:1,vsTypes:{unholy:.20}},
    3:{acc:95,crit:2,vsTypes:{unholy:.25}},
    4:{acc:100,crit:3,vsTypes:{unholy:.30}},
    5:{acc:105,crit:4,vsTypes:{unholy:.35}}
  },
  greater_heal:{
    2:{min:5,max:6},3:{min:6,max:7},4:{min:7,max:8},5:{min:8,max:9}
  },
  group_healing:{
    2:{min:2,max:3},3:{min:3,max:3},4:{min:3,max:4},5:{min:4,max:5}
  },
  // Swordsman / Man-at-Arms
  battle_shout:{
    2:{acc:95,debuff:{chance:110,modifiers:{dodge:-6,speed:-5,critReceivedWhileMarked:5}}},
    3:{acc:100,debuff:{chance:120,modifiers:{dodge:-7,speed:-6,critReceivedWhileMarked:5}}},
    4:{acc:105,debuff:{chance:130,modifiers:{dodge:-8,speed:-6,critReceivedWhileMarked:5}}},
    5:{acc:110,debuff:{chance:140,modifiers:{dodge:-10,speed:-7,critReceivedWhileMarked:5}}}
  },
  guardian_parry:{
    2:{protectBuff:{modifiers:{prot:18}}},
    3:{protectBuff:{modifiers:{prot:22}}},
    4:{protectBuff:{modifiers:{prot:26}}},
    5:{protectBuff:{modifiers:{prot:30}}}
  },
  riposte_stance:{
    2:{acc:90,crit:3.5,riposteMod:-.35,riposteCrit:1},
    3:{acc:95,crit:4.5,riposteMod:-.30,riposteCrit:2},
    4:{acc:100,crit:5.5,riposteMod:-.25,riposteCrit:3},
    5:{acc:105,crit:6.5,riposteMod:-.20,riposteCrit:4}
  },
  swordmasters_orders:{
    2:{buff:{modifiers:{accuracy:6,crit:5,damageWhileGuarded:17}}},
    3:{buff:{modifiers:{accuracy:7,crit:6,damageWhileGuarded:20}}},
    4:{buff:{modifiers:{accuracy:8,crit:7,damageWhileGuarded:22}}},
    5:{buff:{modifiers:{accuracy:10,crit:8,damageWhileGuarded:25}}}
  },
  steadfast_resolve:{
    2:{buff:{modifiers:{dodge:6,stressResist:10}}},
    3:{buff:{modifiers:{dodge:7,stressResist:15}}},
    4:{buff:{modifiers:{dodge:8,stressResist:15}}},
    5:{buff:{modifiers:{dodge:10,stressResist:20}}}
  },
  // Warrior / Crusader
  sweeping_assault:{
    2:{acc:90,crit:-3},3:{acc:95,crit:-2},4:{acc:100,crit:-1},5:{acc:105,crit:0}
  },
  concussive_blow:{
    2:{acc:95,crit:1,status:{chance:110}},
    3:{acc:100,crit:2,status:{chance:120}},
    4:{acc:105,crit:3,status:{chance:130}},
    5:{acc:110,crit:4,status:{chance:140}}
  },
  iron_fortress:{
    2:{buff:{modifiers:{prot:22}}},
    3:{buff:{modifiers:{prot:25}}},
    4:{buff:{modifiers:{prot:28}}},
    5:{buff:{modifiers:{prot:30}}}
  },
  warrior_recovery:{
    2:{min:3,max:3},3:{min:3,max:4},4:{min:4,max:5},5:{min:5,max:6}
  },
  charging_blade:{
    2:{acc:90,crit:7.5,vsTypes:{unholy:.20}},
    3:{acc:95,crit:8.5,vsTypes:{unholy:.25}},
    4:{acc:100,crit:9.5,vsTypes:{unholy:.30}},
    5:{acc:105,crit:10.5,vsTypes:{unholy:.35}}
  },
  rallying_roar:{
    2:{min:1,max:1,stressHeal:5,torch:6},
    3:{min:1,max:2,stressHeal:6,torch:7},
    4:{min:1,max:2,stressHeal:7,torch:8},
    5:{min:2,max:2,stressHeal:8,torch:10}
  },
  // Priest / Vestal
  sacred_strike:{
    2:{acc:90,crit:1,vsTypes:{unholy:.20}},
    3:{acc:95,crit:2,vsTypes:{unholy:.25}},
    4:{acc:100,crit:3,vsTypes:{unholy:.30}},
    5:{acc:105,crit:4,vsTypes:{unholy:.35}}
  },
  divine_judgement:{
    2:{acc:90,crit:6,selfHealOnHit:3},
    3:{acc:95,crit:7,selfHealOnHit:4},
    4:{acc:100,crit:8,selfHealOnHit:4},
    5:{acc:105,crit:9,selfHealOnHit:5}
  },
  radiant_flash:{
    2:{acc:95,crit:6,status:{chance:110}},
    3:{acc:100,crit:7,status:{chance:120}},
    4:{acc:105,crit:8,status:{chance:130}},
    5:{acc:110,crit:9,status:{chance:140}}
  },
  revealing_light:{
    2:{acc:95,torch:6,debuff:{chance:110,modifiers:{dodge:-23}}},
    3:{acc:100,torch:7,debuff:{chance:120,modifiers:{dodge:-25}}},
    4:{acc:105,torch:8,debuff:{chance:130,modifiers:{dodge:-27}}},
    5:{acc:110,torch:10,debuff:{chance:140,modifiers:{dodge:-30}}}
  },
  blessing_strike:{
    2:{acc:90,crit:2,vsTypes:{unholy:.20},selfBuff:{modifiers:{accuracy:7,damage:27}}},
    3:{acc:95,crit:3,vsTypes:{unholy:.25},selfBuff:{modifiers:{accuracy:8,damage:30}}},
    4:{acc:100,crit:4,vsTypes:{unholy:.30},selfBuff:{modifiers:{accuracy:9,damage:33}}},
    5:{acc:105,crit:5,vsTypes:{unholy:.35},selfBuff:{modifiers:{accuracy:10,damage:35}}}
  }
});

export const MAX_SKILL_LEVEL=5;
export function isValidSkillLevel(level){return Number.isInteger(level)&&level>=1&&level<=MAX_SKILL_LEVEL;}
function mergePatch(base,patch){
 const result={...base};
 for(const [key,value] of Object.entries(patch)){
   if(value&&typeof value==='object'&&!Array.isArray(value)){
     result[key]=mergePatch(base[key]??{},value);
   }else result[key]=value;
 }
 return result;
}
export function resolveSkillDefinition(baseSkills,skillId,level=1){
 if(!isValidSkillLevel(level))throw new RangeError('Skill level must be an integer from 1 to 5');
 const base=baseSkills[skillId];
 if(!base)throw new Error('Unknown skill: '+skillId);
 if(level===1)return base;
 const patch=SKILL_UPGRADES[skillId]?.[level];
 if(!patch)throw new Error('Unverified skill upgrade: '+skillId+' level '+level);
 return mergePatch(base,patch);
}
export function availableVerifiedLevels(skillId){
 return [1,2,3,4,5].filter(level=>level===1||Boolean(SKILL_UPGRADES[skillId]?.[level]));
}
export function equipVerifiedSkillLevel(actor,skillId,level,baseSkills){
 const definition=resolveSkillDefinition(baseSkills,skillId,level);
 if(actor.classId!==definition.classId)throw new Error('Skill does not belong to '+actor.classId);
 actor.skillLevels??={};
 actor.skillLevels[skillId]=level;
 return definition;
}
