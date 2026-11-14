import {test,expect} from '@playwright/test';

test('browser inventory supports heirlooms, gems and trinkets with atomic overflow',async ({page})=>{
 await page.goto('/dungeon.html');
 const outcome=await page.evaluate(async ()=>{
  const {createDungeon}=await import('./src/dungeon.js');
  const {offerLoot,collectLoot,inventoryCanAdd,discardInventoryStack,inventoryUsed,expeditionRewardSummary}=await import('./src/inventory.js');
  const d=createDungeon(520,{interactiveEvents:true});
  offerLoot(d,'gem',3);collectLoot(d);
  offerLoot(d,'crest',6);collectLoot(d);
  offerLoot(d,'trinket',1);
  const refused=!inventoryCanAdd(d,'trinket',1);
  let atomic=false;
  try{collectLoot(d)}catch{atomic=d.pendingLoot?.kind==='trinket';}
  discardInventoryStack(d,'food:0');
  collectLoot(d);
  const reward=expeditionRewardSummary(d);
  return {refused,atomic,slots:inventoryUsed(d),reward};
 });
 expect(outcome).toEqual({
  refused:true,atomic:true,slots:8,
  reward:{gold:0,gems:3,crests:6,deeds:0,trinkets:1,gemValue:375,trinketValue:250,totalGold:375}
 });
});

test('expedition settlement rewards transfer only once on victory',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon}=await import('./src/dungeon.js');
  const {offerLoot,collectLoot,createSettlement,claimExpeditionRewards}=await import('./src/inventory.js');
  const d=createDungeon(521,{interactiveEvents:true});
  offerLoot(d,'gem',2);collectLoot(d);
  offerLoot(d,'deed',3);collectLoot(d);
  offerLoot(d,'gold',50);collectLoot(d);
  d.phase='victory';
  const settlement=createSettlement();
  const report=claimExpeditionRewards(d,settlement);
  let duplicateBlocked=false;
  try{claimExpeditionRewards(d,settlement)}catch{duplicateBlocked=true;}
  return {report,settlement,duplicateBlocked};
 });
 expect(result.report.totalGold).toBe(300);
 expect(result.settlement).toEqual({gold:300,crests:0,deeds:3,trinkets:[]});
 expect(result.duplicateBlocked).toBe(true);
});

test('purified Vault curio offers an inventory trinket to be collected or left',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon,interactCurio}=await import('./src/dungeon.js');
  const {collectLoot,inventoryStacks}=await import('./src/inventory.js');
  const d=createDungeon(522,{interactiveEvents:true});
  d.room='vault';interactCurio(d,'purify');
  const pending=structuredClone(d.pendingLoot);
  collectLoot(d);
  return {pending,trinket:inventoryStacks(d).find(x=>x.kind==='trinket')};
 });
 expect(result.pending).toEqual({kind:'trinket',quantity:1});
 expect(result.trinket).toMatchObject({kind:'trinket',quantity:1});
});
