import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,makeLargeMonsterBattle,startRound,prepareActorTurn,takeTurn,currentActor,rng} from '../src/engine.js';

const find=(b,id)=>b.units.find(u=>u.id===id);

test('boss gets two consecutive initiative slots, while normal enemies and heroes get one',()=>{
 const b=makeLargeMonsterBattle(17);
 startRound(b,rng(101));
 assert.equal(find(b,'boss').actionsPerRound,2);
 assert.equal(b.queue.filter(id=>id==='boss').length,2);
 assert.equal(b.queue.length,7,'four heroes, one mage, and two boss actions');
 const i=b.queue.indexOf('boss');
 assert.equal(b.queue[i+1],'boss','boss acts consecutively rather than rolling initiative twice');
 const normal=makeBattle(17);
 startRound(normal,rng(101));
 assert.equal(normal.queue.length,8);
 assert.equal(new Set(normal.queue).size,8);
});

test('boss resolves start-of-turn damage once and keeps timed effects until second action',()=>{
 const b=makeLargeMonsterBattle(17),boss=find(b,'boss');
 boss.hp=50;boss.dot=[{type:'bleed',value:2,turns:2}];
 boss.marked=2;
 b.queue=['boss','boss','h1'];
 assert.equal(prepareActorTurn(b,'boss',()=>.5),'ready');
 assert.equal(boss.hp,48);
 assert.equal(boss.dot[0].turns,1);
 takeTurn(b,'boss','emperor_roar','h1',()=>.5);
 assert.equal(boss.acted,false);
 assert.equal(boss.actionsRemaining,1);
 assert.equal(currentActor(b)?.id,'boss');
 assert.equal(boss.marked,2,'mark should not tick between consecutive actions');
 assert.equal(prepareActorTurn(b,'boss',()=>.5),'ready');
 assert.equal(boss.hp,48,'start-of-turn DOT must not tick again');
 assert.equal(boss.dot[0].turns,1);
 takeTurn(b,'boss','emperor_roar','h1',()=>.5);
 assert.equal(boss.acted,true);
 assert.equal(boss.actionsRemaining,0);
 assert.equal(boss.marked,1,'mark expires once after final action');
 assert.equal(currentActor(b)?.id,'h1');
});

test('one successful stun skips both boss actions and grants one recovery stack',()=>{
 const b=makeLargeMonsterBattle(17),boss=find(b,'boss');
 b.queue=['boss','boss','h1'];boss.stun=1;
 const before=find(b,'h1').stress;
 assert.equal(prepareActorTurn(b,'boss',()=>.5),'stunned');
 assert.equal(boss.stun,0);
 assert.equal(boss.stunRecoveryStacks,1);
 assert.equal(boss.actionsRemaining,0);
 assert.equal(boss.acted,true);
 assert.equal(currentActor(b)?.id,'h1');
 assert.equal(find(b,'h1').stress,before);
});

test('a single-action enemy still consumes one turn and one status tick',()=>{
 const b=makeBattle(17),enemy=find(b,'e1');
 enemy.marked=2;b.queue=['e1','h1'];
 assert.equal(prepareActorTurn(b,'e1',()=>.5),'ready');
 takeTurn(b,'e1','skeleton_guard_break','h1',()=>.5);
 assert.equal(enemy.marked,1);
 assert.equal(enemy.acted,true);
 assert.equal(currentActor(b)?.id,'h1');
});
