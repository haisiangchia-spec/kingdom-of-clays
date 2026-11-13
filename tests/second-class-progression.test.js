import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,makeSecondClassBattle,makeSecondProgressionBattle,setActorSkillLevel,getActorSkill,takeTurn} from '../src/engine.js';
import {SKILL_UPGRADES,availableVerifiedLevels,resolveSkillDefinition} from '../src/skill-progression.js';
import {SKILL_CATALOG} from '../src/skill-catalog.js';
import {effectModifier} from '../src/status.js';
import {SECOND_CLASS_KEYS} from '../src/class-skills-batch2.js';

const groups=['hunter','thief','mage'];
const ids=groups.flatMap(group=>SECOND_CLASS_KEYS[group]);
const level=(id,n)=>resolveSkillDefinition(ABILITIES,id,n);
test('all 21 second-batch skills have exact 1–5 paths, 84 higher patches and 42 total verified paths',()=>{
 assert.equal(ids.length,21);assert.equal(new Set(ids).size,21);
 assert.equal(Object.keys(SKILL_UPGRADES).length,42);
 assert.equal(SKILL_CATALOG.filter(x=>x.verifiedLevels.length===5).length,42);
 for(const id of ids){
  assert.deepEqual(availableVerifiedLevels(id),[1,2,3,4,5]);
  assert.equal(Object.keys(SKILL_UPGRADES[id]).length,4);
  assert.equal(level(id,5).classId,ABILITIES[id].classId);
  assert.equal(level(id,5).name,ABILITIES[id].name);
  assert.deepEqual(level(id,5).from,ABILITIES[id].from);
  assert.deepEqual(level(id,5).to,ABILITIES[id].to);
 }
});
test('Hunter Sniper Shot level five improves ACC, CRIT, mark damage and mark critical bonus',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>[level('eagle_eye_shot',n).acc,level('eagle_eye_shot',n).vsMarked]),
 [[95,.5],[100,.6],[105,.7],[110,.8],[115,1]]);
 assert.equal(level('eagle_eye_shot',5).critVsMarked,13);
 assert.equal(level('eagle_eye_shot',5).crit,9);
});
test('Hunter suppression and marks scale debuffs; mark duration remains three turns',()=>{
 const sup=level('arrow_barrage',5),mark=level('hunters_mark',5);
 assert.equal(sup.acc,115);assert.equal(sup.crit,-6);
 assert.deepEqual(sup.debuff.modifiers,{accuracy:-20,crit:-19});
 assert.equal(sup.debuff.chance,140);assert.equal(sup.debuff.turns,2);
 assert.equal(mark.acc,120);assert.equal(mark.markTurns,3);
 assert.equal(mark.debuff.modifiers.dodge,-30);
 assert.equal(mark.debuff.turns,2);
});
test('Hunter Bola and Blindfire upgrades retain push and random targeting',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>level('entangling_shot',n).moveTarget.chance),[75,85,95,105,105]);
 assert.equal(level('entangling_shot',5).moveTarget.distance,1);
 assert.equal(level('instinctive_shot',5).kind,'randomAttack');
 assert.equal(level('instinctive_shot',5).selfBuff.modifiers.speed,5);
 assert.equal(level('instinctive_shot',5).acc,95);
});
test('Hunter Battlefield Bandage upgrades healing and received-heal boost',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>[level('field_dressing',n).min,level('field_dressing',n).max]),
 [[2,3],[3,3],[3,4],[4,4],[4,5]]);
 assert.deepEqual([1,2,3,4,5].map(n=>level('field_dressing',n).afterHealBuff.modifiers.healingReceived),
 [20,24,28,33,38]);
});
test('Hunter Rallying Flare scaling preserves clear-stun, mark and stealth semantics',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>[level('signal_arrow',n).torch,level('signal_arrow',n).stressHealChance]),
 [[3,60],[4,60],[5,67],[6,60],[7,67]]);
 assert.equal(level('signal_arrow',5).kind,'rallyFlare');
 assert.equal(level('signal_arrow',5).stressHeal,3);
});
test('Thief Pick to Face scaling retains full PROT bypass and 90–110 accuracy',()=>{
 for(let n=1;n<=5;n++){
  const sk=level('armour_piercing_stab',n);
  assert.equal(sk.ignoreProt,true);assert.equal(sk.acc,85+n*5);
  assert.equal(sk.crit,n);
 }
});
test('Thief Lunge scales critical and blighted bonus, retains advance two',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>level('shadow_lunge',n).vsBlighted),
 [.2,.23,.26,.29,.33]);
 assert.equal(level('shadow_lunge',5).crit,12);
 assert.equal(level('shadow_lunge',5).advance,2);
 assert.equal(level('shadow_lunge',5).mod,.4);
});
test('Thief Flashing Daggers scales bleed-resist debuff, two-rank AoE',()=>{
 const sk=level('twin_dagger_flurry',5);
 assert.equal(sk.acc,110);
 assert.equal(sk.crit,-1);
 assert.equal(sk.debuff.modifiers.bleedResist,-33);
 assert.equal(sk.debuff.chance,140);
 assert.equal(sk.targetMode,'all');
});
test('Thief Shadow Fade replacement array preserves separate 2 and 4 turn buffs',()=>{
 const expected=[[80,4,10],[85,5,11],[90,6,12],[95,7,13],[100,8,15]];
 expected.forEach(([damage,crit,dodge],index)=>{
  const sk=level('vanishing_step',index+1);
  assert.deepEqual(sk.buffs,[{turns:2,modifiers:{damage,crit}},{turns:4,modifiers:{dodge}}]);
  assert.equal(sk.stealthTurns,2);assert.equal(sk.selfBack,2);
 });
});
test('Thief thrown dagger and blight dart gain corresponding conditional damage and DOT',()=>{
 const thrown=level('precision_throw',5);
 assert.equal(thrown.vsMarked,.4);assert.equal(thrown.vsBlighted,.33);
 assert.equal(thrown.crit,12);assert.equal(thrown.selfBuff.modifiers.accuracy,10);
 const dart=level('venom_needle',5);
 assert.deepEqual(dart.status,{type:'blight',chance:140,value:4,turns:4});
 assert.equal(dart.debuff.modifiers.blightResist,-33);
});
test('Thief Toxin Trickery keeps one use and progressive battle-length dodge speed buffs',()=>{
 const sk=level('antidote_preparation',5);
 assert.equal(sk.maxUses,1);assert.equal(sk.buff.turns,999);
 assert.deepEqual(sk.buff.modifiers,{dodge:13,speed:4});
 assert.deepEqual(sk.cleanse,['bleed','blight']);
});
test('Mage Noxious Blast scaling increases DOT and accuracy debuff together',()=>{
 const expected=[[95,5,-5],[100,5,-5],[105,6,-6],[110,6,-6],[115,7,-7]];
 expected.forEach(([acc,dot,accuracyPenalty],i)=>{
  const sk=level('corrosive_bolt',i+1);
  assert.equal(sk.acc,acc);
  assert.equal(sk.status.value,dot);
  assert.equal(sk.debuff.modifiers.accuracy,accuracyPenalty);
  assert.equal(sk.status.turns,3);
 });
});
test('Mage Grenade and Incision level-five blight and bleed apply stronger DOT',()=>{
 const grenade=level('toxic_explosion',5),incision=level('arcane_blade',5);
 assert.equal(grenade.status.value,6);
 assert.equal(grenade.status.chance,140);
 assert.equal(grenade.crit,4);
 assert.equal(incision.status.value,4);
 assert.equal(incision.status.chance,140);
 assert.equal(incision.crit,9);
});
test('Mage Blinding Gas and Disorienting Blast scale stun chances while retaining use limit',()=>{
 const gas=level('blinding_mist',5),disorient=level('displacement_spell',5);
 assert.equal(gas.status.chance,140);assert.equal(gas.maxUses,3);
 assert.equal(disorient.status.chance,140);
 assert.equal(disorient.moveTarget.chance,140);
 assert.equal(disorient.clearCorpses,true);
});
test('Mage Battlefield Medicine and Emboldening Vapours scale healing and damage speed buff',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>[level('purification_spell',n).min,level('purification_spell',n).max]),
 [[1,1],[1,2],[2,2],[2,3],[3,3]]);
 const buff=level('empowerment_spell',5);
 assert.equal(buff.maxUses,2);
 assert.equal(buff.buff.turns,999);
 assert.deepEqual(buff.buff.modifiers,{damage:25,speed:5});
});
test('actual Hunter level-five field dressing heals and increases received healing',()=>{
 const b=makeSecondClassBattle(),hunter=b.units.find(u=>u.id==='h4'),target=b.units.find(u=>u.id==='h1');
 target.hp=12;
 setActorSkillLevel(b,hunter.id,'field_dressing',5);
 b.queue=['h4'];takeTurn(b,'h4','field_dressing','h1',()=>.3);
 assert.equal(target.hp,16);
 assert.equal(effectModifier(target,'healingReceived'),38);
});
test('actual Mage level-five blight produces a six-damage DOT',()=>{
 const b=makeSecondClassBattle(),foe=b.units.find(u=>u.id==='e3');
 setActorSkillLevel(b,'h3','toxic_explosion',5);
 b.queue=['h3'];takeTurn(b,'h3','toxic_explosion','e3',()=>.2);
 assert.ok(foe.dot.some(dot=>dot.type==='blight'&&dot.value===6));
});
test('actual Thief level-five stealth equips damage crit and dodge buffs',()=>{
 const b=makeSecondClassBattle(),thief=b.units.find(u=>u.id==='h2');
 setActorSkillLevel(b,thief.id,'vanishing_step',5);
 b.queue=['h2'];takeTurn(b,'h2','vanishing_step','h2',()=>.3);
 assert.equal(effectModifier(thief,'damage'),100);
 assert.equal(effectModifier(thief,'crit'),8);
 assert.equal(effectModifier(thief,'dodge'),15);
 assert.equal(thief.stealthed,1);
});
test('second-level-five laboratory upgrades exactly 21 skills and preserves Warrior level one',()=>{
 const b=makeSecondProgressionBattle();
 const tracks=b.units.filter(u=>u.side==='hero').map(u=>({name:u.name,levels:Object.keys(u.skillLevels)}));
 assert.equal(tracks.reduce((sum,h)=>sum+h.levels.length,0),21);
 assert.equal(tracks.find(h=>h.name==='Warrior').levels.length,0);
 for(const id of ['h2','h3','h4'])
  assert.ok(Object.values(b.units.find(u=>u.id===id).skillLevels).every(n=>n===5));
 assert.equal(getActorSkill(b.units.find(u=>u.id==='h4'),'eagle_eye_shot').vsMarked,1);
});
