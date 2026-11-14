import {test,expect} from '@playwright/test';

test('quirk and disease stats are applied to the live expedition, then saved without base-stat drift',async ({page})=>{
 await page.goto('/dungeon.html');
 const output=await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave,CAMPAIGN_SAVE_KEY}=await import('./src/settlement.js');
  const {createDungeon}=await import('./src/dungeon.js');
  const {prepareRosterParty,returnPartyToRoster}=await import('./src/hero-roster.js');
  const s=createCampaignSettlement(),h=s.roster[0];
  h.quirks.positive.push({id:'sturdy',locked:true},{id:'eagleEye',locked:false});
  h.quirks.negative.push({id:'nervous',locked:false});
  h.diseases.push('ashenFever');
  const p=prepareRosterParty(s),u=p[0];
  const deployed={hp:u.maxHp,spd:u.spd,acc:u.accMod,bleed:u.resist.bleed};
  const d=createDungeon(1229,{party:p});
  d.party[0].hp-=3;
  d.phase='victory';returnPartyToRoster(s,d);
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(s,d));
  const x=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {deployed,base:{hp:x.settlement.roster[0].unit.maxHp,spd:x.settlement.roster[0].unit.spd,
    acc:x.settlement.roster[0].unit.accMod,stress:x.settlement.roster[0].unit.stress},
   next:prepareRosterParty(x.settlement)[0].maxHp};
 });
 expect(output).toEqual({deployed:{hp:35,spd:1,acc:0,bleed:10},
  base:{hp:33,spd:3,acc:0,stress:0},next:35});
 await page.reload();
 await expect(page.locator('#hero-roster')).toContainText('1 diseases');
});

test('a real crypt encounter can infect roster heroes and persists infection through victory',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave}=await import('./src/settlement.js');
  const {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle}=await import('./src/dungeon.js');
  const {prepareRosterParty,returnPartyToRoster}=await import('./src/hero-roster.js');
  const {exposeHeroToDisease}=await import('./src/trait-effects.js');
  const s=createCampaignSettlement();
  const d=createDungeon(1230,{party:prepareRosterParty(s),interactiveEvents:true});
  beginCorridor(d,'gallery');advanceCorridor(d);
  const b=dungeonBattle(d),h=b.units.find(u=>u.id==='h1'),enemy=b.units.find(u=>u.enemyProfile==='cryptDefender');
  const first=exposeHeroToDisease(b,enemy,h,()=>0);
  const second=exposeHeroToDisease(b,enemy,h,()=>0);
  for(const foe of b.units.filter(u=>u.side==='enemy'))foe.dead=true;
  resolveDungeonBattle(d);d.phase='victory';returnPartyToRoster(s,d);
  const loaded=decodeCampaignSave(encodeCampaignSave(s,d));
  return {first,second,infected:loaded.settlement.roster[0].diseases,
    futureSpd:prepareRosterParty(loaded.settlement)[0].spd,baseSpd:loaded.settlement.roster[0].unit.spd};
 });
 expect(result).toEqual({first:true,second:false,infected:['creepingCough'],futureSpd:1,baseSpd:3});
});
