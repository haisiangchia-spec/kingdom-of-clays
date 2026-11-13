import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,makeFifthClassBattle,setActorSkillLevel,getActorSkill,availableTargets,takeTurn} from '../src/engine.js';
import {effectModifier,guardTarget} from '../src/status.js';
const battle=(actor='h3')=>{const b=makeFifthClassBattle(17);b.queue=[actor];return b;};
const unit=(b,id)=>b.units.find(x=>x.id===id);

test('original DD1 Weakening Curse level one inflicts -10 DMG, -10 PROT, -75% base hit',()=>{
 const s=ABILITIES.enfeebling_hex;
 assert.equal(s.mod,-.75);assert.equal(s.crit,5);
 assert.deepEqual(s.debuff,{chance:100,turns:3,modifiers:{damage:-10,prot:-10}});
 const b=battle();
 takeTurn(b,'h3','enfeebling_hex','e2',()=>.3);
 assert.equal(effectModifier(unit(b,'e2'),'damage'),-10);
 assert.equal(effectModifier(unit(b,'e2'),'prot'),-10);
});
test('Weakening Curse level five retains published increased debuff without overwriting its base object',()=>{
 const b=battle();setActorSkillLevel(b,'h3','enfeebling_hex',5);
 const s=getActorSkill(unit(b,'h3'),'enfeebling_hex');
 assert.deepEqual([s.acc,s.crit,s.mod,s.debuff.chance,s.debuff.modifiers.damage,s.debuff.modifiers.prot],[115,9,-.75,140,-20,-20]);
 assert.equal(ABILITIES.enfeebling_hex.debuff.modifiers.damage,-10);
});
test('Wyrd Reconstruction level one has 0–13 healing and one-point bleed over three turns',()=>{
 const sk=ABILITIES.forbidden_restoration;
 assert.deepEqual([sk.min,sk.max,sk.bleedChance,sk.bleedValue,sk.bleedTurns],[0,13,60,1,3]);
 const b=battle(),target=unit(b,'h1');target.hp=10;target.resist.bleed=0;
 takeTurn(b,'h3','forbidden_restoration','h1',()=>0);
 assert.equal(target.hp,10);
 assert.deepEqual(target.dot,[{type:'bleed',value:1,turns:3}]);
});
test('Wyrd Reconstruction uses one application-minus-resistance roll, not two independent chances',()=>{
 const b=battle(),target=unit(b,'h1');
 target.resist.bleed=50;
 takeTurn(b,'h3','forbidden_restoration','h1',()=>.2);
 assert.equal(target.dot.length,0,'60 application - 50 resistance = 10%, so 20% roll must resist');
});
test('Wyrd Reconstruction chance is 60 minus 50 bleed resist, so a 5% roll applies bleed',()=>{
 const b=battle(),target=unit(b,'h1');
 target.resist.bleed=50;
 takeTurn(b,'h3','forbidden_restoration','h1',()=>.05);
 assert.equal(target.dot.length,1);
 assert.equal(target.dot[0].value,1);
});
test('level-five Wyrd Reconstruction retains 85% and three-point bleed',()=>{
 const b=battle();setActorSkillLevel(b,'h3','forbidden_restoration',5);
 const sk=getActorSkill(unit(b,'h3'),'forbidden_restoration');
 assert.deepEqual([sk.max,sk.bleedChance,sk.bleedValue],[22,85,3]);
});
test('Vulnerability Hex level one mark and dodge values are correct',()=>{
 const sk=ABILITIES.curse_of_exposure;
 assert.equal(sk.crit,5);assert.equal(sk.mod,-.9);
 assert.equal(sk.debuff.modifiers.dodge,-15);
 const b=battle();takeTurn(b,'h3','curse_of_exposure','e1',()=>.2);
 assert.equal(unit(b,'e1').marked,3);
 assert.equal(effectModifier(unit(b,'e1'),'dodge'),-15);
});
test('Occultist stun and pull now have the documented critical chances',()=>{
 assert.equal(ABILITIES.abyssal_grasp.crit,9);
 assert.equal(ABILITIES.shadow_grasp.crit,5);
});
test('Antiquarian Get Down level one includes +1 speed',()=>{
 const b=battle('h2');
 takeTurn(b,'h2','quick_retreat','h2',()=>.2);
 assert.equal(effectModifier(unit(b,'h2'),'speed'),1);
 assert.equal(effectModifier(unit(b,'h2'),'dodge'),15);
});
test('Protect Me level one gives guardian 10 PROT, 4 dodge, and three-turn mark',()=>{
 const b=battle('h2');
 takeTurn(b,'h2','take_cover','h1',()=>.2);
 const guardian=unit(b,'h1'),treasure=unit(b,'h2');
 assert.equal(effectModifier(guardian,'prot'),10);
 assert.equal(effectModifier(guardian,'dodge'),4);
 assert.equal(guardian.marked,3);
 assert.equal(guardian.guard.targetId,'h2');
 assert.equal(guardTarget(b,treasure).id,guardian.id);
});
test('Protect Me has three-use cap at level one and retains cap at level five',()=>{
 const b=battle('h2'),a=unit(b,'h2');
 assert.equal(ABILITIES.take_cover.maxUses,3);
 for(let i=0;i<3;i++){
  a.acted=false;b.queue=['h2'];
  takeTurn(b,'h2','take_cover','h1',()=>.2);
 }
 assert.equal(a.usedSkills.take_cover,3);
 assert.deepEqual(availableTargets(b,'h2','take_cover'),[]);
 assert.throws(()=>takeTurn(b,'h2','take_cover','h1',()=>.2),/Illegal target or rank/);
 setActorSkillLevel(b,'h2','take_cover',5);
 assert.equal(getActorSkill(a,'take_cover').maxUses,3);
});
test('Protect Me four-turn guardian buff survives and still expires via shared turn lifecycle',()=>{
 const b=battle('h2');
 takeTurn(b,'h2','take_cover','h1',()=>.2);
 const guardian=unit(b,'h1');
 assert.equal(guardian.effects.find(x=>x.modifiers?.prot===10)?.turns,4);
});
