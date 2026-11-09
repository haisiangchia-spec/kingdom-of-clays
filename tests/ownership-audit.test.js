import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,makeFifthClassBattle,makeSpiritboundBattle,availableTargets,takeTurn,unit} from '../src/engine.js';
test('unit identifies the hero class independently of formation position',()=>{
 const u=unit('custom','Monster Slayer','hero',{});
 assert.equal(u.classId,'monster_slayer');
});
test('rank legality cannot bypass class ownership for hero skills',()=>{
 const b=makeBattle();b.queue=['h1'];
 assert.deepEqual(availableTargets(b,'h1','crushing_strike'),[]);
 assert.deepEqual(availableTargets(b,'h1','greater_heal'),[]);
 assert.deepEqual(availableTargets(b,'h1','heavy_slash'),['e1','e2','e3']);
 assert.throws(()=>takeTurn(b,'h1','crushing_strike','e1',()=>0),/Illegal target or rank/);
 assert.equal(b.queue[0],'h1');
});
test('Treasure Hunter cannot cast Hex Mage healing, even at legal target ranks',()=>{
 const b=makeFifthClassBattle();b.queue=['h2'];
 assert.deepEqual(availableTargets(b,'h2','forbidden_restoration'),[]);
 assert.ok(availableTargets(b,'h3','forbidden_restoration').length>0);
 assert.throws(()=>takeTurn(b,'h2','forbidden_restoration','h1',()=>0),/Illegal target or rank/);
});
test('Spiritbound can only use skills from its own catalog and current form',()=>{
 const b=makeSpiritboundBattle();
 assert.deepEqual(availableTargets(b,'h2','sweeping_assault'),[]);
 assert.ok(availableTargets(b,'h2','spirit_chains').length>0);
 assert.deepEqual(availableTargets(b,'h2','primal_fury'),[]);
});
test('enemy prototype still has access to its explicitly available enemy abilities',()=>{
 const b=makeBattle();
 assert.deepEqual(availableTargets(b,'e1','enemy_strike'),['h1','h2','h3','h4']);
});
