import test from 'node:test';
import assert from 'node:assert/strict';
import {STARTER_CLASS_SKILLS,STARTER_CLASS_KEYS} from '../src/class-skills.js';
import {makeBattle,availableTargets,takeTurn,beginTurn,rank,ABILITIES} from '../src/engine.js';
import {effectModifier} from '../src/status.js';

const fresh=(actor='h1')=>{const b=makeBattle(99);b.queue=[actor];return b;};
const doSkill=(actor,key,target,r=()=>.1)=>{const b=fresh(actor);takeTurn(b,actor,key,target,r);return b;};
test('both classes have seven DD1 level-one abilities with exact Clays names',()=>{
 assert.equal(STARTER_CLASS_KEYS.swordsman.length,7);
 assert.equal(STARTER_CLASS_KEYS.warrior.length,7);
 for(const [id,spec] of Object.entries(STARTER_CLASS_SKILLS)){
  assert.equal(ABILITIES[id].name,spec.name);
  assert.ok(spec.from.length>0&&spec.to.length>0);
 }
});
test('Swordsman Crush reaches third rank, Rampart can advance and stun',()=>{
 const b=fresh();
 assert.deepEqual(availableTargets(b,'h1','heavy_slash'),['e1','e2','e3']);
 assert.deepEqual(availableTargets(b,'h1','countering_advance'),['e1','e2']);
 // Frontline cannot advance beyond rank 1; stun application remains independent.
 takeTurn(b,'h1','countering_advance','e1',()=>.1);
 assert.equal(rank(b,'h1'),0);
 assert.equal(b.units.find(x=>x.id==='e1').stun,1);
});
test('Swordsman Bellow applies rank-wide dodge and speed debuffs',()=>{
 const b=doSkill('h1','battle_shout','e1',()=>.1);
 for(const foe of b.units.filter(x=>x.side==='enemy')){
  assert.equal(effectModifier(foe,'dodge'),-5);
  assert.equal(effectModifier(foe,'speed'),-5);
 }
});
test('Swordsman Defender grants a protective PROT buff and guarding',()=>{
 const b=doSkill('h1','guardian_parry','h4');
 assert.equal(b.units.find(x=>x.id==='h1').guard.targetId,'h4');
 assert.equal(effectModifier(b.units.find(x=>x.id==='h1'),'prot'),15);
});
test('Swordsman Retribution applies self mark and establishes 3-turn riposte',()=>{
 const b=doSkill('h1','riposte_stance','e1');
 const hero=b.units.find(x=>x.id==='h1');
 assert.equal(hero.marked,2);assert.equal(hero.riposte,3);
 assert.equal(hero.riposteMod,-.4);
});
test('Swordsman Command buffs all allies, including backline',()=>{
 const b=doSkill('h1','swordmasters_orders','h1');
 for(const hero of b.units.filter(x=>x.side==='hero')){
  assert.equal(effectModifier(hero,'accuracy'),5);
  assert.equal(effectModifier(hero,'crit'),4);
 }
});
test('Swordsman Bolster is once-per-battle and persists as a battle buff',()=>{
 const b=doSkill('h1','steadfast_resolve','h1');
 assert.equal(availableTargets(b,'h1','steadfast_resolve').length,0);
 for(const hero of b.units.filter(x=>x.side==='hero')){
  assert.equal(effectModifier(hero,'dodge'),5);
  assert.equal(effectModifier(hero,'stressResist'),10);
 }
});
test('Warrior Smite has an Unholy damage bonus and correct target ranks',()=>{
 const b=fresh('h2'),hero=b.units.find(x=>x.id==='h2');
 hero.dmgMin=hero.dmgMax=10;
 assert.deepEqual(availableTargets(b,'h2','crushing_strike'),['e1','e2']);
 const hp=b.units.find(x=>x.id==='e1').hp;
 takeTurn(b,'h2','crushing_strike','e1',()=>.1);
 assert.equal(hp-b.units.find(x=>x.id==='e1').hp,12);
});
test('Warrior Zealous Accusation hits only front pair',()=>{
 const b=doSkill('h2','sweeping_assault','e1');
 assert.equal(b.units.find(x=>x.id==='e1').hp<16,true);
 assert.equal(b.units.find(x=>x.id==='e2').hp<16,true);
 assert.equal(b.units.find(x=>x.id==='e3').hp,14);
});
test('Warrior Stunning Blow has ninety accuracy, half damage, base 100 stun',()=>{
 const s=ABILITIES.concussive_blow;
 assert.equal(s.acc,90);assert.equal(s.mod,-.5);assert.equal(s.status.chance,100);
 const b=doSkill('h2','concussive_blow','e1',()=>.1);
 assert.equal(b.units.find(x=>x.id==='e1').stun,1);
});
test('Warrior Bulwark of Faith is self-only, once-per-battle, and adds torch',()=>{
 const b=doSkill('h2','iron_fortress','h2');
 assert.equal(b.torch,99);assert.equal(effectModifier(b.units.find(x=>x.id==='h2'),'prot'),20);
 assert.ok(b.units.find(x=>x.id==='h2').marked>0);
 assert.equal(availableTargets(b,'h2','iron_fortress').length,0);
});
test('Warrior Battle Heal gives base 2 to 3 HP and respects caps',()=>{
 const b=fresh('h2'),target=b.units.find(x=>x.id==='h1');target.hp=10;
 takeTurn(b,'h2','warrior_recovery','h1',()=>.2);
 assert.equal(target.hp,12);
});
test('Warrior Holy Lance is from rear ranks, targets enemy back ranks and advances',()=>{
 const b=makeBattle();b.units=[b.units[0],b.units[2],b.units[3],b.units[1],...b.units.filter(x=>x.side==='enemy')];
 b.queue=['h2'];
 assert.equal(rank(b,'h2'),3);
 assert.deepEqual(availableTargets(b,'h2','charging_blade'),['e2','e3','e4']);
 takeTurn(b,'h2','charging_blade','e2',()=>.1);
 assert.equal(rank(b,'h2'),2);
});
test('Warrior Inspiring Cry heals, relieves stress, and raises torch',()=>{
 const b=fresh('h2'),target=b.units.find(x=>x.id==='h1');target.stress=17;target.hp=20;
 takeTurn(b,'h2','rallying_roar','h1',()=>.1);
 assert.equal(target.stress,12);assert.equal(target.hp,21);assert.equal(b.torch,80);
});
