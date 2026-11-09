import test from 'node:test';
import assert from 'node:assert/strict';
import {combinedAttackMultiplier,directDamage,effectiveCombatStats} from '../src/dd1-math.js';
import {makeBattle,stress,takeTurn} from '../src/engine.js';

test('DD1 skill base modifier and additive attacker buffs form separate factors',()=>{
 assert.equal(combinedAttackMultiplier(-.4,[20,40]),.96);
 assert.equal(combinedAttackMultiplier(-.15,[25]),1.0625);
 assert.equal(combinedAttackMultiplier(0,[60,15]),1.75);
 assert.equal(combinedAttackMultiplier(0,[-150]),0);
});
test('marked plus enemy-type bonuses add rather than multiply',()=>{
 const b=makeBattle(),h=b.units.find(u=>u.id==='h2'),e=b.units.find(u=>u.id==='e1');
 h.classId='monster_slayer';h.dmgMin=h.dmgMax=10;h.crit=0;
 e.types=['human'];e.marked=3;e.hp=e.maxHp=100;b.queue=['h2'];
 takeTurn(b,'h2','hunters_execution','e1',()=>.3);
 assert.equal(100-e.hp,21); // +90 marked +15 human = +105%, rounded
});
test('skill base negative multiplier remains independent of conditional damage bonuses',()=>{
 assert.equal(directDamage({minDamage:10,maxDamage:10,skillMultiplier:combinedAttackMultiplier(-.4,[60]),prot:0},()=>.5),10);
});
test('heart attack recovery and death door recovery stack in correct order',()=>{
 const b=makeBattle(),h=b.units.find(u=>u.id==='h1');
 h.stress=195;h.affliction='Panic';
 stress(b,h,10,()=>.9);
 assert.equal(h.deathDoor,true);
 b.queue=['h4'];
 takeTurn(b,'h4','greater_heal','h1',()=>.3);
 assert.deepEqual(effectiveCombatStats(h),{accuracy:-5,damageMultiplier:.85,speed:0,stressMultiplier:1.25});
});
