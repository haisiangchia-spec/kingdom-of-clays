import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,makeSecondClassBattle,takeTurn,startRound,availableTargets,rng} from '../src/engine.js';
import {corpseFromEnemy,formationSlots} from '../src/formation.js';
const get=(b,id)=>b.units.find(u=>u.id===id);

test('bleed or blight can be applied to corpse despite immunity to other status effects',()=>{
 const b=makeSecondClassBattle(44),corpse=get(b,'e1');
 corpse.hp=0;corpseFromEnemy(corpse,0);
 assert.equal(corpse.resist.blight,0);
 assert.ok(availableTargets(b,'h2','venom_needle').includes('corpse_e1'));
 b.queue=['h2'];
 takeTurn(b,'h2','venom_needle','corpse_e1',()=>.2);
 assert.deepEqual(corpse.dot,[{type:'blight',value:2,turns:4}]);
 assert.equal(corpse.effects.length,0,'debuff must not apply to corpse');
 assert.equal(corpse.dead,false);
});

test('corpse DoT ticks once at provisional round boundary, never creates initiative slot',()=>{
 const b=makeBattle(45),corpse=get(b,'e1');
 corpseFromEnemy(corpse,0);
 const hp=corpse.hp;
 corpse.dot.push({type:'bleed',value:2,turns:3},{type:'blight',value:1,turns:2});
 startRound(b,rng(45));
 assert.equal(corpse.hp,hp-3);
 assert.deepEqual(corpse.dot.map(d=>d.turns),[2,1]);
 assert.equal(b.queue.includes('corpse_e1'),false);
});

test('DoT can destroy corpse without displacing living enemies or creating another corpse',()=>{
 const b=makeBattle(46),corpse=get(b,'e1');
 corpseFromEnemy(corpse,0);
 corpse.hp=2;corpse.dot=[{type:'blight',value:3,turns:2}];
 startRound(b,rng(46));
 assert.equal(corpse.dead,true);
 assert.equal(corpse.hp,0);
 assert.equal(b.units.filter(u=>u.corpse).length,1);
 assert.deepEqual(formationSlots(b,'enemy').map(u=>u?.id),['e2','e3','e4',undefined]);
});

test('expired corpses are removed before a new round initiative',()=>{
 const b=makeBattle(47),corpse=get(b,'e1');
 corpseFromEnemy(corpse,0);
 b.round=3;
 startRound(b,rng(47));
 assert.equal(corpse.dead,true);
 assert.equal(b.queue.includes('corpse_e1'),false);
});
