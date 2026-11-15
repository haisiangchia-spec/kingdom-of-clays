import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,questObjectiveComplete,questObjectiveProgress,bonusObjectiveProgress} from '../src/dungeon.js';
test('reconnaissance completes upon securing the Sanctum',()=>{
 const d=createDungeon(12);
 assert.equal(questObjectiveComplete(d),false);
 d.questId='crypt-recon';d.cleared=['sanctum'];
 assert.equal(questObjectiveComplete(d),true);
});
test('Veteran and Champion require both outposts and the Sanctum',()=>{
 for(const questId of ['warrens-veteran','warrens-champion']){
  const d=createDungeon(12,{region:'plague',tier:questId==='warrens-veteran'?'veteran':'champion'});
  d.questId=questId;d.cleared=['sanctum'];
  assert.equal(questObjectiveComplete(d),false);
  d.cleared.push('watch');assert.equal(questObjectiveComplete(d),false);
  d.cleared.push('vault');assert.equal(questObjectiveComplete(d),true);
  assert.equal(questObjectiveComplete(structuredClone(d)),true);
 }
});

test('quest checklist tracks cleared rooms and preserves completion on reload',()=>{
 const d=createDungeon(33,{region:'plague',tier:'veteran'});
 d.questId='warrens-veteran';
 assert.deepEqual(questObjectiveProgress(d).map(g=>g.room),['watch','vault','sanctum']);
 assert.equal(questObjectiveProgress(d).filter(g=>g.complete).length,0);
 d.cleared=['vault','sanctum'];
 assert.deepEqual(questObjectiveProgress(structuredClone(d)).map(g=>g.complete),[false,true,true]);
 assert.equal(questObjectiveComplete(d),false);
 d.cleared.push('watch');
 assert.equal(questObjectiveComplete(d),true);
});

test('bonus objectives reveal optional rooms and deterministic rewards without gating victory',()=>{
 for(const [tier,expected] of [['apprentice',[]],['veteran',['outpost']],['champion',['outpost','catacomb']]]){
  const d=createDungeon(52,{region:'plague',tier,proceduralBranches:true});
  assert.deepEqual(bonusObjectiveProgress(d).map(x=>x.room),expected);
  assert.deepEqual(bonusObjectiveProgress(d),bonusObjectiveProgress(structuredClone(d)));
  d.cleared=['watch','vault','sanctum'];
  d.questId=tier==='champion'?'warrens-champion':'warrens-veteran';
  assert.equal(questObjectiveComplete(d),true);
  assert.ok(bonusObjectiveProgress(d).every(x=>!x.complete));
  d.cleared.push(...expected);
  assert.ok(bonusObjectiveProgress(d).every(x=>x.complete));
 }
 assert.deepEqual(bonusObjectiveProgress(createDungeon(52)),[]);
});
