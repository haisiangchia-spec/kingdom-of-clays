import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,DUNGEON_CORRIDORS,dungeonCorridors} from '../src/dungeon.js';
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

test('seeded branches change room connectivity but preserve reachable objective',()=>{
 const even=createDungeon(124,{proceduralBranches:true,variableCorridors:true});
 const odd=createDungeon(125,{proceduralBranches:true,variableCorridors:true});
 assert.deepEqual(dungeonCorridors(even),dungeonCorridors(createDungeon(124,{proceduralBranches:true})));
 assert.notDeepEqual(dungeonCorridors(even),dungeonCorridors(odd));
 for(const d of [even,odd]){
  const seen=new Set(['entrance']);
  let changed=true;
  while(changed){changed=false;for(const edge of dungeonCorridors(d)){
   if(seen.has(edge.from)&&!seen.has(edge.to)){seen.add(edge.to);changed=true;}
   if(seen.has(edge.to)&&!seen.has(edge.from)){seen.add(edge.from);changed=true;}
  }}
  assert.equal(seen.size,5);
  assert.ok(seen.has('sanctum'));
  assert.deepEqual(Object.keys(d.corridorSteps).sort(),dungeonCorridors(d).map(e=>e.id).sort());
 }
 assert.equal(dungeonCorridors(createDungeon(124)).length,DUNGEON_CORRIDORS.length);
});
