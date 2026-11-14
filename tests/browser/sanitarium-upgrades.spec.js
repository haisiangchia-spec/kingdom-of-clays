import {test,expect} from '@playwright/test';

test('Sanitarium upgrade panel spends Busts and Crests and retains levels after reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const s=createCampaignSettlement();s.town.week=4;s.town.offers=[];s.busts=40;s.crests=40;s.gold=12000;
  s.roster[0].quirks.negative=[{id:'nervous',locked:false}];
  const d=createDungeon(786);d.phase='victory';d.rosterReturned=true;d.townWeekProcessed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 await expect(page.locator('#settlement-panel')).toContainText('40 busts');
 await page.getByRole('button',{name:'Upgrade Treatment Library (3 busts, 3 crests)'}).click();
 await expect(page.locator('#settlement-panel')).toContainText('Treatment Library Lv 1/5');
 await expect(page.locator('#settlement-panel')).toContainText('37 busts');
 await expect(page.getByRole('button',{name:'Remove Nervous · 1350 gold'})).toBeVisible();
 await page.reload();
 await expect(page.locator('#settlement-panel')).toContainText('Treatment Library Lv 1/5');
 await page.getByRole('button',{name:'Upgrade Patient Cells (10 busts, 6 crests)'}).click();
 await expect(page.locator('#hero-roster')).toContainText('0/2 medical wards');
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('0/2 medical wards');
});

test('two upgraded Sanitarium medical wards handle different patients and cures persist',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave}=await import('./src/settlement.js');
  const {upgradeSanitarium}=await import('./src/sanitarium-upgrades.js');
  const {bookSanitarium,completeSanitariumWeek,sanitariumWardBookings}=await import('./src/sanitarium.js');
  const s=createCampaignSettlement();s.town.week=4;s.town.offers=[];s.busts=40;s.crests=40;s.gold=20000;
  s.roster[0].diseases=['creepingCough'];s.roster[1].diseases=['ashenFever'];
  upgradeSanitarium(s,'patientCells');
  const first=bookSanitarium(s,'r1','disease','creepingCough');
  const second=bookSanitarium(s,'r2','disease','ashenFever');
  const before=sanitariumWardBookings(s,'medicalWard').length;
  const saved=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
  completeSanitariumWeek(saved);
  return {first,second,before,after:sanitariumWardBookings(saved,'medicalWard').length,
   leftA:saved.roster[0].diseases,leftB:saved.roster[1].diseases};
 });
 expect(result.first).toEqual({ward:'medicalWard',cost:750});
 expect(result.second).toEqual({ward:'medicalWard',cost:750});
 expect(result.before).toBe(2);
 expect(result.after).toBe(0);
 expect(result.leftA).toEqual([]);
 expect(result.leftB).toEqual([]);
});
