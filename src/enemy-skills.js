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
  // Source-checked DD1 Apprentice Swine Wretch Vomit: all ranks/targets,
  // ACC 82.5, CRIT 12, 1 damage, +10 stress and 33% disease.
  plague_vomit:{name:'Blight Vomit',from:[0,1,2,3],to:[0,1,2,3],
    acc:82.5,crit:12,damageMin:1,damageMax:1,onHitStress:10,diseaseChance:33},
  // Source-checked Apprentice Swine Drummer (DD1).
  plague_drum_doom:{name:'Doombeat',from:[0,1,2,3],to:[0,1,2,3],targetMode:'all',
    acc:82.5,crit:2,damageMin:1,damageMax:1,onHitStress:5,onHitStressChance:70},
  plague_drum_debilitation:{name:'Weakening Rhythm',from:[0,1,2,3],to:[0,1,2,3],
    kind:'mark',acc:82.5,crit:6,damageMin:1,damageMax:1,mod:0,markTurns:3,
    debuff:{chance:100,turns:3,modifiers:{dodge:-10}}},
  // DD1 Apprentice Swine Slasher, Hook Where It Hurts (wiki.gg):
  // all launch ranks, targets 1–3, ACC 82.5, CRIT 16, DMG 3–7, back 1.
  plague_hook_slash:{name:'Hookstalker Strike',from:[0,1,2,3],to:[0,1,2],
    acc:82.5,crit:16,damageMin:3,damageMax:7,selfBack:1},
  // Champion DD1 Swine Skiver, wiki.gg. The AoE blight/debuff
  // attack uses the engine's existing status and targetMode support.
  plague_skiver_roast:{name:'Impaling Javelin',from:[1,2,3],to:[0,1,2],
    acc:107.5,crit:21,damageMin:12,damageMax:18,advance:1,
    status:{type:'stun',chance:130},
    moveTarget:{type:'push',distance:3,chance:120}},
  plague_skiver_cripple:{name:'Crippling Volley',from:[1,2,3],to:[1,2,3],
    targetMode:'all',acc:97.5,crit:9,damageMin:6,damageMax:13,
    status:{type:'blight',chance:120,value:3,turns:3},
    debuff:{chance:130,turns:3,modifiers:{dodge:-8,speed:-6}}},
  plague_skiver_flight:{name:'Goring Retreat',from:[0,1],to:[0,1],
    acc:92.5,crit:7,damageMin:4,damageMax:7,selfBack:4},
  // Source-checked Apprentice Swine Chopper (DD1).
  plague_butcher_cut:{name:"Butcher's Cleave",from:[0,1],to:[0,1,2],
    acc:82.5,crit:12,damageMin:3,damageMax:7,
    status:{type:'bleed',chance:100,value:2,turns:3}},
  plague_ball_chain:{name:'Spiked Chain',from:[0,1,2,3],to:[2,3],
    acc:82.5,crit:12,damageMin:2,damageMax:4,
    status:{type:'stun',chance:100},
    moveTarget:{type:'push',distance:1,chance:100}},
  // Champion Swine Slayer analogue. ACC/CRIT/status from wiki.gg;
  // damage ranges follow the official June 2018 balance patch (6-13 / 4-7).
  plague_champion_butcher_cut:{name:"Butcher's Cleave",from:[0,1],to:[0,1,2],
    acc:102.5,crit:17,damageMin:6,damageMax:13,
    status:{type:'bleed',chance:140,value:4,turns:3},
    debuff:{chance:140,turns:3,modifiers:{healingReceived:-50}}},
  plague_champion_ball_chain:{name:'Spiked Chain',from:[0,1,2,3],to:[2,3],
    acc:102.5,crit:17,damageMin:4,damageMax:7,
    status:{type:'stun',chance:140},
    moveTarget:{type:'push',distance:1,chance:140}},
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
