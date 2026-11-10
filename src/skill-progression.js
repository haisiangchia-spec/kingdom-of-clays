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
