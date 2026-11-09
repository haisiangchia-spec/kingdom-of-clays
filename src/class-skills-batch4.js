// DD1 base game, skill level 1, frontmost rank is zero.
// Names are Kingdom of Clays reskins; sources are original DD1 ability names.
// Sources: darkestdungeon.wiki.gg/wiki/{Highwayman,Houndmaster,Jester}_(Darkest_Dungeon).
// Upgrade tiers, camping and item effects are separate future milestones.
export const FOURTH_CLASS_SKILLS=Object.freeze({
 dark_slash:{name:'Dark Slash',classId:'dark_knight',source:'Wicked Slice',from:[0,1,2],to:[0,1],acc:85,crit:5,mod:.15},
 shadow_bolt:{name:'Shadow Bolt',classId:'dark_knight',source:'Pistol Shot',from:[1,2,3],to:[1,2,3],acc:85,crit:7.5,mod:-.15,vsMarked:.25},
 point_blank_burst:{name:'Point-Blank Burst',classId:'dark_knight',source:'Point Blank Shot',from:[0],to:[0],acc:95,crit:5,mod:.50,selfBack:1,moveTarget:{type:'push',distance:1,chance:100}},
 shadow_volley:{name:'Shadow Volley',classId:'dark_knight',source:'Grapeshot Blast',from:[1,2],to:[0,1,2],targetMode:'all',acc:75,crit:-9,mod:-.50,debuff:{chance:100,turns:3,modifiers:{critReceived:4}}},
 focused_assault:{name:'Focused Assault',classId:'dark_knight',source:'Tracking Shot',from:[0,1,2,3],to:[1,2,3],acc:95,crit:0,mod:-.80,ignoreStealth:true,removeStealth:true,maxUses:1,selfBuff:{turns:999,modifiers:{accuracy:6,crit:4,damage:12}}},
 shadowstep_counter:{name:'Shadowstep Counter',classId:'dark_knight',source:"Duelist's Advance",from:[1,2,3],to:[0,1,2],acc:90,crit:5,mod:-.20,advance:1,riposte:true,riposteDuration:3,riposteMod:-.40,riposteAcc:90},
 bleeding_edge:{name:'Bleeding Edge',classId:'dark_knight',source:'Open Vein',from:[0,1,2],to:[0,1],acc:95,crit:0,mod:-.15,status:{type:'bleed',chance:100,value:2,turns:3},debuff:{chance:100,turns:3,modifiers:{bleedResist:-20,speed:-1}}},
 wolfs_assault:{name:"Wolf's Assault",classId:'beastmaster',source:"Hound's Rush",from:[1,2,3],to:[0,1,2,3],acc:85,crit:5,mod:0,vsMarked:.60,vsTypes:{beast:.15},status:{type:'bleed',chance:100,value:1,turns:3}},
 pack_harassment:{name:'Pack Harassment',classId:'beastmaster',source:"Hound's Harry",from:[0,1,2,3],to:[0,1,2,3],targetMode:'all',acc:85,crit:-5,mod:-.75,status:{type:'bleed',chance:110,value:1,turns:3}},
 hunt_command:{name:'Hunt Command',classId:'beastmaster',source:'Target Whistle',from:[0,1,2,3],to:[0,1,2,3],kind:'mark',acc:100,markTurns:3,debuff:{chance:130,turns:4,modifiers:{prot:-20}}},
 comforting_howl:{name:'Comforting Howl',classId:'beastmaster',source:'Cry Havoc',from:[2,3],to:[0,1,2,3],kind:'partyStressChance',stressHeal:2,stressHealChance:66},
 guardian_wolf:{name:'Guardian Wolf',classId:'beastmaster',source:'Guard Dog',from:[0,1,2,3],to:[0,1,2,3],kind:'guard',guardTurns:2,protectBuff:{turns:3,modifiers:{dodge:10}}},
 beasts_recovery:{name:"Beast's Recovery",classId:'beastmaster',source:'Lick Wounds',from:[1,2,3],to:[0,1,2,3],kind:'selfHeal',min:4,max:4},
 staff_strike:{name:'Staff Strike',classId:'beastmaster',source:'Blackjack',from:[0,1],to:[0,1,2],acc:95,crit:5,mod:-.65,status:{type:'stun',chance:110}},
 flourishing_strike:{name:'Flourishing Strike',classId:'bard',source:'Dirk Stab',from:[0,1,2,3],to:[0,1,2],acc:85,crit:5,mod:0,advance:1,bypassGuard:true,finaleBuff:{damage:30}},
 whirling_blades:{name:'Whirling Blades',classId:'bard',source:'Harvest',from:[1,2],to:[1,2],targetMode:'all',acc:90,crit:0,mod:-.50,status:{type:'bleed',chance:100,value:2,turns:3},finaleBuff:{damage:30}},
 grand_finale:{name:'Grand Finale',classId:'bard',source:'Finale',from:[0,1],to:[0,1,2,3],acc:140,crit:5,mod:.50,selfBack:3,maxUses:1,consumeFinale:true,selfDebuff:{turns:999,selfInflicted:true,modifiers:{dodge:-25,speed:-3,stressTaken:100}}},
 heroic_solo:{name:'Heroic Solo',classId:'bard',source:'Solo',from:[2,3],to:[0,1,2,3],targetMode:'all',acc:125,mod:-1,maxUses:2,advance:3,markSelf:3,selfBuff:{turns:4,modifiers:{dodge:20}},finaleBuff:{damage:75,crit:8}},
 cutting_refrain:{name:'Cutting Refrain',classId:'bard',source:'Slice Off',from:[1,2],to:[1,2],acc:95,crit:8,mod:-.33,status:{type:'bleed',chance:100,value:3,turns:3},finaleBuff:{damage:30}},
 song_of_courage:{name:'Song of Courage',classId:'bard',source:'Battle Ballad',from:[2,3],to:[0,1,2,3],kind:'partyBuff',buff:{turns:4,modifiers:{accuracy:5,crit:2,speed:2}},finaleBuff:{damage:30,crit:8}},
 soothing_melody:{name:'Soothing Melody',classId:'bard',source:'Inspiring Tune',from:[2,3],to:[0,1,2,3],kind:'stressOnly',stressHeal:8,stressResist:10,finaleBuff:{damage:30,crit:8}}
});
export const FOURTH_CLASS_KEYS=Object.freeze({
 dark_knight:['dark_slash','shadow_bolt','point_blank_burst','shadow_volley','focused_assault','shadowstep_counter','bleeding_edge'],
 beastmaster:['wolfs_assault','pack_harassment','hunt_command','comforting_howl','guardian_wolf','beasts_recovery','staff_strike'],
 bard:['flourishing_strike','whirling_blades','grand_finale','heroic_solo','cutting_refrain','song_of_courage','soothing_melody']
});
