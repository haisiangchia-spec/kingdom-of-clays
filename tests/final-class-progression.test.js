import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,makeFinalProgressionBattle,getActorSkill,takeTurn,availableTargets,beginTurn} from '../src/engine.js';
import {SKILL_UPGRADES,availableVerifiedLevels,resolveSkillDefinition} from '../src/skill-progression.js';
import {FINAL_PROGRESSION_UPGRADES} from '../src/skill-upgrades-batch5.js';
import {FIFTH_CLASS_KEYS} from '../src/class-skills-batch5.js';
import {SPIRITBOUND_KEYS} from '../src/class-skills-spiritbound.js';
import {SKILL_CATALOG} from '../src/skill-catalog.js';
import {effectModifier,guardTarget} from '../src/status.js';
const names=[...FIFTH_CLASS_KEYS.hex_mage,...FIFTH_CLASS_KEYS.treasure_hunter,...SPIRITBOUND_KEYS];
const battle=()=>makeFinalProgressionBattle(7);
const u=(b,id)=>b.units.find(x=>x.id===id);
test('all 105 hero skills have level 1–5 patches and catalog coverage',()=>{
 assert.equal(Object.keys(SKILL_UPGRADES).length,105);
 assert.equal(SKILL_CATALOG.length,105);
 assert.equal(SKILL_CATALOG.filter(s=>s.verifiedLevels.length===5).length,105);
 assert.equal(names.length,21);
 assert.equal(Object.keys(FINAL_PROGRESSION_UPGRADES).length,21);
 assert.equal(names.reduce((n,key)=>n+Object.keys(FINAL_PROGRESSION_UPGRADES[key]).length,0),84);
 for(const name of names)assert.deepEqual(availableVerifiedLevels(name),[1,2,3,4,5]);
});
test('level-five battle equips all 21 upgrades without mutating shared level-one definitions',()=>{
 const b=battle();
 assert.equal(b.units.filter(x=>x.side==='hero').reduce((n,x)=>n+Object.keys(x.skillLevels).length,0),21);
 assert.equal(u(b,'h1').form,'human');
 assert.equal(getActorSkill(u(b,'h3'),'ritual_dagger').acc,100);
 assert.equal(getActorSkill(u(b,'h2'),'alchemical_fumes').status.value,4);
 assert.equal(getActorSkill(u(b,'h1'),'spirit_claw').rakeBonus,25);
 assert.equal(ABILITIES.spirit_claw.rakeBonus,15);
 assert.equal(Object.keys(u(b,'h4').skillLevels).length,0);
});
test('Hex Mage Sacrificial Stab and Abyssal Artillery scale eldritch bonus independently',()=>{
 const b=battle(),occ=u(b,'h3');
 assert.deepEqual([getActorSkill(occ,'ritual_dagger').acc,getActorSkill(occ,'ritual_dagger').crit,getActorSkill(occ,'ritual_dagger').vsTypes.eldritch],[100,13,.35]);
 assert.deepEqual([getActorSkill(occ,'abyssal_barrage').acc,getActorSkill(occ,'abyssal_barrage').crit,getActorSkill(occ,'abyssal_barrage').vsTypes.eldritch],[105,4,.25]);
});
test('Hex Mage debuffs and stun, pull chances reflect level-five data',()=>{
 const occ=u(battle(),'h3');
 const weak=getActorSkill(occ,'enfeebling_hex'),mark=getActorSkill(occ,'curse_of_exposure');
 const stun=getActorSkill(occ,'abyssal_grasp'),pull=getActorSkill(occ,'shadow_grasp');
 assert.deepEqual([weak.acc,weak.mod,weak.debuff.chance,weak.debuff.modifiers.damage,weak.debuff.modifiers.prot],[115,-.75,140,-20,-20]);
 assert.equal(mark.debuff.modifiers.dodge,-20);assert.equal(mark.debuff.chance,140);
 assert.equal(stun.status.chance,150);assert.equal(stun.torch,-5);
 assert.equal(pull.moveTarget.chance,140);assert.equal(pull.moveTarget.distance,2);
});
test('Hex Mage variable healing reaches zero-to-22 with bleeding risk',()=>{
 const b=battle(),target=u(b,'h1'),occ=u(b,'h3');
 target.hp=2;b.queue=['h3'];
 const sk=getActorSkill(occ,'forbidden_restoration');
 assert.deepEqual([sk.min,sk.max,sk.bleedChance,sk.bleedValue],[0,22,85,3]);
 takeTurn(b,'h3','forbidden_restoration','h1',()=>.99);
 assert.equal(target.hp,24);
 assert.equal(target.dot.length,0);
});
test('Treasure Hunter poison and retreat scale per source tables',()=>{
 const h=u(battle(),'h2'),vap=getActorSkill(h,'alchemical_fumes'),retreat=getActorSkill(h,'quick_retreat');
 assert.deepEqual([vap.acc,vap.crit,vap.mod,vap.status.chance,vap.status.value,vap.debuff.modifiers.blightResist],[115,4,-.75,140,4,-36]);
 assert.deepEqual(retreat.buff.modifiers,{dodge:25,blightSkill:15,speed:5});
});
test('Treasure Hunter level-five poison applies four-point blight and debuff',()=>{
 const b=battle(),foe=u(b,'e1');
 b.queue=['h2'];takeTurn(b,'h2','alchemical_fumes','e1',()=>.2);
 assert.ok(foe.dot.some(dot=>dot.type==='blight'&&dot.value===4));
 assert.equal(effectModifier(foe,'blightResist'),-36);
});
test('Treasure Hunter healing and party dodge buffs have level-five values',()=>{
 const b=battle(),h=u(b,'h2'),target=u(b,'h1');
 target.hp=8;b.queue=['h2'];
 takeTurn(b,'h2','protective_tonic','h1',()=>.3);
 assert.equal(target.hp,11);
 assert.equal(effectModifier(target,'bleedResist'),15);
 assert.equal(effectModifier(target,'blightResist'),15);
 assert.equal(getActorSkill(h,'evasion_tonic').buff.modifiers.dodge,10);
});
test('Treasure Hunter reverse guard applies upgraded protection and mark',()=>{
 const b=battle(),h=u(b,'h2'),guardian=u(b,'h1');
 assert.equal(getActorSkill(h,'take_cover').maxUses,3);
 b.queue=['h2'];takeTurn(b,'h2','take_cover','h1',()=>.3);
 assert.equal(effectModifier(guardian,'prot'),20);
 assert.equal(effectModifier(guardian,'dodge'),8);
 assert.equal(guardian.marked,3);
 assert.equal(guardTarget(b,h).id,guardian.id);
});
test('Spiritbound transformation in level five improves speed damage resist and healing',()=>{
 const b=battle(),spirit=u(b,'h1');
 spirit.hp=6;b.queue=['h1'];
 takeTurn(b,'h1','spirit_awakening','h1',()=>.3);
 assert.equal(spirit.form,'beast');
 assert.equal(spirit.hp,16);
 assert.equal(effectModifier(spirit,'speed'),5);
 assert.equal(effectModifier(spirit,'damage'),25);
 assert.equal(effectModifier(spirit,'blightResist'),30);
 assert.deepEqual(availableTargets(b,'h1','spirit_chains'),[]);
});
test('Spiritbound level-five return to human has no speed penalty',()=>{
 const b=battle(),spirit=u(b,'h1');b.queue=['h1'];
 takeTurn(b,'h1','spirit_awakening','h1',()=>.3);
 takeTurn(b,'h1','primal_fury','e2',()=>.3);
 spirit.acted=false;b.queue=['h1'];beginTurn(b,'h1',()=>.3);
 takeTurn(b,'h1','spirit_awakening','h1',()=>.3);
 assert.equal(spirit.form,'human');
 assert.equal(effectModifier(spirit,'speed'),0);
 assert.equal(spirit.transformsUsed,2);
 assert.equal(b.queue[0],'h1');
});
test('Spiritbound Manacles and Bile upgrade stun, DOT and debuff chance',()=>{
 const b=battle(),h=u(b,'h1'),chains=getActorSkill(h,'spirit_chains'),bile=getActorSkill(h,'corrupting_essence');
 assert.deepEqual([chains.acc,chains.crit,chains.status.chance],[115,5,130]);
 assert.deepEqual([bile.acc,bile.crit,bile.status.chance,bile.status.value,bile.debuff.modifiers.blightResist],[115,6,140,5,-33]);
 b.queue=['h1'];takeTurn(b,'h1','corrupting_essence','e2',()=>.2);
 assert.ok(u(b,'e2').dot.some(dot=>dot.type==='blight'&&dot.value===5));
});
test('Spiritbound Absolution level-five heals five and reduces ten stress',()=>{
 const b=battle(),h=u(b,'h1');
 h.hp=8;h.stress=25;b.queue=['h1'];
 takeTurn(b,'h1','spiritual_purification','h1',()=>.3);
 assert.deepEqual([h.hp,h.stress],[13,15]);
});
test('Spiritbound Rake, Rage and Slam preserve form gating and scale properly',()=>{
 const b=battle(),h=u(b,'h1'),rake=getActorSkill(h,'spirit_claw'),rage=getActorSkill(h,'primal_fury'),slam=getActorSkill(h,'spirit_crush');
 assert.deepEqual([rake.acc,rake.crit,rake.rakeBonus],[110,1,25]);
 assert.deepEqual([rage.acc,rage.crit],[105,11.5]);
 assert.deepEqual([slam.acc,slam.crit,slam.moveTarget.chance,slam.debuff.modifiers.speed],[100,5,140,-6]);
 b.queue=['h1'];takeTurn(b,'h1','spirit_awakening','h1',()=>.3);
 takeTurn(b,'h1','spirit_claw','e1',()=>.3);
 assert.equal(effectModifier(h,'rakeDamage'),25);
});
