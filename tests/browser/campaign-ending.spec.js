import {test,expect} from '@playwright/test';

test('claiming Champion Warrens victory completes campaign and survives reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const s=createCampaignSettlement();s.completedExpeditions=4;s.campaignVictories=['veteran-victory'];
  const d=createDungeon(1550,{region:'plague',tier:'champion',interactiveEvents:true});
  d.questId='warrens-champion';d.phase='victory';d.cleared=['watch','vault','sanctum'];
  d.rosterReturned=true;d.townWeekProcessed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 await expect(page.locator('#settlement-panel')).toContainText('Campaign Objectives');
 await page.getByRole('button',{name:'Return rewards to settlement'}).click();
 await expect(page.locator('#settlement-panel')).toContainText('Campaign Complete — Champion of Clays');
 await expect(page.locator('#settlement-panel')).toContainText('Champion Trial');
 const read=()=>page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {campaignProgress}=await import('./src/campaign-progression.js');
  const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {finished:campaignProgress(settlement).finished,completed:campaignProgress(settlement).completed,
   expeditions:settlement.completedExpeditions,claimed:expedition.rewardClaimed,
   championVictories:settlement.campaignVictories.filter(x=>x==='champion-victory').length};
 });
 const first=await read();
 expect(first).toEqual({finished:true,completed:4,expeditions:5,claimed:true,championVictories:1});
 await page.reload();
 expect(await read()).toEqual(first);
 await expect(page.locator('#settlement-panel')).toContainText('Campaign Complete — Champion of Clays');
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toHaveCount(0);
});
