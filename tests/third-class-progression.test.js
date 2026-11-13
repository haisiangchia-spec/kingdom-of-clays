import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,makeThirdProgressionBattle,makeThirdClassBattle,setActorSkillLevel,getActorSkill,takeTurn,rank} from '../src/engine.js';
import {THIRD_CLASS_KEYS} from '../src/class-skills-batch3.js';
import {FOURTH_CLASS_KEYS} from '../src/class-skills-batch4.js';
import {THIRD_PROGRESSION_UPGRADES} from '../src/skill-upgrades-batch3.js';
import {SKILL_UPGRADES,availableVerifiedLevels} from '../src/skill-progression.js';
import {SKILL_CATALOG} from '../src/skill-catalog.js';
import {effectModifier} from '../src/status.js';
const keys=[...THIRD_CLASS_KEYS.monster_slayer,...THIRD_CLASS_KEYS.berserker,...FOURTH_CLASS_KEYS.dark_knight];
const level=(key,level=5)=>({...ABILITIES[key],...THIRD_PROGRESSION_UPGRADES[key]?.[level]});
const demo=()=>makeThirdProgressionBattle(17);
test('all 21 additional skill tracks have exactly 84 patches; 84 total tracks complete',()=>{
 assert.equal(keys.length,21);
 assert.equal(Object.keys(THIRD_PROGRESSION_UPGRADES).length,21);
 assert.equal(Object.keys(SKILL_UPGRADES).length,84);
 assert.equal(SKILL_CATALOG.filter(x=>x.verifiedLevels.length===5).length,84);
 for(const key of keys){
  assert.deepEqual(availableVerifiedLevels(key),[1,2,3,4,5]);
  assert.deepEqual(Object.keys(THIRD_PROGRESSION_UPGRADES[key]).sort(),['2','3','4','5']);
  assert.equal(ABILITIES[key].classId,level(key).classId);
 }
 assert.deepEqual(availableVerifiedLevels('ritual_dagger'),[1]);
});
test('Monster Slayer Collect Bounty preserves +90 marked and grows human damage to +35%',()=>{
 for(let i=1;i<=5;i++){
  const sk=i===1?ABILITIES.hunters_execution:{...ABILITIES.hunters_execution,...THIRD_PROGRESSION_UPGRADES.hunters_execution[i]};
  assert.equal(sk.acc,80+i*5);
  assert.equal(sk.crit,6+i);
  assert.equal(sk.vsMarked,.9);
  assert.ok(Math.abs(sk.vsTypes.human-(.1+i*.05))<1e-9);
 }
});
test('Monster Slayer mark levels increase protection debuff and speed bonus',()=>{
 const b=demo(),hero=b.units.find(x=>x.id==='h3');
 b.queue=['h3'];
 takeTurn(b,'h3','identify_weakness','e1',()=>.2);
 const e=b.units.find(x=>x.id==='e1');
 assert.equal(e.marked,3);
 assert.equal(effectModifier(e,'prot'),-20);
 assert.equal(effectModifier(hero,'speed'),5);
});
test('Monster Slayer hook and uppercut level-five chances increase to 140%',()=>{
 const hook=getActorSkill(demo().units.find(x=>x.id==='h3'),'grappling_hook');
 const upper=getActorSkill(demo().units.find(x=>x.id==='h3'),'brutal_uppercut');
 assert.equal(hook.moveTarget.chance,140);assert.equal(hook.acc,110);assert.equal(hook.crit,4);
 assert.equal(upper.status.chance,140);assert.equal(upper.moveTarget.chance,140);
 assert.equal(upper.moveTarget.distance,2);
});
test('Monster Slayer flash bomb stun and shuffle probabilities grow separately',()=>{
 const skill=getActorSkill(demo().units.find(x=>x.id==='h3'),'flash_bomb');
 assert.equal(skill.status.chance,150);
 assert.equal(skill.moveTarget.chance,140);
 assert.equal(skill.acc,115);
 assert.equal(skill.mod,-1);
});
test('Monster Slayer finishing and Caltrops follow published stun and bleed progression',()=>{
 const h=demo().units.find(x=>x.id==='h3');
 const finish=getActorSkill(h,'finishing_strike'),trap=getActorSkill(h,'spiked_trap');
 assert.equal(finish.vsStunned,.6);assert.equal(finish.acc,105);assert.equal(finish.crit,9);
 assert.equal(trap.status.value,4);assert.equal(trap.status.chance,140);
 assert.equal(trap.debuff.modifiers.damageTaken,20);
 assert.equal(trap.debuff.modifiers.speed,-8);
});
test('Monster Slayer level-five Caltrops actually inflicts four-point bleed',()=>{
 const b=demo();b.queue=['h3'];
 takeTurn(b,'h3','spiked_trap','e3',()=>.2);
 const foe=b.units.find(x=>x.id==='e3');
 assert.ok(foe.dot.some(dot=>dot.type==='bleed'&&dot.value===4));
});
test('Berserker Wicked Hack and Iron Swan accuracy and critical scaling',()=>{
 const b=demo(),a=b.units.find(x=>x.id==='h1');
 assert.deepEqual([getActorSkill(a,'savage_cleave').acc,getActorSkill(a,'savage_cleave').crit],[105,8]);
 assert.deepEqual([getActorSkill(a,'rising_axe').acc,getActorSkill(a,'rising_axe').crit],[105,9]);
 assert.deepEqual(getActorSkill(a,'rising_axe').to,[3]);
});
test('Berserker Barbaric YAWP upgrades stun while retaining three-use exhaustion',()=>{
 const a=demo().units.find(x=>x.id==='h1'),sk=getActorSkill(a,'terrifying_war_cry');
 assert.equal(sk.acc,115);assert.equal(sk.status.chance,150);assert.equal(sk.maxUses,3);
 assert.equal(sk.selfDebuff.modifiers.damage,-20);assert.equal(sk.selfDebuff.modifiers.speed,-3);
});
test('Berserker bleed progression tracks If It Bleeds and Bleed Out independently',()=>{
 const a=demo().units.find(x=>x.id==='h1');
 const slash=getActorSkill(a,'rending_slash'),out=getActorSkill(a,'bloodletting_blow');
 assert.deepEqual([slash.acc,slash.crit,slash.status.value,slash.status.chance],[105,4,4,140]);
 assert.deepEqual([out.acc,out.crit,out.status.value,out.status.chance],[105,10,5,140]);
 assert.equal(out.selfDebuff.modifiers.damage,-20);
});
test('Berserker Adrenaline Rush at level five heals four and increases ACC and DMG',()=>{
 const b=demo(),a=b.units.find(x=>x.id==='h1');
 a.hp=12;a.dot=[{type:'bleed',value:2,turns:2}];
 b.queue=['h1'];
 takeTurn(b,'h1','battle_frenzy','h1',()=>.3);
 assert.equal(a.hp,16);
 assert.equal(a.dot.length,0);
 assert.equal(effectModifier(a,'accuracy'),10);
 assert.equal(effectModifier(a,'damage'),30);
});
test('Berserker Breakthrough retains advance 1 and unchanged exhaustion penalties',()=>{
 const a=demo().units.find(x=>x.id==='h1'),sk=getActorSkill(a,'berserkers_charge');
 assert.deepEqual([sk.acc,sk.crit,sk.advance],[105,3,1]);
 assert.equal(sk.mod,-.5);
 assert.deepEqual(sk.selfDebuff.modifiers,{damage:-10,speed:-1});
});
test('Dark Knight level-five melee and pistol attack progression',()=>{
 const a=demo().units.find(x=>x.id==='h4');
 const slash=getActorSkill(a,'dark_slash'),pistol=getActorSkill(a,'shadow_bolt');
 assert.deepEqual([slash.acc,slash.crit,slash.mod],[105,9,.15]);
 assert.deepEqual([pistol.acc,pistol.crit,pistol.vsMarked],[105,11.5,.5]);
});
test('Dark Knight point-blank attack displacement and damage remain distinct',()=>{
 const a=demo().units.find(x=>x.id==='h4'),sk=getActorSkill(a,'point_blank_burst');
 assert.deepEqual([sk.acc,sk.crit,sk.mod,sk.selfBack],[115,9,.5,1]);
 assert.equal(sk.moveTarget.chance,140);
 assert.equal(sk.moveTarget.distance,1);
});
test('Dark Knight Grapeshot debuff applies 8% received-critical chance at level five',()=>{
 const b=demo(),a=b.units.find(x=>x.id==='h4');
 b.units=[b.units[0],a,b.units[1],b.units[2],...b.units.filter(x=>x.side==='enemy')];
 b.queue=['h4'];takeTurn(b,'h4','shadow_volley','e1',()=>.3);
 for(const id of ['e1','e2','e3'])
  assert.equal(effectModifier(b.units.find(x=>x.id===id),'critReceived'),8);
 assert.equal(getActorSkill(a,'shadow_volley').crit,-5);
});
test('Dark Knight Tracking Shot grants permanent level-five buff once per battle',()=>{
 const b=demo(),a=b.units.find(x=>x.id==='h4');
 b.queue=['h4'];
 takeTurn(b,'h4','focused_assault','e2',()=>.3);
 assert.equal(effectModifier(a,'accuracy'),10);
 assert.equal(effectModifier(a,'crit'),8);
 assert.equal(effectModifier(a,'damage'),20);
 assert.equal(getActorSkill(a,'focused_assault').maxUses,1);
});
test('Dark Knight Duelist Advance scales riposte crit and DMG',()=>{
 const b=demo(),a=b.units.find(x=>x.id==='h4');
 b.queue=['h4'];
 takeTurn(b,'h4','shadowstep_counter','e1',()=>.3);
 assert.equal(a.riposteCrit,5);
 assert.equal(a.riposteMod,-.15);
 assert.equal(a.riposte,3-1);
 assert.equal(rank(b,'h4'),2);
});
test('Dark Knight Open Vein level-five bleed and speed debuff',()=>{
 const b=demo(),a=b.units.find(x=>x.id==='h4');
 b.units=[b.units[0],a,b.units[1],b.units[2],...b.units.filter(x=>x.side==='enemy')];
 b.queue=['h4'];takeTurn(b,'h4','bleeding_edge','e1',()=>.3);
 const foe=b.units.find(x=>x.id==='e1');
 assert.ok(foe.dot.some(dot=>dot.type==='bleed'&&dot.value===4));
 assert.equal(effectModifier(foe,'speed'),-3);
 assert.equal(effectModifier(foe,'bleedResist'),-33);
});
test('level-five laboratory upgrades exactly the 21 new abilities, leaves Warrior at one',()=>{
 const b=demo(),heroes=b.units.filter(x=>x.side==='hero');
 assert.equal(heroes.reduce((n,u)=>n+Object.keys(u.skillLevels).length,0),21);
 assert.equal(Object.keys(heroes.find(x=>x.id==='h2').skillLevels).length,0);
 assert.equal(getActorSkill(heroes.find(x=>x.id==='h3'),'hunters_execution').acc,105);
 assert.equal(getActorSkill(heroes.find(x=>x.id==='h1'),'bloodletting_blow').status.value,5);
 assert.equal(getActorSkill(heroes.find(x=>x.id==='h4'),'shadowstep_counter').riposteCrit,5);
});
