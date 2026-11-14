// Kingdom of Clays prototype enemy profile catalog.
// These values are distinct test fixtures, NOT source-verified Darkest Dungeon 1 statistics.
// The unit factory is injected to keep this module independent of the combat engine.
export const ENEMY_PROFILES=Object.freeze({
  swordsman:Object.freeze({name:'Skeleton Swordsman',stats:Object.freeze({
    hp:16,spd:2,dodge:5,prot:0,dmgMin:4,dmgMax:8,
    stunResist:25,bleedResist:35,blightResist:15,moveResist:20,debuffResist:20,
    types:['unholy']
  }),skills:['skeleton_cleaver','skeleton_guard_break']}),
  archer:Object.freeze({name:'Skeleton Archer',stats:Object.freeze({
    hp:14,spd:4,dodge:8,prot:0,dmgMin:3,dmgMax:7,
    stunResist:20,bleedResist:20,blightResist:10,moveResist:15,debuffResist:20,
    types:['unholy']
  }),skills:['skeleton_bone_arrow','skeleton_pin_arrow']}),
  mage:Object.freeze({name:'Skeleton Court Mage',stats:Object.freeze({
    hp:13,spd:5,dodge:9,prot:0,dmgMin:2,dmgMax:5,
    stunResist:35,bleedResist:15,blightResist:45,moveResist:25,debuffResist:30,
    types:['unholy']
  }),skills:['court_curse','court_blight']}),
  // Outlaw Duelist is a Kingdom of Clays reskin of the DD1 Veteran
  // Brigand Cutthroat for a source-grounded enemy-AI reference encounter.
  duelist:Object.freeze({name:'Outlaw Duelist',stats:Object.freeze({
    hp:17,spd:4,dodge:11.25,prot:25,dmgMin:4,dmgMax:8,
    stunResist:45,bleedResist:40,blightResist:40,moveResist:45,debuffResist:35,
    types:['human']
  }),skills:['duelist_sweep','duelist_uppercut','duelist_shank','duelist_poke']}),
  emperor:Object.freeze({name:'Goblin Emperor',stats:Object.freeze({
    size:3,actionsPerRound:2,hp:96,spd:2,dodge:3,prot:15,dmgMin:7,dmgMax:13,
    stunResist:70,bleedResist:60,blightResist:50,moveResist:80,debuffResist:60,
    types:['human']
  }),skills:['emperor_slam','emperor_roar','emperor_call']})
});

export const ENCOUNTER_PRESETS=Object.freeze({
  standard:Object.freeze(['swordsman','swordsman','archer','mage']),
  rearguard:Object.freeze(['swordsman','archer','archer','mage']),
  curseCourt:Object.freeze(['swordsman','archer','mage','mage']),
  outlawPatrol:Object.freeze(['duelist','swordsman','archer','mage'])
});

export function spawnProfileEnemy(unitFactory,id,profileId){
  const profile=ENEMY_PROFILES[profileId];
  if(!profile)throw Error('Unknown enemy profile: '+profileId);
  const unit=unitFactory(id,profile.name,'enemy',profile.stats);
  unit.enemyProfile=profileId;
  unit.enemySkills=[...profile.skills]; // per-instance so duplicates remain independent
  return unit;
}
export function makeEnemyFormation(unitFactory,preset='standard'){
  const profileIds=ENCOUNTER_PRESETS[preset];
  if(!profileIds)throw Error('Unknown encounter preset: '+preset);
  return profileIds.map((profile,i)=>spawnProfileEnemy(unitFactory,'e'+(i+1),profile));
}
