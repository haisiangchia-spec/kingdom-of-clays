import {test,expect} from '@playwright/test';

test('victory auto-returns roster and advances town week exactly once across reload',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {prepareRosterParty}=await import('./src/hero-roster.js');
  const s=createCampaignSettlement();
  const party=prepareRosterParty(s);
  party[0].hp=Math.max(1,party[0].hp-5);
  const d=createDungeon(1203,{party,region:'crypt',tier:'apprentice'});
  d.questId='crypt-recon';d.phase='victory';d.cleared=['sanctum'];
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
 });
 await page.reload();
 const read=()=>page.evaluate(async ()=>{
  const {decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {settlement,expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  const hero=settlement.roster.find(x=>x.rosterId==='r1');
  return {returned:expedition.rosterReturned,weekProcessed:expedition.townWeekProcessed,
   week:settlement.town.week,xp:hero.xp,level:hero.level,hp:hero.unit.hp};
 });
 const first=await read();
 expect(first.returned).toBe(true);
 expect(first.weekProcessed).toBe(true);
 expect(first.week).toBe(2);
 expect(first.xp).toBe(2);
 expect(first.hp).toBeGreaterThan(0);
 await page.reload();
 expect(await read()).toEqual(first);
 await expect(page.locator('#hero-roster')).toContainText('Town Week 2');
});
