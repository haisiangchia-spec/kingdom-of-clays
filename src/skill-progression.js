// Verified DD1 base-game skill progression, keyed by locked Kingdom of Clays IDs.
// Full data is deliberately sparse: only researched levels are usable.
// A patch is merged over its level-one definition without changing ranks or names.
// Sources:
// https://darkestdungeon.wiki.gg/wiki/Man-at-Arms
// https://darkestdungeon.wiki.gg/wiki/Crusader
// https://darkestdungeon.wiki.gg/wiki/Vestal
import {THIRD_PROGRESSION_UPGRADES} from './skill-upgrades-batch3.js';
import {FOURTH_PROGRESSION_UPGRADES} from './skill-upgrades-batch4.js';
import {FINAL_PROGRESSION_UPGRADES} from './skill-upgrades-batch5.js';
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
  },
  // Hunter / Arbalest — DD1 original combat skill tables.
  eagle_eye_shot:{
    2:{acc:100,crit:6,vsMarked:.60,critVsMarked:10},
    3:{acc:105,crit:7,vsMarked:.70,critVsMarked:11},
    4:{acc:110,crit:8,vsMarked:.80,critVsMarked:12},
    5:{acc:115,crit:9,vsMarked:1.00,critVsMarked:13}
  },
  arrow_barrage:{
    2:{acc:100,crit:-9,debuff:{chance:110,modifiers:{accuracy:-16,crit:-16}}},
    3:{acc:105,crit:-8,debuff:{chance:120,modifiers:{accuracy:-17,crit:-17}}},
    4:{acc:110,crit:-7,debuff:{chance:130,modifiers:{accuracy:-18,crit:-18}}},
    5:{acc:115,crit:-6,debuff:{chance:140,modifiers:{accuracy:-20,crit:-19}}}
  },
  hunters_mark:{
    2:{acc:105,debuff:{chance:110,modifiers:{dodge:-22}}},
    3:{acc:110,debuff:{chance:120,modifiers:{dodge:-25}}},
    4:{acc:115,debuff:{chance:130,modifiers:{dodge:-27}}},
    5:{acc:120,debuff:{chance:140,modifiers:{dodge:-30}}}
  },
  entangling_shot:{
    2:{acc:100,crit:3,moveTarget:{chance:85}},
    3:{acc:105,crit:4,moveTarget:{chance:95}},
    4:{acc:110,crit:5,moveTarget:{chance:105}},
    5:{acc:115,crit:6,moveTarget:{chance:105}}
  },
  instinctive_shot:{
    2:{acc:80,crit:1,selfBuff:{modifiers:{speed:3}}},
    3:{acc:85,crit:2,selfBuff:{modifiers:{speed:4}}},
    4:{acc:90,crit:3,selfBuff:{modifiers:{speed:4}}},
    5:{acc:95,crit:4,selfBuff:{modifiers:{speed:5}}}
  },
  field_dressing:{
    2:{min:3,max:3,afterHealBuff:{modifiers:{healingReceived:24}}},
    3:{min:3,max:4,afterHealBuff:{modifiers:{healingReceived:28}}},
    4:{min:4,max:4,afterHealBuff:{modifiers:{healingReceived:33}}},
    5:{min:4,max:5,afterHealBuff:{modifiers:{healingReceived:38}}}
  },
  signal_arrow:{
    2:{acc:100,torch:4,stressHeal:2,stressHealChance:60},
    3:{acc:105,torch:5,stressHeal:2,stressHealChance:67},
    4:{acc:110,torch:6,stressHeal:3,stressHealChance:60},
    5:{acc:115,torch:7,stressHeal:3,stressHealChance:67}
  },
  // Thief / Grave Robber
  armour_piercing_stab:{
    2:{acc:95,crit:2},3:{acc:100,crit:3},4:{acc:105,crit:4},5:{acc:110,crit:5}
  },
  shadow_lunge:{
    2:{acc:100,crit:9,vsBlighted:.23},
    3:{acc:105,crit:10,vsBlighted:.26},
    4:{acc:110,crit:11,vsBlighted:.29},
    5:{acc:115,crit:12,vsBlighted:.33}
  },
  twin_dagger_flurry:{
    2:{acc:95,crit:-4,debuff:{chance:110,modifiers:{bleedResist:-23}}},
    3:{acc:100,crit:-3,debuff:{chance:120,modifiers:{bleedResist:-26}}},
    4:{acc:105,crit:-2,debuff:{chance:130,modifiers:{bleedResist:-30}}},
    5:{acc:110,crit:-1,debuff:{chance:140,modifiers:{bleedResist:-33}}}
  },
  vanishing_step:{
    2:{buffs:[{turns:2,modifiers:{damage:85,crit:5}},{turns:4,modifiers:{dodge:11}}]},
    3:{buffs:[{turns:2,modifiers:{damage:90,crit:6}},{turns:4,modifiers:{dodge:12}}]},
    4:{buffs:[{turns:2,modifiers:{damage:95,crit:7}},{turns:4,modifiers:{dodge:13}}]},
    5:{buffs:[{turns:2,modifiers:{damage:100,crit:8}},{turns:4,modifiers:{dodge:15}}]}
  },
  precision_throw:{
    2:{acc:95,crit:9,vsMarked:.28,vsBlighted:.23,selfBuff:{modifiers:{accuracy:6}}},
    3:{acc:100,crit:10,vsMarked:.32,vsBlighted:.26,selfBuff:{modifiers:{accuracy:7}}},
    4:{acc:105,crit:11,vsMarked:.36,vsBlighted:.29,selfBuff:{modifiers:{accuracy:8}}},
    5:{acc:110,crit:12,vsMarked:.40,vsBlighted:.33,selfBuff:{modifiers:{accuracy:10}}}
  },
  venom_needle:{
    2:{acc:100,crit:8.5,status:{chance:110,value:3},debuff:{chance:110,modifiers:{blightResist:-23}}},
    3:{acc:105,crit:9.5,status:{chance:120,value:3},debuff:{chance:120,modifiers:{blightResist:-26}}},
    4:{acc:110,crit:10.5,status:{chance:130,value:3},debuff:{chance:130,modifiers:{blightResist:-30}}},
    5:{acc:115,crit:11.5,status:{chance:140,value:4},debuff:{chance:140,modifiers:{blightResist:-33}}}
  },
  antidote_preparation:{
    2:{buff:{modifiers:{dodge:10,speed:2}}},
    3:{buff:{modifiers:{dodge:11,speed:3}}},
    4:{buff:{modifiers:{dodge:12,speed:3}}},
    5:{buff:{modifiers:{dodge:13,speed:4}}}
  },
  // Mage / Plague Doctor
  corrosive_bolt:{
    2:{acc:100,crit:6,status:{chance:110,value:5},debuff:{chance:110,modifiers:{accuracy:-5}}},
    3:{acc:105,crit:7,status:{chance:120,value:6},debuff:{chance:120,modifiers:{accuracy:-6}}},
    4:{acc:110,crit:8,status:{chance:130,value:6},debuff:{chance:130,modifiers:{accuracy:-6}}},
    5:{acc:115,crit:9,status:{chance:140,value:7},debuff:{chance:140,modifiers:{accuracy:-7}}}
  },
  toxic_explosion:{
    2:{acc:100,crit:1,status:{chance:110,value:4}},
    3:{acc:105,crit:2,status:{chance:120,value:5}},
    4:{acc:110,crit:3,status:{chance:130,value:5}},
    5:{acc:115,crit:4,status:{chance:140,value:6}}
  },
  blinding_mist:{
    2:{acc:100,status:{chance:110}},
    3:{acc:105,status:{chance:120}},
    4:{acc:110,status:{chance:130}},
    5:{acc:115,status:{chance:140}}
  },
  arcane_blade:{
    2:{acc:90,crit:6,status:{chance:110,value:2}},
    3:{acc:95,crit:7,status:{chance:120,value:3}},
    4:{acc:100,crit:8,status:{chance:130,value:3}},
    5:{acc:105,crit:9,status:{chance:140,value:4}}
  },
  purification_spell:{
    2:{min:1,max:2},3:{min:2,max:2},4:{min:2,max:3},5:{min:3,max:3}
  },
  empowerment_spell:{
    2:{buff:{modifiers:{damage:21,speed:3}}},
    3:{buff:{modifiers:{damage:22,speed:4}}},
    4:{buff:{modifiers:{damage:23,speed:4}}},
    5:{buff:{modifiers:{damage:25,speed:5}}}
  },
  displacement_spell:{
    2:{acc:100,status:{chance:110},moveTarget:{chance:110}},
    3:{acc:105,status:{chance:120},moveTarget:{chance:120}},
    4:{acc:110,status:{chance:130},moveTarget:{chance:130}},
    5:{acc:115,status:{chance:140},moveTarget:{chance:140}}
  },
  ...THIRD_PROGRESSION_UPGRADES,
  ...FOURTH_PROGRESSION_UPGRADES,
  ...FINAL_PROGRESSION_UPGRADES
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
