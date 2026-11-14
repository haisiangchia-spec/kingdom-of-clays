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

## Pass 11 — Base skill parity: Occultist, Antiquarian and mark/heal engine rules (2026-11-14)

**Scope:** Begin the hero-class parity pass using primary single-player DD1 published skill tables, focusing on demonstrably incorrect level-one values in Hex Mage (Occultist) and Treasure Hunter (Antiquarian), and two shared-engine application rules. This is an initial **targeted pass**, not certification of 105 skills.

**References**
- [Occultist original DD1 skill tables](https://darkestdungeon.wiki.gg/wiki/Occultist)
- [Antiquarian original DD1 skill tables](https://darkestdungeon.wiki.gg/wiki/Antiquarian)
- [Official DD1 combat mechanics](https://darkestdungeon.wiki.gg/wiki/Combat_Mechanics_(Darkest_Dungeon))

**Corrections**
1. Weakening Curse, level one: -75% direct damage modifier, +5% CRIT, **-10% DMG and -10% PROT** (100% debuff base, three rounds). Previously -90% and -20% DMG were incorrect.
2. Wyrd Reconstruction, level one: **0–13 HP**, **60% bleed application** at **1 damage/turn over three turns**. The previous level-one bleed value of 3 was erroneously level-five strength.
3. Wyrd Reconstruction's bleed application now uses a **single roll against (skill application chance − effective target Bleed Resist)**, matching DD1 status application and preventing the previous mathematically incorrect two independent-roll multiplication. Its level-five bleed remains 85% base and 3 per turn.
4. Vulnerability Hex, level one: +5% CRIT, -90% damage modifier and **-15 DODGE** debuff, with three-turn mark. The shared mark handler now deals the skill's physical damage **only when a damaging modifier is explicitly supplied**. Purely non-damaging marks such as Arbalest's Sniper's Mark still cause zero physical damage.
5. Hands from the Abyss and Daemon's Pull level-one critical modifiers corrected to +9% and +5% respectively.
6. Get Down! level one now additionally provides +1 SPD (four-turn buff), alongside existing +15 DODGE and +10% Blight Skill Chance.
7. Protect Me level one: target guardian now receives **+10% PROT, +4 DODGE** for four turns, **Mark (three turns)**, and forced guard (two turns). Its usage limit is now **3 per battle** at level one, matching levels two through five. These buffs stack through the existing common status engine and guard timing.

**Automated evidence:** `tests/hero-baseline-parity.test.js` and `tests/browser/hero-baseline-parity.spec.js` provide independent deterministic and Chromium fixtures, including 5%/20% resistance-boundary roll cases, damage-bearing vs damage-free marks, reverse guard, and max-use enforcement. The previous level-one prototype test assertions were updated to match the original published DD1 values.

**Explicit unresolved issues:** Damage-bearing mark skills currently use a simplified critical/miss pipeline and must be checked against the full DD1 critical response, guarding redirection and accuracy streaks. Occultist heals can critically heal in the source game; current healing implementation and bleed interactions require that dedicated audit. The base Antiquarian and other fourteen-class stats, equipment/Resolve scaling, healing interactions, blight chance buffs, skill-specific round-duration exceptions and all monster/boss action rules require source comparisons. Passing the tests demonstrates the encoded rules for these fixtures, not complete original-game fidelity.

**Next suggested pass:** extend baseline parity to remaining Leper, Abomination and the other class-specific status/mark/heal interactions, then tackle enemy stat and AI fixtures.

## Pass 12 — Stun skip and guard interception hardening (2026-11-14)

**Stun fallback.** Direct callers of `takeTurn` now skip a stunned actor's action without spending per-battle limited uses or torch. Importantly, the early return also prevents the skipped skill from applying post-action movement, self-marks, riposte or buffs. The normal `prepareActorTurn` stun path remains the recommended controller entry point, and the direct-call branch is only a defensive equivalent. Regression coverage lives in `tests/turn-audit.test.js`; the stun work passed Node and Chromium CI at commit `c4c1ec67`.

**Guard interception.** The dedicated single-target `kind: 'mark'` handler previously bypassed guard, while ordinary attacks already resolved the guardian. Now direct marks (including the physical Occultist Vulnerability Hex and nondamaging marks) resolve the guardian before the hit/dodge roll, physical damage, marking and associated debuff. Exceptions can explicitly set `bypassGuard`. The original target is unaffected if intercepted. The caster's miss streak is also updated on mark hits/misses. Three new deterministic tests verify physical mark interception, nonphysical mark interception, and a guardian's successful dodge.

**Sources:** [DD1 Guard](https://darkestdungeon.wiki.gg/wiki/Guard_%28Darkest_Dungeon%29), [DD1 Mark](https://darkestdungeon.wiki.gg/wiki/Mark). This is a targeted interaction fix; other class skill numbers, enemy AI and full bestiary remain unverified.

## Pass 13 — Occultist critical variable healing (2026-11-14)

**Correction:** `variableHeal` previously rolled Wyrd Reconstruction's 0–13 (or upgraded) HP and applied bleed but had no critical heal path. DD1 single-target heals have a fixed **12% critical-heal chance**; critical healing doubles the rolled amount and relieves 4 stress from the recipient, even when the rolled heal is zero. Wyrd Reconstruction's bleed application remains independent of the critical-heal roll and uses skill application minus target Bleed Resist.

The engine also applies the target's `healingReceived` modifier to variable healing, consistent with existing fixed healing paths. A zero-point critical heal does not exit Death's Door, but may still cause bleed; positive healing clears Death's Door through the existing recovery path.

**References:** [DD1 Critical Hit — Critical Heals](https://darkestdungeon.wiki.gg/wiki/Critical_Hit_%28Darkest_Dungeon%29); [DD1 Occultist](https://darkestdungeon.wiki.gg/wiki/Occultist). Deterministic regression tests cover double healing, stress relief, zero critical healing/bleed, and received-healing modifiers. This is not a blanket certification of all healing and mortality interactions.

## Pass 14 — Healing modifiers cannot inflict damage (2026-11-14)

**Boundary case corrected.** The ordinary `heal` and `groupHeal` handlers previously added the rounded healing amount without enforcing a nonnegative floor. When a target had a cumulative `healingReceived` modifier lower than -100%, a supportive spell could subtract HP, potentially driving the target below zero without a legitimate damage or Death's Door event. Both paths now clamp the *effective healing amount* to zero before adding it to current HP, matching the guard already present on the `variableHeal` path.

**Tests:** `tests/hero-baseline-parity.test.js` now includes negative-modifier cases for a single-target heal and a party heal, including an ally already at Death's Door. This fixes a defensive engine invariant; it does not claim that an arbitrary -200% modifier is obtainable under standard DD1 equipment or abilities.

**Outstanding:** The broader healing pipeline still needs validation against live-game rounding order, critical modifiers and battle affliction edge cases. The enemy roster and tactical AI remain major next milestones.

## Pass 15 — Source-checked enemy and corpse mechanics (2026-11-14)

**Sources reviewed**
- [Official DD1 wiki: Corpse](https://darkestdungeon.wiki.gg/wiki/Corpse) — rank occupancy, no initiative, despawning, corpse-specific defenses, critical attack consequences.
- [Official DD1 wiki: Combat Mechanics](https://darkestdungeon.wiki.gg/wiki/Combat_Mechanics_%28Darkest_Dungeon%29) — initiative, default one action and multi-action monster exceptions.
- [Darkest Dungeon official modding guide](https://steamcommunity.com/sharedfiles/filedetails/?id=819597757) — per-monster `initiative` and `monster_brain` data, conditional skill-selection desires and target desires.

| Subsystem | Current implementation | Fidelity status | Remaining work |
| --- | --- | --- | --- |
| Corpse rank footprint | Preserved until destroyed/expired; size three bosses leave none | DD1-supported base behaviour | Check every monster's `noCorpse` flag and exceptions |
| Corpse resistance | Bleed/Blight 0%; Stun/Move/Debuff 200%; PROT/DODGE 0 | **Corrected and source checked** | Bleed/blight ticking on corpse needs dedicated round-lifecycle implementation |
| Critical hits on corpses | Single-target critical attacks do not grant hero stress relief; area attacks can | **Corrected and source checked** | Validate other critical stress interactions against authentic fights |
| Multi-action monsters | Engine supports multiple slots with one shared turn lifecycle | Engine capability; **boss-specific fixture provisional** | Read actual `initiative` entries for each intended monster |
| Enemy decision policies | Skill-first weighted selection, sample targeting profiles | **Provisional** | Replace test profiles with actual `monster_brain` desires and conditional weights |
| Goblin Emperor HP phases and summons | Custom low-HP phase, once-per-battle summon with rank check | **Kingdom of Clays exception / prototype** | Clearly identify as original content; never claim base DD1 boss parity |
| Enemy HP, resistances and abilities | Distinct working sample roster | **Provisional** | Record monster-by-monster source evidence before marking verified |

**Tests:** `tests/corpse-fidelity.test.js` and `tests/browser/corpse-fidelity.spec.js` cover the two corrected corpse mechanics and ensure corpses never receive initiative slots. Other systems remain intentionally flagged as provisional.

## Pass 16 — Corpse Bleed/Blight application and timing scaffold (2026-11-14)

The [DD1 Corpse reference](https://darkestdungeon.wiki.gg/wiki/Corpse) confirms corpses have 0% resistance to Bleed and Blight despite having no combat turns; the [combat mechanics reference](https://darkestdungeon.wiki.gg/wiki/Combat_Mechanics_%28Darkest_Dungeon%29) confirms corpses never receive initiative slots. The prototype previously blocked **all** secondary statuses on corpses, making their 0% Bleed/Blight resistance irrelevant. It now permits both DOT statuses while keeping stun and debuff applications excluded.

**Timing caveat:** Since no initiative turn belongs to corpses, the engine now ticks existing corpse Bleed/Blight stacks once when the next round starts, before clearing expired corpses and rolling initiative. This is an explicit **Kingdom of Clays scheduling approximation, not yet source-verified exact DD1 timing**. A tick can destroy a corpse and free the formation space without producing another corpse. Each stack's duration counts down independently. An already-dead corpse cannot receive future initiative slots.

**Automated coverage:** `tests/corpse-dot.test.js` and `tests/browser/corpse-dot.spec.js` cover application, duration countdown, destruction and absent initiative slots. Further research should establish the precise in-game corpse DOT trigger before calling this section fully DD1-faithful.

## Pass 17 — Conditional monster target desires (2026-11-14)

The [official DD1 modding guide](https://steamcommunity.com/sharedfiles/filedetails/?id=819597757) describes `marked_target`, `resistance_target`, `health_target`, `stress_target`, and `rank_target` among monster-brain targeting desires. These are part of the official data-driven AI vocabulary; their exact per-monster weights require inspection of actual monster-brain source files.

**Implemented architecture:** `src/enemy-ai.js` now accepts declarative per-monster target desires with optional skill restrictions. Marked heroes receive an additional preference weight, and skills such as the Skeleton Archer's Pinning Arrow can favour lower resistance. It chooses from **legal target IDs returned by the engine**, so target desires cannot override ability ranks, stealth or blocked targets. Unmarked and profile-free monsters retain deterministic fallback choices; the existing Court Mage stress preference, Archer rear preference and Emperor phase preferences are preserved.

**Fidelity distinction:** These are **Kingdom of Clays provisional weights**, not copied vanilla DD1 monster-brain probabilities. The official guide establishes the *types* of target desires, not the numerical weights 4× marked or 2× resistance preference used here. Do not present this as complete enemy-AI parity.

**Tests:** `tests/enemy-desires.test.js` and `tests/browser/enemy-desires.spec.js` cover mark changes, resistance effects scoped to specific skills, target legality and deterministic fallback. Future work should extract reference monster-brain entries and implement documented conditional *skill* desires as well as target desires.

## Pass 18 — Conditional enemy skill desires (2026-11-14)

The [official DD1 modding guide](https://steamcommunity.com/sharedfiles/filedetails/?id=819597757) identifies several `monster_brain` skill-selection desires: `specific_skill`, `heal_skill`, `effect_key_status_skill`, `ally_alive_skill`, `ally_dead_skill` and `performing_turn_skill`. The latter refers to the **monster's performing initiative**, not the battle's round number. These source-verified categories motivate, but do not fully define, the following implementation.

**Engine extension:** `src/enemy-ai.js` supports composable, optional conditional skill weights for living or defeated allied monster profiles, status-bearing legal targets (marked, stunned, Bleed or Blight) and a monster's next completed action count. Multipliers adjust the chance of selecting a skill only **after** `availableTargets` has found legal targets; they cannot bypass rank, phase or limited-use rules. `src/engine.js` tracks `actionsTaken` across rounds for non-free successfully executed skills. Stunned turns and passes do not advance the counter.

**Encounter examples:** Skeleton Swordsmen favour Shieldbreaker Bash after the Court Mage is defeated; Court Mages favour Courtly Dread when an eligible hero is blighted; the Goblin Emperor can modestly favour Imperial Slam on its second executed action. Existing HP-phase weights and legal target checks remain.

**Fidelity qualification:** Condition *types* reflect official DD1 modding concepts. These specific enemy profiles, multiplier numbers (3×, 2× and 1.5×) and counter semantics are provisional Kingdom of Clays implementation choices. They are **not claims of exact vanilla DD1 monster-brain probabilities**. Actual reference monster-brain files are needed before certifying monster-by-monster AI parity.

**Tests:** `tests/enemy-skill-desires.test.js` and `tests/browser/enemy-skill-desires.spec.js` cover ally and target conditions, legal target restrictions, action-count versus round behaviour, stun, and determinism.

## Pass 19 — Verified reference monster-brain profile: Veteran Cutthroat (2026-11-14)

**Source:** [Official Darkest Dungeon Wiki — Brigand Cutthroat](https://darkestdungeon.wiki.gg/wiki/Brigand_Cutthroat), sections *Skill Selection* and *Skill Targeting*, cross-checked with [Red Hook's official modding guide](https://steamcommunity.com/sharedfiles/filedetails/?id=819597757) on performing-turn skill desires. The wiki describes **Veteran/Champion** Cutthroat turn-dependent skill selection. This reference should not be confused with the Apprentice difficulty variant, whose skill probabilities are different.

**Playable Clays reskin:** The new **Outlaw Patrol · DD1 AI Reference** combat demo includes an `Outlaw Duelist` mapped to the Veteran Cutthroat's four attacks. Relative weights (prior to removing illegal skills) are:

| Performing action count | Crossblade Sweep | Rising Pommel | Outlaw Stab |
| --- | ---: | ---: | ---: |
| First action | **7** | **1** | **2** |
| Second action | **2** | **1** | **6** |
| Third and later | **2** | **1** | **2** |

- At rank 3 (zero-based rank 2), Rising Pommel is illegal: normalize remaining weights (7:2; 2:6; then 2:2).
- At rank 4 (zero-based rank 3), only Retreating Jab is legal, so it is selected with 100% probability and moves the Duelist forward one rank.
- The **verified scope** is the Veteran Cutthroat's relative AI skill-selection weights, rank-eligibility pattern, and published Veteran baseline HP/DODGE/PROT/SPD/resistances.
- **Still provisional:** Exact attack damage, hit chance, non-Shank effects, and all other Clays monsters. The Duelist abilities use custom names and approximate effect values, not fully verified DD1 attack numerical parity.

`src/enemy-ai.js` supports an optional per-monster `turnWeights` table keyed to `actionsTaken+1` (with `later` fallback). The legal skill filter occurs before the weighted draw, exactly so disabling one attack automatically renormalizes surviving weights. `tests/outlaw-duelist-reference.test.js` and `tests/browser/outlaw-duelist-reference.spec.js` cover the documented branch cases.

**Verified Shank target priority:** The Wiki reports a **+100% relative chance** to target the hero with the lowest Bleed resistance and, at Veteran difficulty, **+300% relative chance** to target a marked hero. `additiveTargetWeight` implements those as bonuses **+1** and **+3** to a default target weight of 1; the bonuses add (rather than multiply) if a target meets both conditions. For four targets with only one marked hero, this means relative weights **1:4:1:1**, not guaranteed targeting. These bonuses apply only to `duelist_shank` and only across currently legal targets. Tests include the interaction between lowest resistance and mark status.

**Outstanding AI parity:** Continue mapping additional monster brains from reference data without assuming every reskin shares its source creature's behaviour.

## Pass 20 — Veteran Cutthroat ability data and resistance sign (2026-11-14)

**Source:** [Official DD1 wiki: Brigand Cutthroat](https://darkestdungeon.wiki.gg/wiki/Brigand_Cutthroat), Veteran abilities table. The *Outlaw Duelist* remains an original-name reskin. Individual skills now carry their own damage range; these ranges replace the actor's shared base damage only for skills that specify them.

| Reskinned skill | Veteran ACC | CRIT | DMG | Status / movement |
| --- | ---: | ---: | ---: | --- |
| Crossblade Sweep (Slice and Dice) | 78.75% | 16% | 4–7 each | Front two heroes; 120% -25 Bleed Resist |
| Rising Pommel (Uppercut Slice) | 78.75% | 12% | 3–5 | Push 1 rank, 120% |
| Outlaw Stab (Shank) | 82.5% | 12% | 5–11 | Bleed 2, 120% |
| Retreating Jab (Harmless Poke) | 52.5% | 0% | 3–5 | Advance 1 rank and +2 SPD |

The engine already applies the hidden DD1 +5 ACC correction to the skill's nominal ACC. The target's DODGE still lowers hit probability, and PROT reduces direct damage but not DoT. The Speed buff's exact duration is currently a **provisional two-turn fixture**, pending confirmation from game data; its **+2 value** is source-backed.

**Related bug fixed:** The shared secondary-status resistance path previously **subtracted** effect modifiers from the target's baseline resistance. With a -25 Bleed Resist debuff this mistakenly made the target **more** resistant. The application now uses **baseline resistance + signed modifier**; the same correction applies to debuff resistance. A follow-up Shank regression checks that -25 Bleed Resist increases the chance of Bleed.

**Tests:** `tests/outlaw-duelist-abilities.test.js` and `tests/browser/outlaw-duelist-abilities.spec.js` check damage ranges, AoE hits, status modifiers, knockback, retreat and buff. This is an implementation-level ability parity pass, not a full certification of round-by-round game behaviour or animations.

## Pass 21 — Apprentice Bone Arbalist reference encounter (2026-11-14)

**Reference:** [Official DD1 wiki — Bone Arbalist](https://darkestdungeon.wiki.gg/wiki/Bone_Arbalist). This pass uses **Apprentice** difficulty data only, not Veteran Marksman or Champion Sharpshooter values. Kingdom of Clays names the reskin **Crypt Arbalist** and introduces the **Crypt Volley · DD1 Arbalist Reference** encounter (two swordsmen, two independently spawned Arbalists).

**Source-backed profile:** HP 15, DODGE 5%, PROT 0%, SPD 5, Unholy type, Stun 10%, Blight 10%, Bleed 200%, Debuff 15%, Move 25%. Two abilities:

| Clays reskin | Source skill | User ranks (front=1) | Target ranks | ACC | CRIT | DMG | Special |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| Crypt Quarrel | Quarrel | 3–4 | 2–4 | 82.5% | 12% | 3–7 | +25% damage against marked heroes |
| Crypt Bayonet | Bayonet Jab | 1–2 | 1–2 | 72.5% | 2% | 2–4 | Self back one rank |

The engine's previously audited global hidden +5 accuracy calculation still applies. Quarrel and Bayonet ranks do not overlap, so the Arbalist is forced to use its weaker Bayonet when moved to the front. Self movement resolves even if Bayonet misses. The status and movement behavior are independently exercised in Node.js and Chromium tests.

**Fidelity boundaries:** The reference establishes the Apprentice stats, attack values and forced rank-dependent selection. It does not establish the behaviour of a mixed Clays encounter or the targeting weights among multiple eligible heroes; those are still prototype defaults. The separate `Skeleton Archer` profile and its provisional abilities remain unchanged. Do not apply this Apprentice reference to Veteran or Champion scaling without independent verification.

**Tests:** `tests/crypt-arbalist-reference.test.js` and `tests/browser/crypt-arbalist-reference.spec.js` check profile fields, legal ranks, marked damage, forced bayonet use, post-attack retreat and duplicate independence.

## Pass 22 — Apprentice Bone Defender reference and Shieldwall Volley (2026-11-14)

**Source:** [Official DD1 wiki — Bone Defender](https://darkestdungeon.wiki.gg/wiki/Bone_Defender) (Apprentice difficulty). The Kingdom of Clays **Crypt Shieldbearer** is a renamed version used alongside two **Crypt Arbalists** in the playable **Shieldwall Volley** encounter. This makes a four-enemy reference formation, while keeping the standalone, provisional Skeleton Swordsman roster unchanged.

**Verified Apprentice baseline:** HP 15; DODGE 0%; PROT 25%; SPD 0; Unholy; STUN 25%; Blight 10%; Bleed 200%; Debuff 15%; Move 50%. Source-checked abilities:

| Reskinned skill | DD1 reference | Usable ranks | Hero targets | ACC | CRIT | DMG | Effect |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| Crypt Axeblade | Axeblade | 1–2 | 1–2 | 72.5% | 6% | 3–5 | No additional effect |
| Grave Weight | Dead Weight | 1–2 | 1–2 | 82.5% | 6% | 2–4 | 100% Stun; 100% knockback one rank |
| Clumsy Axeblade | Clumsy Axeblade | 3–4 | 1–2 | 42.5% | 0% | 2–4 | Advance one rank |

**Source-checked Apprentice monster brain:** On first performed action, Axeblade and Dead Weight have a **4:1** relative choice ratio, thereafter **1:1**. If **three or more heroes are stunned**, Dead Weight is excluded; it also does not choose stunned victims. In ranks 3–4, only Clumsy Axeblade can be used, and the Shieldbearer moves toward the front. Axeblade gains an additive **+200%** target weighting for marked heroes; Dead Weight gains **+200%** for a hero with the lowest Move resistance. These boosts do not guarantee the target.

**Fidelity boundaries:** The attack data, Apprentice profile, skill-selection ratios, forced fallback and target preference values have direct published references. Mixed encounter composition and specific reskinned character names are original Clays choices. Exact combined Stun/knockback sequencing and all non-reference enemies still need deeper validation; a particular chance roll can resist either effect independently.

**Tests:** `tests/crypt-shieldbearer-reference.test.js` and `tests/browser/crypt-shieldbearer-reference.spec.js` cover baseline stats, duplicated units, 4:1/1:1 choices, stun exclusions, marked/Move-resist preferences, forced fallback, Stun and knockback.

## Pass 23 — Seeded reference-enemy dungeon encounter generation (2026-11-14)

**Scope:** `src/encounter-generator.js` introduces reusable, **seeded and weighted** compositions made exclusively from the already audited DD1 reference-enemy reskins (`cryptDefender` / Bone Defender, `cryptArbalist` / Bone Arbalist and `duelist` / Veteran Cutthroat). `makeGeneratedEncounter(seed,difficulty)` creates a normal combat-engine battle with four existing playable heroes and an `encounterPlan` record. The new Scout, Patrol and Gauntlet buttons in the combat lab launch independently reseeded battles.

**Difficulty is a Clays prototype concept, NOT a DD1 dungeon level or its source encounter table.** The weighting tables and threat points are authored for Kingdom of Clays; no claim is made that they reproduce DD1's actual spawn probabilities, hallway/room encounter lists, rarity or region-specific distributions.

| Difficulty | Candidate compositions | Relative weights |
| --- | --- | --- |
| Scout | Shieldline (Defender, Defender, Arbalist); Cutthroat Raid (Duelist, Defender, Arbalist); Ambush (Defender, Duelist, Arbalist) | 5:3:2 |
| Patrol | Shieldline; Cutthroat Raid; Shieldwall (Defender, Defender, Arbalist, Arbalist); Mixed Raid (Duelist, Defender, Arbalist, Arbalist); Vanguard (Defender, Duelist, Arbalist, Arbalist) | 1:1:4:3:2 |
| Gauntlet | Shieldwall; Mixed Raid; Vanguard; Cutthroat Pair (Duelist, Duelist, Arbalist, Arbalist) | 2:4:3:1 |

**Invariants:** Four occupied ranks maximum; each independently instantiated monster receives a unique ID, per-instance HP/status/loadout, and at least one legal skill from its starting position. The same seed and difficulty produce the same template and enemies; source-verified enemy stats are not silently scaled. This layer is deliberately independent of exploration, loot and quest mechanics, so dungeon rooms and corridors can later request the same generator.

**Tests:** `tests/encounter-generator.test.js` verifies probability interval boundaries, deterministic seeds, hundreds of generated formations, duplicate isolation, difficulty progression and AI/skill legality. `tests/browser/encounter-generator.spec.js` verifies UI modes and legal seeded combatants in Chromium.

**Remaining:** Source-audit DD1 encounter weights by dungeon region, quest difficulty and room/hallway context, then add region-specific tables and journey state before implementing the dungeon map. The new threat points are only relative composition indicators.

## Pass 24 — First persistent dungeon exploration slice (2026-11-14)

**Scope:** `src/dungeon.js` introduces an independent, seeded five-room graph (Entrance → Gallery → Guard Post / Relic Vault → Sanctum) connected by bidirectional two-step corridors. `dungeon.html` and `src/dungeon-app.js` provide a playable browser expedition, linked from the existing Combat Lab. `makeGeneratedEncounter` supplies corridor and room combat from the reference-enemy generator developed in Pass 23.

**Travel/combat invariants:** An adjacent-room move begins a corridor journey; each advance moves one corridor step. Encounter checks occur on the first step of each corridor, with an intentionally guaranteed tutorial encounter from Entrance to Gallery. Combat blocks additional travel. On victory, the pending route resumes at the same step; on defeat, the expedition ends. Rooms with a first-visit encounter trigger once on arrival and remain cleared after victory. The Sanctum room objective completes the expedition only after its combat is won. The player can revisit rooms and traverse cleared corridors without replaying their completed encounters.

**Persistent party:** Each battle instantiates the same four heroes with copied HP, max HP, stress, death state, statuses, skill progression and temporary effects from the expedition party. After battle, all surviving and fallen hero states are copied back. Torch carries across battles and corridor steps. Copies avoid unwanted shared references to prior battle state.

**DD1 fidelity boundary:** This is a **Kingdom of Clays functional scaffold, not source-verified DD1 exploration**. Room graph topology, corridor lengths, 35% encounter probability, starting torch 75, travel torch drain 1 per step, use of Scout reference enemies and guarantee of the first corridor encounter are provisional gameplay values. DD1-specific curios, traps, scouting, hunger, stress costs, provisions, retreat, camping, room rewards, backtracking cost, quest conditions and fog of war remain to be implemented or audited. This first slice has no automatic post-battle health recovery.

**Automated coverage:** `tests/dungeon.test.js` tests connected topology, blocked travel during combat, exact continuation after corridor victory, hero HP/stress persistence, no duplicated room encounters, victory/defeat and seed determinism. `tests/browser/dungeon.spec.js` verifies the page link, playable corridor and combat transition, persistent party damage, and complete expedition success in Chromium.

## Pass 25 — Provision inventory, torchlight bands and corridor traps (2026-11-14)

The expedition now starts with **3 torches and 8 food**, represented as persistent per-expedition supplies. During exploration, a torch can be spent to restore **25 light** (capped at 100) or food spent on a living wounded hero to restore **2 HP** (capped at max HP). Supplies cannot be spent in combat, or used when their intended effect would have no benefit. The visible light bands are Radiant (75–100), Dim (50–74), Dark (25–49) and Pitch-black (0–24). The dungeon continues to store torchlight between combat and travel steps.

Corridor encounter probability in this prototype now depends on torchlight: 30% at 75+ light, 40% at 25–74 and 55% below 25, while the Entrance–Gallery tutorial encounter is guaranteed. In the two corridors approaching the Sanctum, a one-time, deterministically seeded trap check occurs on the first traversal. Trap probability is 15% at 75+ light, 30% at 25–74 and 50% below 25. The trap inflicts 2 HP and 5 stress on the first living hero; if it defeats the entire party the expedition ends. A checked corridor cannot reroll its hazard on later trips.

**Critical fidelity boundary:** Starting quantities, light bands, numerical torch restoration, food healing, hazard and combat probabilities, trap damage and limited hazard placement above are **new Kingdom of Clays campaign fixtures**, not claimed as exact Darkest Dungeon 1 mechanics. They are intended as a playable interface to expand into DD1 scouting, trap disarming, hunger, provisions, light thresholds, stress and encounter roll tables.

**Regression coverage:** `tests/dungeon-provisions.test.js` and `tests/browser/dungeon-provisions.spec.js` cover legal and illegal supply use, persistent inventory, light changes, deterministic hazard checks and browser controls.

## Pass 26 — Interactive scouting, disarming, hunger and curios (2026-11-14)

This milestone extends `src/dungeon.js` and the playable `dungeon.html` expedition with **optional scouting** of adjacent corridors, **trap-disarming attempts** before entering a scouted trapped corridor, **hunger decisions** and **one-time curios** in Ashen Gallery / Relic Vault.

**Scouting:** From a room, scouting an adjacent corridor costs 2 torchlight, is allowed once per corridor, and records whether the existing seeded enemy and trap checks will occur. This prevents scouting from rerolling the same danger on repeat visits. If a trap is revealed, the party can select any living hero to disarm it before taking the corridor's first step. The chance is `min(95%, 55% + 4% × hero SPD)`; success removes the trap and reduces that hero's stress by 3; failure immediately triggers the trap's previously defined HP/stress effect. An inspected or disarmed trap cannot trigger again. Unscouted traps continue to resolve automatically at corridor entry, preserving earlier expedition behaviour.

**Hunger:** The browser expedition enables explicit hunger choices (the headless `createDungeon` API supports `interactiveEvents:true`, with its default off to preserve legacy non-interactive exploration consumers). After every four completed corridor steps, the **next attempted step** pauses travel for a meal decision: spend four food for no damage or skip and inflict 3 HP and 15 stress on each living hero. The same hunger check cannot repeat at the same step. If all heroes die, the expedition ends.

**Curios:** The Ashen Gallery contains an Abandoned Reliquary and the Relic Vault a Sealed Urn. A curio can be permanently left, touched (50% deterministic chance of 100 loot; otherwise 12 stress to the first living hero), or purified using the expedition's one starting holy water for a guaranteed 175 loot. Every curio can be interacted with only once. Loot and remaining holy water persist within the expedition.

**Fidelity scope:** These are **provisional Kingdom of Clays mechanics**, not certified DD1 rules, source-verified probabilities or original DD1 curio interactions. In particular, the scripted fixed dungeon, one-time corridor hazards, scouting cost, scouting certainty, disarm formula, hunger cadence, ration requirements, loot values and chosen curios are new prototype choices. DD1 scouting, hero trap skills, curio provision interaction tables and quest-specific hunger algorithms remain to be audited.

**Verification:** `tests/dungeon-decisions.test.js` and `tests/browser/dungeon-decisions.spec.js` cover seeded forecasts, disarm success/failure, hunger blocking and refusal, provision requirements, curio persistence and the real browser UI. Existing non-interactive dungeon tests remain backward compatible.

## Pass 27 — Expedition inventory, treasure stacks and collection choices (2026-11-14)

**Implementation:** `src/inventory.js` adds an 8-slot shared expedition pack with independent stacks of food (4), torches (2), holy water (1), and gold (100). These sizes and the capacity are **Kingdom of Clays provisional balancing choices**, not validated DD1 inventory limits. Provision quantities continue to be stored in their established `supplies` and `curioSupplies` fields: `inventoryStacks` derives supply stacks on demand, avoiding duplicate inventory counters. Treasure is maintained separately in `inventory`; `loot` tracks its currently carried gold total.

**Loot interaction:** Successful Gallery/Vault curios offer 100 or 175 gold; completed non-final battles offer a provisional 50 gold. In interactive expeditions the reward enters `pendingLoot` and **must be collected or left** before travel or other curio interaction continues. Collecting merges available partial gold stacks before using new slots. If the complete offered quantity will exceed eight slots, collection is rejected without partially modifying items or gold totals; the player may discard a provision or a treasure stack and try again, or leave the reward. Discarding carried gold reduces both the gold stacks and the carried-gold total. Discarding provision stacks immediately updates food, torch or holy-water quantities. Inventory may not be discarded during combat.

**Compatibility:** Non-interactive `createDungeon` use retains earlier immediate curio reward collection, while the interactive dungeon page uses pending decisions. All reward examples are original Clays fixtures and do **not** represent exact DD1 economy, item values, money stack limits or post-combat loot drops.

**Testing:** `tests/dungeon-inventory.test.js` and `tests/browser/dungeon-inventory.spec.js` cover initial supply accounting, gold stacking and merging, atomic overflow, discard-and-collect, leave behind, curio reward persistence, battle loot locks and real browser controls. Existing hunger traversal regression helpers resolve pending battle loot to preserve their intended test path.

**Remaining:** More item categories, DD1-accurate provision capacities and stack sizes, reward tables, actual trinkets/heirlooms, item sorting, quest rewards and settlement conversion after the expedition.

## Pass 28 — Gems, heirlooms, trinkets and settlement handoff (2026-11-14)

This milestone expands the expedition inventory from gold to four additional reward types: **Moonstone gems** (3 per stack, 125 gold each), **Crests** (6 per stack), **Deeds** (4 per stack), and unique **Ward Charms** (1 trinket per stack). Existing gold, food, torch, and holy-water stack behaviour is retained; all rewards continue to count against the same 8-slot pack limit. Mixed rewards merge with existing stacks of the same kind, and capacity checks are atomic. Discarding gold reduces carried gold; discarding a gem, crest, deed, or trinket removes the appropriate stack without incorrectly changing the gold counter.

**New deterministic reward fixtures:** Non-final corridor battles ordinarily offer 50 gold. The Guard Post room victory offers 3 Crests; the Relic Vault room victory offers 2 Moonstones; Sanctum approach corridor battles offer 2 Deeds. Purifying the Sealed Urn in the Vault offers one Ward Charm in interactive expeditions; older non-interactive calls retain their immediate-gold behaviour. The new reward types reuse the pending-loot collect / leave / discard-to-make-room choice, and persist until the expedition ends.

**Settlement reward handoff:** On victory, an explicit **Return rewards to settlement** control transfers all *carried* valuables to an in-memory settlement record once. Gold plus the sale value of Moonstones becomes settlement gold. Crests and Deeds are separate upgrade currencies, and Ward Charms enter a trinket collection. A second transfer from the same expedition is rejected, and unclaimed or discarded items are excluded. The settlement survives a new expedition within the same browser page, but is **not yet saved persistently across page reloads**. This is a foundation for the future Temple, Market, upgrades, and other settlement facilities.

**Fidelity warning:** Reward types are inspired by DD1 but the specific stack sizes, values, item names, source-specific drops, payout conversion, economy and end-of-quest settlement behaviour are **provisional Kingdom of Clays rules**, not exact original DD1 data. Death/retreat reward retention and persistent settlement storage still require implementation.

**Coverage:** `tests/dungeon-rewards.test.js` and `tests/browser/dungeon-rewards.spec.js` validate heterogeneous stacking, reward selection, Vault trinkets, inventory overflow and once-only settlement payouts.

## Pass 29 — Persistent settlement, facility upgrades and browser campaign saves (2026-11-14)

This milestone connects the earlier single-expedition reward handoff to an upgradeable **campaign settlement**, implemented in `src/settlement.js`. Settlement resources include gold, Crests, Deeds and Ward Charm trinket storage, with completed-expedition tracking and three upgradable facilities. The next-tier upgrade consumes gold and, where applicable, heirloom currency, with escalating requirements and a level-three cap. Resource checks run before any deduction, preventing partially paid upgrades.

| Facility | Level-1 cost | Per-level benefit for *future* expeditions |
| --- | --- | --- |
| Market | 100 gold + 1 Crest | +2 starting food |
| Guild | 125 gold + 1 Deed | +2 maximum and current starting HP per hero |
| Temple | 150 gold + 1 Crest + 1 Deed | −2 stress per hero from skipping hunger |

Costs multiply by the level being purchased (second level ×2, third ×3). No upgrade modifies the currently active expedition; new expeditions use the settlement's purchased benefits. These three effects, names, costs and tiering rules are **provisional Clays campaign values**, not DD1 source-verified upgrade trees. Resurrection, stress-treatment services, permanent hero-roster progression and actual DD1 hamlet building functions remain separate future work.

**Persistence:** The browser expedition now automatically saves both settlement and active dungeon state to first-party `localStorage` under the versioned key `kingdom-of-clays-campaign-v1`. The save includes party HP/stress/status, rooms/corridors, supplies, loot, pending choices, pending combat state, facility levels, treasury, trinket store, and the deterministic combat RNG cursor (`randomCalls`). Reloading restores the expedition rather than starting a fresh one, while **New expedition** creates a new seeded dungeon without discarding settlement resources or upgrades. Malformed JSON, unknown schema versions, negative currencies, impossible facility levels and invalid trinket data are rejected. Browser storage is device/browser-local, is not cloud-synced, and can be cleared by the browser; no cross-device account persistence is implied.

**Reward integrity:** The prior once-only `rewardClaimed` flag is included in expedition saves. Returning an expedition's gold, gem proceeds, heirlooms and trinkets to settlement is rejected when already claimed; no double-counting should occur from reloading. Settlement `completedExpeditions` increments on a successful handoff.

**Verification:** `tests/settlement.test.js` covers upgrade costs, max-level checks, atomic failure, new-expedition bonuses, hunger stress, save serialization/validation and one-time reward transfers. `tests/browser/settlement.spec.js` tests the actual UI, reloads an in-progress expedition, transfers an end-of-quest reward, upgrades a facility, reloads the settlement, and launches a new expedition with its earned bonus.

**Remaining DD1 fidelity:** Proper hero roster persistence, town services, resurrection in the Temple (user-approved exception), stress treatment, trinket equipment, provision purchasing and retirement/death lifecycle. These will require separate mechanics and tests before campaign parity can be claimed.

## Pass 30 — Persistent hero roster, recruitment, death, equipment and Temple resurrection (2026-11-14)

**Scope:** `src/hero-roster.js` introduces stable named heroes with persistent `rosterId` identities, current health/stress, class and combat template, Resolve XP and level, single equipped Ward Charm slot, and death state. The settlement in `src/settlement.js` stores the roster, ordered four-rank squad, recruitment serial and dismissed-hero graveyard inside its existing versioned browser save. Older settlement saves without a roster receive four default starter heroes on load. Expeditions create copies of the selected roster heroes and assign temporary `h1`–`h4` combat IDs, allowing multiple instances of the same class and retaining the rank-specific combat UI.

**DD1-backed baseline:** [Heroes reference](https://darkestdungeon.wiki.gg/wiki/Heroes_%28Darkest_Dungeon%29), [Stage Coach](https://darkestdungeon.wiki.gg/wiki/Stage_Coach) and [Resolve Level](https://darkestdungeon.wiki.gg/wiki/Resolve_Level). Basic Stage Coach recruitment is **free** and the starting roster capacity is **8**; duplicates of a class are permitted. Short Apprentice victories award **2 Resolve XP**. The implementation uses standard Darkest XP thresholds `[0,2,8,14,24,36,48]` for Resolve levels 0–6, but currently restricts selectable classes to the four hero class templates implemented in the playable combat UI. Additional class reskins and Stage Coach availability/upgrade tables remain to be implemented.

**End-of-expedition state:** When a dungeon ends in victory or defeat, the current party is copied back to its permanent roster exactly once. HP and stress survive between expeditions; dead heroes remain dead and cannot join the next party. Survivors of a victory gain the quest XP; the defeated party earns none. Guild HP bonuses are removed from saved baseline maximum/current HP on return and reapplied when the hero embarks again, preventing repeated permanent stat inflation. Temporary battle-only effects are cleared, while permanent `skillLevels` remain. Previously equipped Ward Charms are associated with the permanent hero, can be unequipped into settlement storage, and can be equipped from storage between expeditions.

**Retirement and replacement:** A full roster with dead members cannot become permanently softlocked. Between expeditions the player can permanently dismiss heroes, freeing roster capacity and leaving an unfilled party rank if applicable. A new recruit can occupy that rank. Dismissed dead heroes enter a permanent Graveyard record and can no longer be resurrected; living retirees return their equipped charm to storage, whereas dead heroes lose it. Empty party ranks cannot embark.

**User-approved divergence — resurrection:** While DD1 death is ordinarily permanent (except the rare From Beyond town event), Kingdom of Clays deliberately allows resurrection at the **Temple level 1+** for **250 gold**, restoring the selected fallen hero at 50% HP and 100 stress while retaining their Resolve level. This cost, repeatability and aftermath are original Clays rules, not vanilla DD1. A dismissed hero cannot be resurrected.

**Other provisional deviations:** No Stage Coach weekly candidate randomness yet; only four starter class templates; one instead of two wearable trinkets; no active combat stat benefit from a Ward Charm yet; no hero quirks, diseases, weapon/armor upgrades, standard DD1 town stress services or level-based expedition restrictions. Persistent wounds after quests and the present retirement costs/returns should also be treated as prototype rules until source audited.

**Tests:** `tests/hero-roster.test.js` covers unique roster IDs, duplicate recruits, squad reordering, persistent injuries and deaths, quest XP, Guild bonus reversal, paid Temple revival, equipment handling, save migrations, once-only roster and loot handoff, and full-roster dismissal/replacement. `tests/browser/hero-roster.spec.js` verifies recruitment, load/save roundtrips, party selection, resurrection, equipment and replacing a dead hero when the roster is full.

## Pass 31 — Weekly Stage Coach, Abbey/Tavern recovery and town availability (2026-11-14)

**Reference:** [DD1 Stage Coach](https://darkestdungeon.wiki.gg/wiki/Stage_Coach), [DD1 Abbey](https://darkestdungeon.wiki.gg/wiki/Abbey), [DD1 Tavern](https://darkestdungeon.wiki.gg/wiki/Tavern), [DD1 Stress](https://darkestdungeon.wiki.gg/wiki/Stress). The Stage Coach supplies **free** candidates that refresh on the passage of a quest week, rather than letting the player select any class without limit. A hero in Abbey/Tavern stress treatment is unavailable for the next expedition; treatment completes on return from that expedition. Non-deployed, non-treated idle heroes lose 5 stress per week. Apprentice base services **Cloister** and **Bar** each cost **1000 gold** and relieve **45 stress**.

**Clays implementation:** `src/town-week.js` provides deterministic week-number-seeded candidates, one-time recruitment from a displayed offer, a single slot in each of the Abbey and Tavern, cost-validated treatment booking, no simultaneous treatment in two buildings, and an idempotent week-ending transition. Every completed expedition increments the town week and refreshes the candidate selection **once**, independently of screen redraws and browser reloads. Booked heroes recover stress during the week and cannot embark, be selected into a new slot, or be dismissed while undergoing treatment. Current provision, expedition and roster data remain in the same versioned browser save. Existing saves from Pass 30 without `town` gain an initial set of weekly candidates on migration.

**Source-fidelity boundary:** Weekly refreshing/free recruitment, basic stress-service cost/relief and idle −5 stress follow DD1 references. Candidate **class probability and deterministic seed generator**, number of offers beyond the baseline, available stress-building rooms, treatment availability from week one, omission of side effects and caretaker room blocking are **provisional**. The current playable four classes are only a subset of the reskin roster; weekly offers do not simulate class-specific arrival odds or the Stage Coach Network/Barracks/Experienced Recruits upgrade tree. The full DD1 Hamlet has additional treatment rooms with different costs/effects, a 37.5% chance of treatment side effects, and later weekly unlocks. Battle XP, permanent class progression and stress mechanics continue to be audited separately.

**CI:** `tests/town-week.test.js` verifies deterministic offers, one-time recruit claims, per-week progression, Abbey/Tavern booking rules, 5-stress idle recovery, atomic insufficient-resource failure, migration, and save roundtrips. `tests/browser/town-week.spec.js` verifies the actual town UI, booked hero unavailability, completed treatments and refresh idempotence across reloads. Earlier roster browser tests now select from actual week-two Stage Coach offers.

## Pass 32 — Persistent quirks, diseases and week-four Sanitarium (2026-11-14)

**Reference:** [DD1 Sanitarium](https://darkestdungeon.wiki.gg/wiki/Sanitarium), [Quirks](https://darkestdungeon.wiki.gg/wiki/Quirks), [Diseases](https://darkestdungeon.wiki.gg/wiki/Disease). The DD1 Sanitarium unlocks **Week 4**, with **one quirk-treatment ward and one medical ward** initially. Base Apprentice costs are **1,500 gold** to remove an unlocked negative quirk, **5,000** to remove a locked negative quirk, **7,500** to lock a positive quirk, and **750** to treat one disease. A hero may hold five positive and five negative quirks and up to three diseases, with no more than three locked positive quirks. Treatments occupy a hero for a town week.

**Implemented:** `src/sanitarium.js` stores separate per-hero arrays of positive and negative quirks, lock status, and diseases; the roster and bookings serialize in the existing campaign save. The newly implemented Sanitarium unlock gate, source-backed Apprentice costs and initial ward capacities allow a negative quirk to be removed, a positive quirk locked, or a disease cured. Booking consumes gold atomically and blocks the hero from other town treatment, dismissal, party selection or embarkation. Two different heroes can use the quirk and medical wards simultaneously. Successful quests perform an idempotent seed-based, per-hero trait roll; the town-week transition finishes booked Sanitarium treatments exactly once, restores hero availability, and keeps settled results across browser reloads. Existing saved rosters without trait records are migrated to empty lists.

**Fidelity boundary:** The current trait subset (**Sturdy**, **Eagle Eye**, **Nervous**, **Slow Reflexes**, **Creeping Cough**, **Ashen Fever**) is an authored Clays prototype set; no combat stat modifiers or monster disease-infliction mechanics have yet been wired. Trait roll odds (20% positive, 20% negative, 10% disease), deterministic choice, the small trait pool, simplistic slot overflow, absence of chronic negative-quirk locking and no secondary disease-removal chance are **not certified DD1 equivalents**. Higher-level cost scaling, cost-reduction/Patient Cells upgrades, extra Sanitarium wards, quirks earned from curios, and DD1 disease interactions remain for later passes.

**Regression:** `tests/sanitarium.test.js` checks week-four unlock, source-backed prices, ward occupancy, disease/quirk treatment, lock status and save migrations; `tests/browser/sanitarium.spec.js` checks real browser bookings, persistence across reloads, recovery after a town week and treatment restrictions.

## Pass 33 — Trait stat effects, crypt disease exposure and negative quirk reinforcement (2026-11-14)

**Scope:** `src/trait-effects.js` implements a first set of **combat-effective** numeric modifications for permanent positive/negative quirks and diseases already stored on the roster. Effects are applied to temporary expedition units when the party embarks, propagate through actual combat formulas (accuracy, speed/initiative, dodge, resistances, maximum HP), and are precisely **reversed on roster return**. Existing HP loss, stress and permanent disease lists remain; no permanent stacking of temporary bonuses occurs between expeditions, and Guild max-HP modifiers are still independently reversed. Diseases newly contracted mid-expedition immediately update combat stats and are synced to the permanent hero after the expedition. The source-audited combat lab encounters never receive additional disease rolls.

| Clays trait | Initial gameplay effect | Fidelity status |
| --- | --- | --- |
| Sturdy | +2 maximum and current HP | Provisional |
| Eagle Eye | +5 accuracy | Provisional |
| Nervous | −2 speed | Provisional |
| Slow Reflexes | −5 dodge | Provisional |
| Creeping Cough | −2 speed | Provisional |
| Ashen Fever | −5 accuracy, −10 bleed resistance | Provisional |

**Disease transmission:** In roster-led dungeon battles only, each damaging hit from a `cryptDefender` or `cryptArbalist` rolls an additional **8%** disease-exposure check. The disease is selected with the combat RNG and is prevented if already present or the three-disease cap is reached. Such rolls use the saved combat RNG cursor, preserving deterministic replay and in-progress save/reload behaviour. Neither the chosen source monsters nor the specific 8% odds are intended as DD1 canon; source-accurate disease-applying skills and monsters remain to be modelled.

**Negative quirk reinforcement:** After a victorious expedition, the existing seeded trait-roll path may select a negative quirk already present. A repeated quirk is now **locked** rather than added twice, requiring the Sanitarium's more expensive locked-negative removal. This is a deliberately simplified stand-in for DD1's negative-quirk reinforcement and is idempotent on replay/reload.

**Non-combat boundaries:** Full original DD1 quirks, conditional modifiers, disease transfer and cure odds, trait rarity, disease-inflicting enemy skills, and exactly sourced numerical effects are not yet implemented. The six current traits remain Kingdom of Clays prototypes; the stat values above must not be cited as the original game's effects. Expansion to the 17-class roster and higher-difficulty disease interaction requires further audit.

**Coverage:** `tests/trait-effects.test.js` and `tests/browser/trait-effects.spec.js` cover cumulative individual stat modifiers, repeated expedition returns without numerical drift, immediate crypt disease exposure and later persistence, disease cap/duplicate guards, negative-quirk reinforcement, and save/reload compatibility. The original combat reference tests remain unchanged.

## Pass 34 — Source-backed Sanitarium upgrade trees, conditional quirks and an explicit disease skill (2026-11-14)

**Primary sources:** [DD1 Sanitarium](https://darkestdungeon.wiki.gg/wiki/Sanitarium), [DD1 Quirks](https://darkestdungeon.wiki.gg/wiki/Quirks), [DD1 Swine Wretch](https://darkestdungeon.wiki.gg/wiki/Swine_Wretch), [DD1 Diseases](https://darkestdungeon.wiki.gg/wiki/Disease).

**Sanitarium upgrades:** `src/sanitarium-upgrades.js` implements three source-backed trees bought with **Busts and Crests**, saved in the existing campaign settlement.
- **Treatment Library**: five levels, costing Bust/Crest pairs `3/3, 8/5, 12/8, 16/10, 21/13`, each reducing quirk treatment cost another **10%** (maximum **50%**).
- **Medical Devices**: five levels with the same Bust/Crest costs. Levels **1, 3 and 5** each lower the Apprentice disease treatment price by **100 gold** (750 → 650 → 550 → 450); levels **2 and 4** improve the chance of curing additional diseases.
- **Patient Cells**: four levels costing Bust/Crest pairs `10/6, 20/13, 30/19, 60/38`. Levels **1 and 3** grant one additional **medical** treatment slot; levels **2 and 4** grant one additional **quirk** treatment slot, for a final capacity of three each.

*Source/prototype distinction:* Because an exact published extra-disease cure probability was not established, the current extra-cure checks use **15% at Medical Devices 2** and **30% at level 4**, are deterministic for the booking, and must not be represented as DD1 rates. Medical devices costs above follow published Apprentice cost steps, and Veteran/Champion treatment tiers use 1.4× and 1.8× respectively. Booked extra patients are included in one-time weekly completion, exclusivity and idle-recovery suppression. Existing campaign saves containing only the original one-per-type ward load with empty upgrade data and zero Busts; upgrading does not erase patients. The four-rank expedition inventory now supports **Busts** (provisional six per stack), with three Busts offered on eligible Gallery approach corridor victories. The new resource persists to the settlement, transfers once only, and is spent atomically by upgrades. **Bust reward locations and stack sizes are Clays campaign fixtures.**

**Conditional quirks:** `Early Riser` grants **+2 SPD** only when torchlight is strictly **above 75**; `Nocturnal` causes **−2 SPD** at the same threshold. Both effects come from the DD1 quirk table, are evaluated on live combat initiative with current torchlight, and cannot stack into a hero's permanently stored speed. Existing six prototype traits and their earlier *unsourced* numbers remain explicitly provisional.

**Disease-bearing enemy:** `Blight Wretch` is a Kingdom of Clays reskin of DD1 **Apprentice Swine Wretch**, with **12 HP, 12.5 DODGE, 8 SPD** and a single source-backed skill `Blight Vomit`: **ACC 82.5, 12% CRIT, 1 base damage, +10 stress, 33% disease chance** against any hero rank. A Vault-room combat encounters this enemy alongside Crypt Shieldbearers and a Crypt Arbalist. The disease roll uses the same combat RNG as the attack, so active-combat saves preserve the outcome. Only the two existing *Clays* diseases are selectable in this initial subset. The previously added **8% provisional Crypt hit infection** remains as an intentionally identified fidelity gap; DD1 does **not** attribute this arbitrary hit-based disease chance to Bone Defenders or Bone Arbalists. Removing those speculative exposures and adding correctly configured disease skills to remaining monster types is future work.

**Tests:** `tests/sanitarium-upgrades.test.js`, `tests/conditional-quirks.test.js`, `tests/blight-wretch-reference.test.js`, `tests/browser/sanitarium-upgrades.spec.js`, and `tests/browser/blight-wretch.spec.js` cover upgrade cost/capacity progression, discounts, Bust collection, legacy saves, disease cures, torch boundary, source skill accuracy/effects and Vault infection persistence.
