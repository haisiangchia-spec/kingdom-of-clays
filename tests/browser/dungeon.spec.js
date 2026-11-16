import {test,expect} from '@playwright/test';

test('Dungeon Expedition link opens a seeded connected-room exploration screen',async ({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Enter Dungeon Expedition/}).click();
 await expect(page).toHaveURL(/dungeon\.html/);
 await expect(page.locator('#dungeon-status')).toContainText('Crypt Entrance');
 await expect(page.locator('#dungeon-party .dungeon-unit')).toHaveCount(4);
 await expect(page.getByRole('button',{name:'Travel to Ashen Gallery'})).toBeVisible();
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await expect(page.getByRole('button',{name:'Advance corridor'})).toBeVisible();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 await expect(page.locator('#dungeon-panel-title')).toHaveText('Combat');
 await expect(page.locator('#dungeon-combat')).toContainText('Enemies');
 await expect(page.getByRole('button',{name:'Travel to Ashen Gallery'})).toHaveCount(0);
});

test('browser-generated dungeon persists hero wounds after corridor victory',async ({page})=>{
 await page.goto('/dungeon.html');
 const data=await page.evaluate(async ()=>{
  const {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle}=await import('./src/dungeon.js');
  const d=createDungeon(333);
  beginCorridor(d,'gallery');advanceCorridor(d);
  const b=dungeonBattle(d);
  b.units.find(u=>u.id==='h1').hp=11;
  b.units.find(u=>u.id==='h1').stress=35;
  for(const foe of b.units.filter(u=>u.side==='enemy'))foe.dead=true;
  resolveDungeonBattle(d);
  advanceCorridor(d);
  beginCorridor(d,'vault');advanceCorridor(d);
  if(dungeonBattle(d)){
   for(const foe of dungeonBattle(d).units.filter(u=>u.side==='enemy'))foe.dead=true;
   resolveDungeonBattle(d);
  }
  if(d.pendingTravel)advanceCorridor(d);
  return {room:d.room,hp:d.party.find(u=>u.id==='h1').hp,stress:d.party.find(u=>u.id==='h1').stress,
   cleared:d.cleared.includes('vault'),party:dungeonBattle(d)?.units.find(u=>u.id==='h1')?.hp??null};
 });
 expect(data).toEqual({room:'vault',hp:11,stress:35,cleared:false,party:11});
});

test('dungeon can finish after clearing route and sanctum in Chromium',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle}=await import('./src/dungeon.js');
  const d=createDungeon(335);
  const clear=()=>{if(!dungeonBattle(d))return;
   for(const enemy of dungeonBattle(d).units.filter(u=>u.side==='enemy'))enemy.dead=true;
   resolveDungeonBattle(d);
  };
  for(const room of ['gallery','watch','sanctum']){
   beginCorridor(d,room);
   while(d.pendingTravel){
    advanceCorridor(d);clear();
   }
   clear();
  }
  return {room:d.room,phase:d.phase,cleared:d.cleared};
 });
 expect(result.room).toBe('sanctum');
 expect(result.phase).toBe('victory');
 expect(result.cleared).toEqual(['watch','sanctum']);
});

test('browser victory transfers rewards once, recovers town, and starts the next quest',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {prepareRosterParty}=await import('/src/hero-roster.js');
  const {createDungeon}=await import('/src/dungeon.js');
  const {offerLoot,collectLoot}=await import('/src/inventory.js');
  const settlement=createCampaignSettlement();
  const expedition=createDungeon(321,{region:'crypt',tier:'apprentice',interactiveEvents:true,party:prepareRosterParty(settlement)});
  expedition.questId='crypt-recon';
  expedition.cleared=['sanctum'];
  offerLoot(expedition,'gold',100);collectLoot(expedition);
  expedition.phase='victory';
  expedition.rosterReturned=false;
  expedition.townWeekProcessed=false;
  expedition.traitsProcessed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(settlement,expedition));
 });
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('VICTORY');
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toBeVisible();
 await page.getByRole('button',{name:'Return rewards to settlement'}).click();
 await expect(page.locator('#settlement-panel')).toContainText('100 gold');
 await expect(page.locator('#settlement-panel')).toContainText('1 completed');
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toHaveCount(0);
 await page.reload();
 await expect(page.locator('#settlement-panel')).toContainText('1 completed');
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toHaveCount(0);
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
 await expect(page.locator('#dungeon-party .dungeon-unit')).toHaveCount(4);
});

