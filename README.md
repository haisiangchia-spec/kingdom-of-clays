# Kingdom of Clays — Combat Lab (work in progress)

HTML5, GitHub Pages-compatible combat-engine prototype. The design targets **base Darkest Dungeon 1** mechanics with agreed Kingdom of Clays names and, later in the campaign layer, optional Temple Resurrection. This is **not yet** a faithful/complete DD1 clone.

## Weekly Stage Coach and stress recovery (Milestone 31)

Between dungeon expeditions, a **weekly Stage Coach** shows a small number of deterministic recruit candidates. Recruiting one costs no gold but removes the offer until the next week; the player cannot freely pick an unlimited class outside the displayed candidates. Each completed expedition advances the week once, refreshing available recruits. The current eight-hero roster cap still applies.

The town also has an **Abbey Cloister** and **Tavern Bar**, each providing one paid treatment slot per week. The source-backed base Apprentice treatment costs **1,000 gold**, relieves **45 stress** after a full expedition week, and holds its hero out of the next party. Other idle non-deployed heroes recover **5 stress** each week. Weekly reservations, offers and the town week survive save/reload. Stage Coach class odds, additional services and side effects, room expansion, unlock timing and caretaker restrictions are not yet source-complete. See `docs/combat-fidelity-audit.md` Pass 31.

## Persistent hero roster and resurrection (Milestone 30)

The expedition now uses a **persistent four-hero party chosen from an eight-slot roster**. Named hero records survive quest completion, defeat and browser reloads; each hero retains HP, stress, class, equipment, and Resolve XP/level, and dead heroes cannot embark. Stage Coach-style recruits of the four currently implemented classes are free (as in DD1), with duplicates permitted. A short Apprentice victory grants 2 Resolve XP and uses the standard DD1 level thresholds. After an expedition, the town interface can recruit, select/replace heroes in combat ranks, equip/unequip a stored Ward Charm, and permanently dismiss heroes to free a full roster slot. Dismissed dead heroes are listed in the graveyard and cannot return.

**Agreed DD1 exception:** the Temple at level 1+ offers repeatable resurrection of a *rostered* fallen hero for a provisional cost of 250 gold, restoring half health and 100 stress. The rest of the resurrection system is original Clays rules. Weekly random recruits, full 17-class roster, quirks, diseases, equipment upgrades, real trinket stat modifiers and paid stress treatment remain future milestones. See `docs/combat-fidelity-audit.md` Pass 30.

## Persistent settlement and facilities (Milestone 29)

[Dungeon Expedition](./dungeon.html) now autosaves the **active expedition and the settlement** to versioned browser-local storage, restoring rooms, party HP/stress, supplies, pending decisions, combat, resources and purchased upgrades after a reload. Completing an expedition and transferring its reward fills the treasury and records crests, deeds and trinkets; each reward transfer may occur only once. Settlement upgrades become available after the expedition ends:

- **Market:** 100 gold + 1 Crest at level 1; +2 starting food per tier
- **Guild:** 125 gold + 1 Deed at level 1; +2 starting HP per hero per tier
- **Temple:** 150 gold + 1 Crest + 1 Deed at level 1; reduce skipped-hunger stress by 2 per tier

Tier costs scale with purchase level up to level 3. Upgrades affect **new expeditions**, not the current one. This is local-browser persistence (not a cloud account or cross-device save); clearing browser site data erases it. Facility costs, benefits and upgrade tiers are provisional Clays rules rather than original DD1 values. See `docs/combat-fidelity-audit.md` Pass 29.

## Gems, heirlooms, trinkets and settlement rewards (Milestone 28)

Completed room and corridor encounters can now offer mixed valuables: gold, Moonstone gems, Crests and Deeds; purifying the Vault curio yields a Ward Charm trinket. Gems, heirlooms and charms occupy the shared inventory slots and use their own stack capacities. On a victorious expedition, **Return rewards to settlement** transfers carried gold and gem sale value into a settlement treasury and records Crests, Deeds and trinkets separately. Rewards can only be claimed once. The settlement currently persists for the current page session, not across reloads. The quantities and economy are original Clays prototypes, not yet sourced DD1 item rules. See `docs/combat-fidelity-audit.md` Pass 28.

## Expedition inventory and loot (Milestone 27)

