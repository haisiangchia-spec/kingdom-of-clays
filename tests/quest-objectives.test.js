import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,questObjectiveComplete} from '../src/dungeon.js';
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
