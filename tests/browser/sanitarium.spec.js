import {test,expect} from '@playwright/test';

async function installTown(page,week=4){
 await page.goto('/dungeon.html');
 await page.evaluate(async week=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {stageCoachOffers}=await import('./src/town-week.js');
  const s=createCampaignSettlement();
  s.town.week=week;s.town.offers=stageCoachOffers(week,s.roster);
  s.gold=25000;
  s.roster[0].quirks.negative.push({id:'nervous',locked:false});
  s.roster[1].diseases.push('creepingCough');
  s.roster[2].quirks.positive.push({id:'sturdy',locked:false});
  const d=createDungeon(990);d.phase='victory';d.rosterReturned=true;d.townWeekProcessed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 },week);
 await page.reload();
}
test('Sanitarium is unlocked at week four and has working quirk and medical bookings',async ({page})=>{
 await installTown(page);
 await expect(page.locator('#hero-roster')).toContainText('Sanitarium: OPEN');
 const removal=page.getByRole('button',{name:'Remove Nervous · 1500 gold'});
 const cure=page.getByRole('button',{name:'Cure Creeping Cough · 750 gold'});
 await expect(removal).toBeEnabled();
 await expect(cure).toBeEnabled();
 await removal.click();
 await cure.click();
 await expect(page.locator('#hero-roster')).toContainText('IN TREATMENT');
 await expect(page.locator('#settlement-panel')).toContainText('Treasury: 22750 gold');
 await page.reload();
 const result=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {sanitariumUnavailable}=await import('./src/sanitarium.js');
  const s=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).settlement;
  return {quirk:s.sanitarium.quirkWard,medical:s.sanitarium.medicalWard,blocked:sanitariumUnavailable(s,'r1')};
 });
 expect(result.quirk).toEqual({rosterId:'r1',mode:'negative',target:'nervous'});
 expect(result.medical).toEqual({rosterId:'r2',mode:'disease',target:'creepingCough'});
 expect(result.blocked).toBe(true);
});
test('Sanitarium bookings clear once after an expedition week and survive reload',async ({page})=>{
 await installTown(page);
 await page.getByRole('button',{name:'Remove Nervous · 1500 gold'}).click();
 await page.getByRole('button',{name:'Cure Creeping Cough · 750 gold'}).click();
 const result=await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {recruitHero,selectHero,prepareRosterParty,returnPartyToRoster}=await import('./src/hero-roster.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {advanceTownWeek}=await import('./src/town-week.js');
  const {settlement:s}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  const a=recruitHero(s,'Hunter'),b=recruitHero(s,'Priest');
  selectHero(s,0,a.rosterId);selectHero(s,1,b.rosterId);
  const d=createDungeon(991,{party:prepareRosterParty(s)});
  d.phase='victory';returnPartyToRoster(s,d);
  const first=advanceTownWeek(s,d),second=advanceTownWeek(s,d);
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
  return {first,second,week:s.town.week,quirks:s.roster[0].quirks.negative,diseases:s.roster[1].diseases,
   wards:s.sanitarium};
 });
 expect(result).toMatchObject({first:true,second:false,week:5,quirks:[],diseases:[],
  wards:{quirkWard:null,medicalWard:null}});
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Town Week 5');
 await expect(page.locator('#hero-roster')).not.toContainText('IN TREATMENT');
});
test('Sanitarium remains locked before week four',async ({page})=>{
 await installTown(page,3);
 await expect(page.locator('#hero-roster')).toContainText('Sanitarium: unlocks in Week 4');
 await expect(page.getByRole('button',{name:/Remove Nervous/})).toHaveCount(0);
});
