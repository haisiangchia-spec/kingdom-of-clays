import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGeneratedEncounter} from '../src/engine.js';
import {QUESTS} from '../src/quest-board.js';

const tiers={apprentice:0,veteran:1,champion:2};

test('600 seeded campaign encounters have legal enemy formations and stable threat',()=>{
 for(const quest of QUESTS){
  for(let seed=1;seed<=100;seed++){
   const b=makeGeneratedEncounter(seed,quest.difficulty,quest.region,quest.tier);
   const again=makeGeneratedEncounter(seed,quest.difficulty,quest.region,quest.tier);
   const enemies=b.units.filter(u=>u.side==='enemy');
   assert.ok(enemies.length>=1&&enemies.length<=4,quest.id+' seed '+seed+' enemy count');
   assert.ok(enemies.every(u=>u.hp>0&&u.maxHp>=u.hp&&!u.dead),quest.id+' seed '+seed+' enemy health');
   assert.ok(enemies.every(u=>Number.isFinite(u.dmgMin)&&Number.isFinite(u.dmgMax)&&u.dmgMin<=u.dmgMax),quest.id+' seed '+seed+' damage');
   assert.equal(b.units.filter(u=>u.side==='hero').length,4);
   assert.deepEqual(b.encounterPlan,again.encounterPlan,quest.id+' seed '+seed+' reproducibility');
   assert.ok(tiers[quest.tier]>=0);
  }
 }
});
