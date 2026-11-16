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
 for(let turn=0;turn<8&&!attacked;turn++){
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
 if(!attacked)await page.getByRole('button',{name:'Pass turn'}).click();
 }
 expect(attacked).toBe(true);
 const after=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return expedition.pendingBattle?.battle?.log.length??0;
 });
 expect(after).toBeGreaterThan(before.log);
});

test('browser completes a multi-room expedition and claims its victory rewards',async ({page})=>{
 await page.goto('/dungeon.html');
 // Travel and event decisions use the real UI. Combat is resolved deterministically
 // through the engine so this test isolates the campaign traversal and reward wiring.
 for(const destination of ['Ashen Gallery','Guard Post','Forgotten Sanctum']){
  await page.getByRole('button',{name:'Travel to '+destination}).click();
  let arrived=false;
  for(let step=0;step<35;step++){
   const status=await page.locator('#dungeon-status').innerText();
   if(status.includes('VICTORY')){arrived=true;break;}
   const state=await page.evaluate(async ()=>{
    const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
    const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    return {room:expedition.room,phase:expedition.phase,pendingTravel:!!expedition.pendingTravel,pendingLoot:!!expedition.pendingLoot,pendingHunger:!!expedition.pendingHunger};
   });
   if(!state.pendingTravel&&state.phase==='explore'&&!state.pendingLoot&&!state.pendingHunger){arrived=true;break;}
   if(state.phase==='combat'){
    await page.evaluate(async ()=>{
     const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {resolveDungeonBattle}=await import('/src/dungeon.js');
     const save=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     for(const enemy of save.expedition.pendingBattle.battle.units.filter(u=>u.side==='enemy'))enemy.dead=true;
     resolveDungeonBattle(save.expedition);
     localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(save.settlement,save.expedition));
    });
    await page.reload();
   }else if(await page.getByRole('button',{name:'Collect treasure'}).count()){
    await page.getByRole('button',{name:'Collect treasure'}).click();
   }else if(await page.getByRole('button',{name:'Eat four food'}).count()){
    await page.getByRole('button',{name:'Eat four food'}).click();
   }else if(await page.getByRole('button',{name:'Advance corridor'}).count()){
    await page.getByRole('button',{name:'Advance corridor'}).click();
   }else throw Error('Dungeon traversal stalled: '+status);
  }
  expect(arrived).toBe(true);
  const room=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   return decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition.room;
  });
  expect(room).toBe(({ 'Ashen Gallery':'gallery','Guard Post':'watch','Forgotten Sanctum':'sanctum' })[destination]);
 }
 await expect(page.locator('#dungeon-status')).toContainText('VICTORY');
 while(await page.getByRole('button',{name:'Collect treasure'}).count()){
  await page.getByRole('button',{name:'Collect treasure'}).click();
 }
 await page.getByRole('button',{name:'Return rewards to settlement'}).click();
 const claimed=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {gold:settlement.gold,crests:settlement.crests,deeds:settlement.deeds,completed:settlement.completedExpeditions,claimed:expedition.rewardClaimed};
 });
 expect(claimed.claimed).toBe(true);
 expect(claimed.completed).toBe(1);
 await page.reload();
 const reloaded=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {gold:settlement.gold,crests:settlement.crests,deeds:settlement.deeds,completed:settlement.completedExpeditions,claimed:expedition.rewardClaimed};
 });
 expect(reloaded).toEqual(claimed);
 await expect(page.locator('#settlement-panel')).toContainText('1 completed');
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
});

test('browser resolves an entire corridor battle using only player combat controls',async ({page})=>{
 test.setTimeout(90000);
 await page.goto('/dungeon.html');
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 let turns=0;
 while(turns++<120){
  const phase=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   return decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition.phase;
  });
  if(phase!=='combat')break;
  const enemyNames=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return expedition.pendingBattle.battle.units.filter(u=>u.side==='enemy'&&!u.dead&&!u.corpse).map(u=>u.name);
  });
  let acted=false;
  for(const skill of await page.locator('#dungeon-combat button[aria-pressed]').all()){
   await skill.click();
   for(const enemy of enemyNames){
    const target=page.locator('#dungeon-combat button').filter({hasText:enemy});
    if(await target.count()){
     await target.first().click();
     acted=true;break;
    }
   }
   if(acted)break;
  }
  if(!acted)await page.getByRole('button',{name:'Pass turn'}).click();
 }
 expect(turns).toBeLessThan(121);
 const result=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {phase:expedition.phase,cleared:expedition.corridors['entrance-gallery']?.encounterCleared??false};
 });
 expect(['explore','defeat','victory']).toContain(result.phase);
 if(result.phase==='explore')expect(result.cleared).toBe(true);
});

