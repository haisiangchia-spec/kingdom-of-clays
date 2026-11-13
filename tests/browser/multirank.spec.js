import {test,expect} from '@playwright/test';

test('large monster demo renders one boss occupying three ranks and permits targeting',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Goblin Emperor Demo'}).click();
 await expect(page.locator('#enemy .unit')).toHaveCount(2);
 await expect(page.locator('#enemy .unit').filter({hasText:'Goblin Emperor'})).toContainText('Rank 1–3');
 await expect(page.locator('#phase')).toContainText('Round 1');
 const state=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,occupiedRanks,availableTargets}=await import('./src/engine.js');
  const s=makeLargeMonsterBattle(7);
  return {ranks:occupiedRanks(s,'boss'),targets:availableTargets(s,'h3','eagle_eye_shot')};
 });
 expect(state.ranks).toEqual([0,1,2]);
 expect(state.targets).toContain('boss');
 expect(errors).toEqual([]);
});
test('multi-rank boss can be damaged and turn order contains two boss actions',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,takeTurn,startRound,occupiedRanks}=await import('./src/engine.js');
  const b=makeLargeMonsterBattle();
  startRound(b,()=>0);
  const twoActions=b.queue.filter(id=>id==='boss').length===2;
  b.queue=['h2'];const before=b.units.find(x=>x.id==='boss').hp;
  takeTurn(b,'h2','sweeping_assault','boss',()=>.1);
  return {twoActions,ranks:occupiedRanks(b,'boss'),damage:before-b.units.find(x=>x.id==='boss').hp};
 });
 expect(result.twoActions).toBe(true);
 expect(result.ranks).toEqual([0,1,2]);
 expect(result.damage).toBeGreaterThan(0);
});
