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
 await expect(page.getByRole('button',{name:/Recruit .+ · w2-o1/})).toBeEnabled();
 await page.getByRole('button',{name:/Recruit .+ · w2-o1/}).click();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 5/8');
 await expect(page.getByRole('button',{name:/Recruit .+ · w2-o1/})).toHaveCount(0);
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

test('all six Abbey and Tavern activities are visible and independent in the Hamlet',async ({page})=>{
 await makeTown(page,{gold:6000,stress:100});
 await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const saved=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  saved.settlement.roster[1].unit.stress=100;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(saved.settlement,saved.expedition));
 });
 await page.reload();
 const names=['Abbey Cloister','Abbey Transept','Abbey Penance Hall','Tavern Bar','Tavern Gambling Hall','Tavern Brothel'];
 for(const name of names){
  await expect(page.getByRole('button',{name:`Treat at ${name} · ${['Abbey Transept','Tavern Gambling Hall'].includes(name)?1250:['Abbey Penance Hall','Tavern Brothel'].includes(name)?1500:1000} gold`,exact:false}).first()).toBeVisible();
 }
 await expect(page.getByRole('button',{name:/Treat at Abbey Cloister · 1000 gold · -45 stress · 0\/1 slots/}).first()).toBeEnabled();
 await page.getByRole('button',{name:/Treat at Abbey Cloister · 1000 gold/}).first().click();
 await page.getByRole('button',{name:/Treat at Tavern Gambling Hall · 1250 gold/}).first().click();
 await expect(page.getByRole('button',{name:/Treat at Abbey Cloister · 1000 gold · -45 stress · 1\/1 slots/})).toHaveCount(0);
 await expect(page.locator('#hero-roster')).toContainText('Treatment rooms: 2/6');
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Treatment rooms: 2/6');
 await expect(page.locator('#settlement-panel')).toContainText('Treasury: 3750 gold');
});

test('Hamlet activity upgrades are independently visible and persist across reload',async ({page})=>{
 await makeTown(page,{gold:1000,stress:100});
 await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const saved=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  saved.settlement.crests=20;saved.settlement.deeds=20;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(saved.settlement,saved.expedition));
 });
 await page.reload();
 const panel=page.locator('#settlement-panel');
 await expect(panel).toContainText('Abbey Transept activity upgrade Lv 0/2 · 1 slots · -55 stress');
 await expect(panel).toContainText('Abbey Penance Hall activity upgrade Lv 0/2 · 1 slots · -65 stress');
 await page.getByRole('button',{name:'Upgrade Abbey Transept activity (3 crests, 2 deeds)'}).click();
 await expect(panel).toContainText('Abbey Transept activity upgrade Lv 1/2 · 1 slots · -69 stress');
 await expect(panel).toContainText('Abbey Penance Hall activity upgrade Lv 0/2 · 1 slots · -65 stress');
 await page.reload();
 await expect(panel).toContainText('Abbey Transept activity upgrade Lv 1/2 · 1 slots · -69 stress');
 await page.getByRole('button',{name:'Upgrade Abbey Transept activity (6 crests, 4 deeds)'}).click();
 await expect(panel).toContainText('Abbey Transept activity upgrade Lv 2/2 · 2 slots · -86 stress');
 await expect(panel).toContainText('Abbey Penance Hall activity upgrade Lv 0/2 · 1 slots · -65 stress');
});

test('migrated recovery tracks hide obsolete shared Abbey and Tavern upgrades',async ({page})=>{
 await makeTown(page,{gold:1000,stress:100});
 await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {upgradeRecoveryActivity}=await import('./src/town-week.js');
  const saved=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  saved.settlement.crests=20;saved.settlement.deeds=20;
  upgradeRecoveryActivity(saved.settlement,'abbeyTransept');
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(saved.settlement,saved.expedition));
 });
 await page.reload();
 const panel=page.locator('#settlement-panel');
 await expect(panel).toContainText('Abbey Transept activity upgrade Lv 1/2');
 await expect(page.getByRole('button',{name:/Upgrade Abbey Recovery \(/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Upgrade Tavern Recovery \(/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Upgrade Abbey Transept activity (6 crests, 4 deeds)'})).toBeEnabled();
});

test('hero treatment quirks disable forbidden Hamlet activities in the browser',async ({page})=>{
 await makeTown(page,{gold:6000,stress:100});
 await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const saved=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  saved.settlement.roster[0].quirks.negative=[{id:'gambler',locked:false}];
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(saved.settlement,saved.expedition));
 });
 await page.reload();
 await expect(page.getByRole('button',{name:/Treat at Tavern Gambling Hall · 1250 gold/}).first()).toBeEnabled();
 await expect(page.getByRole('button',{name:/Treat at Abbey Cloister · 1000 gold/}).first()).toBeDisabled();
 await expect(page.getByRole('button',{name:/Treat at Tavern Bar · 1000 gold/}).first()).toBeDisabled();
 await page.getByRole('button',{name:/Treat at Tavern Gambling Hall · 1250 gold/}).first().click();
 await expect(page.locator('#settlement-panel')).toContainText('Treasury: 4750 gold');
 await expect(page.locator('#hero-roster')).toContainText('Treatment rooms: 1/6');
});

test('Hamlet displays the negative quirk that restricts stress treatment',async ({page})=>{
 await makeTown(page,{gold:3000,stress:90});
 await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const save=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  save.settlement.roster[0].quirks.negative=[{id:'knownCheat',locked:false}];
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(save.settlement,save.expedition));
 });
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Negative quirks: Known Cheat');
 const forbidden=page.getByRole('button',{name:/Treat at Tavern Gambling Hall/}).first();
 await expect(forbidden).toBeDisabled();
 await expect(forbidden).toHaveAttribute('title',/knownCheat prohibits Tavern Gambling Hall/);
});

test('new campaigns show six independent stress upgrades without obsolete shared upgrade buttons',async ({page})=>{
 await makeTown(page,{gold:4000,stress:90});
 await expect(page.getByRole('button',{name:/Upgrade Abbey \(/})).toHaveCount(0);
 await expect(page.getByRole('button',{name:/Upgrade Tavern \(/})).toHaveCount(0);
 for(const activity of ['Abbey Cloister','Abbey Transept','Abbey Penance Hall','Tavern Bar','Tavern Gambling Hall','Tavern Brothel'])
  await expect(page.getByRole('button',{name:new RegExp('Upgrade '+activity+' activity')})).toHaveCount(1);
});