test('browser travels onward after resolving its first corridor fight through combat controls',async ({page})=>{
 test.setTimeout(90000);
 // Keep the campaign reproducible: production still uses a random seed.
 await page.addInitScript(()=>{Math.random=()=>321/0xffffffff;});
 await page.goto('/dungeon.html');
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 let turns=0;
 while(turns++<120){
  const phase=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   return decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition.phase;
  });
  if(phase!=='combat')break;
  const enemies=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return expedition.pendingBattle.battle.units.filter(u=>u.side==='enemy'&&!u.dead&&!u.corpse).map(u=>u.name);
  });
  let acted=false;
  for(const skill of await page.locator('#dungeon-combat button[aria-pressed]').all()){
   await skill.click();
   for(const enemy of enemies){
    const target=page.locator('#dungeon-combat button').filter({hasText:enemy});
    if(await target.count()){await target.first().click();acted=true;break;}
   }
   if(acted)break;
  }
  if(!acted)await page.getByRole('button',{name:'Pass turn'}).click();
 }
 expect(turns).toBeLessThan(121);
 const phase=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  return decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition.phase;
 });
 expect(phase).toBe('explore');
 for(let i=0;i<15;i++){
  const room=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return expedition.room;
  });
  if(room==='gallery')break;
  if(await page.getByRole('button',{name:'Eat four food'}).count())
   await page.getByRole('button',{name:'Eat four food'}).click();
  else if(await page.getByRole('button',{name:'Collect treasure'}).count())
   await page.getByRole('button',{name:'Collect treasure'}).click();
  else await page.getByRole('button',{name:'Advance corridor'}).click();
 }
 const reached=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {room:expedition.room,cleared:expedition.corridors['entrance-gallery'].encounterCleared};
 });
 expect(reached).toEqual({room:'gallery',cleared:true});
 await expect(page.getByRole('button',{name:'Travel to Guard Post'})).toBeVisible();
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('Ashen Gallery');
 await expect(page.getByRole('button',{name:'Travel to Guard Post'})).toBeVisible();
 await page.getByRole('button',{name:'Travel to Guard Post'}).click();
 const inTransit=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {room:expedition.room,travel:!!expedition.pendingTravel,phase:expedition.phase};
 });
 expect(inTransit.room).toBe('gallery');
 expect(inTransit.travel).toBe(true);
 await page.reload();
 const resumed=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {room:expedition.room,travel:!!expedition.pendingTravel,phase:expedition.phase};
 });
 expect(resumed).toEqual(inTransit);
 await expect(page.getByRole('button',{name:'Advance corridor'})).toBeVisible();
 let encountered=false,arrived=false;
 for(let step=0;step<25;step++){
  const state=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return {room:expedition.room,phase:expedition.phase,travel:!!expedition.pendingTravel};
  });
  if(state.phase==='combat'){encountered=true;break;}
  if(state.room==='watch'){arrived=true;break;}
  if(await page.getByRole('button',{name:'Eat four food'}).count())
   await page.getByRole('button',{name:'Eat four food'}).click();
  else if(await page.getByRole('button',{name:'Collect treasure'}).count())
   await page.getByRole('button',{name:'Collect treasure'}).click();
  else if(await page.getByRole('button',{name:'Advance corridor'}).count())
   await page.getByRole('button',{name:'Advance corridor'}).click();
  else throw Error('No available corridor action on approach to Guard Post');
 }
 expect(encountered||arrived).toBe(true);
 await page.reload();
 const persisted=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {room:expedition.room,phase:expedition.phase,travel:!!expedition.pendingTravel};
 });
 expect(persisted.phase==='combat'||persisted.room==='watch').toBe(true);
 if(persisted.phase==='combat'){
  let turns=0;
  while(turns++<120){
   const state=await page.evaluate(async ()=>{
    const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
    const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    return {phase:expedition.phase,enemies:expedition.pendingBattle?.battle.units.filter(u=>u.side==='enemy'&&!u.dead&&!u.corpse).map(u=>u.name)??[]};
   });
   if(state.phase!=='combat')break;
   let acted=false;
   for(const skill of await page.locator('#dungeon-combat button[aria-pressed]').all()){
    await skill.click();
    for(const enemy of state.enemies){
     const target=page.locator('#dungeon-combat button').filter({hasText:enemy});
     if(await target.count()){await target.first().click();acted=true;break;}
    }
    if(acted)break;
   }
   if(!acted)await page.getByRole('button',{name:'Pass turn'}).click();
  }
  expect(turns).toBeLessThan(121);
  const resolved=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return {phase:expedition.phase,room:expedition.room};
  });
  expect(['explore','defeat','victory']).toContain(resolved.phase);
  await page.reload();
  const resumedPhase=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   return decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition.phase;
  });
  expect(resumedPhase).toBe(resolved.phase);
 }
 await page.reload();
 const finalState=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {phase:expedition.phase,room:expedition.room};
 });
 expect(['explore','defeat','victory']).toContain(finalState.phase);
 if(finalState.phase==='explore'){
  for(let step=0;step<25;step++){
   const state=await page.evaluate(async ()=>{
    const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
    const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    return {phase:expedition.phase,room:expedition.room};
   });
   if(state.room==='watch'||state.phase!=='explore')break;
   const collect=page.getByRole('button',{name:'Collect treasure'});
   const hunger=page.getByRole('button',{name:'Eat four food'});
   const advance=page.getByRole('button',{name:'Advance corridor'});
   if(await collect.count())await collect.click();
   else if(await hunger.count())await hunger.click();
   else if(await advance.count())await advance.click();
   else throw Error('No valid action while approaching Guard Post');
  }
  const reached=await page.evaluate(async ()=>{
   const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
   const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   return {room:expedition.room,phase:expedition.phase};
  });
  if(reached.room==='watch'&&reached.phase==='explore'){
   for(let pending=0;pending<12;pending++){
    const loot=page.getByRole('button',{name:'Collect treasure'});
    const hunger=page.getByRole('button',{name:'Eat four food'});
    if(await loot.count())await loot.click();
    else if(await hunger.count())await hunger.click();
    else break;
   }
   await expect(page.getByRole('button',{name:'Travel to Forgotten Sanctum'})).toBeVisible();
   await page.getByRole('button',{name:'Travel to Forgotten Sanctum'}).click();
   await page.reload();
   const onward=await page.evaluate(async ()=>{
    const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
    const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    return {room:expedition.room,travel:!!expedition.pendingTravel};
   });
   expect(onward).toEqual({room:'watch',travel:true});
   let nextEncounter=false,objectiveReached=false;
   for(let step=0;step<25;step++){
    const progress=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {phase:expedition.phase,room:expedition.room};
    });
    if(progress.phase==='combat'){nextEncounter=true;break;}
    if(progress.room==='sanctum'){objectiveReached=true;break;}
    const collect=page.getByRole('button',{name:'Collect treasure'});
    const hunger=page.getByRole('button',{name:'Eat four food'});
    const advance=page.getByRole('button',{name:'Advance corridor'});
    if(await collect.count())await collect.click();
    else if(await hunger.count())await hunger.click();
    else if(await advance.count())await advance.click();
    else throw Error('No available action toward Forgotten Sanctum');
   }
   expect(nextEncounter||objectiveReached).toBe(true);
   await page.reload();
   const saved=await page.evaluate(async ()=>{
    const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
    const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    return {phase:expedition.phase,room:expedition.room};
   });
   expect(saved.phase==='combat'||saved.room==='sanctum').toBe(true);
   if(saved.phase==='combat'){
    let turns=0;
    while(turns++<120){
     const battle=await page.evaluate(async ()=>{
      const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
      const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
      return {phase:expedition.phase,enemies:expedition.pendingBattle?.battle.units.filter(u=>u.side==='enemy'&&!u.dead&&!u.corpse).map(u=>u.name)??[]};
     });
     if(battle.phase!=='combat')break;
     let acted=false;
     for(const skill of await page.locator('#dungeon-combat button[aria-pressed]').all()){
      await skill.click();
      for(const enemy of battle.enemies){
       const target=page.locator('#dungeon-combat button').filter({hasText:enemy});
       if(await target.count()){await target.first().click();acted=true;break;}
      }
      if(acted)break;
     }
     if(!acted)await page.getByRole('button',{name:'Pass turn'}).click();
    }
    expect(turns).toBeLessThan(121);
    const afterBattle=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return expedition.phase;
    });
    expect(['explore','victory','defeat']).toContain(afterBattle);
    await page.reload();
    const restoredPhase=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     return decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition.phase;
    });
    expect(restoredPhase).toBe(afterBattle);
   }
   const finalApproach=await page.evaluate(async ()=>{
    const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
    const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    return {phase:expedition.phase,room:expedition.room};
   });
   if(finalApproach.phase==='explore'&&finalApproach.room!=='sanctum'){
    for(let step=0;step<20;step++){
     const state=await page.evaluate(async ()=>{
      const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
      const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
      return {phase:expedition.phase,room:expedition.room};
     });
     if(state.phase!=='explore'||state.room==='sanctum')break;
     const collect=page.getByRole('button',{name:'Collect treasure'});
     const hunger=page.getByRole('button',{name:'Eat four food'});
     const advance=page.getByRole('button',{name:'Advance corridor'});
     if(await collect.count())await collect.click();
     else if(await hunger.count())await hunger.click();
     else if(await advance.count())await advance.click();
     else throw Error('Objective corridor has no available continuation action');
    }
    const destination=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {phase:expedition.phase,room:expedition.room};
    });
    expect(destination.room==='sanctum'||destination.phase==='combat'||destination.phase==='victory').toBe(true);
   }
   const completion=await page.evaluate(async ()=>{
    const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
    const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
    return {phase:expedition.phase,room:expedition.room};
   });
   if(completion.room==='sanctum'){
    expect(['victory','combat','explore']).toContain(completion.phase);
    const state=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {cleared:expedition.cleared,questId:expedition.questId,phase:expedition.phase};
    });
    expect(state.questId).toBe('crypt-recon');
    if(state.phase==='victory')expect(state.cleared).toContain('sanctum');
   }
   expect(completion.phase,'expedition must win through browser combat and exploration').toBe('victory');
   {
    for(let pending=0;pending<15;pending++){
     const collect=page.getByRole('button',{name:'Collect treasure'});
     if(!await collect.count())break;
     await collect.click();
    }
    await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toBeVisible();
    await page.getByRole('button',{name:'Return rewards to settlement'}).click();
    const rewards=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {completed:settlement.completedExpeditions,claimed:expedition.rewardClaimed,gold:settlement.gold};
    });
    expect(rewards.completed).toBe(1);
    expect(rewards.claimed).toBe(true);
    await page.reload();
    const savedRewards=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {completed:settlement.completedExpeditions,claimed:expedition.rewardClaimed,gold:settlement.gold};
    });
    expect(savedRewards).toEqual(rewards);
    const town=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {returned:expedition.rosterReturned,weekProcessed:expedition.townWeekProcessed,week:settlement.town.week};
    });
    expect(town).toMatchObject({returned:true,weekProcessed:true,week:2});
    await expect(page.getByRole('button',{name:'New expedition'})).toBeVisible();
    await page.getByRole('button',{name:'New expedition'}).click();
    await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
    const next=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {completed:settlement.completedExpeditions,phase:expedition.phase,claimed:expedition.rewardClaimed,party:expedition.party.length,
      room:expedition.room,cleared:expedition.cleared,visited:expedition.visited,
      rosterReturned:expedition.rosterReturned,townWeekProcessed:expedition.townWeekProcessed};
    });
    expect(next).toMatchObject({completed:1,phase:'explore',party:4,room:'entrance',cleared:[]});
    expect(next.claimed).not.toBe(true);
    expect(next.visited).toContain('entrance');
    expect(next.visited).not.toContain('sanctum');
    expect(next.rosterReturned).not.toBe(true);
    expect(next.townWeekProcessed).not.toBe(true);
    await page.reload();
    await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
    const persisted=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {completed:settlement.completedExpeditions,room:expedition.room,cleared:expedition.cleared,visited:expedition.visited};
    });
    expect(persisted).toMatchObject({completed:1,room:'entrance',cleared:[]});
    expect(persisted.visited).not.toContain('sanctum');
    await expect(page.getByRole('button',{name:'Travel to Ashen Gallery'})).toBeVisible();
    await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
    await expect(page.getByRole('button',{name:'Advance corridor'})).toBeVisible();
    await page.getByRole('button',{name:'Advance corridor'}).click();
    const secondRun=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {completed:settlement.completedExpeditions,phase:expedition.phase,room:expedition.room,
      travel:!!expedition.pendingTravel,combat:!!expedition.pendingBattle};
    });
    expect(secondRun.completed).toBe(1);
    expect(secondRun.room).toBe('entrance');
    expect(secondRun.travel||secondRun.combat).toBe(true);
    await page.reload();
    const secondRestored=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {completed:settlement.completedExpeditions,phase:expedition.phase,room:expedition.room,
      travel:!!expedition.pendingTravel,combat:!!expedition.pendingBattle};
    });
    expect(secondRestored).toEqual(secondRun);
    const milestone=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {campaignMilestoneProgress,expeditionUnlock}=await import('/src/campaign-progression.js');
     const {availableQuests}=await import('/src/quest-board.js');
     const {settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return {goals:campaignMilestoneProgress(settlement).map(g=>({id:g.id,complete:g.complete,current:g.current})),
      veteran:expeditionUnlock(settlement,'plague','veteran').unlocked,
      champion:expeditionUnlock(settlement,'plague','champion').unlocked,
      apprentice:availableQuests(settlement).filter(q=>q.tier==='apprentice'&&q.unlocked).length};
    });
    expect(milestone.goals.length).toBe(4);
    expect(milestone.goals[0].complete).toBe(true);
    expect(milestone.goals[0].current).toBeGreaterThanOrEqual(1);
    expect(milestone.veteran).toBe(false);
    expect(milestone.champion).toBe(false);
    expect(milestone.apprentice).toBeGreaterThan(0);
    await expect(page.locator('#settlement-panel')).toContainText('Campaign Objectives');
    await expect(page.locator('#settlement-panel')).toContainText('1/1');
    const lockedQuest=await page.evaluate(async ()=>{
     const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
     const {availableQuests}=await import('/src/quest-board.js');
     const {settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
     return availableQuests(settlement).filter(q=>q.tier!=='apprentice').map(q=>({tier:q.tier,unlocked:q.unlocked}));
    });
    expect(lockedQuest.some(q=>q.tier==='veteran')).toBe(true);
    expect(lockedQuest.some(q=>q.tier==='champion')).toBe(true);
    expect(lockedQuest.every(q=>!q.unlocked)).toBe(true);
   }
  }
 }
});

