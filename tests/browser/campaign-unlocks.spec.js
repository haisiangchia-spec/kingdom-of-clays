import {test,expect} from '@playwright/test';

test('campaign unlocks Warrens, Veteran and Champion quests in sequence across reloads',async ({page})=>{
 await page.goto('/dungeon.html');
 const stage=async (completed,veteran=false)=>{
  await page.evaluate(async ({completed,veteran})=>{
   const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
   const {createDungeon}=await import('./src/dungeon.js');
   const s=createCampaignSettlement();s.completedExpeditions=completed;
   if(veteran)s.campaignVictories.push('veteran-victory');
   const d=createDungeon(1410+completed);d.phase='victory';d.rosterReturned=true;d.townWeekProcessed=true;d.rewardClaimed=true;
   localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
  },{completed,veteran});
  await page.reload();
 };
 const quest=title=>page.locator('#settlement-panel .dungeon-unit').filter({hasText:title});
 await stage(0);
 await expect(quest('Blighted Warrens Reconnaissance')).toContainText('LOCKED');
 await expect(quest('Veteran Warrens Expedition')).toContainText('LOCKED');
 await stage(1);
 await expect(quest('Blighted Warrens Reconnaissance')).not.toContainText('LOCKED');
 await expect(quest('Veteran Warrens Expedition')).toContainText('LOCKED');
 await stage(3);
 await expect(quest('Veteran Warrens Expedition')).not.toContainText('LOCKED');
 await expect(quest('Champion Warrens Expedition')).toContainText('LOCKED');
 await stage(4,true);
 await expect(quest('Champion Warrens Expedition')).not.toContainText('LOCKED');
 await expect(page.locator('#settlement-panel')).toContainText('Veteran Trial — Win a Veteran Blighted Warrens expedition (1/1)');
});
