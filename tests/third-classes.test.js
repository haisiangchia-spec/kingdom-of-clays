import test from 'node:test';
import assert from 'node:assert/strict';
import {THIRD_CLASS_KEYS,THIRD_CLASS_SKILLS} from '../src/class-skills-batch3.js';
import {makeThirdClassBattle,takeTurn,availableTargets,rank,ABILITIES} from '../src/engine.js';
import {effectModifier} from '../src/status.js';
const build=(id='h4')=>{const b=makeThirdClassBattle(24);b.queue=[id];return b;};
const act=(id,key,target,r=()=>.3)=>{const b=build(id);takeTurn(b,id,key,target,r);return b;};
test('21 skills register with their locked display names and DD1 sources',()=>{
 assert.equal(Object.keys(THIRD_CLASS_SKILLS).length,21);
 for(const [cls,keys] of Object.entries(THIRD_CLASS_KEYS)){
  assert.equal(keys.length,7);
  for(const key of keys){assert.equal(ABILITIES[key].name,THIRD_CLASS_SKILLS[key].name);assert.equal(ABILITIES[key].classId,cls);assert.ok(ABILITIES[key].source);}
 }
});
test('Priest Sacred Strike has anti-Unholy damage bonus',()=>{
 const b=build(),p=b.units.find(u=>u.id==='h4');
 assert.deepEqual(availableTargets(b,'h4','sacred_strike'),[]);
 // Move Priest to front to make the skill usable.
 b.units=[b.units[0],b.units[3],b.units[1],b.units[2],...b.units.filter(u=>u.side==='enemy')];
 p.dmgMin=p.dmgMax=10;p.crit=0;
 takeTurn(b,'h4','sacred_strike','e1',()=>.3);
 assert.equal(16-b.units.find(u=>u.id==='e1').hp,12);
});
test('Priest Divine Judgement restores own HP after a successful strike',()=>{
 const b=build(),p=b.units.find(x=>x.id==='h4');p.hp=10;p.crit=0;
 takeTurn(b,'h4','divine_judgement','e2',()=>.3);
 assert.equal(p.hp,13);
});
test('Priest Radiant Flash adds torch and stuns a front target',()=>{
 const b=act('h4','radiant_flash','e2');
 assert.equal(b.torch,81);assert.equal(b.units.find(x=>x.id==='e2').stun,1);
});
test('Priest Greater Heal and Group Healing have proper starting ranges',()=>{
 assert.equal(ABILITIES.greater_heal.min,4);assert.equal(ABILITIES.greater_heal.max,5);
 assert.equal(ABILITIES.group_healing.min,1);assert.equal(ABILITIES.group_healing.max,3);
 const b=build(),ally=b.units.find(x=>x.id==='h1');ally.hp=10;
 takeTurn(b,'h4','greater_heal','h1',()=>.3);assert.equal(ally.hp,14);
});
test('Priest Revealing Light targets stealthed enemy and cannot crit',()=>{
 const b=build(),foe=b.units.find(x=>x.id==='e2'),p=b.units.find(x=>x.id==='h4');
 foe.stealthed=2;p.crit=100;p.dmgMin=p.dmgMax=10;
 b.units=[b.units[0],b.units[1],p,b.units[2],...b.units.filter(u=>u.side==='enemy')];
 assert.ok(availableTargets(b,'h4','revealing_light').includes('e2'));
 takeTurn(b,'h4','revealing_light','e2',()=>.3);
 assert.equal(foe.stealthed,0);assert.equal(effectModifier(foe,'dodge'),-20);assert.equal(b.torch,80);
 assert.ok(b.log.some(x=>x.includes('Revealing Light')&&!x.includes('CRIT')));
});
test('Priest Blessing Strike is available in front and buffs Priest',()=>{
 const b=build(),p=b.units.find(x=>x.id==='h4');
 b.units=[p,...b.units.filter(u=>u.side==='hero'&&u.id!=='h4'),...b.units.filter(u=>u.side==='enemy')];
 assert.ok(availableTargets(b,'h4','blessing_strike').includes('e2'));
 takeTurn(b,'h4','blessing_strike','e2',()=>.3);
 assert.equal(effectModifier(p,'accuracy'),6);assert.equal(effectModifier(p,'damage'),25);
});
test('Slayer Hunter Execution has marked and human damage bonuses',()=>{
 const dmg=marked=>{
  const b=build('h3'),h=b.units.find(x=>x.id==='h3'),foe=b.units.find(x=>x.id==='e2');
  h.dmgMin=h.dmgMax=5;h.crit=0;foe.types=['human'];foe.marked=marked?3:0;
  takeTurn(b,'h3','hunters_execution','e2',()=>.3);
  return 16-foe.hp;
 };
 assert.equal(dmg(false),6);assert.equal(dmg(true),11);
});
test('Slayer Identify Weakness applies mark, PROT debuff and self speed buff',()=>{
 const b=act('h3','identify_weakness','e1'),h=b.units.find(x=>x.id==='h3'),e=b.units.find(x=>x.id==='e1');
 assert.equal(e.marked,3);assert.equal(effectModifier(e,'prot'),-10);assert.equal(effectModifier(h,'speed'),3);
});
test('Slayer Grappling Hook marks and pulls rear enemy',()=>{
 const b=act('h3','grappling_hook','e4'),e=b.units.find(x=>x.id==='e4');
 assert.equal(e.marked,2);assert.equal(rank(b,e.id),1);
});
test('Slayer Brutal Uppercut pushes and stuns',()=>{
 const b=build('h3'),e=b.units.find(x=>x.id==='e1');
 b.units=[b.units[0],b.units[2],b.units[1],b.units[3],...b.units.filter(x=>x.side==='enemy')];
 takeTurn(b,'h3','brutal_uppercut','e1',()=>.3);
 assert.equal(e.stun,1);assert.equal(rank(b,e.id),2);
});
test('Slayer Flash Bomb shuffles and stuns without direct damage',()=>{
 const b=act('h3','flash_bomb','e4'),e=b.units.find(x=>x.id==='e4');
 assert.equal(e.hp,13);assert.equal(e.stun,1);
 assert.notEqual(rank(b,e.id),3);
});
test('Slayer Finishing Strike deals bonus damage to stunned opponents',()=>{
 const hit=stunned=>{
  const b=build('h3'),h=b.units.find(x=>x.id==='h3'),e=b.units.find(x=>x.id==='e2');
  h.dmgMin=h.dmgMax=8;h.crit=0;e.stun=stunned?1:0;
  takeTurn(b,'h3','finishing_strike','e2',()=>.3);
  return 16-e.hp;
 };
 assert.equal(hit(false),8);assert.equal(hit(true),10);
});
test('Slayer Spiked Trap bleeds and increases damage taken and reduces speed',()=>{
 const b=act('h3','spiked_trap','e3'),e=b.units.find(x=>x.id==='e3');
 assert.ok(e.dot.some(x=>x.type==='bleed'&&x.value===2));
 assert.equal(effectModifier(e,'damageTaken'),10);
 assert.equal(effectModifier(e,'speed'),-4);
});
test('Berserker Savage Cleave and Rising Axe have correct rank restrictions',()=>{
 const b=build('h1');
 assert.deepEqual(availableTargets(b,'h1','rising_axe'),['e4']);
 assert.deepEqual(availableTargets(b,'h1','savage_cleave'),['e1','e2']);
});
test('Berserker War Cry stuns front two without damage and applies unremovable exhaustion',()=>{
 const b=act('h1','terrifying_war_cry','e1');
 for(const id of ['e1','e2']){const e=b.units.find(x=>x.id===id);assert.equal(e.stun,1);assert.equal(e.hp,16);}
 const h=b.units.find(x=>x.id==='h1');
 assert.equal(effectModifier(h,'damage'),-20);assert.equal(effectModifier(h,'speed'),-3);
 assert.ok(h.effects.some(x=>x.selfInflicted));
});
test('Berserker Rending Slash causes two bleed per round to middle target',()=>{
 const b=act('h1','rending_slash','e2');
 assert.ok(b.units.find(x=>x.id==='e2').dot.some(x=>x.type==='bleed'&&x.value===2));
});
test('Berserker Charge attacks front three and advances one',()=>{
 const b=build('h1');
 b.units=[b.units[1],b.units[0],b.units[2],b.units[3],...b.units.filter(x=>x.side==='enemy')];
 assert.equal(rank(b,'h1'),1);
 takeTurn(b,'h1','berserkers_charge','e1',()=>.3);
 assert.equal(rank(b,'h1'),0);
 for(const id of ['e1','e2','e3'])assert.ok(b.units.find(x=>x.id===id).hp<b.units.find(x=>x.id===id).maxHp);
 assert.equal(effectModifier(b.units.find(x=>x.id==='h1'),'speed'),-1);
});
test('Berserker Battle Frenzy heals self, cleanses DOT, buffs damage and accuracy',()=>{
 const b=build('h1'),h=b.units.find(x=>x.id==='h1');h.hp=10;
 h.dot=[{type:'bleed',value:2,turns:3},{type:'blight',value:2,turns:3}];
 takeTurn(b,'h1','battle_frenzy','h1',()=>.3);
 assert.equal(h.hp,11);assert.equal(h.dot.length,0);
 assert.equal(effectModifier(h,'accuracy'),5);assert.equal(effectModifier(h,'damage'),20);
});
test('Berserker Bleed Out bleeds foremost enemy and applies exhaustion',()=>{
 const b=act('h1','bloodletting_blow','e1'),h=b.units.find(x=>x.id==='h1');
 assert.ok(b.units.find(x=>x.id==='e1').dot.some(x=>x.type==='bleed'&&x.value===3));
 assert.equal(effectModifier(h,'damage'),-20);assert.equal(effectModifier(h,'speed'),-3);
});
