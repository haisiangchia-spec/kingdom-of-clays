import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle,questObjectiveProgress} from '../src/dungeon.js';
import {status} from '../src/engine.js';

// Navigation smoke test deliberately resolves battles without tactical combat.
// It diagnoses quest softlocks independently of combat balance/survivability.
function clearBattle(d){
 const battle=dungeonBattle(d);
 assert.ok(battle,'combat phase must have a battle');
 for(const enemy of battle.units.filter(u=>u.side==='enemy'))enemy.dead=true;
 assert.equal(status(battle),'victory');
 resolveDungeonBattle(d);
}
function travel(d,to){
 beginCorridor(d,to);
 for(let guard=0;d.pendingTravel&&guard<20;guard++){
  if(d.phase==='combat'){clearBattle(d);continue;}
  assert.equal(d.phase,'explore','travel should not softlock');
  advanceCorridor(d);
 }
 assert.equal(d.pendingTravel,null,'corridor must terminate');
 assert.equal(d.room,to,'must arrive at destination');
 if(d.phase==='combat')clearBattle(d);
}
test('seeded Veteran and Champion contracts can reach victory without quest softlocks',()=>{
 for(const [tier,questId] of [['veteran','warrens-veteran'],['champion','warrens-champion']]){
  for(let seed=1;seed<=30;seed++){
   const d=createDungeon(seed,{region:'plague',tier,difficulty:'scout',proceduralBranches:true,variableCorridors:true});
   d.questId=questId;
   // Clear the three required rooms using connected paths, including backtracking.
   for(const room of ['gallery','watch','gallery','vault','gallery','watch','sanctum']){
    travel(d,room);
    if(room!=='sanctum')assert.notEqual(d.phase,'victory','contract completed prematurely');
   }
   assert.equal(d.phase,'victory',tier+' seed '+seed+' did not complete');
   assert.ok(questObjectiveProgress(d).every(x=>x.complete));
  }
 }
});
