# Kingdom of Clays — Combat Lab (work in progress)

HTML5, GitHub Pages-compatible combat-engine prototype. The design targets **base Darkest Dungeon 1** mechanics with agreed Kingdom of Clays names and, later in the campaign layer, optional Temple Resurrection. This is **not yet** a faithful/complete DD1 clone.

## Run and test

Serve the repository root with `python3 -m http.server 8000` and open `http://localhost:8000`. Use Node.js 22+ and `npm test` for the unit/regression suite. On every push/PR, GitHub Actions also runs real Chromium tests via Playwright.

- **New Battle** — original four-versus-four prototype combat.
- **Goblin Emperor Demo** — four heroes against one three-rank Goblin Emperor and a rear enemy. Boss skill values and AI are **temporary test fixtures**.
- **Hunter / Thief / Mage** — testing lineup with Warrior front, Thief second, Mage third, Hunter fourth. Some rear-only abilities require repositioning.
- **Priest / Slayer / Berserker** — testing lineup with Berserker front, Warrior second, Monster Slayer third, Priest rear. Frontline abilities of the rear heroes require repositioning, as in DD1.
- Repeated skill targeting of any occupied rank hits a giant **once**. Multi-rank AoE attacks likewise hit it **once**, not once per slot.

## Architecture

- `src/engine.js` — turn order, combat resolution, sample playable skills, scenario fixtures.
- `src/formation.js` — four-slot formations, contiguous size-one to size-four entities, push/pull, corpse footprints.
- `src/combat-effects.js` — group targeting, cleansing, restoration.
- `src/status.js` — guard, stun, riposte, temporary buffs and debuffs.
- `src/dd1-math.js` — combat calculations.
- `src/skill-catalog.js` — **105 locked display-name mappings** (15 base-game classes × 7 abilities). Exactly 56 now carry `level1-integrated` coverage across Swordsman, Warrior, Hunter, Thief, Mage, Priest, Monster Slayer and Berserker; all remaining entries are pending. Levels 2–5 and full DD1 parity remain incomplete.
- `src/class-skills.js` — 14 level-one Swordsman (Man-at-Arms) and Warrior (Crusader) specifications.
- `src/class-skills-batch2.js` — 21 level-one Hunter (Arbalest), Thief (Grave Robber), and Mage (Plague Doctor) specifications.
- `src/class-skills-batch3.js` — 21 level-one Priest (Vestal), Monster Slayer (Bounty Hunter), and Berserker (Hellion) specifications; includes self-exhaustion, conditional attack bonuses, self-healing, torch, stealth detection and crowd control. Ability data is grounded in the DD1 class skill tables; final fidelity audit, skills levels 2–5, and exact hero/enemy stats remain outstanding.
- `tests/` — deterministic Node tests and `tests/browser/` Chromium tests.

## Fidelity boundaries

The engine has working examples of rank-based targeting, movement, bleed/blight, effects, guarding, marking, riposte, corpses and large enemies, but many skills and quantitative values remain provisional. In particular, DD1 class-specific skill rank scaling, enemy attacks and AI, enemy resistances, turn sequencing, stun edge cases, multi-action bosses, stalling rules, status-effect combinations, deathblow transitions and the complete bestiary **require additional implementation and verification**. A three-rank boss does not leave a corpse; an eligible two-rank enemy may leave a two-rank corpse.

Visuals are still placeholders. No copyrighted anime illustrations are packaged here. Eight classes now have seven level-one skills each. The next work should implement the remaining classes, add skill upgrades/level scaling, and audit exact effect ordering, then enemy templates and boss abilities.

Sandbox campaign and dungeon-exploration layers remain deferred until combat fidelity is sufficiently verified.
