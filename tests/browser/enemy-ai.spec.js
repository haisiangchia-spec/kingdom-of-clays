import {test,expect} from '@playwright/test';

test('enemy selector uses legal skill-first decisions in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const {makeBattle,ABILITIES,availableTargets,rng}=await import('./src/engine.js');
  const state=makeBattle(22),keys=['enemy_stress','enemy_strike'];
  const action=chooseEnemyAction(state,'e4',keys,rng(33),ABILITIES,availableTargets);
  return {action,valid:keys.includes(action?.key)&&availableTargets(state,'e4',action.key).includes(action.targetId)};
 });
 expect(result.valid).toBe(true);
 expect(result.action).toEqual(await page.evaluate(async ()=>{
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const {makeBattle,ABILITIES,availableTargets,rng}=await import('./src/engine.js');
  return chooseEnemyAction(makeBattle(22),'e4',['enemy_stress','enemy_strike'],rng(33),ABILITIES,availableTargets);
 }));
});