test('browser quest board unlocks Veteran after three victories and Champion after Veteran victory',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const save=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  save.settlement.completedExpeditions=3;
  save.settlement.campaignVictories=[];
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(save.settlement,save.expedition));
 });
 await page.reload();
 await expect(page.locator('#settlement-panel')).toContainText('Established Company');
 await expect(page.locator('#settlement-panel')).toContainText('3/3');
 const veteran=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expeditionUnlock}=await import('/src/campaign-progression.js');
  const {availableQuests}=await import('/src/quest-board.js');
  const {settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {veteran:expeditionUnlock(settlement,'plague','veteran').unlocked,
   champion:expeditionUnlock(settlement,'plague','champion').unlocked,
   quest:availableQuests(settlement).find(q=>q.id==='warrens-veteran')?.unlocked};
 });
 expect(veteran).toEqual({veteran:true,champion:false,quest:true});
 await page.evaluate(async ()=>{
  const {decodeCampaignSave,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const save=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  save.settlement.campaignVictories.push('veteran-victory');
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(save.settlement,save.expedition));
 });
 await page.reload();
 const champion=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {expeditionUnlock}=await import('/src/campaign-progression.js');
  const {availableQuests}=await import('/src/quest-board.js');
  const {settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {champion:expeditionUnlock(settlement,'plague','champion').unlocked,
   quest:availableQuests(settlement).find(q=>q.id==='warrens-champion')?.unlocked};
 });
 expect(champion).toEqual({champion:true,quest:true});
 await expect(page.locator('#settlement-panel')).toContainText('Veteran Trial');
 await expect(page.locator('#settlement-panel')).toContainText('1/1');
 await page.reload();
 const persistedUnlocks=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('/src/settlement.js');
  const {campaignProgress,expeditionUnlock}=await import('/src/campaign-progression.js');
  const {settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {completed:settlement.completedExpeditions,
   finished:campaignProgress(settlement).finished,
   milestones:campaignProgress(settlement).milestones.map(x=>({id:x.id,complete:x.complete})),
   veteran:expeditionUnlock(settlement,'plague','veteran').unlocked,
   champion:expeditionUnlock(settlement,'plague','champion').unlocked};
 });
 expect(persistedUnlocks.completed).toBe(3);
 expect(persistedUnlocks.veteran).toBe(true);
 expect(persistedUnlocks.champion).toBe(true);
 expect(persistedUnlocks.finished).toBe(false);
 expect(persistedUnlocks.milestones.find(x=>x.id==='champion-victory').complete).toBe(false);
});
