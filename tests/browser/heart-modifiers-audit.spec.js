import {test,expect} from '@playwright/test';

test('virtuous hero reaches 200 stress without heart attack',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,stress}=await import('./src/engine.js');
  const b=makeBattle(),hero=b.units.find(x=>x.id==='h1');
  hero.virtue='Bravery';hero.stress=198;
  stress(b,hero,5,()=>.8);
  return {stress:hero.stress,virtue:hero.virtue,hp:hero.hp,deathDoor:hero.deathDoor};
 });
 expect(result).toEqual({stress:0,virtue:null,hp:33,deathDoor:false});
});
test('heart attack, followed by healing, applies combined mortality debuffs',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,stress,takeTurn}=await import('./src/engine.js');
  const {effectiveCombatStats}=await import('./src/dd1-math.js');
  const b=makeBattle(),hero=b.units.find(x=>x.id==='h1');
  hero.affliction='Despair';hero.stress=199;
  stress(b,hero,3,()=>.8);
  const onDoor=hero.deathDoor&&hero.hp===0&&hero.stress===170;
  b.queue=['h4'];takeTurn(b,'h4','greater_heal','h1',()=>.3);
  return {onDoor,heartRecovery:hero.heartAttackRecovery,stats:effectiveCombatStats(hero)};
 });
 expect(result).toEqual({
  onDoor:true,heartRecovery:true,
  stats:{accuracy:-5,damageMultiplier:.85,speed:0,stressMultiplier:1.25}
 });
});
test('additive marked and human attack bonuses are used in browser',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const [{combinedAttackMultiplier},{makeThirdClassBattle,takeTurn}]=await Promise.all([
   import('./src/dd1-math.js'),import('./src/engine.js')
  ]);
  const b=makeThirdClassBattle(),attacker=b.units.find(x=>x.id==='h3'),enemy=b.units.find(x=>x.id==='e1');
  attacker.dmgMin=attacker.dmgMax=10;attacker.crit=0;
  enemy.types=['human'];enemy.marked=3;enemy.hp=enemy.maxHp=100;
  b.queue=['h3'];takeTurn(b,'h3','hunters_execution','e1',()=>.3);
  return {multiplier:combinedAttackMultiplier(0,[90,15]),damage:100-enemy.hp};
 });
 expect(result).toEqual({multiplier:2.05,damage:21});
});
