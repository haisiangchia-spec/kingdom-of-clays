import test from 'node:test';
import assert from 'node:assert/strict';
import {FOURTH_CLASS_KEYS,FOURTH_CLASS_SKILLS} from '../src/class-skills-batch4.js';
import {makeFourthClassBattle,takeTurn,availableTargets,rank,ABILITIES,beginTurn} from '../src/engine.js';
import {effectModifier,applyGuard} from '../src/status.js';
const b=(id='h1')=>{const s=makeFourthClassBattle(9);s.queue=[id];return s;};
const attack=(id,ability,target,r=()=>.3)=>{const s=b(id);takeTurn(s,id,ability,target,r);return s;};

test('all three classes each map seven unique locked names and original DD1 skills',()=>{
 assert.equal(Object.keys(FOURTH_CLASS_SKILLS).length,21);
 for(const [classId,keys] of Object.entries(FOURTH_CLASS_KEYS)){
  assert.equal(keys.length,7);
  assert.equal(new Set(keys).size,7);
  for(const key of keys){assert.equal(ABILITIES[key].classId,classId);assert.ok(ABILITIES[key].source);}
 }
});
test('Dark Knight pistol attacks backline and receives marked-target bonus',()=>{
 const s=b('h1'),a=s.units.find(u=>u.id==='h1'),e=s.units.find(u=>u.id==='e3');
 a.dmgMin=a.dmgMax=8;a.crit=0;e.marked=3;
 s.units=[s.units[1],a,s.units[2],s.units[3],...s.units.filter(x=>x.side==='enemy')];
 assert.deepEqual(availableTargets(s,'h1','shadow_bolt'),['e2','e3','e4']);
 takeTurn(s,'h1','shadow_bolt','e3',()=>.3);
 assert.equal(14-e.hp,9);
});
test('Point Blank Burst pushes enemy rank one and retreats the user one rank',()=>{
 const s=attack('h1','point_blank_burst','e1');
 assert.equal(rank(s,'h1'),1);
 assert.equal(rank(s,'e1'),1);
});
test('Shadow Volley hits front three and applies critical-vulnerability debuff',()=>{
 const s=b('h1');s.units=[s.units[1],s.units[0],s.units[2],s.units[3],...s.units.filter(x=>x.side==='enemy')];s.queue=['h1'];
 takeTurn(s,'h1','shadow_volley','e1',()=>.3);
 for(const id of ['e1','e2','e3'])assert.equal(effectModifier(s.units.find(u=>u.id===id),'critReceived'),4);
 assert.equal(effectModifier(s.units.find(u=>u.id==='e4'),'critReceived'),0);
});
test('Tracking Shot can reveal stealth and buffs actor once per battle',()=>{
 const s=b(),a=s.units.find(u=>u.id==='h1'),target=s.units.find(u=>u.id==='e2');
 target.stealthed=2;
 takeTurn(s,'h1','focused_assault','e2',()=>.3);
 assert.equal(target.stealthed,0);
 assert.equal(effectModifier(a,'accuracy'),6);
 assert.deepEqual(availableTargets(s,'h1','focused_assault'),[]);
});
test('Duelist advance moves forward and arms riposte',()=>{
 const s=b('h1');s.units=[s.units[1],s.units[0],s.units[2],s.units[3],...s.units.filter(x=>x.side==='enemy')];
 takeTurn(s,'h1','shadowstep_counter','e1',()=>.3);
 assert.equal(rank(s,'h1'),0);assert.equal(s.units.find(u=>u.id==='h1').riposte,2);
});
test('Open Vein applies bleed and speed penalty',()=>{
 const s=attack('h1','bleeding_edge','e1'),target=s.units.find(x=>x.id==='e1');
 assert.ok(target.dot.some(x=>x.type==='bleed'&&x.value===2));
 assert.equal(effectModifier(target,'speed'),-1);
});
test('Beastmaster Wolf assault gains mark and beast damage synergy and bleed',()=>{
 const s=b('h2'),a=s.units.find(x=>x.id==='h2'),e=s.units.find(x=>x.id==='e2');
 e.types=['beast'];e.marked=3;a.dmgMin=a.dmgMax=4;a.crit=0;
 takeTurn(s,'h2','wolfs_assault','e2',()=>.3);
 assert.equal(16-e.hp,7);
 assert.ok(e.dot.some(x=>x.type==='bleed'));
});
test('Beastmaster Hound Harry hits four enemies and bleeds each once',()=>{
 const s=attack('h2','pack_harassment','e1');
 for(const e of s.units.filter(x=>x.side==='enemy'))assert.ok(e.dot.some(x=>x.type==='bleed'&&x.value===1));
});
test('Beastmaster Hunt Command marks and reduces protection',()=>{
 const s=attack('h2','hunt_command','e1'),e=s.units.find(x=>x.id==='e1');
 assert.equal(e.marked,3);assert.equal(effectModifier(e,'prot'),-20);
});
test('Beastmaster Comforting Howl probabilistically heals party stress',()=>{
 const s=b('h2');
 for(const u of s.units.filter(x=>x.side==='hero'))u.stress=10;
 s.units=[s.units[0],s.units[2],s.units[1],s.units[3],...s.units.filter(x=>x.side==='enemy')];
 takeTurn(s,'h2','comforting_howl','h1',()=>.3);
 for(const u of s.units.filter(x=>x.side==='hero'))assert.equal(u.stress,8);
});
test('Beastmaster Guardian Wolf guards an ally and grants dodge',()=>{
 const s=attack('h2','guardian_wolf','h3'),u=s.units.find(x=>x.id==='h2');
 assert.equal(u.guard.targetId,'h3');assert.equal(effectModifier(u,'dodge'),10);
});
test('Beastmaster Lick Wounds is a self-heal and cannot target others',()=>{
 const s=b('h2'),u=s.units.find(x=>x.id==='h2');
 u.hp=10;assert.deepEqual(availableTargets(s,'h2','beasts_recovery'),['h2']);
 takeTurn(s,'h2','beasts_recovery','h2',()=>.3);
 assert.equal(u.hp,14);
});
test('Beastmaster Blackjack is front-rank stun move',()=>{
 const s=b('h2');
 assert.deepEqual(availableTargets(s,'h2','staff_strike'),['e1','e2','e3']);
 takeTurn(s,'h2','staff_strike','e1',()=>.3);
 assert.equal(s.units.find(x=>x.id==='e1').stun,1);
});
test('Bard Dirk Stab ignores guard and advances',()=>{
 const s=b('h3'),bard=s.units.find(x=>x.id==='h3'),target=s.units.find(x=>x.id==='e1'),guard=s.units.find(x=>x.id==='e2');
 applyGuard(s,guard,target.id,2);
 const guardHp=guard.hp,old=rank(s,'h3');
 takeTurn(s,'h3','flourishing_strike','e1',()=>.3);
 assert.equal(guard.hp,guardHp);
 assert.equal(rank(s,'h3'),old-1);
 assert.equal(effectModifier(bard,'finaleDamage'),30);
});
test('Bard Harvest bleeds both middle enemies and adds Finale stack',()=>{
 const s=attack('h3','whirling_blades','e2');
 for(const id of ['e2','e3'])assert.ok(s.units.find(x=>x.id===id).dot.some(x=>x.type==='bleed'));
 assert.equal(effectModifier(s.units.find(x=>x.id==='h3'),'finaleDamage'),30);
});
test('Bard Solo advances to front and gives mark, dodge, Finale boosts',()=>{
 const s=attack('h3','heroic_solo','e1'),a=s.units.find(x=>x.id==='h3');
 assert.equal(rank(s,'h3'),0);assert.equal(a.marked,2);
 assert.equal(effectModifier(a,'dodge'),20);assert.equal(effectModifier(a,'finaleDamage'),75);
});
test('Bard Finale consumes stacks, retreats and is once per battle',()=>{
 const s=b('h3'),a=s.units.find(x=>x.id==='h3');
 s.units=[s.units[0],a,s.units[1],s.units[3],...s.units.filter(x=>x.side==='enemy')];
 a.effects=[{kind:'buff',finaleStack:true,turns:8,modifiers:{finaleDamage:75,finaleCrit:8}}];
 takeTurn(s,'h3','grand_finale','e1',()=>.3);
 assert.equal(rank(s,'h3'),3);
 assert.equal(effectModifier(a,'finaleDamage'),0);
 assert.deepEqual(availableTargets(s,'h3','grand_finale'),[]);
 assert.equal(effectModifier(a,'dodge'),-25);
});
test('Bard Slice Off inflicts three-point bleed',()=>{
 const s=attack('h3','cutting_refrain','e2');
 assert.ok(s.units.find(x=>x.id==='e2').dot.some(x=>x.type==='bleed'&&x.value===3));
});
test('Bard Battle Ballad buffs party and self Finale stacks',()=>{
 const s=attack('h3','song_of_courage','h1');
 for(const u of s.units.filter(x=>x.side==='hero'))assert.equal(effectModifier(u,'speed'),2);
 assert.equal(effectModifier(s.units.find(x=>x.id==='h3'),'finaleCrit'),8);
});
test('Bard Inspiring Tune heals stress and gives stress resist',()=>{
 const s=b('h3'),t=s.units.find(x=>x.id==='h1');t.stress=25;
 takeTurn(s,'h3','soothing_melody','h1',()=>.3);
 assert.equal(t.stress,17);assert.equal(effectModifier(t,'stressResist'),10);
});