The [Dungeon Expedition](./dungeon.html) now shows a shared **8-slot** backpack for food (stacks of 4), torches (2), holy water (1), and gold (100). Curio rewards and 50-gold provisional rewards from completed non-final encounters are offered as treasure: **collect**, **leave behind**, or **discard a carried stack** to make room. Gold merges into partial stacks first; a full backpack never partially collects a reward. Travel is blocked until pending treasure is resolved. Discarded provisions immediately update their usable supplies. Capacities, drop quantities and valuations are **original Clays prototype settings**, not yet confirmed DD1 data. The combat and expedition economy remain separate from the future settlement layer.

## Expedition scouting, hunger and curios (Milestone 26)

In [Dungeon Expedition](./dungeon.html), players can scout adjacent corridors (spending 2 torchlight) to reveal seeded enemy and trap risks, attempt to disarm discovered traps with a chosen hero, and respond to hunger after every four completed corridor steps by spending four food or taking HP/stress penalties. The Gallery and Vault contain one-time curios that can be left, examined at risk or safely purified with a limited holy-water provision. Encounter/curio outcomes and supplies persist across the expedition. These probabilities, rewards, thresholds and light costs are **original Clays provisional choices**, not verified DD1 values. See `docs/combat-fidelity-audit.md` Pass 26.

## Dungeon supplies and hazards (Milestone 25)

The dungeon expedition screen now includes three starting torches and eight food. Torches restore 25 light (up to 100); food heals a wounded living hero for 2 HP. Supplies cannot be used during combat. Four torchlight bands are displayed, lower light increases corridor encounter and trap probabilities, and the two late-stage corridors can trigger a one-time seeded trap that damages HP and stress. These values and odds are **provisional Kingdom of Clays exploration rules**, not certified DD1 numerical fidelity. See `docs/combat-fidelity-audit.md` Pass 25.

## Dungeon expedition (Milestone 24)

Open **[Dungeon Expedition](./dungeon.html)** from the Combat Lab or navigate directly to `dungeon.html`. The first campaign slice has five connected rooms, two-step corridors, seeded reference-enemy encounters, a Sanctum objective, and persistent hero HP/stress/death state between battles. In battle, choose a hero ability and target; enemy AI executes automatically. On victory, corridor traversal resumes where it stopped. A failed combat ends the expedition.

**Fidelity boundary:** Dungeon graph, encounter chances, travel cost and goal are intentional prototype fixtures, not copied DD1 exploration or encounter distributions. Provisions, loot, scouting, traps, retreat, curios and camping are planned for later milestones. Combat still uses the earlier DD1-inspired engine and verified reference-monster subsets.

## Run and test

Serve the repository root with `python3 -m http.server 8000` and open `http://localhost:8000`. Use Node.js 22+ and `npm test` for the unit/regression suite. On every push/PR, GitHub Actions also runs real Chromium tests via Playwright.

- **New Battle** — original four-versus-four prototype combat.
- **Goblin Emperor Demo** — four heroes against one three-rank Goblin Emperor and a rear enemy. The emperor takes **two consecutive actions per round**, with one initiative and status lifecycle; stun consumes both action slots. Its provisional **Commanding** phase (above 50% HP) favors Tyrant Roar 3:1 over Imperial Slam; **Desperate** (50% or below) favors Imperial Slam 4:1, may summon one Skeleton Swordsman into an empty rank **only at 50% HP or below** (enforced by the engine as well as by AI selection), and preferentially targets injured heroes. A corpse occupies a rank and blocks summoning until removed; reinforcements first act next round. The current phase appears in the combat UI. These phases, weights, ability values and action count are **Kingdom of Clays test fixtures**, not source-verified DD1 boss rules.
- **Hunter / Thief / Mage** — testing lineup with Warrior front, Thief second, Mage third, Hunter fourth. Some rear-only abilities require repositioning.
- **Priest / Slayer / Berserker** — testing lineup with Berserker front, Warrior second, Monster Slayer third, Priest rear. Frontline abilities of rear heroes require repositioning.
- **Dark Knight / Beastmaster / Bard** — three-class testing lineup with Dark Knight front, Beastmaster second, Bard third and Priest rear. Several combat abilities only become legal after rank movement.
- **Champion / Hex Mage / Treasure Hunter** — testing lineup with Cursed Champion front, Treasure Hunter second, Hex Mage third, Warrior rear. Includes reverse guard, variable healing, limited-use self buffs and rank movement.
- **Spiritbound Transformation** — testing lineup with Warrior front, Spiritbound second, Priest third and Hunter rear. Spiritbound has three human skills, three beast skills and one shared free Transform.
- **Verified Lv5 Skills** — four-hero combat lab with all seven level-five abilities for Swordsman, Warrior and Priest (21 skills total).
- **Hunter / Thief / Mage Lv5** — another level-five laboratory with all 21 upgraded abilities across Hunter (Arbalest), Thief (Grave Robber), and Mage (Plague Doctor); the accompanying Warrior remains level one.
- **Slayer / Berserker / Dark Knight Lv5** — all 21 level-five skills of Monster Slayer (Bounty Hunter), Berserker (Hellion), and Dark Knight (Highwayman), plus a level-one Warrior anchor.
- **Champion / Beastmaster / Bard Lv5** — a fourth upgrade laboratory containing the seven level-five abilities of Cursed Champion (Leper), Beastmaster (Houndmaster), and Bard (Jester). Priest remains at level one.
- **Spiritbound / Hex Mage / Treasure Hunter Lv5** — fifth laboratory: all 21 level-five skills for Spiritbound (Abomination), Hex Mage (Occultist), and Treasure Hunter (Antiquarian), with a level-one Warrior control. Spiritbound starts at the front and can transform immediately; some human-form abilities require moving backward.
- Repeated skill targeting of any occupied rank hits a giant **once**. Multi-rank AoE attacks likewise hit it **once**, not once per slot.

