// Frozen reskin mapping for the 15 base-DD1 classes. Coverage tracks level-one
// integrations separately from the still-pending level-two through level-five upgrades.
import {STARTER_CLASS_SKILLS} from './class-skills.js';
import {SECOND_CLASS_SKILLS} from './class-skills-batch2.js';
import {THIRD_CLASS_SKILLS} from './class-skills-batch3.js';
import {FOURTH_CLASS_SKILLS} from './class-skills-batch4.js';
import {FIFTH_CLASS_SKILLS} from './class-skills-batch5.js';
export const CLASS_SKILL_CATALOG = [
  {
    "id": "swordsman",
    "name": "Swordsman",
    "dd1": "Man-at-Arms",
    "skills": [
      {
        "id": "crush",
        "dd1Source": "Crush",
        "name": "Heavy Slash",
        "mechanics": "pending"
      },
      {
        "id": "rampart",
        "dd1Source": "Rampart",
        "name": "Countering Advance",
        "mechanics": "pending"
      },
      {
        "id": "bellow",
        "dd1Source": "Bellow",
        "name": "Battle Shout",
        "mechanics": "pending"
      },
      {
        "id": "defender",
        "dd1Source": "Defender",
        "name": "Guardian's Parry",
        "mechanics": "pending"
      },
      {
        "id": "retribution",
        "dd1Source": "Retribution",
        "name": "Riposte Stance",
        "mechanics": "pending"
      },
      {
        "id": "command",
        "dd1Source": "Command",
        "name": "Swordmaster's Orders",
        "mechanics": "pending"
      },
      {
        "id": "bolster",
        "dd1Source": "Bolster",
        "name": "Steadfast Resolve",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "warrior",
    "name": "Warrior",
    "dd1": "Crusader",
    "skills": [
      {
        "id": "smite",
        "dd1Source": "Smite",
        "name": "Crushing Strike",
        "mechanics": "pending"
      },
      {
        "id": "zealous_accusation",
        "dd1Source": "Zealous Accusation",
        "name": "Sweeping Assault",
        "mechanics": "pending"
      },
      {
        "id": "stunning_blow",
        "dd1Source": "Stunning Blow",
        "name": "Concussive Blow",
        "mechanics": "pending"
      },
      {
        "id": "bulwark_of_faith",
        "dd1Source": "Bulwark of Faith",
        "name": "Iron Fortress",
        "mechanics": "pending"
      },
      {
        "id": "battle_heal",
        "dd1Source": "Battle Heal",
        "name": "Warrior's Recovery",
        "mechanics": "pending"
      },
      {
        "id": "holy_lance",
        "dd1Source": "Holy Lance",
        "name": "Charging Blade",
        "mechanics": "pending"
      },
      {
        "id": "inspiring_cry",
        "dd1Source": "Inspiring Cry",
        "name": "Rallying Roar",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "hunter",
    "name": "Hunter",
    "dd1": "Arbalest",
    "skills": [
      {
        "id": "sniper_shot",
        "dd1Source": "Sniper Shot",
        "name": "Eagle-Eye Shot",
        "mechanics": "pending"
      },
      {
        "id": "suppressing_fire",
        "dd1Source": "Suppressing Fire",
        "name": "Arrow Barrage",
        "mechanics": "pending"
      },
      {
        "id": "sniper_s_mark",
        "dd1Source": "Sniper's Mark",
        "name": "Hunter's Mark",
        "mechanics": "pending"
      },
      {
        "id": "bola",
        "dd1Source": "Bola",
        "name": "Entangling Shot",
        "mechanics": "pending"
      },
      {
        "id": "blindfire",
        "dd1Source": "Blindfire",
        "name": "Instinctive Shot",
        "mechanics": "pending"
      },
      {
        "id": "battlefield_bandage",
        "dd1Source": "Battlefield Bandage",
        "name": "Field Dressing",
        "mechanics": "pending"
      },
      {
        "id": "rallying_flare",
        "dd1Source": "Rallying Flare",
        "name": "Signal Arrow",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "thief",
    "name": "Thief",
    "dd1": "Grave Robber",
    "skills": [
      {
        "id": "pick_to_the_face",
        "dd1Source": "Pick to the Face",
        "name": "Armour-Piercing Stab",
        "mechanics": "pending"
      },
      {
        "id": "lunge",
        "dd1Source": "Lunge",
        "name": "Shadow Lunge",
        "mechanics": "pending"
      },
      {
        "id": "flashing_daggers",
        "dd1Source": "Flashing Daggers",
        "name": "Twin Dagger Flurry",
        "mechanics": "pending"
      },
      {
        "id": "shadow_fade",
        "dd1Source": "Shadow Fade",
        "name": "Vanishing Step",
        "mechanics": "pending"
      },
      {
        "id": "thrown_dagger",
        "dd1Source": "Thrown Dagger",
        "name": "Precision Throw",
        "mechanics": "pending"
      },
      {
        "id": "poison_dart",
        "dd1Source": "Poison Dart",
        "name": "Venom Needle",
        "mechanics": "pending"
      },
      {
        "id": "toxin_trickery",
        "dd1Source": "Toxin Trickery",
        "name": "Antidote Preparation",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "mage",
    "name": "Mage",
    "dd1": "Plague Doctor",
    "skills": [
      {
        "id": "noxious_blast",
        "dd1Source": "Noxious Blast",
        "name": "Corrosive Bolt",
        "mechanics": "pending"
      },
      {
        "id": "plague_grenade",
        "dd1Source": "Plague Grenade",
        "name": "Toxic Explosion",
        "mechanics": "pending"
      },
      {
        "id": "blinding_gas",
        "dd1Source": "Blinding Gas",
        "name": "Blinding Mist",
        "mechanics": "pending"
      },
      {
        "id": "incision",
        "dd1Source": "Incision",
        "name": "Arcane Blade",
        "mechanics": "pending"
      },
      {
        "id": "battlefield_medicine",
        "dd1Source": "Battlefield Medicine",
        "name": "Purification Spell",
        "mechanics": "pending"
      },
      {
        "id": "emboldening_vapours",
        "dd1Source": "Emboldening Vapours",
        "name": "Empowerment Spell",
        "mechanics": "pending"
      },
      {
        "id": "disorienting_blast",
        "dd1Source": "Disorienting Blast",
        "name": "Displacement Spell",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "priest",
    "name": "Priest",
    "dd1": "Vestal",
    "skills": [
      {
        "id": "mace_bash",
        "dd1Source": "Mace Bash",
        "name": "Sacred Strike",
        "mechanics": "pending"
      },
      {
        "id": "judgement",
        "dd1Source": "Judgement",
        "name": "Divine Judgement",
        "mechanics": "pending"
      },
      {
        "id": "dazzling_light",
        "dd1Source": "Dazzling Light",
        "name": "Radiant Flash",
        "mechanics": "pending"
      },
      {
        "id": "divine_grace",
        "dd1Source": "Divine Grace",
        "name": "Greater Heal",
        "mechanics": "pending"
      },
      {
        "id": "divine_comfort",
        "dd1Source": "Divine Comfort",
        "name": "Group Healing",
        "mechanics": "pending"
      },
      {
        "id": "illumination",
        "dd1Source": "Illumination",
        "name": "Revealing Light",
        "mechanics": "pending"
      },
      {
        "id": "hand_of_light",
        "dd1Source": "Hand of Light",
        "name": "Blessing Strike",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "monster_slayer",
    "name": "Monster Slayer",
    "dd1": "Bounty Hunter",
    "skills": [
      {
        "id": "collect_bounty",
        "dd1Source": "Collect Bounty",
        "name": "Hunter's Execution",
        "mechanics": "pending"
      },
      {
        "id": "mark_for_death",
        "dd1Source": "Mark for Death",
        "name": "Identify Weakness",
        "mechanics": "pending"
      },
      {
        "id": "come_hither",
        "dd1Source": "Come Hither",
        "name": "Grappling Hook",
        "mechanics": "pending"
      },
      {
        "id": "uppercut",
        "dd1Source": "Uppercut",
        "name": "Brutal Uppercut",
        "mechanics": "pending"
      },
      {
        "id": "flashbang",
        "dd1Source": "Flashbang",
        "name": "Flash Bomb",
        "mechanics": "pending"
      },
      {
        "id": "finish_him",
        "dd1Source": "Finish Him",
        "name": "Finishing Strike",
        "mechanics": "pending"
      },
      {
        "id": "caltrops",
        "dd1Source": "Caltrops",
        "name": "Spiked Trap",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "berserker",
    "name": "Berserker",
    "dd1": "Hellion",
    "skills": [
      {
        "id": "wicked_hack",
        "dd1Source": "Wicked Hack",
        "name": "Savage Cleave",
        "mechanics": "pending"
      },
      {
        "id": "iron_swan",
        "dd1Source": "Iron Swan",
        "name": "Rising Axe",
        "mechanics": "pending"
      },
      {
        "id": "barbaric_yawp",
        "dd1Source": "Barbaric YAWP!",
        "name": "Terrifying War Cry",
        "mechanics": "pending"
      },
      {
        "id": "if_it_bleeds",
        "dd1Source": "If It Bleeds",
        "name": "Rending Slash",
        "mechanics": "pending"
      },
      {
        "id": "breakthrough",
        "dd1Source": "Breakthrough",
        "name": "Berserker's Charge",
        "mechanics": "pending"
      },
      {
        "id": "adrenaline_rush",
        "dd1Source": "Adrenaline Rush",
        "name": "Battle Frenzy",
        "mechanics": "pending"
      },
      {
        "id": "bleed_out",
        "dd1Source": "Bleed Out",
        "name": "Bloodletting Blow",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "dark_knight",
    "name": "Dark Knight",
    "dd1": "Highwayman",
    "skills": [
      {
        "id": "wicked_slice",
        "dd1Source": "Wicked Slice",
        "name": "Dark Slash",
        "mechanics": "pending"
      },
      {
        "id": "pistol_shot",
        "dd1Source": "Pistol Shot",
        "name": "Shadow Bolt",
        "mechanics": "pending"
      },
      {
        "id": "point_blank_shot",
        "dd1Source": "Point Blank Shot",
        "name": "Point-Blank Burst",
        "mechanics": "pending"
      },
      {
        "id": "grapeshot_blast",
        "dd1Source": "Grapeshot Blast",
        "name": "Shadow Volley",
        "mechanics": "pending"
      },
      {
        "id": "tracking_shot",
        "dd1Source": "Tracking Shot",
        "name": "Focused Assault",
        "mechanics": "pending"
      },
      {
        "id": "duelist_s_advance",
        "dd1Source": "Duelist's Advance",
        "name": "Shadowstep Counter",
        "mechanics": "pending"
      },
      {
        "id": "open_vein",
        "dd1Source": "Open Vein",
        "name": "Bleeding Edge",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "beastmaster",
    "name": "Beastmaster",
    "dd1": "Houndmaster",
    "skills": [
      {
        "id": "hound_s_rush",
        "dd1Source": "Hound's Rush",
        "name": "Wolf's Assault",
        "mechanics": "pending"
      },
      {
        "id": "hound_s_harry",
        "dd1Source": "Hound's Harry",
        "name": "Pack Harassment",
        "mechanics": "pending"
      },
      {
        "id": "target_whistle",
        "dd1Source": "Target Whistle",
        "name": "Hunt Command",
        "mechanics": "pending"
      },
      {
        "id": "cry_havoc",
        "dd1Source": "Cry Havoc",
        "name": "Comforting Howl",
        "mechanics": "pending"
      },
      {
        "id": "guard_dog",
        "dd1Source": "Guard Dog",
        "name": "Guardian Wolf",
        "mechanics": "pending"
      },
      {
        "id": "lick_wounds",
        "dd1Source": "Lick Wounds",
        "name": "Beast's Recovery",
        "mechanics": "pending"
      },
      {
        "id": "blackjack",
        "dd1Source": "Blackjack",
        "name": "Staff Strike",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "bard",
    "name": "Bard",
    "dd1": "Jester",
    "skills": [
      {
        "id": "dirk_stab",
        "dd1Source": "Dirk Stab",
        "name": "Flourishing Strike",
        "mechanics": "pending"
      },
      {
        "id": "harvest",
        "dd1Source": "Harvest",
        "name": "Whirling Blades",
        "mechanics": "pending"
      },
      {
        "id": "finale",
        "dd1Source": "Finale",
        "name": "Grand Finale",
        "mechanics": "pending"
      },
      {
        "id": "solo",
        "dd1Source": "Solo",
        "name": "Heroic Solo",
        "mechanics": "pending"
      },
      {
        "id": "slice_off",
        "dd1Source": "Slice Off",
        "name": "Cutting Refrain",
        "mechanics": "pending"
      },
      {
        "id": "battle_ballad",
        "dd1Source": "Battle Ballad",
        "name": "Song of Courage",
        "mechanics": "pending"
      },
      {
        "id": "inspiring_tune",
        "dd1Source": "Inspiring Tune",
        "name": "Soothing Melody",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "cursed_champion",
    "name": "Cursed Champion",
    "dd1": "Leper",
    "skills": [
      {
        "id": "chop",
        "dd1Source": "Chop",
        "name": "Executioner's Cleave",
        "mechanics": "pending"
      },
      {
        "id": "hew",
        "dd1Source": "Hew",
        "name": "Greatsword Sweep",
        "mechanics": "pending"
      },
      {
        "id": "purge",
        "dd1Source": "Purge",
        "name": "Overwhelming Force",
        "mechanics": "pending"
      },
      {
        "id": "revenge",
        "dd1Source": "Revenge",
        "name": "Cursed Strength",
        "mechanics": "pending"
      },
      {
        "id": "withstand",
        "dd1Source": "Withstand",
        "name": "Unyielding Body",
        "mechanics": "pending"
      },
      {
        "id": "solemnity",
        "dd1Source": "Solemnity",
        "name": "Warrior's Meditation",
        "mechanics": "pending"
      },
      {
        "id": "intimidate",
        "dd1Source": "Intimidate",
        "name": "Dreadful Presence",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "hex_mage",
    "name": "Hex Mage",
    "dd1": "Occultist",
    "skills": [
      {
        "id": "sacrificial_stab",
        "dd1Source": "Sacrificial Stab",
        "name": "Ritual Dagger",
        "mechanics": "pending"
      },
      {
        "id": "abyssal_artillery",
        "dd1Source": "Abyssal Artillery",
        "name": "Abyssal Barrage",
        "mechanics": "pending"
      },
      {
        "id": "weakening_curse",
        "dd1Source": "Weakening Curse",
        "name": "Enfeebling Hex",
        "mechanics": "pending"
      },
      {
        "id": "wyrd_reconstruction",
        "dd1Source": "Wyrd Reconstruction",
        "name": "Forbidden Restoration",
        "mechanics": "pending"
      },
      {
        "id": "vulnerability_hex",
        "dd1Source": "Vulnerability Hex",
        "name": "Curse of Exposure",
        "mechanics": "pending"
      },
      {
        "id": "hands_from_the_abyss",
        "dd1Source": "Hands from the Abyss",
        "name": "Abyssal Grasp",
        "mechanics": "pending"
      },
      {
        "id": "daemon_s_pull",
        "dd1Source": "Daemon's Pull",
        "name": "Shadow Grasp",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "treasure_hunter",
    "name": "Treasure Hunter",
    "dd1": "Antiquarian",
    "skills": [
      {
        "id": "nervous_stab",
        "dd1Source": "Nervous Stab",
        "name": "Hidden Dagger",
        "mechanics": "pending"
      },
      {
        "id": "festering_vapours",
        "dd1Source": "Festering Vapours",
        "name": "Alchemical Fumes",
        "mechanics": "pending"
      },
      {
        "id": "get_down",
        "dd1Source": "Get Down!",
        "name": "Quick Retreat",
        "mechanics": "pending"
      },
      {
        "id": "flashpowder",
        "dd1Source": "Flashpowder",
        "name": "Blinding Powder",
        "mechanics": "pending"
      },
      {
        "id": "fortifying_vapours",
        "dd1Source": "Fortifying Vapours",
        "name": "Protective Tonic",
        "mechanics": "pending"
      },
      {
        "id": "invigorating_vapours",
        "dd1Source": "Invigorating Vapours",
        "name": "Evasion Tonic",
        "mechanics": "pending"
      },
      {
        "id": "protect_me",
        "dd1Source": "Protect Me",
        "name": "Take Cover!",
        "mechanics": "pending"
      }
    ]
  },
  {
    "id": "spiritbound",
    "name": "Spiritbound",
    "dd1": "Abomination",
    "skills": [
      {
        "id": "transform",
        "dd1Source": "Transform",
        "name": "Spirit Awakening",
        "mechanics": "pending"
      },
      {
        "id": "manacles",
        "dd1Source": "Manacles",
        "name": "Spirit Chains",
        "mechanics": "pending"
      },
      {
        "id": "beast_s_bile",
        "dd1Source": "Beast's Bile",
        "name": "Corrupting Essence",
        "mechanics": "pending"
      },
      {
        "id": "absolution",
        "dd1Source": "Absolution",
        "name": "Spiritual Purification",
        "mechanics": "pending"
      },
      {
        "id": "rake",
        "dd1Source": "Rake",
        "name": "Spirit Claw",
        "mechanics": "pending"
      },
      {
        "id": "rage",
        "dd1Source": "Rage",
        "name": "Primal Fury",
        "mechanics": "pending"
      },
      {
        "id": "slam",
        "dd1Source": "Slam",
        "name": "Spirit Crush",
        "mechanics": "pending"
      }
    ]
  }
];
export const SKILL_CATALOG = CLASS_SKILL_CATALOG.flatMap(c=>c.skills.map(s=>({...s,classId:c.id,className:c.name,dd1Class:c.dd1,mechanics:Object.values({...STARTER_CLASS_SKILLS,...SECOND_CLASS_SKILLS,...THIRD_CLASS_SKILLS,...FOURTH_CLASS_SKILLS,...FIFTH_CLASS_SKILLS}).some(v=>v.classId===c.id&&v.source===s.dd1Source&&v.name===s.name)?'level1-integrated':'pending'})));
export function catalogSkill(classId,sourceId){
  return SKILL_CATALOG.find(s=>s.classId===classId&&s.id===sourceId)??null;
}
export function implementedSkillNames(abilities){
  const implemented=new Set(Object.values(abilities).filter(a=>a.name).map(a=>a.name));
  return SKILL_CATALOG.filter(s=>implemented.has(s.name));
}
