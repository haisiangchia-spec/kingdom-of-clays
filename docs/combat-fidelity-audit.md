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
