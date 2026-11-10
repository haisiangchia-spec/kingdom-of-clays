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
- **Verified Lv5 Skills** — four-hero combat lab with level-five upgrades for Swordsman's Heavy Slash and Countering Advance, Warrior's Crushing Strike, and Priest's Greater Heal and Group Healing. All other skills remain level one until their upgrade tables are verified.
- Repeated skill targeting of any occupied rank hits a giant **once**. Multi-rank AoE attacks likewise hit it **once**, not once per slot.

## Architecture

- `src/engine.js` — turn order, combat resolution, sample playable skills, scenario fixtures.
- `src/formation.js` — four-slot formations, contiguous size-one to size-four entities, push/pull, corpse footprints.
- `src/combat-effects.js` — group targeting, cleansing, restoration.
- `src/status.js` — guard, stun, riposte, temporary buffs and debuffs.
- `src/dd1-math.js` — combat calculations.
- `src/skill-catalog.js` — **105 locked display-name mappings** (15 base-game classes × 7 abilities). All 105 hero skills have level-one prototype handlers, but this does not establish full DD1 parity. A separate `verifiedLevels` field identifies source-checked higher upgrades; exactly five skills currently have full level 1–5 tables.
- `src/skill-progression.js` — actor-specific skill levels and **verified-only** progression patches. Upgrades are rejected, not guessed, when original DD1 values are unverified. First five researched skills have level 2–5 values and are playable through the level-five lab.
- `src/class-skills.js` — 14 level-one Swordsman (Man-at-Arms) and Warrior (Crusader) specifications.
- `src/class-skills-batch2.js` — 21 level-one Hunter (Arbalest), Thief (Grave Robber), and Mage (Plague Doctor) specifications.
- `src/class-skills-batch3.js` — 21 level-one Priest (Vestal), Monster Slayer (Bounty Hunter), and Berserker (Hellion) specifications; includes self-exhaustion, conditional attack bonuses, self-healing, torch, stealth detection and crowd control.
- `src/class-skills-batch4.js` — 21 level-one Dark Knight (Highwayman), Beastmaster (Houndmaster), and Bard (Jester) specifications, including conditional damage, bleed, movement, guarding, party stress relief, riposte and Finale stacks. Ability data is grounded in the DD1 class skill tables; final fidelity audit, skills levels 2–5, and exact hero/enemy stats remain outstanding.
- `src/class-skills-batch5.js` — 21 level-one Cursed Champion (Leper), Hex Mage (Occultist), and Treasure Hunter (Antiquarian) ability specifications.
- `src/class-skills-spiritbound.js` — 7 level-one Spiritbound (Abomination) abilities, with human/beast form gating, free Transform, per-battle limits, ally stress, persistent beast stress and Rake stacks. Some interactions still require a parity audit.
- `tests/` — deterministic Node tests and `tests/browser/` Chromium tests.

## Fidelity boundaries

The engine has working examples of rank-based targeting, movement, bleed/blight, effects, guarding, marking, riposte, corpses and large enemies, but many skills and quantitative values remain provisional. In particular, DD1 class-specific skill rank scaling, enemy attacks and AI, enemy resistances, turn sequencing, stun edge cases, multi-action bosses, stalling rules, status-effect combinations, deathblow transitions and the complete bestiary **require additional implementation and verification**. A three-rank boss does not leave a corpse; an eligible two-rank enemy may leave a two-rank corpse.

Visuals are still placeholders. No copyrighted anime illustrations are packaged here. Fifteen classes now have seven level-one ability definitions each. The next work should extend verified skill progression beyond the initial five skills (5 of 105 researched to level five), audit skill data/effect order, then implement the full enemy/boss ability roster.

Sandbox campaign and dungeon-exploration layers remain deferred until combat fidelity is sufficiently verified.