## Architecture

- `src/engine.js` — turn order, combat resolution, sample playable skills, scenario fixtures.
  - Encounter lifecycle now uses a shared pass-turn action: enemies without legal abilities forfeit remaining action slots while timed effects tick once. Defeating the Emperor alone does not end the fight while summoned or surviving enemies remain.
- `src/enemy-ai.js` — deterministic skill-first enemy choice with provisional per-monster tactics. Skeleton Archer favours rear-rank targets; Skeleton Court Mage favours stress abilities and stressed targets. Target weighting uses current formation and never overrides legal targets. These behavioural weights are **Clays testing assumptions, not yet verified DD1 monster AI**.
- `src/enemy-skills.js` — provisional undead encounter roster: Rustblade Cleave and Shieldbreaker Bash for Skeleton Swordsmen, Bone Arrow and Pinning Arrow for Skeleton Archers, Courtly Dread and Withering Sigil for Skeleton Court Mages, and Imperial Slam and Tyrant Roar for the Goblin Emperor demo. These enemy ability statistics and monster loadouts are **not** source-verified DD1 values.
- `src/enemy-roster.js` — distinct provisional resistances and stats for swordsmen, archers, mages and the Goblin Emperor; independent duplicate enemy instances and **standard / rearguard / curseCourt** four-slot compositions. The **Undead Rearguard** and **Cursed Court** buttons launch these encounters. Monster stat numbers are simulation fixtures, not source-verified DD1 tables.
- **Generated Scout / Patrol / Gauntlet** — new playable encounter modes with deterministic, seed-based and weighted formation templates using the source-checked Crypt Shieldbearer, Crypt Arbalist and Outlaw Duelist profiles. Three to four enemies fill at most four ranks and retain legal starting abilities; difficulty composition weights and threat scores are **original Clays provisional values**, *not* DD1 dungeon spawn probabilities. The reusable `src/encounter-generator.js` can later supply room and corridor battles. See `docs/combat-fidelity-audit.md` Pass 23.
- **Shieldwall Volley · DD1 Defender Reference** — playable encounter with two Crypt Shieldbearers (Apprentice Bone Defender reskins) and two Crypt Arbalists. Shieldbearers use source-backed Axeblade and Dead Weight values, conditional 4:1 then 1:1 AI choices, Stun/knockback, marked/Move-resistance targeting, and a forced advancing melee attack from rear ranks. See `docs/combat-fidelity-audit.md` Pass 22.
- **Crypt Volley · DD1 Arbalist Reference** — playable four-enemy encounter featuring two independently spawned Crypt Arbalists. The new enemy is an Apprentice Bone Arbalist reskin with source-checked HP, speed, dodge, protection, resistances, Quarrel/marked damage, Bayonet attack, rank restrictions and self-retreat. The original provisional Skeleton Archer remains available in other encounters. See `docs/combat-fidelity-audit.md` Pass 21.
- **Outlaw Patrol · DD1 AI Reference** — playable mixed encounter featuring the Outlaw Duelist, a reskin of the Veteran Brigand Cutthroat. Its 1st/2nd/later-action skill selection weights (7:1:2, 2:1:6, 2:1:2), rank-restricted fallback attack, and Outlaw Stab/Shank targeting bonuses (+100% to lowest Bleed resistance, +300% to marked) follow documented DD1 reference values. The Duelist's ability damage and secondary effects are still provisional; see `docs/combat-fidelity-audit.md` Pass 19.
- `src/formation.js` — four-slot formations, contiguous size-one to size-four entities, push/pull, corpse footprints.
- `src/combat-effects.js` — group targeting, cleansing, restoration.
- `src/status.js` — guard, stun, riposte, temporary buffs and debuffs.
- `src/dd1-math.js` — combat calculations.
- `src/skill-catalog.js` — **105 locked display-name mappings** (15 base-game classes × 7 abilities). All 105 hero skills have level-one prototype handlers, but this does not establish full DD1 parity. A separate `verifiedLevels` field identifies source-checked higher upgrades; all **105 skills** now have recorded levels 1–5 upgrade tables across all fifteen base-game classes. This is complete *upgrade table coverage*, not proof of full DD1 runtime fidelity.
- `src/skill-progression.js` — actor-specific skill levels and **verified-only** progression patches. Upgrades are rejected, not guessed, when original DD1 values are unverified. 105 skills across all fifteen classes have source-checked level 2–5 upgrade data and are playable through five dedicated level-five laboratories.
- `src/class-skills.js` — 14 level-one Swordsman (Man-at-Arms) and Warrior (Crusader) specifications.
- `src/class-skills-batch2.js` — 21 level-one Hunter (Arbalest), Thief (Grave Robber), and Mage (Plague Doctor) specifications.
- `src/skill-upgrades-batch3.js` — 84 level 2–5 patches for Monster Slayer, Berserker and Dark Knight; shared runtime uses the existing progression resolver.
- `src/skill-upgrades-batch4.js` — 84 level 2–5 patches for Beastmaster (Houndmaster), Bard (Jester), and Cursed Champion (Leper), with level-specific bleed, buff, guard, stress, healing and displacement modifiers.
- `src/skill-upgrades-batch5.js` — final 84 level 2–5 upgrade patches covering Hex Mage (Occultist), Treasure Hunter (Antiquarian), and Spiritbound (Abomination), including form-specific transformation scaling.
- `src/class-skills-batch3.js` — 21 level-one Priest (Vestal), Monster Slayer (Bounty Hunter), and Berserker (Hellion) specifications; includes self-exhaustion, conditional attack bonuses, self-healing, torch, stealth detection and crowd control.
- `src/class-skills-batch4.js` — 21 level-one Dark Knight (Highwayman), Beastmaster (Houndmaster), and Bard (Jester) specifications, including conditional damage, bleed, movement, guarding, party stress relief, riposte and Finale stacks. Ability data is grounded in the DD1 class skill tables; source-based baseline and interaction parity audits remain outstanding even though all levels 1–5 are registered.
- `src/class-skills-batch5.js` — 21 level-one Cursed Champion (Leper), Hex Mage (Occultist), and Treasure Hunter (Antiquarian) ability specifications. **Parity Pass 11** corrected baseline Hex Mage curse/bleed statistics, Treasure Hunter's Get Down! and Protect Me values and the latter's three-use limit.
- `src/class-skills-spiritbound.js` — 7 level-one Spiritbound (Abomination) abilities, with human/beast form gating, free Transform, per-battle limits, ally stress, persistent beast stress and Rake stacks. Some interactions still require a parity audit.
- `tests/` — deterministic Node tests and `tests/browser/` Chromium tests.

## Fidelity boundaries

The engine has working examples of rank-based targeting, movement, bleed/blight, effects, guarding, marking, riposte, corpses and large enemies. **Baseline Parity Pass 11** verified selected Occultist and Antiquarian level-one values and corrected Wyrd Reconstruction's bleed/resistance roll and damage-bearing Vulnerability Hex marks; remaining class skills and numerical interactions are not yet certified. In particular, DD1 class-specific skill rank scaling, enemy attacks and AI, enemy resistances, turn sequencing, stun edge cases, multi-action bosses, stalling rules, status-effect combinations, deathblow transitions and the complete bestiary **require additional implementation and verification**. A three-rank boss does not leave a corpse; an eligible two-rank enemy may leave a two-rank corpse.

Visuals are still placeholders. No copyrighted anime illustrations are packaged here. Fifteen classes now have seven level-one ability definitions each. **All 105 hero skill paths now have levels 1–5 represented.** The next work is a rigorous base-skill and interaction parity audit, followed by enemy and boss combat design. The implemented numerical upgrades must still be compared against original-game runtime edge cases.

Sandbox campaign and dungeon-exploration layers remain deferred until combat fidelity is sufficiently verified.
