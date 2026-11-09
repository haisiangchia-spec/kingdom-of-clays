import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSecondClassBattle,availableTargets,takeTurn,rank,ABILITIES} from '../src/engine.js';
import {SECOND_CLASS_KEYS,SECOND_CLASS_SKILLS} from '../src/class-skills-batch2.js';
import {effectModifier} from '../src/status.js';

const fresh=(id='h4')=>{const b=makeSecondClassBattle(11);b.queue=[id];return b;};
const act=(id,skill,target,rand=()=>.2)=>{const b=fresh(id);takeTurn(b,id,skill,target,rand);return b;};
test('21 locked level-one skill definitions split across Hunter, Thief and Mage',()=>{
 assert.equal(Object.keys(SECOND_CLASS_SKILLS).length,21);
 for(const [cls,keys] of Object.entries(SECOND_CLASS_KEYS)){
  assert.equal(keys.length,7);
  for(const key of keys){assert.equal(ABILITIES[key].classId,cls);assert.ok(ABILITIES[key].source);}
 }
});
test('Hunter shot gets +50% damage versus marked, without changing an unmarked hit',()=>{
 const damage=marked=>{
  const b=fresh(),h=b.units.find(u=>u.id==='h4'),e=b.units.find(u=>u.id==='e2');
  h.dmgMin=h.dmgMax=8;h.crit=0;e.marked=marked?3:0;
  takeTurn(b,'h4','eagle_eye_shot','e2',()=>.2);return 16-e.hp;
 };
 assert.equal(damage(false),8);assert.equal(damage(true),12);
});
test('Hunter suppressing fire attacks rear three enemies and debuffs each',()=>{
 const b=act('h4','arrow_barrage','e2',()=>.2);
 for(const id of ['e2','e3','e4'])assert.equal(effectModifier(b.units.find(u=>u.id===id),'accuracy'),-15);
 assert.equal(effectModifier(b.units.find(u=>u.id==='e1'),'accuracy'),0);
});
test('Hunter mark applies a three-round mark and dodge penalty',()=>{
 const b=act('h4','hunters_mark','e1',()=>.2),u=b.units.find(x=>x.id==='e1');
 assert.equal(u.marked,3);assert.equal(effectModifier(u,'dodge'),-20);
});
test('Hunter entangling shot targets the front pair and can push an enemy',()=>{
 const b=act('h4','entangling_shot','e1',()=>.2);
 assert.ok(b.units.find(u=>u.id==='e1').hp<16);
 assert.ok(b.log.some(x=>x.includes('moves')));
});
test('Hunter blindfire random target does not include corpses and buffs speed',()=>{
 const b=fresh();b.units.find(u=>u.id==='e1').corpse=true;
 takeTurn(b,'h4','instinctive_shot','e1',()=>.2);
 assert.equal(effectModifier(b.units.find(u=>u.id==='h4'),'speed'),3);
 assert.ok(b.log.some(x=>x.includes('Instinctive Shot')));
});
test('Hunter battlefield bandage heals and buffs healing received',()=>{
 const b=fresh(),ally=b.units.find(u=>u.id==='h1');ally.hp=10;
 takeTurn(b,'h4','field_dressing','h1',()=>.2);
 assert.equal(ally.hp,12);assert.equal(effectModifier(ally,'healingReceived'),20);
});
test('Hunter signal arrow clears ally marks/stuns and enemy stealth',()=>{
 const b=fresh(),ally=b.units.find(u=>u.id==='h2'),foe=b.units.find(u=>u.id==='e2');
 ally.marked=2;ally.stun=1;foe.stealthed=2;
 takeTurn(b,'h4','signal_arrow','h1',()=>.2);
 assert.equal(ally.marked,0);assert.equal(ally.stun,0);assert.equal(foe.stealthed,0);
 assert.equal(b.torch,78);
});
test('Thief armour-piercing stab ignores protection',()=>{
 const b=fresh('h2'),thief=b.units.find(u=>u.id==='h2'),foe=b.units.find(u=>u.id==='e1');
 thief.dmgMin=thief.dmgMax=8;thief.crit=0;foe.prot=80;
 takeTurn(b,'h2','armour_piercing_stab','e1',()=>.2);
 assert.equal(16-foe.hp,7);
});
test('Thief shadow lunge advances two positions',()=>{
 const b=makeSecondClassBattle();b.units=[b.units[0],b.units[2],b.units[3],b.units[1],...b.units.filter(u=>u.side==='enemy')];
 b.queue=['h2'];assert.equal(rank(b,'h2'),3);
 takeTurn(b,'h2','shadow_lunge','e2',()=>.2);
 assert.equal(rank(b,'h2'),1);
});
test('Thief twin daggers hit middle pair and apply bleed resistance debuff',()=>{
 const b=act('h2','twin_dagger_flurry','e2',()=>.2);
 assert.equal(effectModifier(b.units.find(u=>u.id==='e2'),'bleedResist'),-20);
 assert.equal(effectModifier(b.units.find(u=>u.id==='e3'),'bleedResist'),-20);
});
test('Thief vanishing step self-targets, retreats and grants stealth/buffs',()=>{
 const b=act('h2','vanishing_step','h2');
 const u=b.units.find(x=>x.id==='h2');
 assert.equal(rank(b,'h2'),3);assert.equal(u.stealthed,2);
 assert.equal(effectModifier(u,'damage'),80);assert.equal(effectModifier(u,'dodge'),10);
});
test('Thief precision throw grants temporary accuracy on successful hit',()=>{
 const b=act('h2','precision_throw','e2');
 assert.equal(effectModifier(b.units.find(x=>x.id==='h2'),'accuracy'),5);
});
test('Thief venom needle applies four-round blight',()=>{
 const b=act('h2','venom_needle','e2',()=>.2),e=b.units.find(x=>x.id==='e2');
 assert.ok(e.dot.some(x=>x.type==='blight'&&x.turns===4&&x.value===2));
});
test('Thief antidote preparation cures own DOT, gives battle buff once',()=>{
 const b=fresh('h2'),u=b.units.find(x=>x.id==='h2');
 u.dot=[{type:'bleed',value:2,turns:3},{type:'blight',value:1,turns:3}];
 takeTurn(b,'h2','antidote_preparation','h2',()=>.2);
 assert.equal(u.dot.length,0);assert.equal(effectModifier(u,'speed'),2);
 assert.deepEqual(availableTargets(b,'h2','antidote_preparation'),[]);
});
test('Mage corrosive bolt blights and lowers enemy accuracy',()=>{
 const b=act('h3','corrosive_bolt','e1',()=>.2),e=b.units.find(x=>x.id==='e1');
 assert.ok(e.dot.some(x=>x.type==='blight'&&x.value===5));
 assert.equal(effectModifier(e,'accuracy'),-5);
});
test('Mage toxic explosion strikes and blights both rear enemies',()=>{
 const b=act('h3','toxic_explosion','e3',()=>.2);
 for(const id of ['e3','e4'])assert.ok(b.units.find(u=>u.id===id).dot.some(x=>x.type==='blight'));
});
test('Mage blinding mist stuns rear enemies without direct damage',()=>{
 const b=act('h3','blinding_mist','e3',()=>.2);
 assert.equal(b.units.find(x=>x.id==='e3').hp,14);
 assert.equal(b.units.find(x=>x.id==='e4').hp,13);
 for(const id of ['e3','e4'])assert.equal(b.units.find(u=>u.id===id).stun,1);
});
test('Mage arcane blade applies bleed and does direct damage',()=>{
 const b=act('h3','arcane_blade','e1',()=>.2),e=b.units.find(x=>x.id==='e1');
 assert.ok(e.hp<16);assert.ok(e.dot.some(x=>x.type==='bleed'&&x.value===2));
});
test('Mage purification spell cures the target and caster bleed/blight',()=>{
 const b=fresh('h3'),mage=b.units.find(u=>u.id==='h3'),ally=b.units.find(u=>u.id==='h1');
 mage.dot.push({type:'bleed',value:1,turns:2});ally.dot.push({type:'blight',value:2,turns:3});
 takeTurn(b,'h3','purification_spell','h1',()=>.2);
 assert.equal(mage.dot.length,0);assert.equal(ally.dot.length,0);
});
test('Mage empowerment spell buffs ally and has two uses per battle',()=>{
 const b=act('h3','empowerment_spell','h1'),u=b.units.find(x=>x.id==='h1');
 assert.equal(effectModifier(u,'damage'),20);assert.equal(effectModifier(u,'speed'),3);
});
test('Mage displacement spell clears corpses, shuffles/stuns one target, deals no damage',()=>{
 const b=fresh('h3'),target=b.units.find(u=>u.id==='e3'),corpse=b.units.find(u=>u.id==='e1');
 corpse.corpse=true;corpse.hp=8;target.resist.move=0;
 const initial=target.hp;
 takeTurn(b,'h3','displacement_spell','e3',()=>.2);
 assert.equal(corpse.dead,true);assert.equal(target.hp,initial);assert.equal(target.stun,1);
});
