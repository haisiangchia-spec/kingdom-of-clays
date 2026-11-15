import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,DUNGEON_CORRIDORS} from '../src/dungeon.js';
test('procedural corridor lengths are deterministic, bounded and persist in save-shaped state',()=>{
 const a=createDungeon(123,{variableCorridors:true});
 const b=createDungeon(123,{variableCorridors:true});
 assert.deepEqual(a.corridorSteps,b.corridorSteps);
 assert.equal(Object.keys(a.corridorSteps).length,DUNGEON_CORRIDORS.length);
 assert.ok(Object.values(a.corridorSteps).every(n=>Number.isInteger(n)&&n>=2&&n<=4));
 beginCorridor(a,'gallery');
 assert.equal(a.pendingTravel.steps,a.corridorSteps['entrance-gallery']);
 assert.deepEqual(structuredClone(a).corridorSteps,a.corridorSteps);
});
test('legacy fixed corridor length remains available for combat reference tests',()=>{
 const d=createDungeon(123);
 assert.equal(d.corridorSteps,null);
 beginCorridor(d,'gallery');
 assert.equal(d.pendingTravel.steps,2);
});
