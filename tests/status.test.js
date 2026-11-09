import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,takeTurn,beginTurn} from '../src/engine.js';
import {applyGuard,guardTarget,inflictStun,consumeStun,completeUnstunnedTurn,stunResistance,canCounter,addTimedEffect,tickTimedEffects,effectModifier} from '../src/status.js';

test('guard intercepts single-target attack and leaves the original ally unharmed',()=>{
 const b=makeBattle(), protector=b.units.find(x=>x.id==='h1'), ally=b.units.find(x=>x.id==='h2'), enemy=b.units.find(x=>x.id==='e1');
 applyGuard(b,protector,ally.id,3);
 b.queue=[enemy.id];
 const starting=protector.hp, allyHP=ally.hp;
 takeTurn(b,enemy.id,'enemy_strike',ally.id,()=>0);
 assert.ok(protector.hp<starting);
 assert.equal(ally.hp,allyHP);
 assert.ok(b.log.some(x=>x.includes('intercepts')));
});
test('guard is canceled by stun',()=>{
 const b=makeBattle(), p=b.units[0], a=b.units[1];
 applyGuard(b,p,a.id);
 assert.equal(guardTarget(b,a).id,p.id);
 inflictStun(p);
 assert.equal(p.guard,null);
 assert.equal(guardTarget(b,a).id,a.id);
});
test('stun resistance increases by 50 after each stun turn, resets after an unstunned turn',()=>{
 const u={resist:{stun:30},stun:0,stunRecoveryStacks:0,riposte:2,guard:{targetId:'x',turns:2}};
 inflictStun(u);assert.equal(u.riposte,0);assert.equal(u.guard,null);
 assert.ok(consumeStun(u));assert.equal(stunResistance(u),80);
 inflictStun(u);assert.ok(consumeStun(u));assert.equal(stunResistance(u),130);
 completeUnstunnedTurn(u);assert.equal(stunResistance(u),30);
});
test('riposte retaliates even when attack misses',()=>{
 const b=makeBattle(), counter=b.units.find(x=>x.id==='h1'), attacker=b.units.find(x=>x.id==='e1');
 counter.riposte=2;
 counter.dmgMin=counter.dmgMax=12;
 counter.crit=0;
 counter.dodge=150; // force miss
 b.queue=[attacker.id];
 const before=attacker.hp;
 takeTurn(b,attacker.id,'enemy_strike',counter.id,()=>0);
 assert.ok(attacker.hp<before);
 assert.ok(b.log.some(x=>x.includes('ripostes')));
});
test('riposte does not trigger on non-damaging stress skills',()=>{
 const b=makeBattle(), counter=b.units.find(x=>x.id==='h1'), attacker=b.units.find(x=>x.id==='e4');
 counter.riposte=2;b.queue=[attacker.id];
 const before=attacker.hp;
 takeTurn(b,attacker.id,'enemy_stress',counter.id,()=>0);
 assert.equal(attacker.hp,before);
});
test('riposte does not trigger while stunned',()=>{
 const b=makeBattle(), defender=b.units.find(x=>x.id==='h1'), attacker=b.units.find(x=>x.id==='e1');
 defender.riposte=2;inflictStun(defender);
 assert.equal(canCounter(defender,attacker,{kind:'strike'}),false);
});
test('DOT stacks tick independently through beginTurn',()=>{
 const b=makeBattle(),u=b.units[0];u.hp=30;
 u.dot.push({type:'bleed',value:2,turns:1},{type:'blight',value:3,turns:2});
 beginTurn(b,u.id,()=>0);
 assert.equal(u.hp,25);
 assert.equal(u.dot.length,1);
 beginTurn(b,u.id,()=>0);
 assert.equal(u.hp,22);
 assert.equal(u.dot.length,0);
});
test('temporary buffs stack then expire independently',()=>{
 const u={effects:[],marked:0,riposte:0,guard:null};
 addTimedEffect(u,{turns:1,modifiers:{accuracy:5}});
 addTimedEffect(u,{turns:2,modifiers:{accuracy:7}});
 assert.equal(effectModifier(u,'accuracy'),12);
 tickTimedEffects(u);
 assert.equal(effectModifier(u,'accuracy'),7);
 tickTimedEffects(u);
 assert.equal(effectModifier(u,'accuracy'),0);
});
test('guard and riposte expire on owner turn boundaries',()=>{
 const u={effects:[],marked:0,riposte:2,guard:{targetId:'ally',turns:2}};
 tickTimedEffects(u);assert.equal(u.riposte,1);assert.ok(u.guard);
 tickTimedEffects(u);assert.equal(u.riposte,0);assert.equal(u.guard,null);
});
