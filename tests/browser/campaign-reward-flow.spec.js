import {test,expect} from '@playwright/test';

test('campaign victory transfers rewards, advances milestones and persists without duplication',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {offerLoot,collectLoot}=await import('./src/inventory.js');
  const s=createCampaignSettlement();
  const d=createDungeon(902,{region:'crypt',tier:'apprentice',interactiveEvents:true});
  d.questId='crypt-recon';
  offerLoot(d,'gold',100);collectLoot(d);
  d.phase='victory';d.cleared=['sanctum'];d.rosterReturned=true;d.townWeekProcessed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toBeVisible();
 await page.getByRole('button',{name:'Return rewards to settlement'}).click();
 await expect(page.getByText('Rewards transferred to the settlement ✓')).toBeVisible();
 const read=()=>page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {campaignProgress}=await import('./src/campaign-progression.js');
  const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {gold:settlement.gold,completed:settlement.completedExpeditions,claimed:expedition.rewardClaimed,
   milestones:campaignProgress(settlement).completed};
 });
 const first=await read();
 expect(first.claimed).toBe(true);
 expect(first.completed).toBe(1);
 expect(first.milestones).toBe(1);
 await page.reload();
 expect(await read()).toEqual(first);
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toHaveCount(0);
});
