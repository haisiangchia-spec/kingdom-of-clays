# Kingdom of Clays — Combat Lab (work in progress)

HTML5, GitHub Pages-compatible combat-engine prototype. The design targets **base Darkest Dungeon 1** mechanics with agreed Kingdom of Clays names and, later in the campaign layer, optional Temple Resurrection. This is **not yet** a faithful/complete DD1 clone.

## Run and test

Serve the repository root with `python3 -m http.server 8000` and open `http://localhost:8000`. Use Node.js 22+ and `npm test` for the unit/regression suite. On every push/PR, GitHub Actions also runs real Chromium tests via Playwright.

- **New Battle** — original four-versus-four prototype combat.
- **Goblin Emperor Demo** — four heroes against one three-rank Goblin Emperor and a rear enemy. Boss skill values and AI are **temporary test fixtures**.
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
- `src/enemy-ai.js` — deterministic skill-first enemy choice with provisional per-monster tactics. Skeleton Archer favours rear-rank targets; Skeleton Court Mage favours stress abilities and stressed targets. Target weighting uses current formation and never overrides legal targets. These behavioural weights are **Clays testing assumptions, not yet verified DD1 monster AI**.
- `src/enemy-skills.js` — provisional undead encounter roster: Rustblade Cleave and Shieldbreaker Bash for Skeleton Swordsmen, Bone Arrow and Pinning Arrow for Skeleton Archers, Courtly Dread and Withering Sigil for Skeleton Court Mages, and Imperial Slam and Tyrant Roar for the Goblin Emperor demo. These enemy ability statistics and monster loadouts are **not** source-verified DD1 values.
- `src/enemy-roster.js` — distinct provisional resistances and stats for swordsmen, archers, mages and the Goblin Emperor; independent duplicate enemy instances and **standard / rearguard / curseCourt** four-slot compositions. The **Undead Rearguard** and **Cursed Court** buttons launch these encounters. Monster stat numbers are simulation fixtures, not source-verified DD1 tables.
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
