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

test('all four procedural layouts are distinct, connected and repeatable',()=>{
 const layouts=[];
 for(let seed=120;seed<124;seed++){
  const d=createDungeon(seed,{proceduralBranches:true,variableCorridors:true});
  const edges=dungeonCorridors(d);
  assert.equal(edges.length,5);
  assert.deepEqual(edges,dungeonCorridors(createDungeon(seed,{proceduralBranches:true})));
  const reached=new Set(['entrance']);
  for(let pass=0;pass<5;pass++)for(const edge of edges){
   if(reached.has(edge.from))reached.add(edge.to);
   if(reached.has(edge.to))reached.add(edge.from);
  }
  assert.deepEqual([...reached].sort(),['entrance','gallery','sanctum','vault','watch']);
  layouts.push(edges.map(e=>e.id).sort().join('|'));
 }
 assert.equal(new Set(layouts).size,4);
});

test('higher expedition tiers extend seeded corridor travel without changing layout',()=>{
 const opts={region:'plague',proceduralBranches:true,variableCorridors:true};
 const apprentice=createDungeon(204,{...opts,tier:'apprentice'});
 const veteran=createDungeon(204,{...opts,tier:'veteran'});
 const champion=createDungeon(204,{...opts,tier:'champion'});
 assert.equal(dungeonCorridors(veteran).length,dungeonCorridors(apprentice).length+1);
 assert.equal(dungeonCorridors(champion).length,dungeonCorridors(veteran).length+1);
 for(const edge of dungeonCorridors(apprentice)){
  const id=edge.id;
  assert.equal(veteran.corridorSteps[id],apprentice.corridorSteps[id]+1);
  assert.equal(champion.corridorSteps[id],apprentice.corridorSteps[id]+2);
 }
 assert.ok(Object.values(champion.corridorSteps).every(n=>n>=4&&n<=6));
});

test('higher-tier procedural maps add reachable optional rooms',()=>{
 const opts={region:'plague',proceduralBranches:true,variableCorridors:true};
 for(const [tier,rooms] of [['apprentice',5],['veteran',6],['champion',7]]){
  const d=createDungeon(207,{...opts,tier});
  const edges=dungeonCorridors(d);
  const reached=new Set(['entrance']);
  for(let i=0;i<rooms;i++)for(const edge of edges){
   if(reached.has(edge.from))reached.add(edge.to);
   if(reached.has(edge.to))reached.add(edge.from);
  }
  assert.equal(reached.size,rooms);
  assert.equal(edges.length,rooms);
  assert.deepEqual(Object.keys(d.corridorSteps).sort(),edges.map(e=>e.id).sort());
  assert.ok(reached.has('sanctum'));
 }
});
