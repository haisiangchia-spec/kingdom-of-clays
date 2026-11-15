import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,dungeonCorridors,questObjectiveProgress,bonusObjectiveProgress} from '../src/dungeon.js';
import {QUESTS} from '../src/quest-board.js';

function reachable(d){
 const seen=new Set(['entrance']);
 for(let pass=0;pass<10;pass++)for(const edge of dungeonCorridors(d)){
  if(seen.has(edge.from))seen.add(edge.to);
  if(seen.has(edge.to))seen.add(edge.from);
 }
 return seen;
}

test('200 seeds per campaign contract keep required and optional objectives reachable',()=>{
 for(const quest of QUESTS){
  for(let seed=1;seed<=200;seed++){
   const opts={region:quest.region,tier:quest.tier,difficulty:quest.difficulty,proceduralBranches:true,variableCorridors:true};
   const d=createDungeon(seed,opts);d.questId=quest.id;
   const rooms=reachable(d);
   assert.equal(rooms.size,quest.tier==='champion'?7:quest.tier==='veteran'?6:5,quest.id+' seed '+seed);
   for(const goal of [...questObjectiveProgress(d),...bonusObjectiveProgress(d)])
    assert.ok(rooms.has(goal.room),quest.id+' seed '+seed+' unreachable '+goal.room);
   assert.ok(dungeonCorridors(d).every(e=>Number.isInteger(d.corridorSteps[e.id])&&d.corridorSteps[e.id]>=2&&d.corridorSteps[e.id]<=6));
  }
 }
});
