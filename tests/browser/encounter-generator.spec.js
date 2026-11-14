import {test,expect} from '@playwright/test';

test('generated Scout, Patrol and Gauntlet modes launch and show legal ranked enemies',async ({page})=>{
 await page.goto('/');
 for(const button of ['generated-scout-demo','generated-patrol-demo','generated-gauntlet-demo']){
  await page.locator('#'+button).click();
  const count=await page.locator('#enemy .unit').count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(4);
  await expect(page.locator('#phase')).toContainText('Round');
  await expect(page.locator('#enemy .unit').first()).toContainText('HP');
 }
});

test('browser encounter generator preserves seed determinism, composition and legal actions',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
   const {makeGeneratedEncounter,availableTargets,formationSlots}=await import('./src/engine.js');
   const {chooseEnemyAction}=await import('./src/enemy-ai.js');
   const {ABILITIES}=await import('./src/engine.js');
   const picks=[];
   for(const difficulty of ['scout','patrol','gauntlet']){
     const a=makeGeneratedEncounter(512,difficulty),b=makeGeneratedEncounter(512,difficulty);
     const enemies=a.units.filter(u=>u.side==='enemy');
     picks.push({
       difficulty,
       deterministic:JSON.stringify(a.encounterPlan)===JSON.stringify(b.encounterPlan),
       slots:formationSlots(a,'enemy').filter(Boolean).length,
       count:enemies.length,
       legal:enemies.every(u=>u.enemySkills.some(k=>availableTargets(a,u.id,k).length>0)),
       ai:enemies.every(u=>{
         const action=chooseEnemyAction(a,u.id,u.enemySkills,()=>.5,ABILITIES,availableTargets);
         return !!action&&availableTargets(a,u.id,action.key).includes(action.targetId);
       })
     });
   }
   return picks;
 });
 expect(result.map(x=>x.difficulty)).toEqual(['scout','patrol','gauntlet']);
 for(const entry of result){
  expect(entry.deterministic).toBe(true);
  expect(entry.slots).toBeLessThanOrEqual(4);
  expect(entry.count).toBeGreaterThanOrEqual(3);
  expect(entry.legal).toBe(true);
  expect(entry.ai).toBe(true);
 }
});
