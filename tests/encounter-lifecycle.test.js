import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,makeLargeMonsterBattle,passActorTurn,currentActor,prepareActorTurn,takeTurn,status,formationSlots,startRound,rng} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {ABILITIES,availableTargets} from '../src/engine.js';

const unit=(b,id)=>b.units.find(u=>u.id===id);
test('rank-blocked archer passes and completes its timed effect lifecycle',()=>{
 const b=makeBattle(22),archer=unit(b,'e3');
 // A forced enemy front rank leaves rear-only archer skills unavailable.
 b.units.splice(b.units.indexOf(archer),1);
 b.units.splice(4,0,archer);
 assert.equal(availableTargets(b,'e3','skeleton_bone_arrow').length,0);
 assert.equal(availableTargets(b,'e3','skeleton_pin_arrow').length,0);
 archer.marked=2;b.queue=['e3','h1'];
 assert.equal(prepareActorTurn(b,'e3',()=>.5),'ready');
 assert.equal(chooseEnemyAction(b,'e3',archer.enemySkills,()=>.5,ABILITIES,availableTargets),null);
 passActorTurn(b,'e3');
 assert.equal(archer.marked,1);
 assert.equal(archer.acted,true);
 assert.equal(archer.actionsRemaining,0);
 assert.equal(currentActor(b)?.id,'h1');
});

test('multi-action boss pass consumes all remaining slots without another DOT tick',()=>{
 const b=makeLargeMonsterBattle(24),boss=unit(b,'boss');
 boss.dot=[{type:'bleed',value:2,turns:2}];
 boss.marked=2;b.queue=['boss','boss','h1'];
 const hp=boss.hp;
 assert.equal(prepareActorTurn(b,'boss',()=>.5),'ready');
 assert.equal(boss.hp,hp-2);
 passActorTurn(b,'boss');
 assert.equal(boss.actionsRemaining,0);
 assert.equal(boss.acted,true);
 assert.equal(boss.hp,hp-2);
 assert.equal(boss.dot[0].turns,1);
 assert.equal(boss.marked,1);
 assert.deepEqual(b.queue,['h1']);
});

test('passing after first boss action abandons only remaining boss slot',()=>{
 const b=makeLargeMonsterBattle(25),boss=unit(b,'boss');
 boss.marked=2;b.queue=['boss','boss','h1'];
 prepareActorTurn(b,'boss',()=>.5);
 takeTurn(b,'boss','emperor_roar','h1',()=>.5);
 assert.equal(boss.acted,false);
 passActorTurn(b,'boss');
 assert.equal(boss.marked,1);
 assert.equal(boss.actionsRemaining,0);
 assert.deepEqual(b.queue,['h1']);
});

test('boss defeat does not prematurely resolve encounter while summoned reinforcements live',()=>{
 const b=makeLargeMonsterBattle(26),boss=unit(b,'boss');
 unit(b,'e4').dead=true;
 boss.hp=48;b.queue=['boss','boss','h1'];
 takeTurn(b,'boss','emperor_call','boss',()=>.5);
 const reinforcement=unit(b,'reinforcement_1');
 boss.dead=true;
 assert.equal(status(b),'ongoing');
 assert.deepEqual(formationSlots(b,'enemy').filter(Boolean).map(u=>u.id),['reinforcement_1']);
 assert.equal(currentActor(b)?.id,'h1','dead boss may not act again');
 startRound(b,rng(5));
 assert.equal(b.queue.filter(id=>id==='boss').length,0);
 assert.equal(b.queue.filter(id=>id==='reinforcement_1').length,1);
 reinforcement.dead=true;
 assert.equal(status(b),'victory');
});

test('pass action can only be invoked for current actor',()=>{
 const b=makeBattle(27);
 b.queue=['e1','h1'];
 assert.throws(()=>passActorTurn(b,'h1'),/Not this actor/);
 assert.deepEqual(b.queue,['e1','h1']);
});
