import test from 'node:test';
import assert from 'node:assert/strict';
import {hitChance,directDamage,resistChance,dotDuration,deathBlowResistance,initiativeScore,effectiveCombatStats} from '../src/dd1-math.js';
import {makeBattle,takeTurn,startRound,rng} from '../src/engine.js';
test('hidden +5 accuracy and +4 per consecutive miss',()=>{
 assert.equal(hitChance({accuracy:85,dodge:20}),70);
 assert.equal(hitChance({accuracy:85,dodge:20,missStreak:2}),78);
 assert.equal(hitChance({accuracy:95,dodge:0}),100);
 assert.equal(hitChance({accuracy:10,dodge:100}),5);
});
test('critical damage equals 150 percent of maximum damage before protection',()=>{
 assert.equal(directDamage({minDamage:4,maxDamage:8,crit:true,prot:0},()=>0),12);
 assert.equal(directDamage({minDamage:4,maxDamage:8,crit:true,prot:50},()=>0),6);
});
test('direct damage floors to one and protection is capped to 80',()=>{
 assert.equal(directDamage({minDamage:2,maxDamage:2,prot:150},()=>0),1);
 assert.equal(directDamage({minDamage:10,maxDamage:10,prot:150},()=>0),2);
});
test('critical status application bonus and five-turn DOT',()=>{
 assert.equal(resistChance({applicationChance:100,resistance:90}),10);
 assert.equal(resistChance({applicationChance:100,resistance:90,crit:true}),30);
 assert.equal(dotDuration(3,true),5);
 assert.equal(dotDuration(3,false),3);
});
test('death blow resist caps at 87, base hero 67',()=>{
 assert.equal(deathBlowResistance({}),67);
 assert.equal(deathBlowResistance({deathResist:120}),87);
});
test('Death Door and recovery modify combat stats',()=>{
 const u={spd:5,accMod:3,deathDoor:true};
 assert.deepEqual(effectiveCombatStats(u),{accuracy:-7,damageMultiplier:.75,speed:0,stressMultiplier:1.33});
 u.deathDoor=false;u.mortality='deathDoorRecovery';
 assert.deepEqual(effectiveCombatStats(u),{accuracy:1,damageMultiplier:.95,speed:4,stressMultiplier:1.10});
});
test('initiative uses speed plus an eight-sided roll',()=>{
 assert.equal(initiativeScore({spd:4},()=>0),5);
 assert.equal(initiativeScore({spd:4},()=>.999),12);
});
test('healing a hero off Death Door applies mortality recovery penalty',()=>{
 const b=makeBattle(1);const t=b.units.find(u=>u.id==='h1');
 t.hp=0;t.deathDoor=true;b.queue=['h4'];
 takeTurn(b,'h4','greater_heal','h1',()=>0);
 assert.equal(t.deathDoor,false);assert.equal(t.mortality,'deathDoorRecovery');
 assert.ok(t.hp>0);
});
test('seeded initiative remains reproducible',()=>{
 const a=makeBattle(1),b=makeBattle(1);
 startRound(a,rng(55));startRound(b,rng(55));
 assert.deepEqual(a.queue,b.queue);
});
