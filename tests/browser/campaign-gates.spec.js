import {test,expect} from '@playwright/test';

test('browser refuses locked Veteran and Champion expeditions without overwriting the current save',async ({page})=>{
 await page.goto('/dungeon.html');
 const before=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,region:expedition.region,tier:expedition.tier,room:expedition.room};
 });
 expect(before).toMatchObject({region:'crypt',tier:'apprentice',room:'entrance'});
 await page.locator('#dungeon-region').selectOption('plague');
 for(const [tier,reason] of [
  ['veteran','Complete one expedition to unlock Blighted Warrens'],
  ['champion','Complete one expedition to unlock Blighted Warrens']
 ]){
  await page.locator('#dungeon-tier').selectOption(tier);
  await page.getByRole('button',{name:'New expedition'}).click();
  await expect(page.locator('#dungeon-log')).toContainText(reason);
  const after=await page.evaluate(async ()=>{
   const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return {seed:expedition.seed,region:expedition.region,tier:expedition.tier,room:expedition.room};
  });
  expect(after).toEqual(before);
 }
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
 await expect(page.locator('#dungeon-status')).toContainText('Crypt Entrance');
});
