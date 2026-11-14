import {test,expect} from '@playwright/test';

test('new campaign shows persistent four-hero roster and restores it after reload',async ({page})=>{
 await page.goto('/dungeon.html');
 const roster=page.locator('#hero-roster');
 await expect(roster).toContainText('Heroes: 4/8');
 await expect(roster).toContainText('Swordsman [r1]');
 await expect(roster).toContainText('Warrior [r2]');
 await expect(roster).toContainText('Hunter [r3]');
 await expect(roster).toContainText('Priest [r4]');
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 4/8');
});

test('recruiting a duplicate class and selecting a new party persists through reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,CAMPAIGN_SAVE_KEY,encodeCampaignSave}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const s=createCampaignSettlement();s.gold=500;
  const d=createDungeon(931);d.phase='victory';d.rewardClaimed=true;d.rosterReturned=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 await page.getByRole('button',{name:/Recruit Swordsman · w2-o1/}).click();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 5/8');
 await expect(page.locator('#hero-roster')).toContainText('Swordsman 5 [r5]');
 const first=page.locator('#hero-roster select').first();
 await first.selectOption('r5');
 await page.reload();
 await expect(page.locator('#hero-roster select').first()).toHaveValue('r5');
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
 await expect(page.locator('#dungeon-party')).toContainText('Swordsman 5');
 const details=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const state=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {rosterId:state.expedition.party[0].rosterId,combatId:state.expedition.party[0].id,heroClass:state.expedition.party[0].heroClass};
 });
 expect(details).toEqual({rosterId:'r5',combatId:'h1',heroClass:'Swordsman'});
});

test('Temple resurrection and trinket equipment keep spend and hero states through reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,CAMPAIGN_SAVE_KEY,encodeCampaignSave}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const s=createCampaignSettlement();s.gold=650;s.crests=1;s.deeds=1;s.trinkets.push('ward-charm');
  s.roster[0].unit.dead=true;s.roster[0].unit.hp=0;
  const d=createDungeon(932);d.phase='defeat';d.rosterReturned=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('FALLEN');
 await page.getByRole('button',{name:/Upgrade Temple/}).click();
 await page.getByRole('button',{name:'Resurrect Swordsman'}).click();
 await page.getByRole('button',{name:'Equip charm'}).first().click();
 await page.reload();
 await expect(page.locator('#hero-roster')).not.toContainText('FALLEN');
 await expect(page.locator('#hero-roster')).toContainText('Ward Charm');
 await expect(page.locator('#settlement-panel')).toContainText('Temple Lv 1/3');
 const state=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const s=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).settlement;
  return {gold:s.gold,temple:s.facilities.temple,dead:s.roster[0].unit.dead,stress:s.roster[0].unit.stress,gear:s.roster[0].equippedTrinket,stored:s.trinkets.length};
 });
 expect(state).toEqual({gold:250,temple:1,dead:false,stress:100,gear:'ward-charm',stored:0});
});

test('hero roster state survives an expedition end and cannot be transferred twice',async ({page})=>{
 await page.goto('/dungeon.html');
 const output=await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {prepareRosterParty,returnPartyToRoster}=await import('./src/hero-roster.js');
  const s=createCampaignSettlement(),d=createDungeon(933,{party:prepareRosterParty(s)});
  d.party[1].hp=9;d.party[1].stress=76;d.party[2].dead=true;d.party[2].hp=0;
  d.phase='defeat';returnPartyToRoster(s,d);
  const after=decodeCampaignSave(encodeCampaignSave(s,d));
  return {hp:after.settlement.roster[1].unit.hp,stress:after.settlement.roster[1].unit.stress,
   dead:after.settlement.roster[2].unit.dead,again:returnPartyToRoster(after.settlement,after.expedition)};
 });
 expect(output).toEqual({hp:9,stress:76,dead:true,again:false});
});

test('full roster with a dead hero can dismiss, recruit and fill vacant party rank',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {recruitHero}=await import('./src/hero-roster.js');
  const s=createCampaignSettlement();
  for(let i=4;i<8;i++)recruitHero(s,'Warrior');
  s.roster[0].unit.dead=true;s.roster[0].unit.hp=0;
  const d=createDungeon(934);d.phase='defeat';d.rosterReturned=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 8/8');
 await page.getByRole('button',{name:'Dismiss permanently Swordsman'}).click();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 7/8');
 await expect(page.locator('#hero-roster')).toContainText('Graveyard: Swordsman');
 await page.getByRole('button',{name:/Recruit Priest · w2-o2/}).click();
 await expect(page.locator('#hero-roster')).toContainText('Heroes: 8/8');
 await page.locator('#hero-roster select').first().selectOption('r9');
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-party')).toContainText('Priest 9');
 await page.reload();
 await expect(page.locator('#dungeon-party')).toContainText('Priest 9');
});
