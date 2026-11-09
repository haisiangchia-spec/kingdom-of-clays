// Level-one class ability data for three additional base-game DD1 classes.
// Locked Clays names; source references: darkestdungeon.wiki.gg and
// positvenut.com/dd1/en/heroes/{arbalest,grave_robber,plague_doctor}/
// Rank arrays are zero-based, front (0) to back (3). Further levels pending.
export const SECOND_CLASS_SKILLS = Object.freeze({
 // Arbalest -> Hunter
 eagle_eye_shot:{name:'Eagle-Eye Shot',classId:'hunter',source:'Sniper Shot',from:[1,2,3],to:[1,2,3],acc:95,crit:5,mod:0,vsMarked:.50,critVsMarked:9},
 arrow_barrage:{name:'Arrow Barrage',classId:'hunter',source:'Suppressing Fire',from:[2,3],to:[1,2,3],targetMode:'all',acc:95,mod:-.80,crit:-10,debuff:{chance:100,turns:2,modifiers:{accuracy:-15,crit:-15}}},
 hunters_mark:{name:"Hunter's Mark",classId:'hunter',source:"Sniper's Mark",from:[1,2,3],to:[0,1,2,3],kind:'mark',acc:100,markTurns:3,debuff:{chance:100,turns:2,modifiers:{dodge:-20}}},
 entangling_shot:{name:'Entangling Shot',classId:'hunter',source:'Bola',from:[2,3],to:[0,1],targetMode:'all',acc:95,crit:2,mod:-.50,moveTarget:{type:'push',distance:1,chance:75}},
 instinctive_shot:{name:'Instinctive Shot',classId:'hunter',source:'Blindfire',from:[0,1,2,3],to:[0,1,2,3],kind:'randomAttack',acc:75,mod:-.10,crit:0,selfBuff:{turns:4,modifiers:{speed:3}}},
 field_dressing:{name:'Field Dressing',classId:'hunter',source:'Battlefield Bandage',from:[1,2,3],to:[0,1,2,3],kind:'heal',min:2,max:3,afterHealBuff:{turns:3,modifiers:{healingReceived:20}}},
 signal_arrow:{name:'Signal Arrow',classId:'hunter',source:'Rallying Flare',from:[0,1,2,3],to:[0,1,2,3],kind:'rallyFlare',acc:95,torch:3,stressHeal:1,stressHealChance:60},
 // Grave Robber -> Thief
 armour_piercing_stab:{name:'Armour-Piercing Stab',classId:'thief',source:'Pick to the Face',from:[0,1,2],to:[0,1],acc:90,crit:1,mod:-.15,ignoreProt:true},
 shadow_lunge:{name:'Shadow Lunge',classId:'thief',source:'Lunge',from:[2,3],to:[0,1,2],acc:95,crit:8,mod:.40,advance:2,vsBlighted:.20},
 twin_dagger_flurry:{name:'Twin Dagger Flurry',classId:'thief',source:'Flashing Daggers',from:[1,2,3],to:[1,2],targetMode:'all',acc:90,mod:-.33,crit:-5,debuff:{chance:100,turns:3,modifiers:{bleedResist:-20}}},
 vanishing_step:{name:'Vanishing Step',classId:'thief',source:'Shadow Fade',from:[0,1,2],to:[0,1,2,3],kind:'stealth',selfBack:2,stealthTurns:2,buffs:[{turns:2,modifiers:{damage:80,crit:4}},{turns:4,modifiers:{dodge:10}}]},
 precision_throw:{name:'Precision Throw',classId:'thief',source:'Thrown Dagger',from:[1,2,3],to:[1,2,3],acc:90,mod:-.10,crit:8,vsMarked:.25,vsBlighted:.20,selfBuff:{turns:4,modifiers:{accuracy:5}}},
 venom_needle:{name:'Venom Needle',classId:'thief',source:'Poison Dart',from:[1,2,3],to:[0,1,2,3],acc:95,mod:-.60,crit:7.5,status:{type:'blight',chance:100,value:2,turns:4},debuff:{chance:100,turns:3,modifiers:{blightResist:-20}}},
 antidote_preparation:{name:'Antidote Preparation',classId:'thief',source:'Toxin Trickery',from:[0,1,2,3],to:[0,1,2,3],kind:'selfCleanseBuff',maxUses:1,buff:{turns:999,modifiers:{dodge:9,speed:2}},cleanse:['bleed','blight']},
 // Plague Doctor -> Mage
 corrosive_bolt:{name:'Corrosive Bolt',classId:'mage',source:'Noxious Blast',from:[2,3],to:[0,1],acc:95,mod:-.80,crit:5,status:{type:'blight',chance:100,value:5,turns:3},debuff:{chance:100,turns:3,modifiers:{accuracy:-5}}},
 toxic_explosion:{name:'Toxic Explosion',classId:'mage',source:'Plague Grenade',from:[2,3],to:[2,3],targetMode:'all',acc:95,mod:-.90,crit:0,status:{type:'blight',chance:100,value:4,turns:3}},
 blinding_mist:{name:'Blinding Mist',classId:'mage',source:'Blinding Gas',from:[2,3],to:[2,3],targetMode:'all',acc:95,mod:-1,crit:0,status:{type:'stun',chance:100},maxUses:3},
 arcane_blade:{name:'Arcane Blade',classId:'mage',source:'Incision',from:[0,1,2],to:[0,1],acc:85,mod:0,crit:5,status:{type:'bleed',chance:100,value:2,turns:3}},
 purification_spell:{name:'Purification Spell',classId:'mage',source:'Battlefield Medicine',from:[0,1,2,3],to:[0,1,2,3],kind:'cleanse',cleanse:['bleed','blight'],cleanseSelf:true,min:1,max:1},
 empowerment_spell:{name:'Empowerment Spell',classId:'mage',source:'Emboldening Vapours',from:[0,1,2,3],to:[0,1,2,3],kind:'buff',maxUses:2,buff:{turns:999,modifiers:{damage:20,speed:3}}},
 displacement_spell:{name:'Displacement Spell',classId:'mage',source:'Disorienting Blast',from:[1,2,3],to:[1,2,3],acc:95,mod:-1,crit:0,status:{type:'stun',chance:100},moveTarget:{type:'shuffle',chance:100},clearCorpses:true}
});
export const SECOND_CLASS_KEYS=Object.freeze({
 hunter:['eagle_eye_shot','arrow_barrage','hunters_mark','entangling_shot','instinctive_shot','field_dressing','signal_arrow'],
 thief:['armour_piercing_stab','shadow_lunge','twin_dagger_flurry','vanishing_step','precision_throw','venom_needle','antidote_preparation'],
 mage:['corrosive_bolt','toxic_explosion','blinding_mist','arcane_blade','purification_spell','empowerment_spell','displacement_spell']
});
