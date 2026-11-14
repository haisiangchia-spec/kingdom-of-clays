import {test,expect} from '@playwright/test';

test('Blighted Warrens can be selected after quest and selection survives reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const s=createCampaignSettlement();
  const d=createDungeon(763);d.phase='victory';d.rosterReturned=true;d.townWeekProcessed=true;d.rewardClaimed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 const region=page.locator('#dungeon-region');
 await expect(region).toBeEnabled();
 await region.selectOption('plague');
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('Blighted Warrens');
 await expect(region).toBeDisabled();
 await page.reload();
 await expect(region).toHaveValue('plague');
 await expect(page.locator('#dungeon-status')).toContainText('Blighted Warrens');
 await page.getByRole('button',{name:'Travel to Fungal Passage'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 const profiles=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const state=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {region:state.expedition.region,foes:state.expedition.pendingBattle.battle.units.filter(x=>x.side==='enemy').map(x=>x.enemyProfile)};
 });
 expect(profiles.region).toBe('plague');
 expect(profiles.foes.length).toBeGreaterThan(0);
 expect(profiles.foes.every(id=>['plagueChopper','plagueDrummer','plagueWretch','plagueSlasher'].includes(id))).toBe(true);
});

test('Drummer and Chopper abilities are legal and source stats survive browser combat setup',async ({page})=>{
 await page.goto('/dungeon.html');
 const actual=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,ABILITIES,availableTargets}=await import('./src/engine.js');
  const b=makeUndeadEncounter(74,'plagueRaidingParty');
  const drummer=b.units.find(u=>u.enemyProfile==='plagueDrummer');
  const chopper=b.units.find(u=>u.enemyProfile==='plagueChopper');
  return {drummerHp:drummer.hp,chopperHp:chopper.hp,
    doomTarget:availableTargets(b,drummer.id,'plague_drum_doom'),
    chainTarget:availableTargets(b,chopper.id,'plague_ball_chain'),
    doomStress:ABILITIES.plague_drum_doom.onHitStress,
    doomChance:ABILITIES.plague_drum_doom.onHitStressChance};
 });
 expect(actual.drummerHp).toBe(15);
 expect(actual.chopperHp).toBe(21);
 expect(actual.doomTarget).toHaveLength(1);
 expect(actual.chainTarget).toContain('h3');
 expect(actual.doomStress).toBe(5);
 expect(actual.doomChance).toBe(70);
});

test('regional exploration names and curio interactions survive browser save and reload',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon,interactCurio}=await import('./src/dungeon.js');
  const {regionRoomName,regionCurio,regionHazard}=await import('./src/dungeon-regions.js');
  const d=createDungeon(911,{region:'plague'});
  d.room='gallery';
  interactCurio(d,'purify');
  const restored=structuredClone(d);
  return {
   entrance:d.log[0],
   gallery:regionRoomName(restored.region,restored.room),
   curio:regionCurio(restored.region,restored.room).name,
   hazard:regionHazard(restored.region).name,
   used:restored.curiosUsed,
   water:restored.curioSupplies.holyWater,
   log:restored.log.at(-1)
  };
 });
 expect(result).toEqual({
  entrance:'Entered Warrens Entrance',
  gallery:'Fungal Passage',
  curio:'Spore-Covered Cache',
  hazard:'Spore Snare',
  used:['gallery'],
  water:0,
  log:'Spore-Covered Cache yields treasure'
 });
});

test('Hookstalker is encounter-reachable and its retreating strike has legal targets',async ({page})=>{
 await page.goto('/dungeon.html');
 const data=await page.evaluate(async ()=>{
  const {makeGeneratedEncounter,availableTargets,ABILITIES}=await import('./src/engine.js');
  const {ENEMY_PROFILES}=await import('./src/enemy-roster.js');
  let battle=null,foe=null;
  for(let seed=1;seed<=300;seed++){
   const candidate=makeGeneratedEncounter(seed*1000003,'patrol','plague');
   const found=candidate.units.find(u=>u.enemyProfile==='plagueSlasher');
   if(found){battle=candidate;foe=found;break;}
  }
  if(!foe)return null;
  return {
   name:foe.name,hp:foe.hp,prot:foe.prot,
   skills:foe.enemySkills,
   legal:availableTargets(battle,foe.id,'plague_hook_slash'),
   retreat:ABILITIES.plague_hook_slash.selfBack,
   from:ABILITIES.plague_hook_slash.from,
   template:ENEMY_PROFILES.plagueSlasher.name
  };
 });
 expect(data).not.toBeNull();
 expect(data.name).toBe('Blight Hookstalker');
 expect(data.hp).toBe(8);
 expect(data.prot).toBe(25);
 expect(data.skills).toContain('plague_hook_slash');
 expect(data.legal.length).toBeGreaterThan(0);
 expect(data.retreat).toBe(1);
 expect(data.from).toEqual([0,1,2,3]);
});

test('Champion Warrens expedition selection persists and generates Champion combat',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const s=createCampaignSettlement();
  const d=createDungeon(763);d.phase='victory';d.rosterReturned=true;d.townWeekProcessed=true;d.rewardClaimed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 await page.locator('#dungeon-region').selectOption('plague');
 await page.locator('#dungeon-tier').selectOption('champion');
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-tier')).toBeDisabled();
 await expect(page.locator('#dungeon-tier')).toHaveValue('champion');
 await page.reload();
 await expect(page.locator('#dungeon-tier')).toHaveValue('champion');
 await page.getByRole('button',{name:'Travel to Fungal Passage'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 const saved=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {tier:expedition.tier,battleTier:expedition.pendingBattle?.battle?.encounterPlan?.tier,
   foes:expedition.pendingBattle?.battle?.units.filter(u=>u.side==='enemy').map(u=>u.enemyProfile)};
 });
 expect(saved.tier).toBe('champion');
 expect(saved.battleTier).toBe('champion');
 expect(saved.foes).toContain('plagueSkiver');
});

test('Unsupported Champion Crypt selection preserves completed expedition',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const settlement=createCampaignSettlement();
  const dungeon=createDungeon(763);
  dungeon.phase='victory';dungeon.rosterReturned=true;dungeon.townWeekProcessed=true;dungeon.rewardClaimed=true;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(settlement,dungeon));
 });
 await page.reload();
 await page.locator('#dungeon-region').selectOption('crypt');
 await page.locator('#dungeon-tier').selectOption('champion');
 await page.getByRole('button',{name:'New expedition'}).click();
 await expect(page.locator('#dungeon-log')).toContainText('Champion expeditions are currently available only in Blighted Warrens');
 const persisted=await page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {phase:expedition.phase,region:expedition.region,tier:expedition.tier,seed:expedition.seed};
 });
 expect(persisted).toEqual({phase:'victory',region:'crypt',tier:'apprentice',seed:763});
});
