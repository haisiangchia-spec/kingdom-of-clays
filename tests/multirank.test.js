import test from 'node:test';
import assert from 'node:assert/strict';
import {unit,makeBattle,makeLargeMonsterBattle,rank,occupiedRanks,formationSlots,availableTargets,startRound,takeTurn} from '../src/engine.js';
import {attemptDisplacement,moveWithinFormation,corpseFromEnemy} from '../src/formation.js';
import {eligibleRanks} from '../src/combat-effects.js';

test('three-rank boss occupies ranks zero through two and acts once',()=>{
 const b=makeLargeMonsterBattle(7);
 assert.deepEqual(occupiedRanks(b,'boss'),[0,1,2]);
 assert.equal(rank(b,'e4'),3);
 assert.deepEqual(formationSlots(b,'enemy').map(x=>x?.id),['boss','boss','boss','e4']);
 startRound(b,()=>0);
 assert.equal(b.queue.filter(x=>x==='boss').length,1);
 assert.equal(b.queue.length,6);
});
test('rear-rank skills can target boss occupying rearward cells, but not a front-only ordinary enemy',()=>{
 const b=makeLargeMonsterBattle();
 assert.ok(availableTargets(b,'h3','eagle_eye_shot').includes('boss'));
 assert.ok(availableTargets(b,'h2','crushing_strike').includes('boss'));
 assert.ok(availableTargets(b,'h2','sweeping_assault').includes('boss'));
});
test('area skills strike wide boss once rather than once per occupied rank',()=>{
 const b=makeLargeMonsterBattle(),w=b.units.find(x=>x.id==='h2'),boss=b.units.find(x=>x.id==='boss');
 w.dmgMin=w.dmgMax=10;w.crit=0;b.queue=['h2'];
 const hp=boss.hp;takeTurn(b,'h2','sweeping_assault','boss',()=>.1);
 assert.equal(hp-boss.hp,5); // 10 * 60% * (1-15% PROT) rounded = 5
 assert.equal(b.log.filter(x=>x.includes('uses Sweeping Assault on Goblin Emperor')).length,1);
});
test('eligible ranks never duplicate a giant entity in area target collections',()=>{
 const b=makeLargeMonsterBattle(),hits=eligibleRanks(b,'enemy',[0,1,2,3]);
 assert.deepEqual(hits.map(u=>u.id),['boss','e4']);
});
test('whole-unit displacement cannot split a multi-rank monster',()=>{
 const b=makeLargeMonsterBattle(),boss=b.units.find(x=>x.id==='boss');
 assert.equal(attemptDisplacement(b,boss,{type:'push',distance:1,chance:100},()=>0),1);
 assert.deepEqual(occupiedRanks(b,'boss'),[1,2,3]);
 assert.deepEqual(occupiedRanks(b,'e4'),[0]);
});
test('three-rank boss does not leave a corpse, as in base DD1',()=>{
 const b=makeLargeMonsterBattle(),boss=b.units.find(x=>x.id==='boss');
 assert.equal(corpseFromEnemy(boss,0),false);
 assert.equal(boss.corpse,undefined);
});
test('two-rank enemies leave corpses that preserve both occupied ranks',()=>{
 const b=makeLargeMonsterBattle();
 const boss=b.units.find(x=>x.id==='boss');boss.dead=true;
 const enemy=b.units.find(x=>x.id==='e4');enemy.size=2;
 assert.deepEqual(occupiedRanks(b,enemy.id),[0,1]);
 assert.equal(corpseFromEnemy(enemy,0),true);
 assert.deepEqual(occupiedRanks(b,enemy.id),[0,1]);
});
test('formation rejects more than four occupied ranks',()=>{
 const b=makeBattle();b.units.find(u=>u.id==='e1').size=2;
 assert.throws(()=>formationSlots(b,'enemy'),/exceeds four ranks/);
});
