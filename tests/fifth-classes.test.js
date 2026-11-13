import test from 'node:test';
import assert from 'node:assert/strict';
import {FIFTH_CLASS_KEYS,FIFTH_CLASS_SKILLS} from '../src/class-skills-batch5.js';
import {makeFifthClassBattle,takeTurn,availableTargets,rank,ABILITIES,beginTurn} from '../src/engine.js';
import {effectModifier,guardTarget} from '../src/status.js';
import {SKILL_CATALOG} from '../src/skill-catalog.js';
const battle=(actor='h1')=>{const b=makeFifthClassBattle(8);b.queue=[actor];return b;};
const use=(actor,skill,target,r=()=>.3)=>{const b=battle(actor);takeTurn(b,actor,skill,target,r);return b;};

test('fifth class skills register exactly 21 names with 105 integrated in 105-name catalog',()=>{
 assert.equal(Object.keys(FIFTH_CLASS_SKILLS).length,21);
 for(const [cls,keys] of Object.entries(FIFTH_CLASS_KEYS)){
  assert.equal(keys.length,7);
  for(const key of keys){assert.equal(ABILITIES[key].classId,cls);assert.ok(ABILITIES[key].source);}
 }
 assert.equal(SKILL_CATALOG.length,105);
 assert.equal(SKILL_CATALOG.filter(x=>x.mechanics==='level1-integrated').length,105);
});
test('Cursed Champion Chop targets first two ranks and Hew hits both',()=>{
 const b=battle();
 assert.deepEqual(availableTargets(b,'h1','executioners_cleave'),['e1','e2']);
 takeTurn(b,'h1','greatsword_sweep','e1',()=>.3);
 assert.ok(b.units.find(x=>x.id==='e1').hp<16);
 assert.ok(b.units.find(x=>x.id==='e2').hp<16);
 assert.equal(b.units.find(x=>x.id==='e3').hp,14);
});
test('Cursed Champion Purge pushes front target to back rank',()=>{
 const b=use('h1','overwhelming_force','e1');
 assert.equal(rank(b,'e1'),3);
});
test('Cursed Champion Revenge provides damage buff, defence penalty and is limited',()=>{
 const b=use('h1','cursed_strength','h1'),hero=b.units.find(x=>x.id==='h1');
 assert.equal(effectModifier(hero,'damage'),25);
 assert.equal(effectModifier(hero,'prot'),-10);
 assert.deepEqual(availableTargets(b,'h1','cursed_strength'),[]);
});
test('Cursed Champion Withstand marks self and boosts protection',()=>{
 const b=use('h1','unyielding_body','h1'),hero=b.units.find(x=>x.id==='h1');
 assert.equal(hero.marked,998);assert.equal(effectModifier(hero,'prot'),20);
});
test('Cursed Champion Solemnity restores health and stress to self',()=>{
 const b=battle(),hero=b.units.find(x=>x.id==='h1');hero.hp=10;hero.stress=19;
 takeTurn(b,'h1','warriors_meditation','h1',()=>.3);
 assert.equal(hero.hp,16);assert.equal(hero.stress,14);
});
test('Cursed Champion Intimidate dispels stealth and debuffs target',()=>{
 const b=battle(),target=b.units.find(x=>x.id==='e2');target.stealthed=2;
 takeTurn(b,'h1','dreadful_presence','e2',()=>.3);
 assert.equal(target.stealthed,0);
 assert.equal(effectModifier(target,'speed'),-3);
});
test('Hex Mage sacrificial stab is legal from position three and does bonus damage to Eldritch',()=>{
 const b=battle('h3'),hero=b.units.find(x=>x.id==='h3'),target=b.units.find(x=>x.id==='e2');
 hero.dmgMin=hero.dmgMax=8;hero.crit=0;target.types=['eldritch'];
 takeTurn(b,'h3','ritual_dagger','e2',()=>.3);
 assert.equal(16-target.hp,9);
});
test('Hex Mage Abyssal Barrage strikes both back enemies',()=>{
 const b=use('h3','abyssal_barrage','e3');
 assert.ok(b.units.find(x=>x.id==='e3').hp<14);
 assert.ok(b.units.find(x=>x.id==='e4').hp<13);
 assert.equal(b.units.find(x=>x.id==='e1').hp,16);
});
test('Hex Mage Weakening Curse applies both damage and protection debuffs',()=>{
 const b=use('h3','enfeebling_hex','e2'),target=b.units.find(x=>x.id==='e2');
 assert.equal(effectModifier(target,'damage'),-10);
 assert.equal(effectModifier(target,'prot'),-10);
});
test('Hex Mage reconstruction may roll zero healing and add bleed',()=>{
 const b=battle('h3'),target=b.units.find(x=>x.id==='h1');target.hp=9;
 takeTurn(b,'h3','forbidden_restoration','h1',()=>0);
 assert.equal(target.hp,9);
 assert.ok(target.dot.some(e=>e.type==='bleed'&&e.value===1));
});
test('Hex Mage reconstruction can heal 13 HP without bleed',()=>{
 const b=battle('h3'),target=b.units.find(x=>x.id==='h1');target.hp=9;
 takeTurn(b,'h3','forbidden_restoration','h1',()=>.99);
 assert.equal(target.hp,22);assert.equal(target.dot.length,0);
});
test('Hex Mage Vulnerability Hex marks and reduces dodge',()=>{
 const b=use('h3','curse_of_exposure','e1'),target=b.units.find(x=>x.id==='e1');
 assert.equal(target.marked,3);assert.equal(effectModifier(target,'dodge'),-15);
});
test('Hex Mage Abyssal Grasp requires frontline and stuns',()=>{
 const b=battle('h3');
 assert.deepEqual(availableTargets(b,'h3','abyssal_grasp'),[]);
 b.units=[b.units[0],b.units[2],b.units[1],b.units[3],...b.units.filter(x=>x.side==='enemy')];
 takeTurn(b,'h3','abyssal_grasp','e1',()=>.3);
 assert.equal(b.units.find(x=>x.id==='e1').stun,1);
 assert.equal(b.torch,70);
});
test('Hex Mage Shadow Grasp draws back enemy forward',()=>{
 const b=use('h3','shadow_grasp','e4');
 assert.equal(rank(b,'e4'),1);
});
test('Treasure Hunter Hidden Dagger targets first three enemies',()=>{
 const b=battle('h2');
 assert.deepEqual(availableTargets(b,'h2','hidden_dagger'),['e1','e2','e3']);
});
test('Treasure Hunter blight damages through protection over time',()=>{
 const b=use('h2','alchemical_fumes','e1');
 assert.ok(b.units.find(x=>x.id==='e1').dot.some(e=>e.type==='blight'));
});
test('Treasure Hunter Get Down retreats and buffs dodge',()=>{
 const b=use('h2','quick_retreat','h2'),hero=b.units.find(x=>x.id==='h2');
 assert.equal(rank(b,'h2'),3);
 assert.equal(effectModifier(hero,'dodge'),15);
});
test('Treasure Hunter Flashpowder removes enemy stealth and weakens accuracy',()=>{
 const b=battle('h2'),foe=b.units.find(x=>x.id==='e1');foe.stealthed=2;
 takeTurn(b,'h2','blinding_powder','e1',()=>.3);
 assert.equal(foe.stealthed,0);assert.equal(effectModifier(foe,'accuracy'),-10);
});
test('Treasure Hunter Fortifying Vapours heals and increases DOT resistance',()=>{
 const b=use('h2','protective_tonic','h1'),hero=b.units.find(x=>x.id==='h1');
 assert.equal(effectModifier(hero,'bleedResist'),10);
 assert.equal(effectModifier(hero,'blightResist'),10);
});
test('Treasure Hunter Invigorating Vapours gives entire party dodge',()=>{
 const b=use('h2','evasion_tonic','h1');
 for(const hero of b.units.filter(x=>x.side==='hero'))assert.equal(effectModifier(hero,'dodge'),3);
});
test('Treasure Hunter Protect Me makes ally guard Treasure Hunter, not vice versa',()=>{
 const b=use('h2','take_cover','h1');
 const hunter=b.units.find(x=>x.id==='h2'),guardian=b.units.find(x=>x.id==='h1');
 assert.equal(guardTarget(b,hunter).id,guardian.id);
 assert.equal(guardian.guard.targetId,hunter.id);
 assert.equal(effectModifier(guardian,'prot'),10);
 assert.ok(!availableTargets(b,'h2','take_cover').includes('h2'));
});
