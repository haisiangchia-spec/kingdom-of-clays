// Kingdom of Clays Spiritbound (base DD1 Abomination), LEVEL ONE only.
// Source: https://darkestdungeon.wiki.gg/wiki/Abomination_(Darkest_Dungeon)
// One shared Transform skill, three human skills, three beast skills.
export const SPIRITBOUND_SKILLS=Object.freeze({
 spirit_awakening:{name:'Spirit Awakening',classId:'spiritbound',source:'Transform',from:[0,1,2,3],to:[0,1,2,3],kind:'transform',form:'either',maxUses:2,freeAction:true},
 spirit_chains:{name:'Spirit Chains',classId:'spiritbound',source:'Manacles',form:'human',from:[1,2],to:[0,1,2],acc:95,crit:1,mod:-.60,status:{type:'stun',chance:90}},
 corrupting_essence:{name:'Corrupting Essence',classId:'spiritbound',source:"Beast's Bile",form:'human',from:[1,2],to:[1,2],targetMode:'all',acc:95,crit:2,mod:-.90,status:{type:'blight',chance:100,value:2,turns:3},debuff:{chance:100,turns:3,modifiers:{blightResist:-20}}},
 spiritual_purification:{name:'Spiritual Purification',classId:'spiritbound',source:'Absolution',form:'human',from:[0,1,2,3],to:[0,1,2,3],kind:'selfHealStress',min:3,max:3,stressHeal:7},
 spirit_claw:{name:'Spirit Claw',classId:'spiritbound',source:'Rake',form:'beast',from:[0,1],to:[0,1],targetMode:'all',acc:90,crit:-3,mod:-.50,rakeBonus:15,rakeDuration:4},
 primal_fury:{name:'Primal Fury',classId:'spiritbound',source:'Rage',form:'beast',from:[0,1],to:[0,1,2],acc:85,crit:7.5,mod:0},
 spirit_crush:{name:'Spirit Crush',classId:'spiritbound',source:'Slam',form:'beast',from:[0,1,2],to:[0,1],acc:80,crit:1,mod:-.25,advance:1,moveTarget:{type:'push',distance:2,chance:100},debuff:{chance:100,turns:4,modifiers:{dodge:-10,speed:-2}}}
});
export const SPIRITBOUND_KEYS=Object.freeze(Object.keys(SPIRITBOUND_SKILLS));
