import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUndeadEncounter,ABILITIES,availableTargets,takeTurn,rank,formationSlots} from '../src/engine.js';
import {moveWithinFormation} from '../src/formation.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';

const battle=()=>makeUndeadEncounter(112,'cryptVolley');
const enemy=(b,id='e3')=>b.units.find(u=>u.id===id);
test('Apprentice Bone Arbalist reference stats and independent duplicate instances',()=>{
 const b=battle(),a=enemy(b),duplicate=enemy(b,'e4');
 assert.equal(a.name,'Crypt Arbalist');
 assert.deepEqual({hp:a.maxHp,spd:a.spd,dodge:a.dodge,prot:a.prot},{hp:15,spd:5,dodge:5,prot:0});
 assert.deepEqual(a.resist,{stun:10,bleed:200,blight:10,debuff:15,move:25});
 assert.deepEqual(a.enemySkills,['crypt_quarrel','crypt_bayonet']);
 assert.notEqual(a.enemySkills,duplicate.enemySkills);
 assert.deepEqual([rank(b,'e1'),rank(b,'e2'),rank(b,'e3'),rank(b,'e4')],[0,1,2,3]);
 assert.deepEqual(formationSlots(b,'enemy').map(u=>u?.id),['e1','e2','e3','e4']);
});
test('verified Apprentice Quarrel and Bayonet damage and source rank rules',()=>{
 const b=battle();
 assert.deepEqual(availableTargets(b,'e3','crypt_quarrel'),['h2','h3','h4']);
 assert.deepEqual(availableTargets(b,'e3','crypt_bayonet'),[]);
 assert.deepEqual(availableTargets(b,'e4','crypt_quarrel'),['h2','h3','h4']);
 for(const [key,expected] of Object.entries({
  crypt_quarrel:{acc:82.5,crit:12,damageMin:3,damageMax:7,vsMarked:.25},
  crypt_bayonet:{acc:72.5,crit:2,damageMin:2,damageMax:4,selfBack:1}
 }))for(const [prop,value] of Object.entries(expected))assert.equal(ABILITIES[key][prop],value);
});
test('Quarrel deals 25% increased damage to marked targets, with identical seeded damage roll',()=>{
 const plain=battle(),marked=battle();
 const a=plain.units.find(u=>u.id==='h2'),b=marked.units.find(u=>u.id==='h2');
 marked.units.find(u=>u.id==='h2').marked=2;
 plain.queue=['e3'];marked.queue=['e3'];
 takeTurn(plain,'e3','crypt_quarrel','h2',()=>.5);
 takeTurn(marked,'e3','crypt_quarrel','h2',()=>.5);
 assert.equal(33-a.hp,5,'normal Quarrel uses damage roll 5');
 assert.equal(33-b.hp,6,'marked Quarrel multiplies by 1.25 and rounds');
});
test('moving arbalist to front forces Bayonet and its self-retreat one rank',()=>{
 const b=battle();const arbalist=enemy(b);
 assert.equal(moveWithinFormation(b,arbalist.id,-2),-2);
 assert.equal(rank(b,arbalist.id),0);
 assert.deepEqual(availableTargets(b,arbalist.id,'crypt_quarrel'),[]);
 assert.deepEqual(availableTargets(b,arbalist.id,'crypt_bayonet'),['h1','h2']);
 const action=chooseEnemyAction(b,arbalist.id,arbalist.enemySkills,()=>.5,ABILITIES,availableTargets);
 assert.deepEqual(action,{key:'crypt_bayonet',targetId:'h2'});
 b.queue=[arbalist.id,'h1'];
 const h1=b.units.find(u=>u.id==='h1'),hp=h1.hp;
 takeTurn(b,arbalist.id,'crypt_bayonet','h1',()=>.5);
 assert.equal(hp-h1.hp,3);
 assert.equal(rank(b,arbalist.id),1);
 assert.deepEqual(availableTargets(b,arbalist.id,'crypt_bayonet'),['h1','h2']);
});
test('Bayonet retreat still occurs after a miss, but never grants illegal crossbow targets',()=>{
 const b=battle(),a=enemy(b);
 moveWithinFormation(b,a.id,-2);
 b.queue=[a.id];
 takeTurn(b,a.id,'crypt_bayonet','h1',()=>.99);
 assert.equal(rank(b,a.id),1);
 assert.deepEqual(availableTargets(b,a.id,'crypt_quarrel'),[]);
});
