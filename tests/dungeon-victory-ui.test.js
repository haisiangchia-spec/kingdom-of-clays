import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// UI regression: victory rewards are generated after the final battle, so
// collect/leave controls must remain visible even after phase becomes victory.
test('dungeon UI exposes pending treasure actions on victory screen',()=>{
 const source=readFileSync(new URL('../src/dungeon-app.js',import.meta.url),'utf8');
 assert.match(source,/expedition\.pendingLoot&&\['explore','victory'\]\.includes\(expedition\.phase\)/);
 assert.match(source,/el\('button','Collect treasure'/);
 assert.match(source,/el\('button','Leave treasure'/);
});

test('victory screen permits discarding a stack to free space for final loot',()=>{
 const source=readFileSync(new URL('../src/dungeon-app.js',import.meta.url),'utf8');
 assert.match(source,/discard\.disabled=!\['explore','victory'\]\.includes\(expedition\.phase\)/);
});
