import test from 'node:test';
import assert from 'node:assert/strict';
import {directDamage,deathBlowResistance} from '../src/dd1-math.js';
import {makeBattle,takeTurn,beginTurn} from '../src/engine.js';

test('zero-base-damage attacks calculate zero, not a fabricated one-damage floor',()=>{
 assert.equal(directDamage({minDamage:0,maxDamage:0,prot:0},()=>.5),0);
 assert.equal(directDamage({minDamage:10,maxDamage:10,skillMultiplier:0,prot:0},()=>.5),0);
 assert.equal(directDamage({minDamage:0,maxDamage:0,crit:true},()=>.5),0);
});
test('positive physical damage retains minimum 1, protection cap 80 and critical max rule',()=>{
 assert.equal(directDamage({minDamage:1,maxDamage:1,prot:80},()=>.5),1);
 assert.equal(directDamage({minDamage:10,maxDamage:10,prot:120},()=>.5),2);
 assert.equal(directDamage({minDamage:5,maxDamage:10,crit:true,prot:50},()=>0),8);
 assert.equal(directDamage({minDamage:5,maxDamage:10,crit:true,prot:50},()=>.99),8);
});
test('zero-damage physical strike still checks deathblow at Death Door',()=>{
 const b=makeBattle(),enemy=b.units.find(x=>x.id==='e1'),hero=b.units.find(x=>x.id==='h1');
 hero.hp=0;hero.deathDoor=true;enemy.dmgMin=enemy.dmgMax=0;
 b.queue=['e1'];
 const rolls=[.1,.9,.9,.99];let i=0;
 takeTurn(b,'e1','enemy_strike','h1',()=>rolls[i++]??.99);
 assert.equal(hero.dead,true);
 assert.ok(b.log.some(x=>x.includes('Deathblow')));
});
test('zero-damage physical strike can be resisted at Death Door',()=>{
 const b=makeBattle(),enemy=b.units.find(x=>x.id==='e1'),hero=b.units.find(x=>x.id==='h1');
 hero.hp=0;hero.deathDoor=true;enemy.dmgMin=enemy.dmgMax=0;
 b.queue=['e1'];
 takeTurn(b,'e1','enemy_strike','h1',()=>.1);
 assert.equal(hero.dead,false);
 assert.equal(hero.hp,0);
 assert.equal(hero.deathDoor,true);
});
test('normal zero-damage strike cannot push healthy hero to Death Door',()=>{
 const b=makeBattle(),enemy=b.units.find(x=>x.id==='e1'),hero=b.units.find(x=>x.id==='h1');
 enemy.dmgMin=enemy.dmgMax=0;b.queue=['e1'];
 takeTurn(b,'e1','enemy_strike','h1',()=>.1);
 assert.equal(hero.hp,33);
 assert.equal(hero.deathDoor,false);
});
test('zero-damage crowd-control spell does not force deathblow',()=>{
 const b=makeBattle(),mage=b.units.find(x=>x.id==='h3'),target=b.units.find(x=>x.id==='e3');
 // Enemy is deliberately left alive; this verifies a non-damaging spell has no fabricated hit.
 mage.classId='mage';b.queue=['h3'];
 const hp=target.hp;
 takeTurn(b,'h3','blinding_mist','e3',()=>.2);
 assert.equal(target.hp,hp);
});
test('bleed/blight ticks still use their own Death Door checks',()=>{
 const b=makeBattle(),hero=b.units.find(x=>x.id==='h1');
 hero.hp=0;hero.deathDoor=true;hero.dot=[{type:'bleed',value:1,turns:1}];
 beginTurn(b,'h1',()=>.99);
 assert.equal(hero.dead,true);
});
test('Death Blow resistance remains limited to the DD1 maximum',()=>{
 assert.equal(deathBlowResistance({deathResist:140}),87);
 assert.equal(deathBlowResistance({deathResist:67}),67);
});
