# Combat fidelity audit — Milestone 3 / Pass 1

**Scope:** Core engine behaviours affecting all 105 level-one registered hero abilities. This is a *targeted audit*, not certification of all 105 skill values, higher levels or enemy AI.

## Evidence and checks

Reference basis:
- [DD1 official combat mechanics](https://darkestdungeon.wiki.gg/wiki/Combat_Mechanics_(Darkest_Dungeon))
- [DD1 official status effects](https://darkestdungeon.wiki.gg/wiki/Status_effects)
- [DD1 official Death's Door](https://darkestdungeon.wiki.gg/wiki/Death%27s_Door)
- [DD1 official critical hit](https://darkestdungeon.wiki.gg/wiki/Critical_Hit_(Darkest_Dungeon))

| Audit item | State | Verification |
| --- | --- | --- |
| Enemy stun skips its scheduled action | **Fixed** | `prepareActorTurn` and Node/Chromium tests |
| Hero and enemy turn-start processing consistent | **Fixed** | One shared `prepareActorTurn` path |
| Restoration/DOT happen before stun skip | **Covered** | Status tests and new turn-audit tests |
| DOT kills prevent an actor taking an action | **Covered** | Unit and Chromium tests |
| +50% temporary stun-resistance stacking | **Covered** | Existing status tests plus new turn test |
| Spiritbound free transformation retains its turn and stun recovery | **Covered** | New free-action test |
| Hero skills restricted to their correct class | **Fixed** | `classId` validation and ownership tests |
| All 105 level-one skill names exist | **Registered** | `skill-catalog.js`; **not** 105 complete DD1 parity checks |

## Open risks requiring dedicated audits

1. **Skill-specific numbers and upgrades.** Check each of the 105 skill definitions against DD1 rank diagrams and all levels 1–5; document differences. Existing fixture stats and many class-level scalars remain provisional.
2. **Damage and rounding.** Audit additive vs multiplicative modifiers, critical damage, protection, and damage floors against game formulas and replayable examples.
3. **Status timing.** Verify how durations are applied, refreshed and expired for marks, guard, riposte, stun recovery, stealth, horror, and special class buffs.
4. **Death's Door.** Verify physical attacks that deal zero damage, party stress on entry, repeated heart attacks, and mortality recovery variants.
5. **Reactions and multitarget sequencing.** Audit counterattack ordering, death after riposte, displacement and corpses during area attacks, and effects applied independently per target.
6. **Enemy rules.** Enemy abilities, behaviour, boss multi-actions, stalling, corpses and difficulty scaling are not yet implemented to full DD1 fidelity.

**Release gate for full-fidelity claim:** A verified DD1 fixture set with rank restrictions, base stats, levels 1–5, deterministic edge-case tests, and end-to-end enemy encounters for every class and opponent type. Successful tests currently show the prototype matches its encoded behaviours, **not** that every encoded number matches DD1.

## Next pass

Prioritize damage/protection and Death's Door edge cases with reference examples; then proceed through the 15 classes' numerical skill tables. The user-approved Temple resurrection deviation remains separate from ordinary DD1 combat.

## Pass 2 — Damage, protection, critical DOT, Death's Door (2026-11-10)

**Implemented and regression-tested**
- A physical hit doing **zero** damage can still trigger a Death Blow resistance roll if the target is already at Death's Door. The hit must actually land; a miss does not count. Non-damaging control spells and support skills do not automatically trigger the physical-hit rule.
- `directDamage` distinguishes genuinely zero-base-damage attacks (`0`) from positive raw attacks reduced by modifiers/PROT (which retain the existing minimum-one calculation). This is specifically tested, rather than treating a zero damage roll as a fabricated one-point hit.
- Direct damage continues to cap effective PROT at **80%**, with ignore-PROT abilities handled separately. Bleed and blight remain outside direct PROT reduction.
- Critical direct damage remains **150% of the attack's maximum damage**, tested both with and without PROT.
- Critical bleed and blight duration is now **150% of base duration, rounded up**, not just a special case for three-turn effects. Regression fixtures verify 2→3, 3→5, 4→6, 5→8 turns.
- Death Blow resistance retains the **67% base / 87% maximum** rule. Repeated DOT damage at Death's Door continues to resolve with its own checks.
- The new `tests/damage-audit.test.js` and `tests/browser/damage-audit.spec.js` validate these edge cases in Node and Chromium.

**Primary references**
- [Official Combat Mechanics](https://darkestdungeon.wiki.gg/wiki/Combat_Mechanics_(Darkest_Dungeon)) — critical, PROT and status-independent calculation rules
- [Official Critical Hit](https://darkestdungeon.wiki.gg/wiki/Critical_Hit_(Darkest_Dungeon)) — maximum damage ×1.5 and status duration extension
- [Official Death's Door](https://darkestdungeon.wiki.gg/wiki/Death%27s_Door) — resistance and mortality rules
- [Official Getting Started](https://darkestdungeon.wiki.gg/wiki/Getting_Started) — zero-damage physical attacks and Death Blow triggering

**Still unverified or incomplete**
- Precise buff/debuff additive aggregation and intermediate rounding against DD1's runtime.
- The exact numerical stress response for entering Death's Door and observing a comrade die (references confirm it occurs, but this pass does not introduce a guessed value).
- Heart-attack chains, virtue exceptions and exact mortality duration.
- The fidelity of 105 individual hero skills and their level 2–5 upgrades, multi-target reactions, and the monster/boss roster.

Next: prioritize the exact damage modifier pipeline and Death's Door party-stress/heart-attack edge cases, then class-by-class rank and numerical tables.

## Pass 3 — Heart attack, Virtue and damage-bonus ordering (2026-11-10)

**Corrected and tested**
- At **200 stress**, a hero already Virtuous loses the Virtue and returns to **0 stress**, rather than suffering a heart attack. A non-Virtuous hero instead experiences a heart attack: at positive HP the hero reaches Death's Door and stress returns to **170**; at 0 HP the hero dies outright, irrespective of Death Blow Resistance.
- On successful Virtue activation at 100 stress, the hero's stress resets to **45** and living allies lose **6 stress**. An Affliction does not reset to 45.
- Heart Attack Recovery is now **separate and cumulative** with Death's Door Recovery upon healing. The combined penalties are **-5 ACC, -15% DMG, -3 SPD, +25% Stress received**, compared with Death's Door Recovery alone at -2 ACC, -5% DMG, -1 SPD, +10% Stress.
- The skill's base damage modifier remains a separate multiplier; other attacker damage percentage bonuses such as marked targets, enemy type, trinket-style buffs, and temporary skill buffs now accumulate **additively** before calculating damage. Damage-taken modifiers remain a separate target-side factor.
- The Monster Slayer's +90% damage against marked and +15% against human now combine to +105%, not ×1.9×1.15. Deterministic unit and Chromium scenarios exercise the difference.
- `tests/heart-audit.test.js`, `tests/damage-modifiers-audit.test.js` and `tests/browser/heart-modifiers-audit.spec.js` cover these transitions.

**Supporting DD1 sources**
- [Heart attack](https://darkestdungeon.wiki.gg/wiki/Heart_attack)
- [Virtue](https://darkestdungeon.wiki.gg/wiki/Virtue)
- [Death's Door](https://darkestdungeon.wiki.gg/wiki/Death%27s_Door)
- [Combat Mechanics](https://darkestdungeon.wiki.gg/wiki/Combat_Mechanics_(Darkest_Dungeon))
- [DD1 community discussion of additive damage bonuses](https://www.reddit.com/r/darkestdungeon/comments/11wzcsv)

**Not yet certified**
- The *exact* numerical stress applied to all allies upon Death's Door entry and witnessing permanent death remains unimplemented; external reference pages confirm the event but do not provide an unambiguous base-value and probability fixture. Do not invent these values.
- Individual skill level progression, rounding order at each intermediate damage calculation, and specialized debuff/condition stacking still need dedicated tests against original DD1 data.
- Enemy AI, full bestiary, champion scaling and boss multi-actions are still incomplete.

**Next audit:** distinguish DD1's end-of-turn vs start-of-turn duration expiration for status effects and reconcile the skill leveling tables before implementing enemies.

## Pass 4 — End-of-turn status timing and stealth AoE eligibility (2026-11-11)

**Verified implementation changes**
- Moved guard, riposte, mark, stealth, and timed buff/debuff countdown from **start of actor turn** to **end of completed actor turn**. DD1's official Switch 1.2.0 patch notes explicitly changed buffs to tick at the end of turns. This means a self-applied two-turn buff remains active until the end of its owner's following turn, rather than expiring before that actor can benefit from it.
- Kept bleed, blight, and restoration processing at the **start** of the affected actor's turn. Independent DOT stacks still tick and expire separately.
- Stun consumes an actor's scheduled turn but now also advances their timed status counters, without performing an attack. Death to turn-start DOT remains processed before stun, as covered in Pass 1.
- Fixed AoE selection when the **frontmost legal enemy is stealthed but another legal enemy is visible**. Selectability is filtered before choosing the single area-attack anchor. The AoE can then hit both visible and stealthed targets. If all eligible enemies are stealthed, ordinary AoE remains unavailable.
- Updated legacy test expectations for statuses applied on the actor's own turn, plus new Node and Chromium regression coverage in `tests/status-timing-audit.test.js` and `tests/browser/status-timing-audit.spec.js`.

**Reference**
- [Official DD1 status effects](https://darkestdungeon.wiki.gg/wiki/Status_Effects_(Darkest_Dungeon)) — independent stacking, DOT timing
- [Official DD1 Buff](https://darkestdungeon.wiki.gg/wiki/Buff_(Darkest_Dungeon)) — durations decrease at the end of a hero's turn
- [Official DD1 Stealth](https://darkestdungeon.wiki.gg/wiki/Stealth_(Darkest_Dungeon)) — area attacks may strike stealth if a non-stealthed target is legal
- [DD1 Switch patch 1.2.0 notes](https://benoitren.be/switchpatchnotes/darkestdungeon.html) — explicit end-turn buff timing correction
- [Official DD1 Riposte](https://darkestdungeon.wiki.gg/wiki/Riposte) — counterattack expiry and stun interactions

**Remaining work:** Mark and guard refresh nuances, special enemy-only stealth modifiers, critical buff duration edge cases, ability-specific turn-end expiry overrides, horror and affliction lifecycle, enemy action sequencing and the level 2–5 skills still need independent verification. This pass adds lifecycle correctness for the shared implementation; it is not a full fidelity certification.

## Pass 5 — Verified skill progression architecture (2026-11-11)

**Implemented**
- Added `src/skill-progression.js`: a strictly validated, data-driven **level 1–5** upgrade patch registry, separate from the locked skill display names and level-one specifications.
- `getActorSkill(actor,id)` now returns the **actor-specific** effective skill specification. `availableTargets` and `takeTurn` use that specification; rank rules, damage, healing, stun and displacement therefore read the selected level automatically.
- Upgrades belong to individual hero instances (`skillLevels`). A second copy of the same class does not inherit another hero's upgrades. The global `ABILITIES` level-one definitions are never mutated.
- `setActorSkillLevel` verifies class ownership, integer levels 1–5 and **source-confirmed** upgrade values. It throws on unknown/unverified upgrades rather than inventing plausible statistics.
- Added a **Verified Lv5 Skills** browser encounter and a `verifiedLevels` field to the 105-skill catalog so developers and players can distinguish implemented levels from pending ones.

**First five skills with verified complete level 1–5 tables**
| Clays skill | DD1 original | Level progression implemented |
| --- | --- | --- |
| Heavy Slash | Man-at-Arms Crush | ACC 85→105 (+5/level), CRIT 5→9 (+1/level) |
| Countering Advance | Man-at-Arms Rampart | ACC 90→110, CRIT 5→9, stun/knockback application 100→140 |
| Crushing Strike | Crusader Smite | ACC 85→105, CRIT 0→4, +DMG vs Unholy 15→35% |
| Greater Heal | Vestal Divine Grace | Heal range 4–5→8–9 |
| Group Healing | Vestal Divine Comfort | Heal ranges 1–3, 2–3, 3–3, 3–4, 4–5 |

All other 100 skills remain explicitly **level-one only**. Five verified paths do not mean all five classes' seven skills, equipment or level progression is finished.

**Reference tables**
- [Official Man-at-Arms combat skills](https://darkestdungeon.wiki.gg/wiki/Man-at-Arms)
- [Official Crusader combat skills](https://darkestdungeon.wiki.gg/wiki/Crusader)
- [Official Vestal combat skills](https://darkestdungeon.wiki.gg/wiki/Vestal)

**Tests**
- `tests/skill-progression.test.js` checks complete tables, deep effect patching, live damage and healing, class ownership, duplicate hero isolation, invalid input and unverified upgrades.
- `tests/browser/skill-progression.spec.js` covers the playable level-five laboratory and verifies browser calculations and rejection paths.
- Full existing level-one tests continue to run with the default skill level of one.

**Next**
Expand verified level 2–5 skill tables systematically, starting with the remaining Swordsman, Warrior and Priest abilities. Audit numerical progression against the current base-game DD1 version; do not substitute old/rebalanced values without explicit source verification.

## Pass 6 — Complete three-class progression tables (2026-11-11)

**Scope:** Implement and test **all 21** base-game level-one-to-five ability tables for **Swordsman (Man-at-Arms), Warrior (Crusader) and Priest (Vestal)**.

**Verified skill upgrade coverage:** Increased from **5/105** to **21/105** skill tracks. Four upgrade patches per track = **84 level 2–5 patches**. Other 84 hero skills remain level one; unsupported upgrades still throw instead of defaulting to guessed data.

**Original DD1 references:**
- [Official Man-at-Arms combat skill tables](https://darkestdungeon.wiki.gg/wiki/Man-at-Arms) — Bellow, Defender, Retribution, Command and Bolster
- [Official Crusader combat skill tables](https://darkestdungeon.wiki.gg/wiki/Crusader) — Zealous Accusation, Stunning Blow, Bulwark of Faith, Battle Heal, Holy Lance and Inspiring Cry
- [Official Vestal combat skill tables](https://darkestdungeon.wiki.gg/wiki/Vestal) — Mace Bash, Judgement, Dazzling Light, Illumination and Hand of Light

**Engine integration:**
- `src/skill-progression.js` merges nested damage, healing, stun, debuff, guard, protection, stress-heal and torch upgrades into each actor's skill definition without mutating the base skill shared by other heroes.
- Added missing `riposteCrit` propagation and combat calculation for the upgraded Man-at-Arms Retribution riposte. It previously supported the upgraded riposte damage multiplier but ignored its increased critical chance.
- The **Verified Lv5 Skills** demonstration now upgrades seven Swordsman, seven Warrior and seven Priest abilities on their corresponding heroes; all other heroes retain their original level-one skill specifications.
- `SKILL_CATALOG.verifiedLevels` reflects all 21 researched tracks.

**Regression evidence:**
- `tests/three-class-upgrades.test.js`: all 84 patches, numerical tables and relevant runtime effects.
- `tests/browser/three-class-upgrades.spec.js`: 21 upgraded skills in Chromium, upgraded riposte, and Vestal Illumination behaviour.
- Existing `tests/skill-progression.test.js` and browser tests now expect 21 upgrades rather than five.

**Limitations:** Base-game ability levels are verified against published tables, but not every conditional/status effect ordering interaction has been certified against live DD1 runtime. Equipment levels, Resolve XP, gold costs and availability, enemy-specific resistance scaling, character abilities outside the base 15 classes, and all progression for the other twelve classes remain pending.

**Next:** Implement skill 2–5 tables for Hunter, Thief and Mage, then continue through all remaining classes. Keep 105/105 level-one handlers separate from the **21/105 verified level-five tracks** completion metric.

## Pass 7 — Hunter, Thief and Mage skill levels 2–5 (2026-11-14)

**Scope:** Extend the source-backed upgrade registry from 21 to **42 of 105 full five-level hero skill tracks**, adding **84 more level 2–5 upgrade patches** across:
- Hunter / Arbalest: Sniper Shot, Suppressing Fire, Sniper's Mark, Bola, Blindfire, Battlefield Bandage, Rallying Flare
- Thief / Grave Robber: Pick to the Face, Lunge, Flashing Daggers, Shadow Fade, Thrown Dagger, Poison Dart, Toxin Trickery
- Mage / Plague Doctor: Noxious Blast, Plague Grenade, Blinding Gas, Incision, Battlefield Medicine, Emboldening Vapours, Disorienting Blast

**Primary numerical sources:** [Official DD1 Arbalest table](https://darkestdungeon.wiki.gg/wiki/Arbalest), [Official DD1 Grave Robber table](https://darkestdungeon.wiki.gg/wiki/Grave_Robber), [Official DD1 Plague Doctor table](https://darkestdungeon.wiki.gg/wiki/Plague_Doctor). Level patches cover published accuracy, critical modifiers, mark/blight conditional bonuses, DOT values and application chance, stun/movement chance, recovery ranges, self/party buffs, stress relief and torch generation.

**Playable demonstration:** The new **Hunter / Thief / Mage Lv5** encounter upgrades all seven skills for each of the three classes without changing the original Hunter / Thief / Mage level-one combat laboratory.

**Regression tests:** `tests/second-class-progression.test.js` checks all 84 newly added patches, level-1 preservation, nested status/buff data, and actual in-engine level-five healing, blight and stealth. `tests/browser/second-class-progression.spec.js` verifies the scenario and those effects in Chromium. Prior tests now distinguish the 42 fully upgraded paths from 63 level-one-only paths.

**Limitations and next audit:** These are published level-by-level numerical tables applied to the prototype. They do not constitute full skill-fidelity certification: enemy resistances, equipment progression, precise conditional trigger ordering, party stress, level-appropriate enemy AI, and rank-by-rank interactions require further work. The remaining **63 hero skills**, including Monster Slayer, Berserker, Dark Knight, Beastmaster, Bard, Cursed Champion, Hex Mage, Treasure Hunter and Spiritbound, still have no verified higher upgrade levels. Never replace missing levels with estimates.

**Next:** Implement levels 2–5 for Monster Slayer (Bounty Hunter), Berserker (Hellion), and Dark Knight (Highwayman).

## Pass 8 — Monster Slayer, Berserker and Dark Knight skill upgrades (2026-11-14)

**Scope:** Extend five-level skill progression from **42/105** to **63/105** across nine original DD1 hero classes. Added 21 full level-1-to-5 tracks and **84 source-checked level 2–5 patches**. Other **42** hero skills remain level-one-only.

**Primary sources and version:** Original single-player Darkest Dungeon 1 skill tables, not Butcher's Circus or DD2:
- [Bounty Hunter (official wiki)](https://darkestdungeon.wiki.gg/wiki/Bounty_Hunter)
- [Hellion (official wiki)](https://darkestdungeon.wiki.gg/wiki/Hellion)
- [Highwayman (official wiki)](https://darkestdungeon.wiki.gg/wiki/Highwayman)

**Implemented tracks**
- **Monster Slayer (Bounty Hunter):** Collect Bounty, Mark for Death, Come Hither, Uppercut, Flashbang, Finish Him and Caltrops. Includes base accuracy/critical scaling, human damage, PROT and speed debuffs, marked-target and stunned-target damage, stun/pull/shuffle probabilities, bleed damage and enemy damage-taken modifiers.
- **Berserker (Hellion):** Wicked Hack, Iron Swan, Barbaric YAWP!, If It Bleeds, Breakthrough, Adrenaline Rush and Bleed Out. Includes accuracy/critical scaling, stun and bleed application/damage, healing amount, combat buffs and preserved self-exhaustion penalties.
- **Dark Knight (Highwayman):** Wicked Slice, Pistol Shot, Point Blank Shot, Grapeshot Blast, Tracking Shot, Duelist's Advance and Open Vein. Includes accuracy/critical scaling, marked damage, push chance, critical-vulnerability debuff, permanent once-per-battle Tracking Shot bonuses, riposte damage and critical progression, bleed and speed penalties.

**Implementation:** `src/skill-upgrades-batch3.js` contains the level 2–5 patches, merged by `src/skill-progression.js`. `makeThirdProgressionBattle` and the browser's **Slayer / Berserker / Dark Knight Lv5** button provide a 21-upgrade playable example. The un-upgraded Warrior remains a control hero.

**Test coverage:** `tests/third-class-progression.test.js` verifies all 84 new patches and runtime effects including buffs, bleed, mark, PROT, riposte and speed; `tests/browser/third-class-progression.spec.js` covers equivalent scenarios in Chromium. Cumulative older tests use 63 instead of 42; they continue to assert class-specific numbers independently.

**Remaining limitations:** Original class level-one data still requires a separate parity check in places, and some exact status timing, active recovery, crit multipliers and edge-case interactions remain incomplete despite matching published numerical upgrade tables. Guild costs, resolve gates, weapon/armor scaling, enemy AI and bestiary are also out of scope. Passing tests validate the encoded combat model, not full runtime equivalence.

**Next:** verify and implement all seven levels 2–5 skills for Beastmaster (Houndmaster), Bard (Jester), Cursed Champion (Leper), raising complete upgrade tracks to 84/105.

## Pass 9 — Beastmaster, Bard and Cursed Champion level 2–5 (2026-11-14)

**Scope:** Expanded upgraded skill coverage from **63/105** to **84/105** (12 of the 15 base DD1 classes). Added 21 complete class-specific upgrade tracks, comprising 84 new level 2–5 progression patches. The other 21 skills, belonging to Hex Mage (Occultist), Treasure Hunter (Antiquarian) and Spiritbound (Abomination), remain level-one only.

**Original DD1 source tables (single-player, not Butcher's Circus):**
- [Houndmaster](https://darkestdungeon.wiki.gg/wiki/Houndmaster) — Hound's Rush, Hound's Harry, Target Whistle, Cry Havoc, Guard Dog, Lick Wounds and Blackjack.
- [Jester](https://darkestdungeon.wiki.gg/wiki/Jester_%28Darkest_Dungeon%29) — Dirk Stab, Harvest, Finale, Solo, Slice Off, Battle Ballad and Inspiring Tune.
- [Leper](https://darkestdungeon.wiki.gg/wiki/Leper) — Chop, Hew, Purge, Revenge, Withstand, Solemnity and Intimidate.

**Implemented:** `src/skill-upgrades-batch4.js` contains the level 2–5 patches and the shared progression resolver automatically makes them actor-specific. New `makeFourthProgressionBattle` and **Champion / Beastmaster / Bard Lv5** button provide a 21-upgrade playable encounter while Priest remains level one.

**Representative verified numeric changes:**
- Houndmaster's Hound's Rush reaches ACC 105, CRIT +9%, +100% damage vs Marked and Bleed 2 per round; Hound's Harry reaches Bleed 3 per round at 150% application; Target Whistle applies -30% PROT at 170% base; Cry Havoc reaches 6 stress healed at 74% chance; Guard Dog reaches +20 dodge.
- Jester's Finale reaches ACC 160, CRIT +9%; Solo reaches ACC 145 and +30 dodge; Harvest and Slice Off bleed increase to 4 and 5 respectively; Battle Ballad reaches +10 ACC, +6% CRIT and +4 SPD; Inspiring Tune reaches 12 stress heal and 20% stress reduction.
- Leper's Chop/Hew reach 95 ACC; Revenge reaches +15 ACC, +35% damage and +11% CRIT while receiving +25% damage; Withstand reaches +30% PROT; Solemnity heals 10 HP and 7 stress; Intimidate reaches 115 ACC, -33% enemy damage and -5 enemy SPD.

**Regression tests:** `tests/fourth-class-progression.test.js` covers the new 84 patches and live combat status effects. `tests/browser/fourth-class-progression.spec.js` covers UI playability, self-buff/heal, Hound bleed and Jester Finale in Chromium. Prior cumulative coverage checks now expect 84.

**Unresolved parity caveats:** The original level-one prototypes still have some numerical and behaviour differences from the modern DD1 single-player tables (e.g. Leper's original Purge/Revenge descriptors); this pass updates the level 2–5 data but does **not** claim to correct all level-one mismatches or advanced interactions. The Leper Withstand mark and Revenge vulnerability ordering, Hound stress targeting, Jester Finale stack timing, enemy resistances and several effect-stat names require a full comparison in their own audit. Passing tests prove encoded behaviours, not game-wide fidelity.

**Next:** complete all skill levels for Hex Mage, Treasure Hunter and Spiritbound, then return to the mechanics parity audit and enemy/boss implementation before dungeon exploration.

## Pass 10 — All 105 hero skills have five-level upgrade tables (2026-11-14)

**Scope and milestone outcome.** Completed the remaining 21 level 2–5 tracks (84 upgrade entries), bringing the DD1 base-game hero catalog to **105/105 skills with level 1–5 entries**, spanning 15 classes. The implementation now has five separate level-five testing parties.

**Primary published single-player DD1 skill tables:**
- [Occultist](https://darkestdungeon.wiki.gg/wiki/Occultist) — Sacrificial Stab, Abyssal Artillery, Weakening Curse, Wyrd Reconstruction, Vulnerability Hex, Hands from the Abyss, Daemon's Pull.
- [Antiquarian](https://darkestdungeon.wiki.gg/wiki/Antiquarian) — Nervous Stab, Festering Vapours, Get Down!, Flashpowder, Fortifying Vapours, Invigorating Vapours, Protect Me.
- [Abomination](https://darkestdungeon.wiki.gg/wiki/Abomination) — Transform, Manacles, Beast's Bile, Absolution, Rake, Rage, Slam.

**Implementation details:**
- `src/skill-upgrades-batch5.js` supplies 84 additional level 2–5 upgrade entries and is merged by `src/skill-progression.js`.
- Spiritbound's shared Transform has **form-specific level data**: the level-five human-to-beast transformation heals 10 HP, increases SPD by 5, Blight Resist by 30% and DMG by 25%; beast-to-human reversion at level five applies no speed penalty. The engine now uses these values directly.
- Hex Mage's Wyrd Reconstruction progresses up to 0–22 HP and 85% bleed application; Hands from the Abyss reaches 150% stun chance. The existing random-heal/bleed implementation takes the per-level values.
- Treasure Hunter's Festering Vapours reaches 4 damage blight and -36% Blight Resist; Invigorating Vapours grants +10 party DODGE; Protect Me grants +20 PROT and +8 DODGE to its forced guardian and marks the guardian at levels 2–5.
- A new **Spiritbound / Hex Mage / Treasure Hunter Lv5** playable party equips all seven level-five skills for each new class, alongside a level-one Warrior.

**Verification:** `tests/final-class-progression.test.js` covers the final skill tables, actor isolation and live healing, guard, status effects, and both directions of upgraded Transform; `tests/browser/final-class-progression.spec.js` covers the final party and level-five combat in Chromium. All previously completed class test cases still run against the combined 105-skill catalog.

**Important fidelity limits:** Passing the complete progression registry does not establish exact reproduction of original DD1 combat. Several **level-one prototype definitions are known to differ from the published base tables** (examples: Hex Mage's base Weakening Curse/bleed values, and Treasure Hunter's Protect Me mark/protection and limited-use rules); retaining those definitions avoids silently breaking the original milestone's tests. Some higher-level patches now match the DD1 reference despite inherited inaccuracies at level one. Skill accuracy/critical/resistance evaluation and effect ordering require case-by-case review, along with Spiritbound transform-turn status progression, real enemy stats, gear and Guild progression, trinkets and battle AI. The next pass must explicitly correct incorrect base data and update tests to actual DD1 fixtures rather than declaring full fidelity.

**Next major milestones:** (1) hero-skill baseline/parity audit with original DD1 fixture comparisons and critical interaction tests; (2) enemy rosters, resistance profiles, tactical AI, bosses and stalling; (3) dungeon exploration; (4) the agreed Kingdom of Clays sandbox/settlement systems.
