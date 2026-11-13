import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_PROFILES,ENCOUNTER_PRESETS,makeEnemyFormation,spawnProfileEnemy} from '../src/enemy-roster.js';
import {unit,makeBattle,makeUndeadEncounter,makeLargeMonsterBattle,availableTargets,ABILITIES,takeTurn,rank} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';

test('enemy factory retains distinct resistances and duplicate independence',()=>{
 const b=makeBattle(41);
 const front=b.units.find(u=>u.id==='e1'),duplicate=b.units.find(u=>u.id==='e2');
 const archer=b.units.find(u=>u.id==='e3'),mage=b.units.find(u=>u.id==='e4');
 assert.equal(front.resist.bleed,ENEMY_PROFILES.swordsman.stats.bleedResist);
 assert.equal(archer.resist.move,ENEMY_PROFILES.archer.stats.moveResist);
 assert.equal(mage.resist.blight,ENEMY_PROFILES.mage.stats.blightResist);
 assert.notDeepEqual(front.resist,mage.resist);
 assert.notEqual(front.enemySkills,duplicate.enemySkills);
 front.enemySkills.pop();
 assert.equal(duplicate.enemySkills.length,2);
});
test('rearguard and cursed court presets fit four ranks and place ranged monsters legally',()=>{
 for(const preset of ['standard','rearguard','curseCourt']){
  const b=makeUndeadEncounter(43,preset);
  const enemies=b.units.filter(u=>u.side==='enemy');
  assert.equal(enemies.length,4);
  assert.deepEqual(enemies.map(u=>u.enemyProfile),ENCOUNTER_PRESETS[preset]);
  assert.deepEqual(enemies.map(u=>rank(b,u.id)),[0,1,2,3]);
  for(const enemy of enemies){
   const legal=enemy.enemySkills.flatMap(key=>availableTargets(b,enemy.id,key));
   assert.ok(legal.length>0,enemy.id+' has no legal attack in '+preset);
  }
 }
});
test('duplicate casters independently select a legal skill and target',()=>{
 const b=makeUndeadEncounter(44,'curseCourt');
 for(const id of ['e3','e4']){
  const u=b.units.find(x=>x.id===id);
  const action=chooseEnemyAction(b,id,u.enemySkills,()=>.2,ABILITIES,availableTargets);
  assert.ok(u.enemySkills.includes(action.key));
  assert.ok(availableTargets(b,id,action.key).includes(action.targetId));
 }
});
test('boss retains three-rank footprint and its independent resistances',()=>{
 const b=makeLargeMonsterBattle(45),boss=b.units.find(u=>u.id==='boss');
 assert.equal(boss.size,3);
 assert.equal(boss.resist.move,ENEMY_PROFILES.emperor.stats.moveResist);
 assert.deepEqual(boss.enemySkills,['emperor_slam','emperor_roar']);
 assert.deepEqual([0,1,2].map(i=>rank(b,boss.id)+i),[0,1,2]);
});
test('unknown profiles and presets fail explicitly rather than silently substituting monsters',()=>{
 assert.throws(()=>spawnProfileEnemy(unit,'e1','missing'),/Unknown enemy profile/);
 assert.throws(()=>makeEnemyFormation(unit,'missing'),/Unknown encounter preset/);
});
