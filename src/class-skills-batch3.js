// Base DD1 level-one ability definitions, with locked Kingdom of Clays display names.
// Sources: darkestdungeon.wiki.gg/wiki/Vestal, /Bounty_Hunter, /Hellion
// All hero/target ranks are zero-based, front-to-back. Higher skill levels pending.
export const THIRD_CLASS_SKILLS=Object.freeze({
 sacred_strike:{name:'Sacred Strike',classId:'priest',source:'Mace Bash',from:[0,1],to:[0,1],acc:85,crit:0,mod:0,vsTypes:{unholy:.15}},
 divine_judgement:{name:'Divine Judgement',classId:'priest',source:'Judgement',from:[2,3],to:[0,1,2,3],acc:85,crit:5,mod:-.25,selfHealOnHit:3},
 radiant_flash:{name:'Radiant Flash',classId:'priest',source:'Dazzling Light',from:[1,2,3],to:[0,1,2],acc:90,crit:5,mod:-.75,torch:6,status:{type:'stun',chance:100}},
 greater_heal:{name:'Greater Heal',classId:'priest',source:'Divine Grace',from:[2,3],to:[0,1,2,3],kind:'heal',min:4,max:5},
 group_healing:{name:'Group Healing',classId:'priest',source:'Divine Comfort',from:[1,2,3],to:[0,1,2,3],kind:'groupHeal',min:1,max:3},
 revealing_light:{name:'Revealing Light',classId:'priest',source:'Illumination',from:[0,1,2],to:[0,1,2,3],acc:90,crit:0,neverCrit:true,mod:-.75,ignoreStealth:true,removeStealth:true,torch:5,debuff:{chance:100,turns:4,modifiers:{dodge:-20}}},
 blessing_strike:{name:'Blessing Strike',classId:'priest',source:'Hand of Light',from:[0,1],to:[1,2,3],acc:85,crit:1,mod:-.50,vsTypes:{unholy:.15},selfBuff:{turns:4,modifiers:{accuracy:6,damage:25}}},
 hunters_execution:{name:"Hunter's Execution",classId:'monster_slayer',source:'Collect Bounty',from:[0,1,2],to:[0,1],acc:85,crit:7,mod:0,vsMarked:.90,vsTypes:{human:.15}},
 identify_weakness:{name:'Identify Weakness',classId:'monster_slayer',source:'Mark for Death',from:[0,1,2,3],to:[0,1,2,3],kind:'mark',acc:100,markTurns:3,debuff:{chance:100,turns:3,modifiers:{prot:-10}},selfBuff:{turns:2,modifiers:{speed:3}}},
 grappling_hook:{name:'Grappling Hook',classId:'monster_slayer',source:'Come Hither',from:[0,1,2,3],to:[2,3],acc:90,crit:0,mod:-.80,markOnHit:2,moveTarget:{type:'pull',distance:2,chance:100}},
 brutal_uppercut:{name:'Brutal Uppercut',classId:'monster_slayer',source:'Uppercut',from:[0,1],to:[0,1],acc:90,crit:0,mod:-.67,status:{type:'stun',chance:100},moveTarget:{type:'push',distance:2,chance:100}},
 flash_bomb:{name:'Flash Bomb',classId:'monster_slayer',source:'Flashbang',from:[1,2,3],to:[1,2,3],acc:95,mod:-1,status:{type:'stun',chance:110},moveTarget:{type:'shuffle',chance:100}},
 finishing_strike:{name:'Finishing Strike',classId:'monster_slayer',source:'Finish Him',from:[0,1,2],to:[0,1,2],acc:85,crit:5,mod:0,vsStunned:.25},
 spiked_trap:{name:'Spiked Trap',classId:'monster_slayer',source:'Caltrops',from:[1,2,3],to:[2,3],acc:90,crit:5,mod:-.95,status:{type:'bleed',chance:100,value:2,turns:3},debuff:{chance:100,turns:3,modifiers:{damageTaken:10,speed:-4}}},
 savage_cleave:{name:'Savage Cleave',classId:'berserker',source:'Wicked Hack',from:[0,1],to:[0,1],acc:85,crit:4,mod:0},
 rising_axe:{name:'Rising Axe',classId:'berserker',source:'Iron Swan',from:[0],to:[3],acc:85,crit:5,mod:0},
 terrifying_war_cry:{name:'Terrifying War Cry',classId:'berserker',source:'Barbaric YAWP!',from:[0,1],to:[0,1],targetMode:'all',acc:95,mod:-1,maxUses:3,status:{type:'stun',chance:110},selfDebuff:{turns:3,modifiers:{damage:-20,speed:-3}}},
 rending_slash:{name:'Rending Slash',classId:'berserker',source:'If It Bleeds',from:[0,1,2],to:[1,2],acc:85,crit:0,mod:-.35,status:{type:'bleed',chance:100,value:2,turns:3}},
 berserkers_charge:{name:"Berserker's Charge",classId:'berserker',source:'Breakthrough',from:[1,2,3],to:[0,1,2],targetMode:'all',acc:85,crit:-1,mod:-.50,advance:1,selfDebuff:{turns:3,modifiers:{damage:-10,speed:-1}}},
 battle_frenzy:{name:'Battle Frenzy',classId:'berserker',source:'Adrenaline Rush',from:[0,1,2,3],to:[0,1,2,3],kind:'selfCleanseBuff',cleanse:['bleed','blight'],min:1,max:1,buff:{turns:4,modifiers:{accuracy:5,damage:20}}},
 bloodletting_blow:{name:'Bloodletting Blow',classId:'berserker',source:'Bleed Out',from:[0],to:[0],acc:85,crit:6,mod:.20,status:{type:'bleed',chance:100,value:3,turns:3},selfDebuff:{turns:3,modifiers:{damage:-20,speed:-3}}}
});
export const THIRD_CLASS_KEYS=Object.freeze({
 priest:['sacred_strike','divine_judgement','radiant_flash','greater_heal','group_healing','revealing_light','blessing_strike'],
 monster_slayer:['hunters_execution','identify_weakness','grappling_hook','brutal_uppercut','flash_bomb','finishing_strike','spiked_trap'],
 berserker:['savage_cleave','rising_axe','terrifying_war_cry','rending_slash','berserkers_charge','battle_frenzy','bloodletting_blow']
});
