import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,stress,takeTurn} from '../src/engine.js';
import {effectiveCombatStats} from '../src/dd1-math.js';

test('hero already virtuous at 200 stress loses virtue and resets to zero without heart attack',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.stress=195;u.virtue='Bravery';
 stress(b,u,10,()=>.9);
 assert.equal(u.stress,0);assert.equal(u.virtue,null);
 assert.equal(u.hp,33);assert.equal(u.deathDoor,false);assert.equal(u.dead,false);
 assert.ok(b.log.some(x=>x.includes('avoiding a heart attack')));
});
test('first heart attack at 200 stress enters Death Door and resets stress to 170',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.affliction='Despair';u.stress=195;
 stress(b,u,10,()=>.9);
 assert.equal(u.stress,170);assert.equal(u.hp,0);assert.equal(u.deathDoor,true);
 assert.equal(u.dead,false);assert.equal(u.heartAttackRecovery,true);
});
test('heart attack at Death Door kills regardless of Death Blow resistance',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.stress=195;u.affliction='Panic';u.hp=0;u.deathDoor=true;u.deathResist=1000;
 stress(b,u,10,()=>0);
 assert.equal(u.dead,true);
});
test('after heart attack recovery, both death door and heart recovery modifiers are present',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.affliction='Despair';u.stress=195;
 stress(b,u,10,()=>.9);
 b.queue=['h4'];
 takeTurn(b,'h4','greater_heal','h1',()=>.3);
 assert.ok(u.hp>0);assert.equal(u.deathDoor,false);
 assert.equal(u.heartAttackRecovery,true);
 assert.equal(u.mortality,'deathDoorRecovery');
 assert.deepEqual(effectiveCombatStats(u),{accuracy:-5,damageMultiplier:.85,speed:0,stressMultiplier:1.25});
});
test('heart attack recovery penalty is not lost on a second death door recovery',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.heartAttackRecovery=true;u.mortality='deathDoorRecovery';
 u.hp=0;u.deathDoor=true;b.queue=['h4'];
 takeTurn(b,'h4','greater_heal','h1',()=>.3);
 assert.equal(u.heartAttackRecovery,true);
 assert.equal(effectiveCombatStats(u).damageMultiplier,.85);
});
test('normal death door recovery remains distinct from combined heart recovery',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.deathDoor=true;u.hp=0;b.queue=['h4'];
 takeTurn(b,'h4','greater_heal','h1',()=>.3);
 assert.equal(u.heartAttackRecovery,false);
 assert.equal(effectiveCombatStats(u).damageMultiplier,.95);
});
test('virtue resolve at 100 stress resets self to 45 and removes six allied stress',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.stress=95;
 for(const ally of b.units.filter(x=>x.side==='hero'&&x!==u))ally.stress=20;
 stress(b,u,10,()=>0);
 assert.equal(u.stress,45);assert.ok(u.virtue);
 for(const ally of b.units.filter(x=>x.side==='hero'&&x!==u))assert.equal(ally.stress,14);
});
test('affliction at resolve threshold does not reset stress to 45',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.stress=95;
 stress(b,u,10,()=>.9);
 assert.ok(u.affliction);assert.equal(u.stress,105);
});
test('heart attack does not immediately assign a recovery modifier while still at Death Door',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.affliction='Despair';u.stress=199;
 stress(b,u,1,()=>.9);
 assert.equal(u.mortality,null);
 assert.equal(effectiveCombatStats(u).damageMultiplier,.75);
});
