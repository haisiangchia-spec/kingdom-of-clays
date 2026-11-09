# Kingdom of Clays — Combat Lab (work in progress)

HTML5, GitHub Pages-compatible combat-engine prototype. The design targets **base Darkest Dungeon 1** mechanics with agreed Kingdom of Clays names and, later in the campaign layer, optional Temple Resurrection. This is **not yet** a faithful/complete DD1 clone.

## Run and test

Serve the repository root with `python3 -m http.server 8000` and open `http://localhost:8000`. Use Node.js 22+ and `npm test` for the unit/regression suite. On every push/PR, GitHub Actions also runs real Chromium tests via Playwright.

- **New Battle** — original four-versus-four prototype combat.
- **Goblin Emperor Demo** — four heroes against one three-rank Goblin Emperor and a rear enemy. Boss skill values and AI are **temporary test fixtures**.
- Repeated skill targeting of any occupied rank hits a giant **once**. Multi-rank AoE attacks likewise hit it **once**, not once per slot.

## Architecture

- `src/engine.js` — turn order, combat resolution, sample playable skills, scenario fixtures.
- `src/formation.js` — four-slot formations, contiguous size-one to size-four entities, push/pull, corpse footprints.
- `src/combat-effects.js` — group targeting, cleansing, restoration.
- `src/status.js` — guard, stun, riposte, temporary buffs and debuffs.
- `src/dd1-math.js` — combat calculations.
- `src/skill-catalog.js` — **105 locked display-name mappings** (15 base-game classes × 7 abilities). All catalog entries explicitly remain `mechanics: "pending"` until fully validated; the catalog **does not** claim 105 implemented skills.
- `tests/` — deterministic Node tests and `tests/browser/` Chromium tests.

## Fidelity boundaries

The engine has working examples of rank-based targeting, movement, bleed/blight, effects, guarding, marking, riposte, corpses and large enemies, but many skills and quantitative values remain provisional. In particular, DD1 class-specific skill rank scaling, enemy attacks and AI, enemy resistances, turn sequencing, stun edge cases, multi-action bosses, stalling rules, status-effect combinations, deathblow transitions and the complete bestiary **require additional implementation and verification**. A three-rank boss does not leave a corpse; an eligible two-rank enemy may leave a two-rank corpse.

Visuals are still placeholders. No copyrighted anime illustrations are packaged here. The next work should resolve one class's seven skills at a time with exact target/rank rules and tests, then add monster templates and enemy skill data.

Sandbox campaign and dungeon-exploration layers remain deferred until combat fidelity is sufficiently verified.
