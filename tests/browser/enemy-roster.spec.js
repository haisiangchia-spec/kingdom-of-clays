import {test,expect} from '@playwright/test';

test('rearguard and cursed court buttons load distinct monster rosters',async ({page})=>{
 await page.goto('/');
 await page.locator('#rearguard-demo').click();
 await expect(page.locator('#enemy .unit')).toHaveCount(4);
 await expect(page.locator('#enemy .unit')).toContainText(['Skeleton Court Mage','Skeleton Archer','Skeleton Archer','Skeleton Swordsman']);
 await page.locator('#curse-court-demo').click();
 await expect(page.locator('#enemy .unit')).toContainText(['Skeleton Court Mage','Skeleton Court Mage','Skeleton Archer','Skeleton Swordsman']);
});
test('profile-equipped encounter enemies have legal skill choices in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,availableTargets,ABILITIES}=await import('./src/engine.js');
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const b=makeUndeadEncounter(51,'curseCourt');
  return b.units.filter(x=>x.side==='enemy').map(x=>{
   const choice=chooseEnemyAction(b,x.id,x.enemySkills,()=>.3,ABILITIES,availableTargets);
   return {id:x.id,profile:x.enemyProfile,valid:!!choice&&availableTargets(b,x.id,choice.key).includes(choice.targetId)};
  });
 });
 expect(result.map(x=>x.profile)).toEqual(['swordsman','archer','mage','mage']);
 expect(result.every(x=>x.valid)).toBe(true);
});
