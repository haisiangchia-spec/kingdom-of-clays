import test from 'node:test';
import assert from 'node:assert/strict';
import {ABILITIES,makeBattle,setActorSkillLevel,getActorSkill,takeTurn,availableTargets} from '../src/engine.js';
import {SKILL_UPGRADES,availableVerifiedLevels,resolveSkillDefinition} from '../src/skill-progression.js';
import {effectModifier} from '../src/status.js';

const tracks={
 swordsman:['heavy_slash','countering_advance','battle_shout','guardian_parry','riposte_stance','swordmasters_orders','steadfast_resolve'],
 warrior:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],
 priest:['sacred_strike','divine_judgement','radiant_flash','greater_heal','group_healing','revealing_light','blessing_strike']
};
test('all 21 skills have levels 1–5; the 84 upgrade patches are present',()=>{
 const keys=Object.values(tracks).flat();
 assert.equal(keys.length,21);
 assert.equal(Object.keys(SKILL_UPGRADES).length,63);
 for(const key of keys){
  assert.deepEqual(availableVerifiedLevels(key),[1,2,3,4,5]);
  for(const level of [2,3,4,5])assert.ok(SKILL_UPGRADES[key]?.[level],key+' '+level);
 }
 assert.equal(keys.reduce((count,key)=>count+Object.keys(SKILL_UPGRADES[key]).length,0),84);
 assert.deepEqual(availableVerifiedLevels('wolfs_assault'),[1]);
});
test('Swordsman Bellow accuracy, debuff and application chance match all five levels',()=>{
 const expected=[
 [90,-5,-5,100],[95,-6,-5,110],[100,-7,-6,120],
 [105,-8,-6,130],[110,-10,-7,140]
 ];
 expected.forEach(([acc,dodge,speed,chance],index)=>{
  const sk=resolveSkillDefinition(ABILITIES,'battle_shout',index+1);
  assert.equal(sk.acc,acc);assert.equal(sk.debuff.modifiers.dodge,dodge);
  assert.equal(sk.debuff.modifiers.speed,speed);assert.equal(sk.debuff.chance,chance);
  assert.equal(sk.debuff.turns,3);
 });
});
test('Swordsman Defender and Command progression retains other buff fields',()=>{
 for(const [index,prot] of [15,18,22,26,30].entries()){
  const sk=resolveSkillDefinition(ABILITIES,'guardian_parry',index+1);
  assert.equal(sk.protectBuff.modifiers.prot,prot);
  assert.equal(sk.guardTurns,3);assert.equal(sk.protectBuff.turns,4);
 }
 const expected=[[5,4,15],[6,5,17],[7,6,20],[8,7,22],[10,8,25]];
 expected.forEach(([accuracy,crit,damageWhileGuarded],index)=>{
  const sk=resolveSkillDefinition(ABILITIES,'swordmasters_orders',index+1);
  assert.deepEqual(sk.buff.modifiers,{accuracy,crit,damageWhileGuarded});
  assert.equal(sk.buff.turns,3);
 });
});
test('Swordsman Retribution upgrades riposte damage and crit chance independently',()=>{
 const expected=[[-.40,0],[-.35,1],[-.30,2],[-.25,3],[-.20,4]];
 expected.forEach(([mod,crit],index)=>{
  const sk=resolveSkillDefinition(ABILITIES,'riposte_stance',index+1);
  assert.ok(Math.abs(sk.riposteMod-mod)<1e-9);
  assert.equal(sk.riposteCrit??0,crit);
  assert.equal(sk.acc,85+index*5);
  assert.equal(sk.crit,2.5+index);
 });
 const b=makeBattle();setActorSkillLevel(b,'h1','riposte_stance',5);
 b.queue=['h1'];takeTurn(b,'h1','riposte_stance','e1',()=>.3);
 const hero=b.units.find(u=>u.id==='h1');
 assert.equal(hero.riposteCrit,4);
 assert.equal(hero.riposteMod,-.2);
});
test('Swordsman Bolster progression retains once-per-battle and increases dodge/stress resist',()=>{
 const expected=[[5,10],[6,10],[7,15],[8,15],[10,20]];
 expected.forEach(([dodge,stressResist],index)=>{
  const sk=resolveSkillDefinition(ABILITIES,'steadfast_resolve',index+1);
  assert.equal(sk.buff.modifiers.dodge,dodge);
  assert.equal(sk.buff.modifiers.stressResist,stressResist);
  assert.equal(sk.maxUses,1);
 });
});
test('Warrior Zealous Accusation and Stunning Blow accuracy/crit ramp at each level',()=>{
 for(let i=0;i<5;i++){
  const accusation=resolveSkillDefinition(ABILITIES,'sweeping_assault',i+1);
  assert.equal(accusation.acc,85+i*5);
  assert.equal(accusation.crit,-4+i);
  assert.equal(accusation.mod,-.4);
  const blow=resolveSkillDefinition(ABILITIES,'concussive_blow',i+1);
  assert.equal(blow.acc,90+i*5);
  assert.equal(blow.crit,i);
  assert.equal(blow.status.chance,100+i*10);
  assert.equal(blow.status.type,'stun');
 }
});
test('Warrior Bulwark, Battle Heal, Holy Lance and Inspiring Cry match full level tables',()=>{
 const bulwark=[20,22,25,28,30];
 const heals=[[2,3],[3,3],[3,4],[4,5],[5,6]];
 const cries=[[1,1,5,5],[1,1,5,6],[1,2,6,7],[1,2,7,8],[2,2,8,10]];
 for(let i=0;i<5;i++){
  const level=i+1;
  const bul=resolveSkillDefinition(ABILITIES,'iron_fortress',level);
  assert.equal(bul.buff.modifiers.prot,bulwark[i]);assert.equal(bul.markSelf,999);
  assert.equal(bul.torch,24);assert.equal(bul.maxUses,1);
  const heal=resolveSkillDefinition(ABILITIES,'warrior_recovery',level);
  assert.deepEqual([heal.min,heal.max],heals[i]);
  const lance=resolveSkillDefinition(ABILITIES,'charging_blade',level);
  assert.equal(lance.acc,85+i*5);assert.equal(lance.crit,6.5+i);
  assert.ok(Math.abs(lance.vsTypes.unholy-(.15+i*.05))<1e-9);
  assert.equal(lance.advance,1);
  const cry=resolveSkillDefinition(ABILITIES,'rallying_roar',level);
  assert.deepEqual([cry.min,cry.max,cry.stressHeal,cry.torch],cries[i]);
 }
});
test('Priest Mace Bash and Judgement scale ACC CRIT unholy and self-heal correctly',()=>{
 const judgementHeal=[3,3,4,4,5];
 for(let i=0;i<5;i++){
  const mace=resolveSkillDefinition(ABILITIES,'sacred_strike',i+1);
  assert.equal(mace.acc,85+i*5);assert.equal(mace.crit,i);
  assert.ok(Math.abs(mace.vsTypes.unholy-(.15+i*.05))<1e-9);
  const judgement=resolveSkillDefinition(ABILITIES,'divine_judgement',i+1);
  assert.equal(judgement.acc,85+i*5);assert.equal(judgement.crit,5+i);
  assert.equal(judgement.selfHealOnHit,judgementHeal[i]);
 }
});
test('Priest Dazzling Light scales stun, but torch stays +6',()=>{
 for(let i=0;i<5;i++){
  const sk=resolveSkillDefinition(ABILITIES,'radiant_flash',i+1);
  assert.equal(sk.acc,90+i*5);assert.equal(sk.crit,5+i);
  assert.equal(sk.status.chance,100+10*i);
  assert.equal(sk.torch,6);
 }
});
test('Priest Illumination scales dodge penalty and reveal light while never critting',()=>{
 const expected=[[-20,5,100],[-23,6,110],[-25,7,120],[-27,8,130],[-30,10,140]];
 expected.forEach(([dodge,torch,chance],index)=>{
  const sk=resolveSkillDefinition(ABILITIES,'revealing_light',index+1);
  assert.equal(sk.acc,90+index*5);
  assert.equal(sk.debuff.modifiers.dodge,dodge);
  assert.equal(sk.debuff.chance,chance);
  assert.equal(sk.torch,torch);
  assert.equal(sk.neverCrit,true);
  assert.equal(sk.ignoreStealth,true);
 });
});
test('Priest Hand of Light upgrades self-buff, Unholy bonus and hit CRIT',()=>{
 const values=[[6,25],[7,27],[8,30],[9,33],[10,35]];
 values.forEach(([accuracy,damage],index)=>{
  const sk=resolveSkillDefinition(ABILITIES,'blessing_strike',index+1);
  assert.equal(sk.selfBuff.modifiers.accuracy,accuracy);
  assert.equal(sk.selfBuff.modifiers.damage,damage);
  assert.equal(sk.selfBuff.turns,4);
  assert.ok(Math.abs(sk.vsTypes.unholy-(.15+index*.05))<1e-9);
  assert.equal(sk.crit,1+index);
 });
});
test('live level-five Warrior Battle Heal and Priest Judgement use upgraded values',()=>{
 const b=makeBattle(),hero=b.units.find(u=>u.id==='h1'),priest=b.units.find(u=>u.id==='h4');
 hero.hp=9;
 setActorSkillLevel(b,'h2','warrior_recovery',5);b.queue=['h2'];
 takeTurn(b,'h2','warrior_recovery','h1',()=>.3);
 assert.equal(hero.hp,14);
 priest.hp=10;setActorSkillLevel(b,'h4','divine_judgement',5);b.queue=['h4'];
 takeTurn(b,'h4','divine_judgement','e1',()=>.3);
 assert.equal(priest.hp,15);
});
test('level-five group buffs affect party; classless enemy skills remain unchanged',()=>{
 const b=makeBattle(),sword=b.units.find(u=>u.id==='h1');
 setActorSkillLevel(b,'h1','swordmasters_orders',5);
 b.queue=['h1'];takeTurn(b,'h1','swordmasters_orders','h1',()=>.3);
 for(const hero of b.units.filter(u=>u.side==='hero')){
  assert.equal(effectModifier(hero,'accuracy'),10);
  assert.equal(effectModifier(hero,'crit'),8);
 }
 assert.equal(ABILITIES.enemy_strike.acc,85);
 assert.equal(ABILITIES.swordmasters_orders.buff.modifiers.accuracy,5);
});
