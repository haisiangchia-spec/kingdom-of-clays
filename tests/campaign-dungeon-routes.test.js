import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,dungeonCorridors,beginCorridor,advanceCorridor,resolveDungeonBattle,dungeonBattle,questObjectiveProgress,resolveHunger} from '../src/dungeon.js';
import {leaveLoot} from '../src/inventory.js';
import {status} from '../src/engine.js';

function route(d,goal){
 const edges=dungeonCorridors(d),queue=[[d.room]],seen=new Set([d.room]);
 while(queue.length){
  const path=queue.shift(),at=path.at(-1);
  if(at===goal)return path.slice(1);
  for(const e of edges){
   const next=e.from===at?e.to:e.to===at?e.from:null;
   if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next]);}
  }
 }
 throw Error('Unreachable objective '+goal);
}
function clearBattle(d){
 const battle=dungeonBattle(d);
 assert.ok(battle);
 for(const foe of battle.units.filter(u=>u.side==='enemy'))foe.dead=true;
 assert.equal(status(battle),'victory');
 resolveDungeonBattle(d);
}
function resolveEvents(d){
 if(d.pendingLoot)leaveLoot(d);
 if(d.pendingHunger)resolveHunger(d,'skip');
 if(d.phase==='combat')clearBattle(d);
}
test('all quest objectives are reachable through seeded procedural routes',()=>{
 for(const [tier,questId] of [['apprentice','warrens-containment'],['veteran','warrens-veteran'],['champion','warrens-champion']]){
  for(let seed=1;seed<=12;seed++){
   const d=createDungeon(seed,{region:'plague',tier,difficulty:'patrol',proceduralBranches:true,variableCorridors:true,interactiveEvents:true});
   d.questId=questId;
   let actions=0;
   while(d.phase==='explore'&&actions++<500){
    resolveEvents(d);
    if(d.phase!=='explore')break;
    if(d.pendingTravel){
     advanceCorridor(d);
     resolveEvents(d);
     continue;
    }
    const next=questObjectiveProgress(d).find(x=>!x.complete);
    if(!next)break;
    const steps=route(d,next.room);
    assert.ok(steps.length,'incomplete objective should not be at current room');
    beginCorridor(d,steps[0]);
   }
   assert.ok(actions<500,questId+' seed '+seed+' stalled');
   assert.equal(d.phase,'victory',questId+' seed '+seed+' failed to finish');
   assert.ok(questObjectiveProgress(d).every(x=>x.complete));
  }
 }
});
