import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle} from '../src/dungeon.js';

function firstEncounter(seed,tier){
 const dungeon=createDungeon(seed,{region:'plague',tier});
 beginCorridor(dungeon,'gallery');
 advanceCorridor(dungeon);
 assert.equal(dungeon.phase,'combat','forced entrance encounter must start');
 return dungeonBattle(dungeon);
}

test('Veteran and Champion encounter tiers are reproducible per seed',()=>{
 for(const tier of ['veteran','champion']){
  for(let seed=1;seed<=100;seed++){
   const a=firstEncounter(seed,tier);
   const b=firstEncounter(seed,tier);
   assert.equal(a.encounterTier,b.encounterTier);
   assert.equal(a.expeditionTier,tier);
   assert.equal(a.encounterTier==='apprentice'||a.encounterTier==='veteran'||a.encounterTier==='champion',true);
  }
 }
});

test('roughly half of Veteran and Champion encounters use the preceding tier',()=>{
 for(const [tier,lower] of [['veteran','apprentice'],['champion','veteran']]){
  let lowerCount=0;
  const samples=400;
  for(let seed=1;seed<=samples;seed++){
   const battle=firstEncounter(seed,tier);
   assert.ok([tier,lower].includes(battle.encounterTier));
   if(battle.encounterTier===lower)lowerCount++;
  }
  assert.ok(lowerCount>=140&&lowerCount<=260,
   tier+' lower-tier frequency '+lowerCount+'/'+samples+' is unexpectedly far from 50%');
 }
});

test('Apprentice encounters remain Apprentice',()=>{
 for(let seed=1;seed<=40;seed++){
  const battle=firstEncounter(seed,'apprentice');
  assert.equal(battle.encounterTier,'apprentice');
 }
});

test('successive campaign-tier encounters retain combat readiness and deterministic saves across seeds',()=>{
 for(const [tier,lower] of [['apprentice','apprentice'],['veteran','apprentice'],['champion','veteran']]){
  for(let seed=1;seed<=40;seed++){
   const dungeon=createDungeon(seed,{region:'plague',tier});
   beginCorridor(dungeon,'gallery');
   advanceCorridor(dungeon);
   assert.equal(dungeon.phase,'combat');
   const battle=dungeonBattle(dungeon);
   assert.ok([tier,lower].includes(battle.encounterTier));
   assert.equal(battle.expeditionTier,tier);
   assert.ok(battle.units.some(u=>u.side==='enemy'&&!u.dead&&u.hp>0));
   assert.ok(battle.units.some(u=>u.side==='hero'&&!u.dead&&u.hp>0));
   const saved=JSON.parse(JSON.stringify(dungeon));
   assert.equal(saved.pendingBattle.battle.encounterPlan.tier,battle.encounterTier);
   assert.deepEqual(saved.pendingBattle.battle.units.map(u=>[u.id,u.hp,u.dead]),
    dungeon.pendingBattle.battle.units.map(u=>[u.id,u.hp,u.dead]));
  }
 }
});
