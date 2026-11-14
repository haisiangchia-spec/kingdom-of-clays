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
 expect(profiles.foes).toContain('plagueChopper');
 expect(profiles.foes).toContain('plagueDrummer');
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
