// Kingdom of Clays provisional undead encounter abilities.
// All statistics and names are test-fixture values, not verified DD1 monster data.
// Ranks are zero-based, front (0) to rear (3).
export const ENEMY_SKILLS=Object.freeze({
  skeleton_cleaver:{name:'Rustblade Cleave',from:[0,1],to:[0,1],acc:85,crit:1,mod:0,
    status:{type:'bleed',chance:90,value:1,turns:3}},
  skeleton_guard_break:{name:'Shieldbreaker Bash',from:[0,1],to:[0,1],acc:85,crit:0,mod:-.35,
    debuff:{chance:100,turns:2,modifiers:{prot:-10}}},
  skeleton_bone_arrow:{name:'Bone Arrow',from:[1,2,3],to:[1,2,3],acc:95,crit:3,mod:0},
  skeleton_pin_arrow:{name:'Pinning Arrow',from:[1,2,3],to:[1,2,3],acc:90,crit:0,mod:-.40,
    debuff:{chance:100,turns:2,modifiers:{speed:-2}}},
  court_curse:{name:'Courtly Dread',from:[2,3],to:[0,1,2,3],kind:'stress',amount:15,acc:95},
  court_blight:{name:'Withering Sigil',from:[2,3],to:[1,2,3],acc:90,crit:0,mod:-.8,
    status:{type:'blight',chance:105,value:2,turns:3}},
  // Source-checked APPRENTICE DD1 Bone Defender abilities.
  boneguard_axe:{name:'Crypt Axeblade',from:[0,1],to:[0,1],
    acc:72.5,crit:6,damageMin:3,damageMax:5},
  boneguard_weight:{name:'Grave Weight',from:[0,1],to:[0,1],
    acc:82.5,crit:6,damageMin:2,damageMax:4,
    status:{type:'stun',chance:100},
    moveTarget:{type:'push',distance:1,chance:100}},
  boneguard_clumsy:{name:'Clumsy Axeblade',from:[2,3],to:[0,1],
    acc:42.5,crit:0,damageMin:2,damageMax:4,advance:1},
  // Source-checked DD1 APPRENTICE Bone Arbalist (Bone Arbalist wiki.gg).
  // Zero-based ranks: Quarrel usable at 3–4 against heroes 2–4;
  // Bayonet Jab usable at 1–2 against heroes 1–2, self-retreat one rank.
  crypt_quarrel:{name:'Crypt Quarrel',from:[2,3],to:[1,2,3],
    acc:82.5,crit:12,damageMin:3,damageMax:7,vsMarked:.25},
  crypt_bayonet:{name:'Crypt Bayonet',from:[0,1],to:[0,1],
    acc:72.5,crit:2,damageMin:2,damageMax:4,selfBack:1},
  // DD1 VETERAN Brigand Cutthroat ability data (wiki.gg).
  // Accuracy shown in DD1 tables is reproduced as skill ACC here, with
  // the combat engine's documented +5 hidden hit correction applied separately.
  // This reference encounter uses per-skill damage ranges, not actor base DMG.
  duelist_sweep:{name:'Crossblade Sweep',from:[0,1,2],to:[0,1],targetMode:'all',
    acc:78.75,crit:16,damageMin:4,damageMax:7,
    debuff:{chance:120,turns:2,modifiers:{bleedResist:-25}}},
  duelist_uppercut:{name:'Rising Pommel',from:[0,1],to:[0,1,2],
    acc:78.75,crit:12,damageMin:3,damageMax:5,
    moveTarget:{type:'push',distance:1,chance:120}},
  duelist_shank:{name:'Outlaw Stab',from:[0,1,2],to:[0,1,2,3],
    acc:82.5,crit:12,damageMin:5,damageMax:11,
    status:{type:'bleed',chance:120,value:2,turns:3}},
  duelist_poke:{name:'Retreating Jab',from:[3],to:[0,1,2,3],
    acc:52.5,crit:0,damageMin:3,damageMax:5,advance:1,
    onUseBuff:{turns:2,modifiers:{speed:2}}},
  emperor_slam:{name:'Imperial Slam',from:[0,1,2],to:[0,1],acc:85,crit:2,mod:.1},
  emperor_roar:{name:'Tyrant Roar',from:[0,1,2],to:[0,1,2,3],kind:'stress',amount:20,acc:90},
  emperor_call:{name:'Summon Boneguard',from:[0,1,2,3],to:[0,1,2,3],kind:'summon',summonProfile:'swordsman',maxUses:1,maxHpFraction:0.5}
});

export const ENCOUNTER_SKILLS=Object.freeze({
  e1:Object.freeze(['skeleton_cleaver','skeleton_guard_break']),
  e2:Object.freeze(['skeleton_cleaver','skeleton_guard_break']),
  e3:Object.freeze(['skeleton_bone_arrow','skeleton_pin_arrow']),
  e4:Object.freeze(['court_curse','court_blight']),
  boss:Object.freeze(['emperor_slam','emperor_roar','emperor_call'])
});
