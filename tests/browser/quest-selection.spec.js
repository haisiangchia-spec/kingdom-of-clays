import {test,expect} from '@playwright/test';

test('selected alternate Crypt contract launches and survives reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const s=createCampaignSettlement();
  const d=createDungeon(821);d.phase='victory';d.rosterReturned=true;d.townWeekProcessed=true;d.rewardClaimed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 const purge=page.locator('.dungeon-unit').filter({hasText:'Ashen Crypt Purge'});
 await purge.getByRole('button',{name:'Select quest'}).click();
 await expect(purge).toContainText('SELECTED');
 await page.getByRole('button',{name:'New expedition'}).click();
 const read=()=>page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const d=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition;
  return {questId:d.questId,region:d.region,tier:d.tier};
 });
 expect(await read()).toEqual({questId:'crypt-purge',region:'crypt',tier:'apprentice'});
 await page.reload();
 expect(await read()).toEqual({questId:'crypt-purge',region:'crypt',tier:'apprentice'});
 await expect(page.locator('#dungeon-status')).toContainText('APPRENTICE');
});
