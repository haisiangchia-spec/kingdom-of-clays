import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUndeadEncounter,ABILITIES,availableTargets,takeTurn,rank} from '../src/engine.js';
import {moveWithinFormation} from '../src/formation.js';
import {chooseEnemyAction,ENEMY_TACTICS,additiveTargetWeight} from '../src/enemy-ai.js';

const create=()=>makeUndeadEncounter(121,'shieldwallVolley');
const defender=b=>b.units.find(u=>u.id==='e1');
const choose=(b,roll)=>chooseEnemyAction(b,'e1',defender(b).enemySkills,()=>roll,ABILITIES,availableTargets);

test('Apprentice Bone Defender baseline stats match source',()=>{
 const b=create(),d=defender(b);
 assert.equal(d.name,'Crypt Shieldbearer');
 assert.deepEqual([d.hp,d.spd,d.dodge,d.prot],[15,0,0,25]);
 assert.deepEqual(d.resist,{stun:25,bleed:200,blight:10,move:50,debuff:15});
 assert.deepEqual(d.enemySkills,['boneguard_axe','boneguard_weight','boneguard_clumsy']);
 assert.equal(b.units.filter(u=>u.enemyProfile==='cryptDefender').length,2);
 assert.equal(b.units.filter(u=>u.enemyProfile==='cryptArbalist').length,2);
});

test('first and later turn Apprentice Defender Axeblade / Dead Weight weights 4:1 then 1:1',()=>{
 const b=create(),d=defender(b);
 assert.equal(choose(b,.79).key,'boneguard_axe');
 assert.equal(choose(b,.81).key,'boneguard_weight');
 d.actionsTaken=1;
 assert.equal(choose(b,.49).key,'boneguard_axe');
 assert.equal(choose(b,.51).key,'boneguard_weight');
});

test('Dead Weight is disallowed with three stunned heroes and never chooses stunned target',()=>{
 const b=create(),d=defender(b);
 b.units.find(u=>u.id==='h1').stun=1;
 assert.equal(choose(b,.99).key,'boneguard_weight');
 assert.equal(choose(b,.99).targetId,'h2');
 for(const id of ['h2','h3'])b.units.find(u=>u.id===id).stun=1;
 assert.equal(choose(b,.99).key,'boneguard_axe');
 assert.equal(d.actionsTaken,0);
});

test('frontliner moved to rear only uses Clumsy Axeblade and advances on miss',()=>{
 const b=create(),d=defender(b);
 assert.equal(moveWithinFormation(b,d.id,3),3);
 assert.equal(rank(b,d.id),3);
 assert.deepEqual(d.enemySkills.filter(key=>availableTargets(b,d.id,key).length),['boneguard_clumsy']);
 assert.equal(choose(b,.99).key,'boneguard_clumsy');
 b.queue=['e1'];takeTurn(b,'e1','boneguard_clumsy','h1',()=>.99);
 assert.equal(rank(b,'e1'),2);
});

test('Axeblade marked target and Dead Weight low-move-resist target use additive +200% weighting',()=>{
 const b=create(),d=defender(b),h1=b.units.find(u=>u.id==='h1'),h2=b.units.find(u=>u.id==='h2');
 const pref=ENEMY_TACTICS[d.name].additiveTargetDesires;
 h1.marked=2;
 assert.deepEqual([h1,h2].map(u=>additiveTargetWeight(b,u,'boneguard_axe',['h1','h2'],pref)),[3,1]);
 h1.resist.move=90;h2.resist.move=10;
 assert.deepEqual([h1,h2].map(u=>additiveTargetWeight(b,u,'boneguard_weight',['h1','h2'],pref)),[1,3]);
});

test('verified Apprentice Defender skill accuracy, damage and control effects',()=>{
 const expected={
  boneguard_axe:{acc:72.5,crit:6,damageMin:3,damageMax:5},
  boneguard_weight:{acc:82.5,crit:6,damageMin:2,damageMax:4},
  boneguard_clumsy:{acc:42.5,crit:0,damageMin:2,damageMax:4,advance:1}
 };
 for(const [id,properties] of Object.entries(expected)){
  for(const [key,val] of Object.entries(properties))assert.equal(ABILITIES[id][key],val);
 }
 assert.equal(ABILITIES.boneguard_weight.status.chance,100);
 assert.equal(ABILITIES.boneguard_weight.moveTarget.chance,100);
 assert.equal(ABILITIES.boneguard_weight.moveTarget.distance,1);
 const b=create(),h1=b.units.find(u=>u.id==='h1');h1.resist.stun=0;h1.resist.move=0;
 b.queue=['e1'];takeTurn(b,'e1','boneguard_weight','h1',()=>.1);
 assert.equal(h1.stun,1);
 assert.equal(rank(b,'h1'),1);
});
