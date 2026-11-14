import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,unit,takeTurn,availableTargets,startRound,rng} from '../src/engine.js';
import {corpseFromEnemy,formationSlots} from '../src/formation.js';

const get=(b,id)=>b.units.find(u=>u.id===id);

test('corpse conversion replaces original monster resistances with DD1 corpse resistances',()=>{
 const b=makeBattle(15),enemy=get(b,'e1');
 enemy.resist={stun:90,bleed:75,blight:65,move:10,debuff:35};
 enemy.effects.push({kind:'buff',turns:3,modifiers:{prot:20}});
 enemy.dot.push({type:'blight',value:2,turns:3});
 enemy.hp=0;
 assert.equal(corpseFromEnemy(enemy,1),true);
 assert.deepEqual(enemy.resist,{stun:200,bleed:0,blight:0,move:200,debuff:200});
 assert.deepEqual(enemy.effects,[]);
 assert.deepEqual(enemy.dot,[]);
 assert.equal(enemy.prot,0);
 assert.equal(enemy.dodge,0);
 assert.equal(enemy.corpse,true);
 assert.deepEqual(formationSlots(b,'enemy').map(u=>u?.id),['corpse_e1','e2','e3','e4']);
});

test('ordinary critical attack on a corpse does not give hero stress relief',()=>{
 const b=makeBattle(16),corpse=get(b,'e1'),hero=get(b,'h1');
 corpseFromEnemy(corpse,0);
 hero.crit=100;hero.stress=25;
 b.queue=['h1'];
 assert.ok(availableTargets(b,'h1','heavy_slash').includes('corpse_e1'));
 takeTurn(b,'h1','heavy_slash','corpse_e1',()=>.1);
 assert.equal(hero.stress,25,'corpse CRIT must not relieve attacker stress');
});

test('area critical attack that includes a corpse can still relieve hero stress',()=>{
 const b=makeBattle(17),corpse=get(b,'e1'),hero=get(b,'h2');
 corpseFromEnemy(corpse,0);
 hero.crit=100;hero.stress=25;
 b.queue=['h2'];
 takeTurn(b,'h2','sweeping_assault','corpse_e1',()=>.5);
 assert.ok(hero.stress<25,'area critical hits that include a corpse can relieve stress');
});

test('corpses never gain turns, regardless of their original enemy initiative',()=>{
 const b=makeBattle(18),enemy=get(b,'e2');
 corpseFromEnemy(enemy,0);
 startRound(b,rng(18));
 assert.equal(b.queue.includes('corpse_e2'),false);
 assert.equal(b.queue.filter(x=>x==='e1').length,1);
});
