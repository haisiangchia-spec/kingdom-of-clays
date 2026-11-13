import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,makeBattle,makeProgressionBattle,makeThirdClassBattle,setActorSkillLevel,getActorSkill,takeTurn,availableTargets,unit} from '../src/engine.js';
import {SKILL_UPGRADES,resolveSkillDefinition,availableVerifiedLevels,equipVerifiedSkillLevel} from '../src/skill-progression.js';

test('verified upgrade registry covers sixty-three skills across nine classes',()=>{
 const classSkills=Object.entries(ABILITIES).filter(([,sk])=>['swordsman','warrior','priest','hunter','thief','mage','monster_slayer','berserker','dark_knight'].includes(sk.classId)).map(([key])=>key);
 assert.equal(classSkills.length,63);
 assert.deepEqual(Object.keys(SKILL_UPGRADES).sort(),classSkills.sort());
 for(const id of Object.keys(SKILL_UPGRADES))assert.deepEqual(availableVerifiedLevels(id),[1,2,3,4,5]);
 assert.deepEqual(availableVerifiedLevels('wolfs_assault'),[1]);
});
test('level-one definitions remain stable, untouched by upgrade patches',()=>{
 const base=ABILITIES.countering_advance;
 const upgraded=resolveSkillDefinition(ABILITIES,'countering_advance',5);
 assert.equal(upgraded.acc,110);
 assert.equal(upgraded.crit,9);
 assert.equal(upgraded.status.chance,140);
 assert.equal(upgraded.moveTarget.chance,140);
 assert.equal(upgraded.status.type,'stun');
 assert.equal(upgraded.moveTarget.type,'push');
 assert.equal(base.acc,90);
 assert.equal(base.status.chance,100);
 assert.equal(ABILITIES.countering_advance.status.chance,100);
 assert.equal(resolveSkillDefinition(ABILITIES,'countering_advance',1),base);
});
test('DD1 Swordsman Crush ACC and CRIT rise at each verified level',()=>{
 const expected=[[85,5],[90,6],[95,7],[100,8],[105,9]];
 for(let i=0;i<5;i++){
  const definition=resolveSkillDefinition(ABILITIES,'heavy_slash',i+1);
  assert.equal(definition.acc,expected[i][0]);
  assert.equal(definition.crit,expected[i][1]);
  assert.deepEqual(definition.from,[0,1]);
  assert.deepEqual(definition.to,[0,1,2]);
 }
});
test('Crusader Smite progression upgrades accuracy, crit and bonus against Unholy',()=>{
 for(let level=1;level<=5;level++){
  const def=resolveSkillDefinition(ABILITIES,'crushing_strike',level);
  assert.equal(def.acc,85+(level-1)*5);
  assert.equal(def.crit,level-1);
  assert.ok(Math.abs(def.vsTypes.unholy-(.15+(level-1)*.05))<1e-9);
 }
});
test('Vestal Divine Grace heals verified ranges from 4–5 up to 8–9',()=>{
 for(let level=1;level<=5;level++){
  const def=resolveSkillDefinition(ABILITIES,'greater_heal',level);
  assert.equal(def.min,level+3);
  assert.equal(def.max,level+4);
  assert.equal(def.kind,'heal');
 }
});
test('Vestal Divine Comfort has distinct verified group-heal ranges',()=>{
 const expected=[[1,3],[2,3],[3,3],[3,4],[4,5]];
 for(let level=1;level<=5;level++){
  const def=resolveSkillDefinition(ABILITIES,'group_healing',level);
  assert.deepEqual([def.min,def.max],expected[level-1]);
  assert.equal(def.kind,'groupHeal');
 }
});
test('invalid progression levels and unknown upgrade values are rejected, never guessed',()=>{
 for(const level of [0,6,-1,1.5,NaN,'5',null]){
  assert.throws(()=>resolveSkillDefinition(ABILITIES,'heavy_slash',level),RangeError);
 }
 assert.throws(()=>resolveSkillDefinition(ABILITIES,'wolfs_assault',2),/Unverified skill upgrade/);
 assert.throws(()=>resolveSkillDefinition(ABILITIES,'nonexistent',1),/Unknown skill/);
});
test('only matching hero class can equip a researched upgrade',()=>{
 const b=makeBattle();
 assert.throws(()=>setActorSkillLevel(b,'h2','heavy_slash',5),/does not belong/);
 assert.throws(()=>setActorSkillLevel(b,'e1','heavy_slash',5),/Active hero/);
 assert.throws(()=>setActorSkillLevel(b,'missing','heavy_slash',5),/Active hero/);
 assert.equal(setActorSkillLevel(b,'h1','heavy_slash',5).acc,105);
 assert.equal(b.units.find(x=>x.id==='h1').skillLevels.heavy_slash,5);
});
test('per-hero upgrades do not mutate shared definitions or other hero instances',()=>{
 const b=makeBattle(),h1=b.units.find(x=>x.id==='h1');
 const twin=unit('h5','Swordsman','hero',{hp:24});
 b.units.splice(2,0,twin);
 setActorSkillLevel(b,h1.id,'heavy_slash',5);
 assert.equal(getActorSkill(h1,'heavy_slash').acc,105);
 assert.equal(getActorSkill(twin,'heavy_slash').acc,85);
 assert.equal(ABILITIES.heavy_slash.acc,85);
});
test('actual combat uses upgraded damage against Unholy rather than level-one bonus',()=>{
 const run=level=>{
  const b=makeBattle(),warrior=b.units.find(u=>u.id==='h2'),enemy=b.units.find(u=>u.id==='e1');
  warrior.dmgMin=warrior.dmgMax=10;warrior.crit=0;enemy.hp=enemy.maxHp=100;
  if(level>1)setActorSkillLevel(b,'h2','crushing_strike',level);
  b.queue=['h2'];takeTurn(b,'h2','crushing_strike','e1',()=>.3);
  return 100-enemy.hp;
 };
 assert.equal(run(1),12);
 assert.equal(run(5),14);
});
test('upgraded healing values are used by combat not only exposed in data',()=>{
 const run=level=>{
  const b=makeBattle(),wounded=b.units.find(u=>u.id==='h1');wounded.hp=10;
  if(level>1)setActorSkillLevel(b,'h4','greater_heal',level);
  b.queue=['h4'];takeTurn(b,'h4','greater_heal','h1',()=>.3);
  return wounded.hp-10;
 };
 assert.equal(run(1),4);
 assert.equal(run(5),8);
});
test('upgraded group healing preserves per-target healing and legal party targets',()=>{
 const b=makeBattle();setActorSkillLevel(b,'h4','group_healing',5);
 b.units.filter(u=>u.side==='hero').forEach(u=>u.hp=10);
 assert.deepEqual(availableTargets(b,'h4','group_healing'),['h1','h2','h3','h4']);
 b.queue=['h4'];takeTurn(b,'h4','group_healing','h1',()=>.3);
 for(const hero of b.units.filter(u=>u.side==='hero'))assert.equal(hero.hp,14);
});
test('progression laboratory upgrades all twenty-one researched abilities',()=>{
 const b=makeProgressionBattle(17);
 const levels=b.units.filter(u=>u.side==='hero').flatMap(u=>Object.entries(u.skillLevels).map(([key,value])=>({name:u.name,key,value})));
 assert.equal(levels.length,21);
 assert.ok(levels.every(entry=>entry.value===5));
 assert.equal(getActorSkill(b.units.find(u=>u.id==='h1'),'heavy_slash').acc,105);
 assert.equal(getActorSkill(b.units.find(u=>u.id==='h4'),'greater_heal').min,8);
});
