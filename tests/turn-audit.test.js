import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,makeSpiritboundBattle,takeTurn,prepareActorTurn,currentActor} from '../src/engine.js';
import {stunResistance} from '../src/status.js';

test('enemy stun skips enemy action and advances queue',()=>{
 const b=makeBattle(),e=b.units.find(x=>x.id==='e1'),next=b.units.find(x=>x.id==='h1');
 b.queue=['e1','h1'];e.stun=1;
 const before=next.hp;
 assert.equal(prepareActorTurn(b,'e1',()=>.5),'stunned');
 assert.equal(e.stun,0);assert.equal(stunResistance(e),70);
 assert.equal(currentActor(b).id,'h1');assert.equal(next.hp,before);
 assert.throws(()=>takeTurn(b,'e1','enemy_strike','h1',()=>0),/Not this actor/);
});
test('hero stun uses the same skip-turn rule as enemy stun',()=>{
 const b=makeBattle(),h=b.units.find(x=>x.id==='h1');
 b.queue=['h1','e1'];h.stun=1;
 assert.equal(prepareActorTurn(b,'h1',()=>.5),'stunned');
 assert.equal(currentActor(b).id,'e1');assert.equal(stunResistance(h),70);
});
test('bleed damage happens before stunned turn is skipped',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='e1');
 b.queue=['e1'];u.stun=1;u.dot=[{type:'bleed',value:2,turns:2}];
 assert.equal(prepareActorTurn(b,'e1',()=>.5),'stunned');
 assert.equal(u.hp,14);assert.equal(u.dot[0].turns,1);
});
test('DOT death at turn start removes the actor without an attack',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='e1');
 b.queue=['e1','h1'];u.hp=1;u.dot=[{type:'blight',value:3,turns:1}];
 assert.equal(prepareActorTurn(b,'e1',()=>.5),'dead');
 assert.equal(u.dead,true);assert.equal(currentActor(b).id,'h1');
});
test('stunned Death Door hero can die to bleed before stun is checked',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 b.queue=['h1'];u.hp=0;u.deathDoor=true;u.stun=1;
 u.dot=[{type:'bleed',value:2,turns:1}];
 assert.equal(prepareActorTurn(b,'h1',()=>.99),'dead');
 assert.equal(u.dead,true);
});
test('a ready actor ticks start-of-turn effects once and can then attack',()=>{
 const b=makeBattle(),a=b.units.find(x=>x.id==='e1');
 b.queue=['e1'];a.dot=[{type:'bleed',value:1,turns:2}];
 assert.equal(prepareActorTurn(b,'e1',()=>.5),'ready');assert.equal(a.hp,15);
 takeTurn(b,'e1','enemy_strike','h1',()=>.5);
 assert.equal(a.hp,15);assert.equal(a.dot[0].turns,1);
});
test('free Spiritbound transformation retains post-stun resistance until actual attack',()=>{
 const b=makeSpiritboundBattle(),a=b.units.find(x=>x.id==='h2');
 b.queue=['h2'];a.stunRecoveryStacks=1;
 takeTurn(b,'h2','spirit_awakening','h2',()=>.5);
 assert.equal(stunResistance(a),70);
 takeTurn(b,'h2','primal_fury','e2',()=>.5);
 assert.equal(stunResistance(a),20);
});
