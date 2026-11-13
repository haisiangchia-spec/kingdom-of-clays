import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,makeFourthProgressionBattle,getActorSkill,takeTurn,availableTargets,rank} from '../src/engine.js';
import {FOURTH_CLASS_KEYS} from '../src/class-skills-batch4.js';
import {FIFTH_CLASS_KEYS} from '../src/class-skills-batch5.js';
import {SKILL_UPGRADES,availableVerifiedLevels} from '../src/skill-progression.js';
import {FOURTH_PROGRESSION_UPGRADES} from '../src/skill-upgrades-batch4.js';
import {SKILL_CATALOG} from '../src/skill-catalog.js';
import {effectModifier} from '../src/status.js';
const keys=[...FOURTH_CLASS_KEYS.beastmaster,...FOURTH_CLASS_KEYS.bard,...FIFTH_CLASS_KEYS.cursed_champion];
const hero=(state,id)=>state.units.find(u=>u.id===id);
test('84 total hero tracks with 21 new tracks and 84 extra level patches',()=>{
 assert.equal(Object.keys(SKILL_UPGRADES).length,105);
 assert.equal(SKILL_CATALOG.filter(s=>s.verifiedLevels.length===5).length,105);
 assert.equal(keys.length,21);assert.equal(Object.keys(FOURTH_PROGRESSION_UPGRADES).length,21);
 for(const id of keys){
  assert.deepEqual(availableVerifiedLevels(id),[1,2,3,4,5]);
  assert.equal(Object.keys(FOURTH_PROGRESSION_UPGRADES[id]).length,4);
 }
 assert.deepEqual(availableVerifiedLevels('ritual_dagger'),[1,2,3,4,5]);
});
test('level-five lab equips seven skills each for three classes without upgrading Priest',()=>{
 const b=makeFourthProgressionBattle(8);
 assert.equal(b.units.filter(u=>u.side==='hero').reduce((n,u)=>n+Object.keys(u.skillLevels).length,0),21);
 for(const id of ['h1','h2','h3'])assert.equal(Object.keys(hero(b,id).skillLevels).length,7);
 assert.deepEqual(hero(b,'h4').skillLevels,{});
 assert.equal(hero(b,'h1').classId,'cursed_champion');
});
test('Hound Rush scales bleed, beast bonus and marked bonus',()=>{
 const b=makeFourthProgressionBattle(),sk=getActorSkill(hero(b,'h2'),'wolfs_assault');
 assert.deepEqual([sk.acc,sk.crit,sk.vsMarked,sk.vsTypes.beast,sk.status.chance,sk.status.value],[105,9,1,.35,140,2]);
 assert.equal(sk.status.turns,3);
});
test('Hound Harry scales full-party bleed and debuff targeting',()=>{
 const b=makeFourthProgressionBattle(),sk=getActorSkill(hero(b,'h2'),'pack_harassment');
 assert.deepEqual([sk.acc,sk.crit,sk.status.chance,sk.status.value],[105,-1,150,3]);
 b.queue=['h2'];takeTurn(b,'h2','pack_harassment','e1',()=>.2);
 for(const e of b.units.filter(u=>u.side==='enemy'&&!u.dead))assert.ok(e.dot.some(d=>d.type==='bleed'&&d.value===3));
});
test('Hound Target Whistle and Cry Havoc scale PROT and stress relief',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h2'),mark=getActorSkill(h,'hunt_command');
 assert.equal(mark.acc,120);assert.equal(mark.debuff.chance,170);assert.equal(mark.debuff.modifiers.prot,-30);
 assert.equal(getActorSkill(h,'comforting_howl').stressHeal,6);
 assert.equal(getActorSkill(h,'comforting_howl').stressHealChance,74);
 b.queue=['h2'];takeTurn(b,'h2','hunt_command','e1',()=>.2);
 assert.equal(effectModifier(hero(b,'e1'),'prot'),-30);
});
test('Hound Guard Dog, Lick Wounds and Blackjack values',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h2');
 assert.equal(getActorSkill(h,'guardian_wolf').protectBuff.modifiers.dodge,20);
 assert.equal(getActorSkill(h,'beasts_recovery').min,8);
 assert.equal(getActorSkill(h,'staff_strike').status.chance,150);
 h.hp=5;b.queue=['h2'];takeTurn(b,'h2','beasts_recovery','h2',()=>.3);
 assert.equal(h.hp,13);
});
test('Bard Dirk Stab, Harvest and Slice Off scale critical and bleed',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h3');
 assert.equal(getActorSkill(h,'flourishing_strike').acc,105);
 assert.equal(getActorSkill(h,'whirling_blades').status.value,4);
 assert.equal(getActorSkill(h,'cutting_refrain').status.value,5);
 assert.equal(getActorSkill(h,'cutting_refrain').crit,12);
});
test('Bard Finale and Solo scale accuracy and dodge without changing Finale stacks',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h3'),fin=getActorSkill(h,'grand_finale'),solo=getActorSkill(h,'heroic_solo');
 assert.equal(fin.acc,160);assert.equal(fin.crit,9);assert.equal(fin.maxUses,1);
 assert.equal(solo.acc,145);assert.equal(solo.selfBuff.modifiers.dodge,30);
 assert.equal(solo.finaleBuff.damage,75);
 assert.equal(solo.finaleBuff.crit,8);
 b.queue=['h3'];takeTurn(b,'h3','heroic_solo','e1',()=>.3);
 assert.equal(effectModifier(h,'dodge'),30);
 assert.equal(effectModifier(h,'finaleDamage'),75);
});
test('Bard Battle Ballad applies improved party buffs and Inspire reduces stress',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h3');
 const song=getActorSkill(h,'song_of_courage'),tune=getActorSkill(h,'soothing_melody');
 assert.deepEqual(song.buff.modifiers,{accuracy:10,crit:6,speed:4});
 assert.equal(tune.stressHeal,12);assert.equal(tune.stressResist,20);
 b.queue=['h3'];takeTurn(b,'h3','song_of_courage','h3',()=>.3);
 assert.equal(effectModifier(hero(b,'h1'),'accuracy'),10);
 assert.equal(effectModifier(hero(b,'h1'),'speed'),4);
});
test('Leper Chop and Hew end at 95 ACC with distinct crit',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h1');
 assert.deepEqual([getActorSkill(h,'executioners_cleave').acc,getActorSkill(h,'executioners_cleave').crit],[95,7]);
 assert.deepEqual([getActorSkill(h,'greatsword_sweep').acc,getActorSkill(h,'greatsword_sweep').crit],[95,0]);
});
test('Leper Purge knockback and self accuracy buff scale at level five',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h1'),sk=getActorSkill(h,'overwhelming_force');
 assert.equal(sk.mod,-.4);assert.equal(sk.moveTarget.chance,140);
 assert.equal(sk.selfBuff.modifiers.accuracy,5);
 b.queue=['h1'];takeTurn(b,'h1','overwhelming_force','e1',()=>.3);
 assert.equal(rank(b,'e1'),3);
 assert.equal(effectModifier(h,'accuracy'),5);
});
test('Leper Revenge combines +35 damage +15 ACC with +25 damage-taken penalty',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h1'),sk=getActorSkill(h,'cursed_strength');
 assert.equal(sk.buff.modifiers.damage,35);assert.equal(sk.buff.modifiers.accuracy,15);
 assert.equal(sk.buff.modifiers.damageTaken,25);assert.equal(sk.buff.modifiers.crit,11);
 b.queue=['h1'];takeTurn(b,'h1','cursed_strength','h1',()=>.3);
 assert.equal(effectModifier(h,'damage'),35);assert.equal(effectModifier(h,'damageTaken'),25);
});
test('Leper Withstand gives 30 PROT and preserves all resistances',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h1'),sk=getActorSkill(h,'unyielding_body');
 assert.equal(sk.buff.modifiers.prot,30);
 for(const attr of ['bleedResist','blightResist','moveResist','debuffResist'])assert.equal(sk.buff.modifiers[attr],30);
 b.queue=['h1'];takeTurn(b,'h1','unyielding_body','h1',()=>.3);
 assert.equal(effectModifier(h,'prot'),30);
});
test('Leper Solemnity heals ten and reduces seven stress',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h1');
 h.hp=5;h.stress=20;b.queue=['h1'];takeTurn(b,'h1','warriors_meditation','h1',()=>.3);
 assert.equal(h.hp,15);assert.equal(h.stress,13);
});
test('Leper Intimidate upgrades damage, speed penalty, buff and accuracy',()=>{
 const b=makeFourthProgressionBattle(),h=hero(b,'h1'),sk=getActorSkill(h,'dreadful_presence');
 assert.equal(sk.acc,115);assert.equal(sk.mod,-.8);
 assert.deepEqual(sk.debuff.modifiers,{damage:-33,speed:-5});
 assert.equal(sk.debuff.chance,140);
 assert.equal(sk.selfBuff.modifiers.speed,4);
 b.queue=['h1'];takeTurn(b,'h1','dreadful_presence','e1',()=>.3);
 assert.equal(effectModifier(hero(b,'e1'),'damage'),-33);
 assert.equal(effectModifier(h,'speed'),4);
});
