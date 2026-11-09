# Kingdom of Clays — Combat Lab 0.1

A static GitHub Pages-ready HTML5 **combat engine scaffold** for the Kingdom of Clays fan-game concept. It does not yet reproduce DD1 in full. No original anime assets are included.

## Run
Serve the folder with a static server (e.g. `python3 -m http.server 8000`) and visit `http://localhost:8000`. Import maps are not needed. GitHub Pages can host this folder as-is.

## Tests
Node.js 18+; `npm test`.

## Current coverage
Seeded random, initiative SPD + 1–8, rank targeting, attacks, hit chance including +5 hidden accuracy and escalating miss bonus, crit, armour protection, healing, marks, guard redirection, basic stun, DOT, 100 stress resolve check, Death's Door and 200 stress breaking point, and battle victory/defeat. UI demonstrates six reskinned classes against Catacombs enemies.

## Known non-fidelity areas — DO NOT call this full DD1 fidelity
This prototype deliberately contains simplified or incomplete values and mechanics. It does not implement all seven skills of all 15 base classes, complete enemy ability data, class-specific skill levels, affliction involuntary behaviours, status timing fidelity, riposte retaliatory attacks, movement swapping and enemy AI strategy, skill chance resist curves, quirks, trinkets, buff durations, stalling, complete target/rank overrides, stun recovery resist, deathblow modifiers, religious interactions, multi-target actions or enemy-size interactions. Some current skill values are placeholders. It is an architectural starter, not a DD1-certified combat simulation.

## Future milestones
1. Authoritative data fixtures for the 15 base classes, all 105 combat skills, and enemies.
2. Exact effect sequence and status lifecycle; mechanics parity tests.
3. Enemy AI and bosses; battle content regression.
4. Visual sprite integration using your separately generated assets.
5. Dungeon exploration.
6. Settlement sandbox and Temple Resurrection.

## Design baseline
Single fixed settlement, duplicates allowed, base DD1 only; Clays presentation and optional Temple Resurrection are the sole planned deviations. Proposed endgame dungeon and monster reskins are locked. Company ownership of upgrades is bookkeeping only.
