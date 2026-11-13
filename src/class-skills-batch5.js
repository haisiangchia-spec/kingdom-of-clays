// Base-game DD1 level-one integration: Leper, Occultist, Antiquarian.
// Clays names are locked; values are level-one working data under fidelity audit.
// References: darkestdungeon.wiki.gg/wiki/{Leper,Occultist,Antiquarian}
// Ranks are 0-based, from front (0) to rear (3).
export const FIFTH_CLASS_SKILLS=Object.freeze({
 executioners_cleave:{name:"Executioner's Cleave",classId:'cursed_champion',source:'Chop',from:[0,1],to:[0,1],acc:75,crit:2,mod:0},
 greatsword_sweep:{name:'Greatsword Sweep',classId:'cursed_champion',source:'Hew',from:[0,1],to:[0,1],targetMode:'all',acc:75,crit:-4,mod:-.50},
 overwhelming_force:{name:'Overwhelming Force',classId:'cursed_champion',source:'Purge',from:[0],to:[0],acc:85,crit:0,mod:-.90,moveTarget:{type:'push',distance:3,chance:100},clearCorpses:true},
 cursed_strength:{name:'Cursed Strength',classId:'cursed_champion',source:'Revenge',from:[0,1],to:[0,1,2,3],kind:'selfBuff',buff:{turns:999,modifiers:{damage:25,crit:5,accuracy:10,prot:-10,dodge:-10}},maxUses:1},
 unyielding_body:{name:'Unyielding Body',classId:'cursed_champion',source:'Withstand',from:[0,1],to:[0,1,2,3],kind:'selfBuff',buff:{turns:999,modifiers:{prot:20,bleedResist:30,blightResist:30,moveResist:30,debuffResist:30}},markSelf:999,maxUses:1},
 warriors_meditation:{name:"Warrior's Meditation",classId:'cursed_champion',source:'Solemnity',from:[0,1],to:[0,1,2,3],kind:'selfHealStress',min:6,max:6,stressHeal:5,maxUses:2},
 dreadful_presence:{name:'Dreadful Presence',classId:'cursed_champion',source:'Intimidate',from:[0],to:[0,1,2,3],acc:95,crit:0,mod:-.85,ignoreStealth:true,removeStealth:true,debuff:{chance:100,turns:3,modifiers:{damage:-20,speed:-3}},markSelf:4,selfBuff:{turns:4,modifiers:{speed:2}}},
 ritual_dagger:{name:'Ritual Dagger',classId:'hex_mage',source:'Sacrificial Stab',from:[0,1,2],to:[0,1,2],acc:80,crit:9,mod:0,vsTypes:{eldritch:.15}},
 abyssal_barrage:{name:'Abyssal Barrage',classId:'hex_mage',source:'Abyssal Artillery',from:[2,3],to:[2,3],targetMode:'all',acc:85,crit:0,mod:-.33,vsTypes:{eldritch:.15}},
 enfeebling_hex:{name:'Enfeebling Hex',classId:'hex_mage',source:'Weakening Curse',from:[0,1,2,3],to:[0,1,2,3],acc:95,crit:5,mod:-.75,debuff:{chance:100,turns:3,modifiers:{damage:-10,prot:-10}}},
 forbidden_restoration:{name:'Forbidden Restoration',classId:'hex_mage',source:'Wyrd Reconstruction',from:[0,1,2,3],to:[0,1,2,3],kind:'variableHeal',min:0,max:13,bleedChance:60,bleedValue:1,bleedTurns:3},
 curse_of_exposure:{name:'Curse of Exposure',classId:'hex_mage',source:'Vulnerability Hex',from:[0,1,2,3],to:[0,1,2,3],kind:'mark',acc:95,crit:5,mod:-.90,markTurns:3,debuff:{chance:100,turns:3,modifiers:{dodge:-15}}},
 abyssal_grasp:{name:'Abyssal Grasp',classId:'hex_mage',source:'Hands from the Abyss',from:[0,1],to:[0,1,2],acc:90,crit:9,mod:-.50,status:{type:'stun',chance:110},torch:-5},
 shadow_grasp:{name:'Shadow Grasp',classId:'hex_mage',source:"Daemon's Pull",from:[1,2,3],to:[2,3],acc:90,crit:5,mod:-.50,moveTarget:{type:'pull',distance:2,chance:100},clearCorpses:true},
 hidden_dagger:{name:'Hidden Dagger',classId:'treasure_hunter',source:'Nervous Stab',from:[0,1,2,3],to:[0,1,2],acc:85,crit:3,mod:0},
 alchemical_fumes:{name:'Alchemical Fumes',classId:'treasure_hunter',source:'Festering Vapours',from:[0,1,2,3],to:[0,1,2,3],acc:95,crit:0,mod:-.90,status:{type:'blight',chance:100,value:1,turns:3},debuff:{chance:100,turns:3,modifiers:{blightResist:-20}}},
 quick_retreat:{name:'Quick Retreat',classId:'treasure_hunter',source:'Get Down!',from:[0,1,2,3],to:[0,1,2,3],kind:'selfBuff',selfBack:2,buff:{turns:4,modifiers:{dodge:15,blightSkill:10,speed:1}}},
 blinding_powder:{name:'Blinding Powder',classId:'treasure_hunter',source:'Flashpowder',from:[0,1,2,3],to:[0,1,2,3],acc:95,mod:-1,ignoreStealth:true,removeStealth:true,debuff:{chance:100,turns:2,modifiers:{accuracy:-10}}},
 protective_tonic:{name:'Protective Tonic',classId:'treasure_hunter',source:'Fortifying Vapours',from:[0,1],to:[0,1,2,3],kind:'heal',min:1,max:1,afterHealBuff:{turns:3,modifiers:{bleedResist:10,blightResist:10}}},
 evasion_tonic:{name:'Evasion Tonic',classId:'treasure_hunter',source:'Invigorating Vapours',from:[0,1],to:[0,1,2,3],kind:'partyBuff',buff:{turns:3,modifiers:{dodge:3}}},
 take_cover:{name:'Take Cover!',classId:'treasure_hunter',source:'Protect Me',from:[0,1,2,3],to:[0,1,2,3],kind:'reverseGuard',guardTurns:2,markTarget:3,maxUses:3,protectBuff:{turns:4,modifiers:{prot:10,dodge:4}}}
});
export const FIFTH_CLASS_KEYS=Object.freeze({
 cursed_champion:['executioners_cleave','greatsword_sweep','overwhelming_force','cursed_strength','unyielding_body','warriors_meditation','dreadful_presence'],
 hex_mage:['ritual_dagger','abyssal_barrage','enfeebling_hex','forbidden_restoration','curse_of_exposure','abyssal_grasp','shadow_grasp'],
 treasure_hunter:['hidden_dagger','alchemical_fumes','quick_retreat','blinding_powder','protective_tonic','evasion_tonic','take_cover']
});
