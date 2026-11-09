// Source-checked level-one DD1 skill definitions, with locked Clays display names.
// Source: darkestdungeon.wiki.gg/wiki/Man-at-Arms and /wiki/Crusader.
// Positions are zero-based front(0) to rear(3). Levels 2–5 remain pending.
// New kinds rely on shared engine effect handlers rather than bespoke skill code.
export const STARTER_CLASS_SKILLS = Object.freeze({
  heavy_slash: {name:'Heavy Slash',classId:'swordsman',source:'Crush',from:[0,1],to:[0,1,2],acc:85,crit:5,mod:0},
  countering_advance: {name:'Countering Advance',classId:'swordsman',source:'Rampart',from:[0,1,2],to:[0,1],acc:90,crit:5,mod:-.60,advance:1,status:{type:'stun',chance:100},moveTarget:{type:'push',distance:1,chance:100}},
  battle_shout: {name:'Battle Shout',classId:'swordsman',source:'Bellow',from:[0,1,2,3],to:[0,1,2,3],kind:'debuffAll',targetMode:'all',acc:90,debuff:{chance:100,turns:3,modifiers:{dodge:-5,speed:-5,critReceivedWhileMarked:5}}},
  guardian_parry: {name:"Guardian's Parry",classId:'swordsman',source:'Defender',from:[0,1,2,3],to:[0,1,2,3],kind:'guard',guardTurns:3,protectBuff:{turns:4,modifiers:{prot:15}}},
  riposte_stance: {name:'Riposte Stance',classId:'swordsman',source:'Retribution',from:[0,1,2],to:[0,1,2],acc:85,crit:2.5,mod:-.75,riposte:true,riposteDuration:3,riposteMod:-.4,riposteAcc:90,markSelf:2},
  swordmasters_orders: {name:"Swordmaster's Orders",classId:'swordsman',source:'Command',from:[0,1,2,3],to:[0,1,2,3],kind:'partyBuff',targetMode:'all',buff:{turns:3,modifiers:{accuracy:5,crit:4,damageWhileGuarded:15}}},
  steadfast_resolve: {name:'Steadfast Resolve',classId:'swordsman',source:'Bolster',from:[0,1,2,3],to:[0,1,2,3],kind:'partyBuff',targetMode:'all',maxUses:1,buff:{turns:999,modifiers:{dodge:5,stressResist:10}}},
  crushing_strike: {name:'Crushing Strike',classId:'warrior',source:'Smite',from:[0,1],to:[0,1],acc:85,crit:0,mod:0,vsTypes:{unholy:.15}},
  sweeping_assault: {name:'Sweeping Assault',classId:'warrior',source:'Zealous Accusation',from:[0,1],to:[0,1],targetMode:'all',acc:85,crit:-4,mod:-.40},
  concussive_blow: {name:'Concussive Blow',classId:'warrior',source:'Stunning Blow',from:[0,1],to:[0,1],acc:90,crit:0,mod:-.5,status:{type:'stun',chance:100}},
  iron_fortress: {name:'Iron Fortress',classId:'warrior',source:'Bulwark of Faith',from:[0,1],to:[0,1],kind:'selfBuff',maxUses:1,torch:24,markSelf:999,buff:{turns:999,modifiers:{prot:20}}},
  warrior_recovery: {name:"Warrior's Recovery",classId:'warrior',source:'Battle Heal',from:[0,1,2,3],to:[0,1,2,3],kind:'heal',min:2,max:3},
  charging_blade: {name:'Charging Blade',classId:'warrior',source:'Holy Lance',from:[2,3],to:[1,2,3],acc:85,crit:6.5,mod:0,advance:1,vsTypes:{unholy:.15}},
  rallying_roar: {name:'Rallying Roar',classId:'warrior',source:'Inspiring Cry',from:[0,1,2,3],to:[0,1,2,3],kind:'stressHeal',min:1,max:1,stressHeal:5,torch:5}
});
export const STARTER_CLASS_KEYS = Object.freeze({
  swordsman:['heavy_slash','countering_advance','battle_shout','guardian_parry','riposte_stance','swordmasters_orders','steadfast_resolve'],
  warrior:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar']
});