test('browser defeat returns survivors to town and permits a new expedition after reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {prepareRosterParty}=await import('/src/hero-roster.js');
  const {createDungeon}=await import('/src/dungeon.js');
  const settlement=createCampaignSettlement();
  const expedition=createDungeon(329,{region:'crypt',tier:'apprentice',party:prepareRosterParty(settlement)});
  expedition.phase='defeat';
  expedition.party[0].dead=true;
  expedition.party[0].hp=0;
  expedition.rosterReturned=false;
  expedition.townWeekProcessed=false;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(settlement,expedition));
 });
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('DEFEAT');
 await expect(page.locator('#settlement-panel')).toContainText('0 completed');
 const state=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {dead:settlement.roster[0].unit.dead,returned:expedition.rosterReturned,
   processed:expedition.townWeekProcessed,week:settlement.town.week};
 });
 expect(state).toMatchObject({dead:true,returned:true,processed:true,week:2});
 await page.locator('#hero-roster button').filter({hasText:/Recruit /}).first().click();
 const replacement=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  const {settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return settlement.roster.at(-1).rosterId;
 });
 await page.locator('#hero-roster select').first().selectOption(replacement);
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
 await expect(page.locator('#dungeon-party .dungeon-unit')).toHaveCount(4);
});

test('browser exploration resumes mid-corridor after reload without resetting progress',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await expect(page.getByRole('button',{name:'Advance corridor'})).toBeVisible();
 const before=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,from:expedition.pendingTravel.from,to:expedition.pendingTravel.to,
   progress:expedition.pendingTravel.progress,steps:expedition.pendingTravel.steps};
 });
 expect(before).toMatchObject({from:'entrance',to:'gallery',progress:0});
 await page.reload();
 await expect(page.getByRole('button',{name:'Advance corridor'})).toBeVisible();
 const after=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,from:expedition.pendingTravel.from,to:expedition.pendingTravel.to,
   progress:expedition.pendingTravel.progress,steps:expedition.pendingTravel.steps};
 });
 expect(after).toEqual(before);
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
});

test('browser combat permits hero action and preserves battle after reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 await expect(page.locator('#dungeon-combat')).toContainText('to act');
 const before=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,phase:expedition.phase,room:expedition.room,
   battleSerial:expedition.battleSerial,randomCalls:expedition.randomCalls};
 });
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 await expect(page.locator('#dungeon-combat')).toContainText('to act');
 const after=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,phase:expedition.phase,room:expedition.room,
   battleSerial:expedition.battleSerial,randomCalls:expedition.randomCalls};
 });
 expect(after).toEqual(before);
 await page.getByRole('button',{name:'Pass turn'}).click();
 await expect(page.locator('#dungeon-combat')).toContainText('Battle log');
});

test('browser performs a real targeted hero attack during dungeon combat',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 const before=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {enemies:expedition.pendingBattle.battle.units.filter(u=>u.side==='enemy'&&!u.dead).map(u=>u.name),
   log:expedition.pendingBattle.battle.log.length};
 });
 let attacked=false;
 for(const button of await page.locator('#dungeon-combat button[aria-pressed]').all()){
  await button.click();
  for(const enemy of before.enemies){
   const target=page.locator('#dungeon-combat button').filter({hasText:enemy});
   if(await target.count()){
    await target.first().click();
    attacked=true;
    break;
   }
  }
  if(attacked)break;
 }
 expect(attacked).toBe(true);
 const after=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return expedition.pendingBattle?.battle?.log.length??0;
 });
 expect(after).toBeGreaterThan(before.log);
});
