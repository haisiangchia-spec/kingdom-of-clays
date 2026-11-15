import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGeneratedEncounter,availableTargets,ABILITIES,rng} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {QUESTS} from '../src/quest-board.js';

test('600 campaign encounters give every starting enemy a legal AI decision or safe pass',()=>{
 for(const quest of QUESTS)for(let seed=1;seed<=100;seed++){
  const battle=makeGeneratedEncounter(seed,quest.difficulty,quest.region,quest.tier);
  for(const enemy of battle.units.filter(u=>u.side==='enemy')){
   const action=chooseEnemyAction(battle,enemy.id,enemy.enemySkills??[],rng(seed+11),ABILITIES,availableTargets);
   if(action){
    assert.ok(ABILITIES[action.key],quest.id+' seed '+seed+' unknown skill');
    assert.ok(availableTargets(battle,enemy.id,action.key).includes(action.targetId),quest.id+' seed '+seed+' illegal AI target');
   }else{
    assert.ok((enemy.enemySkills??[]).every(key=>availableTargets(battle,enemy.id,key).length===0),quest.id+' seed '+seed+' passed despite legal skill');
   }
  }
 }
});
