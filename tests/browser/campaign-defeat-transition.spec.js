import {test,expect} from '@playwright/test';

test('defeat returns surviving heroes without victory XP or rewards, once across reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {prepareRosterParty}=await import('./src/hero-roster.js');
  const s=createCampaignSettlement();
  const party=prepareRosterParty(s);
  party[0].hp=Math.max(1,party[0].hp-7);
  party[0].stress=45;
  const d=createDungeon(1304,{party,region:'crypt',tier:'apprentice'});
  d.questId='crypt-recon';d.phase='defeat';
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 const read=()=>page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  const hero=settlement.roster.find(x=>x.rosterId==='r1');
  return {returned:expedition.rosterReturned,weekProcessed:expedition.townWeekProcessed,
   week:settlement.town.week,xp:hero.xp,hp:hero.unit.hp,stress:hero.unit.stress,
   completed:settlement.completedExpeditions,claimed:!!expedition.rewardClaimed};
 });
 const first=await read();
 expect(first.returned).toBe(true);
 expect(first.weekProcessed).toBe(true);
 expect(first.week).toBe(2);
 expect(first.xp).toBe(0);
 expect(first.hp).toBeGreaterThan(0);
 expect(first.completed).toBe(0);
 expect(first.claimed).toBe(false);
 await expect(page.getByRole('button',{name:'Return rewards to settlement'})).toHaveCount(0);
 await page.reload();
 expect(await read()).toEqual(first);
});
