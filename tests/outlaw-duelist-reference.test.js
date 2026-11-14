import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUndeadEncounter,ABILITIES,availableTargets,takeTurn,rank,formationSlots} from '../src/engine.js';
import {chooseEnemyAction,additiveTargetWeight,ENEMY_TACTICS} from '../src/enemy-ai.js';
import {moveWithinFormation} from '../src/formation.js';

const fixture=()=>makeUndeadEncounter(91,'outlawPatrol');
const duel=b=>b.units.find(u=>u.enemyProfile==='duelist');
const pick=(b,roll)=>chooseEnemyAction(b,duel(b).id,duel(b).enemySkills,()=>roll,ABILITIES,availableTargets);

test('Outlaw Duelist is a source-anchored Veteran Brigand Cutthroat stat reference',()=>{
 const b=fixture(),d=duel(b);
 assert.equal(d.name,'Outlaw Duelist');
 assert.equal(d.hp,17);
 assert.equal(d.spd,4);
 assert.equal(d.dodge,11.25);
 assert.equal(d.prot,25);
 assert.deepEqual(d.resist,{stun:45,bleed:40,blight:40,move:45,debuff:35});
 assert.deepEqual(d.enemySkills,['duelist_sweep','duelist_uppercut','duelist_shank','duelist_poke']);
});

test('Veteran Cutthroat first-turn skill weights are 7:1:2',()=>{
 const b=fixture();
 assert.equal(pick(b,.69).key,'duelist_sweep');
 assert.equal(pick(b,.75).key,'duelist_uppercut');
 assert.equal(pick(b,.85).key,'duelist_shank');
});

test('second-turn source weights are 2:1:6, subsequent turns 2:1:2',()=>{
 const b=fixture(),d=duel(b);
 d.actionsTaken=1;
 assert.equal(pick(b,.20).key,'duelist_sweep');
 assert.equal(pick(b,.29).key,'duelist_uppercut');
 assert.equal(pick(b,.35).key,'duelist_shank');
 d.actionsTaken=2;
 assert.equal(pick(b,.39).key,'duelist_sweep');
 assert.equal(pick(b,.50).key,'duelist_uppercut');
 assert.equal(pick(b,.75).key,'duelist_shank');
});

test('rank three removes Uppercut and renormalises first and later weights',()=>{
 const b=fixture(),d=duel(b);
 assert.equal(moveWithinFormation(b,d.id,2),2);
 assert.equal(rank(b,d.id),2);
 assert.deepEqual(availableTargets(b,d.id,'duelist_uppercut'),[]);
 assert.equal(pick(b,.77).key,'duelist_sweep');
 assert.equal(pick(b,.78).key,'duelist_shank');
 d.actionsTaken=1;
 assert.equal(pick(b,.24).key,'duelist_sweep');
 assert.equal(pick(b,.25).key,'duelist_shank');
 d.actionsTaken=2;
 assert.equal(pick(b,.49).key,'duelist_sweep');
 assert.equal(pick(b,.51).key,'duelist_shank');
});

test('rank four forces the harmless fallback and moves the duelist forward',()=>{
 const b=fixture(),d=duel(b);
 assert.equal(moveWithinFormation(b,d.id,3),3);
 assert.equal(rank(b,d.id),3);
 assert.deepEqual(d.enemySkills.filter(key=>availableTargets(b,d.id,key).length>0),['duelist_poke']);
 assert.equal(pick(b,.999).key,'duelist_poke');
 b.queue=[d.id,'h1'];
 takeTurn(b,d.id,'duelist_poke','h1',()=>.5);
 assert.equal(rank(b,d.id),2);
 assert.equal(d.actionsTaken,1);
 assert.equal(formationSlots(b,'enemy').filter(Boolean).length,4);
});

test('Veteran Cutthroat Shank uses source-verified additive targeting bonuses',()=>{
 const b=fixture(),d=duel(b);
 const ids=availableTargets(b,d.id,'duelist_shank');
 const desires=ENEMY_TACTICS[d.name].additiveTargetDesires;
 const heroes=ids.map(id=>b.units.find(u=>u.id===id));
 heroes.forEach(h=>{h.resist.bleed=40;h.marked=0;});
 heroes[0].resist.bleed=10;
 heroes[1].marked=3;
 assert.deepEqual(heroes.map(h=>additiveTargetWeight(b,h,'duelist_shank',ids,desires)),[2,4,1,1]);
 heroes[0].marked=2;
 assert.deepEqual(heroes.map(h=>additiveTargetWeight(b,h,'duelist_shank',ids,desires)),[5,4,1,1]);
 assert.deepEqual(heroes.map(h=>additiveTargetWeight(b,h,'duelist_sweep',ids,desires)),[1,1,1,1]);
});
test('Shank bonus affects probability without guaranteeing the marked hero',()=>{
 const b=fixture(),d=duel(b);
 const heroes=b.units.filter(u=>u.side==='hero');
 heroes.forEach(h=>{h.resist.bleed=40;h.marked=0;});
 heroes[1].marked=3;
 // Force Shank with first roll .95, then choose first or marked hero.
 const choose=(targetRoll)=>{
   const rolls=[.95,targetRoll];let i=0;
   return chooseEnemyAction(b,d.id,d.enemySkills,()=>rolls[i++],ABILITIES,availableTargets);
 };
 assert.deepEqual(choose(.02),{key:'duelist_shank',targetId:'h1'});
 assert.deepEqual(choose(.40),{key:'duelist_shank',targetId:'h2'});
});
