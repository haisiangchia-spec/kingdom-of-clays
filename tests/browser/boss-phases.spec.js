import {test,expect} from '@playwright/test';

test('boss AI recalculates its phase and action weights at 50% HP',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,ABILITIES,availableTargets}=await import('./src/engine.js');
  const {chooseEnemyAction,bossPhase}=await import('./src/enemy-ai.js');
  const b=makeLargeMonsterBattle(11),boss=b.units.find(u=>u.id==='boss');
  const first=chooseEnemyAction(b,'boss',boss.enemySkills,()=>.5,ABILITIES,availableTargets);
  const before=bossPhase(boss);
  boss.hp=48;
  const second=chooseEnemyAction(b,'boss',boss.enemySkills,()=>.5,ABILITIES,availableTargets);
  return {before,after:bossPhase(boss),first:first.key,second:second.key,legal:availableTargets(b,'boss',second.key).includes(second.targetId)};
 });
 expect(result).toEqual({before:'commanding',after:'desperate',first:'emperor_roar',second:'emperor_slam',legal:true});
});

test('Goblin Emperor demo displays the currently active tactical phase',async ({page})=>{
 await page.goto('/');
 await page.locator('#large-demo').click();
 await expect(page.locator('#enemy .unit').filter({hasText:'Goblin Emperor'})).toContainText('COMMANDING PHASE');
});
