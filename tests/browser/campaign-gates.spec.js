import {test,expect} from '@playwright/test';

test('browser refuses locked Veteran and Champion tiers without overwriting completed expedition',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave,encodeCampaignSave}=await import('/src/settlement.js');
  const state=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  const expedition=state.expedition;
  expedition.phase='victory';
  expedition.rewardClaimed=true;
  expedition.rosterReturned=true;
  expedition.townWeekProcessed=true;
  expedition.cleared=['sanctum'];
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(state.settlement,expedition));
 });
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('VICTORY');
 const before=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,region:expedition.region,tier:expedition.tier,room:expedition.room,phase:expedition.phase};
 });
 expect(before).toMatchObject({region:'crypt',tier:'apprentice',phase:'victory'});
 await page.locator('#dungeon-region').selectOption('plague');
 for(const tier of ['veteran','champion']){
  await page.locator('#dungeon-tier').selectOption(tier);
  await page.getByRole('button',{name:'New expedition'}).click();
  await expect(page.locator('#dungeon-log')).toContainText('Complete one expedition to unlock Blighted Warrens');
  const after=await page.evaluate(async ()=>{
   const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return {seed:expedition.seed,region:expedition.region,tier:expedition.tier,room:expedition.room,phase:expedition.phase};
  });
  expect(after).toEqual(before);
 }
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('VICTORY');
});
