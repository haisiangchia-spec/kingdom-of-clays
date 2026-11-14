import {test,expect} from '@playwright/test';

test('settlement screen shows facilities and browser autosave keeps scouting progress across reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await expect(page.locator('#settlement-panel')).toContainText('Market Lv 0/3');
 await expect(page.locator('#settlement-panel')).toContainText('Guild Lv 0/3');
 await expect(page.locator('#settlement-panel')).toContainText('Temple Lv 0/3');
 await page.getByRole('button',{name:'Scout Ashen Gallery'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('Torch 73');
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('Torch 73');
 await expect(page.locator('#dungeon-travel')).toContainText('Scouted entrance-gallery');
 await expect(page.locator('#campaign-save-status')).toContainText('Progress saves automatically');
});

test('reloading an active corridor combat restores the fight rather than creating a fresh expedition',async ({page})=>{
 await page.goto('/dungeon.html');
 const start=await page.locator('#dungeon-status').textContent();
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 const roster=await page.locator('#dungeon-combat').textContent();
 await page.reload();
 const reloaded=await page.locator('#dungeon-status').textContent();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 expect(reloaded).toContain(start.match(/Seed \d+/)[0]);
 await expect(page.locator('#dungeon-combat')).toContainText('Enemies');
 expect((await page.locator('#dungeon-combat').textContent()).length).toBeGreaterThan(50);
});

test('victory reward handoff, spending heirlooms, and bonuses persist through reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,encodeCampaignSave,createCampaignSettlement}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {offerLoot,collectLoot}=await import('./src/inventory.js');
  const d=createDungeon(852,{interactiveEvents:true});
  d.phase='victory';d.supplies.food=0;d.supplies.torch=0;d.curioSupplies.holyWater=0;
  for(const [item,qty] of [['gold',200],['gem',2],['crest',2],['deed',1]]){
   offerLoot(d,item,qty);collectLoot(d);
  }
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(createCampaignSettlement(),d));
 });
 await page.reload();
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toBeVisible();
 await page.getByRole('button',{name:'Return rewards to settlement'}).click();
 await expect(page.locator('#settlement-panel')).toContainText('Treasury: 450 gold · 2 crests · 1 deeds');
 await expect(page.getByRole('button',{name:/Upgrade Market/})).toBeEnabled();
 await page.getByRole('button',{name:/Upgrade Market/}).click();
 await expect(page.locator('#settlement-panel')).toContainText('Market Lv 1/3');
 await page.reload();
 await expect(page.locator('#settlement-panel')).toContainText('Treasury: 350 gold · 1 crests · 1 deeds');
 await expect(page.locator('#settlement-panel')).toContainText('Market Lv 1/3');
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toHaveCount(0);
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-supplies')).toContainText('Food: 10');
 await page.reload();
 await expect(page.locator('#dungeon-supplies')).toContainText('Food: 10');
});

test('campaign save decoder rejects broken payload before state restoration',async ({page})=>{
 await page.goto('/dungeon.html');
 const outcome=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  let invalidVersion=false,invalidTreasury=false;
  try{decodeCampaignSave('{"version":2}')}catch{invalidVersion=true;}
  try{decodeCampaignSave('{"version":1,"settlement":{"gold":-3,"crests":0,"deeds":0,"trinkets":[]}}')}catch{invalidTreasury=true;}
  return {invalidVersion,invalidTreasury,key:CAMPAIGN_SAVE_KEY};
 });
 expect(outcome).toEqual({invalidVersion:true,invalidTreasury:true,key:'kingdom-of-clays-campaign-v1'});
});

test('combat reload preserves prepared turn and does not tick Bleed twice',async ({page})=>{
 await page.goto('/dungeon.html');
 const expected=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,encodeCampaignSave,createCampaignSettlement}=await import('./src/settlement.js');
  const {createDungeon,beginCorridor,advanceCorridor,dungeonBattle}=await import('./src/dungeon.js');
  const {prepareActorTurn}=await import('./src/engine.js');
  const d=createDungeon(855,{interactiveEvents:true});
  beginCorridor(d,'gallery');advanceCorridor(d);
  const b=dungeonBattle(d),hero=b.units.find(u=>u.id==='h1');
  b.queue=['h1','e1'];
  hero.dot=[{type:'bleed',value:2,turns:3}];
  prepareActorTurn(b,'h1',()=>.5);
  d.preparedActorId='h1';d.randomCalls=0;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(createCampaignSettlement(),d));
  return {hp:hero.hp,turns:hero.dot[0].turns};
 });
 await page.reload();
 const actual=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('./src/settlement.js');
  const state=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  const hero=state.expedition.pendingBattle.battle.units.find(u=>u.id==='h1');
  return {hp:hero.hp,turns:hero.dot[0].turns};
 });
 expect(actual).toEqual(expected);
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
});
