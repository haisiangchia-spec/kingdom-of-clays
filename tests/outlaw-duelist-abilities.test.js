import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUndeadEncounter,ABILITIES,takeTurn,rank,startRound} from '../src/engine.js';
import {effectModifier} from '../src/status.js';
import {moveWithinFormation} from '../src/formation.js';

const battle=()=>makeUndeadEncounter(101,'outlawPatrol');
const find=(b,id)=>b.units.find(u=>u.id===id);
const attacks={
 duelist_sweep:{acc:78.75,crit:16,damageMin:4,damageMax:7},
 duelist_uppercut:{acc:78.75,crit:12,damageMin:3,damageMax:5},
 duelist_shank:{acc:82.5,crit:12,damageMin:5,damageMax:11},
 duelist_poke:{acc:52.5,crit:0,damageMin:3,damageMax:5}
};

test('Veteran Cutthroat reference abilities retain exact skill damage, accuracy and crit values',()=>{
 for(const [key,expected] of Object.entries(attacks)){
  for(const [stat,value] of Object.entries(expected))assert.equal(ABILITIES[key][stat],value,key+' '+stat);
 }
 assert.equal(ABILITIES.duelist_sweep.debuff.chance,120);
 assert.equal(ABILITIES.duelist_sweep.debuff.modifiers.bleedResist,-25);
 assert.equal(ABILITIES.duelist_uppercut.moveTarget.chance,120);
 assert.equal(ABILITIES.duelist_uppercut.moveTarget.distance,1);
 assert.equal(ABILITIES.duelist_shank.status.chance,120);
 assert.equal(ABILITIES.duelist_shank.status.value,2);
 assert.equal(ABILITIES.duelist_poke.onUseBuff.modifiers.speed,2);
 assert.equal(ABILITIES.duelist_poke.advance,1);
});

test('Crossblade Sweep hits both front heroes using its own 4–7 damage and debuffs Bleed resistance',()=>{
 const b=battle(),duel=find(b,'e1'),front=find(b,'h1'),second=find(b,'h2');
 const hp1=front.hp,hp2=second.hp;
 b.queue=[duel.id];
 takeTurn(b,duel.id,'duelist_sweep',front.id,()=>.5);
 assert.equal(hp1-front.hp,5,'6 base damage through 10 PROT');
 assert.equal(hp2-second.hp,6,'6 base damage with 0 PROT');
 assert.equal(effectModifier(front,'bleedResist'),-25);
 assert.equal(effectModifier(second,'bleedResist'),-25);
});

test('lowered Bleed resistance increases subsequent Shank application chance',()=>{
 const b=battle(),duel=find(b,'e1'),front=find(b,'h1');
 front.resist.bleed=110;front.resist.debuff=0;
 b.queue=[duel.id];
 takeTurn(b,duel.id,'duelist_sweep','h1',()=>.5);
 assert.equal(effectModifier(front,'bleedResist'),-25);
 startRound(b,()=>.5);
 b.queue=[duel.id];
 takeTurn(b,duel.id,'duelist_shank','h1',()=>.15);
 assert.deepEqual(front.dot,[{type:'bleed',value:2,turns:3}]);
});

test('Uppercut inflicts own 3–5 damage and knocks a hero back a rank',()=>{
 const b=battle(),duel=find(b,'e1'),h1=find(b,'h1');
 const hp=h1.hp;b.queue=['e1'];
 takeTurn(b,'e1','duelist_uppercut','h1',()=>.5);
 assert.equal(hp-h1.hp,4,'base 4 damage, 10 PROT => rounded 4');
 assert.equal(rank(b,'h1'),1);
});

test('rear-rank Harmless Poke advances one rank and applies +2 Speed even when missed',()=>{
 const b=battle(),d=find(b,'e1');
 moveWithinFormation(b,'e1',3);
 assert.equal(rank(b,'e1'),3);
 b.queue=['e1'];
 takeTurn(b,'e1','duelist_poke','h1',()=>.99);
 assert.equal(rank(b,'e1'),2);
 assert.equal(effectModifier(d,'speed'),2);
 assert.equal(d.effects.find(e=>e.modifiers?.speed===2)?.turns,1);
});
