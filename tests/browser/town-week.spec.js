import {test,expect} from '@playwright/test';

async function makeTown(page,{gold=2500,stress=80,week=2}={}){
 await page.goto('/dungeon.html');
 await page.evaluate(async ({gold,stress,week})=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {stageCoachOffers}=await import('./src/town-week.js');
  const s=createCampaignSettlement();s.gold=gold;s.town.week=week;
  s.town.offers=stageCoachOffers(week,s.roster);
  s.roster[0].unit.stress=stress;
  const d=createDungeon(961);d.phase='victory';d.rosterReturned=true;d.townWeekProcessed=true;d.rewardClaimed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 },{gold,stress,week});
 await page.reload();
}
test('Stage Coach offers specific free candidates once per town week, retained after reload',async ({page})=>{
 await makeTown(page,{gold:0});
 await expect(page.locator('#hero-roster')).toContainText('Town Week 2 · Stage Coach candidates: 2');
 await expect(page.getByRole('button',{name:/Recruit Swordsman · w2-o1/})).toBeEnabled();
 await page.getByRole('button',{name:/Recruit Swordsman · w2-o1/}).click();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 5/8');
 await expect(page.getByRole('button',{name:/Recruit Swordsman · w2-o1/})).toHaveCount(0);
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 5/8');
 await expect(page.locator('#hero-roster')).toContainText('Stage Coach candidates: 1');
});

test('Abbey booking costs 1000 and a booked hero cannot join a new expedition',async ({page})=>{
 await makeTown(page);
 await expect(page.getByRole('button',{name:'Treat at Abbey Cloister · 1000 gold'})).toBeEnabled();
 await page.getByRole('button',{name:'Treat at Abbey Cloister · 1000 gold'}).click();
 await expect(page.locator('#hero-roster')).toContainText('IN TREATMENT');
 await expect(page.locator('#settlement-panel')).toContainText('Treasury: 1500 gold');
 await expect(page.locator('#hero-roster select').first()).not.toHaveValue('r1');
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('VICTORY');
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('IN TREATMENT');
});

test('town week completes treatment once, refreshes coach, and does not repeat on reload',async ({page})=>{
 await makeTown(page,{stress:91,gold:2000});
 await page.getByRole('button',{name:'Treat at Abbey Cloister · 1000 gold'}).click();
 const result=await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {advanceTownWeek}=await import('./src/town-week.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {returnPartyToRoster,recruitHero,selectHero,prepareRosterParty}=await import('./src/hero-roster.js');
  const saved=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  const {settlement:s}=saved;
  const spare=recruitHero(s,'Hunter');
  selectHero(s,0,spare.rosterId);
  const d=createDungeon(962,{party:prepareRosterParty(s)});
  d.phase='victory';returnPartyToRoster(s,d);
  const once=advanceTownWeek(s,d),again=advanceTownWeek(s,d);
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
  return {once,again,week:s.town.week,stress:s.roster[0].unit.stress,offers:s.town.offers.map(o=>o.offerId)};
 });
 expect(result).toEqual({once:true,again:false,week:3,stress:46,offers:['w3-o1','w3-o2']});
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Town Week 3');
 await expect(page.locator('#hero-roster')).not.toContainText('IN TREATMENT');
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Town Week 3');
});
