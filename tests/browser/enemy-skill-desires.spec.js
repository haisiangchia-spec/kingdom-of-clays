import {test,expect} from '@playwright/test';

test('ally defeat changes a skeleton swordsman skill preference in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,availableTargets,ABILITIES}=await import('./src/engine.js');
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const battle=makeBattle(82),mage=battle.units.find(u=>u.id==='e4'),sword=battle.units.find(u=>u.id==='e1');
  const choose=()=>chooseEnemyAction(battle,sword.id,sword.enemySkills,()=>.4,ABILITIES,availableTargets);
  const before=choose();
  mage.dead=true;
  const after=choose();
  return {before,after,legal:availableTargets(battle,sword.id,after.key).includes(after.targetId)};
 });
 expect(result.before.key).toBe('skeleton_cleaver');
 expect(result.after.key).toBe('skeleton_guard_break');
 expect(result.legal).toBe(true);
});

test('performing-turn skill desire follows boss action count rather than battle round',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,takeTurn,availableTargets}=await import('./src/engine.js');
  const {skillDesireWeight}=await import('./src/enemy-ai.js');
  const battle=makeLargeMonsterBattle(83),boss=battle.units.find(u=>u.id==='boss');
  const desire={type:'performing_turn',skill:'emperor_slam',turn:2,weight:4};
  battle.round=9;
  battle.queue=['boss','boss','h1'];
  const first=skillDesireWeight(battle,boss,'emperor_slam',availableTargets(battle,'boss','emperor_slam'),[desire]);
  takeTurn(battle,'boss','emperor_roar','h1',()=>.5);
  const second=skillDesireWeight(battle,boss,'emperor_slam',availableTargets(battle,'boss','emperor_slam'),[desire]);
  return {first,second,actionsTaken:boss.actionsTaken,round:battle.round};
 });
 expect(result).toEqual({first:1,second:4,actionsTaken:1,round:9});
});
