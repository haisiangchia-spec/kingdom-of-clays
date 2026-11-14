import {test,expect} from '@playwright/test';

test('Vault room loads source-backed Blight Wretch and skill-matched disease exposure',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createCampaignSettlement}=await import('./src/settlement.js');
  const {prepareRosterParty,returnPartyToRoster}=await import('./src/hero-roster.js');
  const {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle}=await import('./src/dungeon.js');
  const {exposeHeroToDisease}=await import('./src/trait-effects.js');
  const s=createCampaignSettlement();
  const d=createDungeon(31415,{party:prepareRosterParty(s)});
  d.room='gallery';d.visited.push('gallery');
  beginCorridor(d,'vault');
  d.corridors['gallery-vault']={traversals:0,encounterCleared:true};
  advanceCorridor(d);advanceCorridor(d);
  const b=dungeonBattle(d),w=b.units.find(x=>x.enemyProfile==='plagueWretch'),h=b.units.find(x=>x.id==='h1');
  const infected=exposeHeroToDisease(b,w,h,()=>0,'plague_vomit');
  for(const u of b.units.filter(x=>x.side==='enemy'))u.dead=true;
  resolveDungeonBattle(d);d.phase='victory';returnPartyToRoster(s,d);
  return {name:w?.name,infected,stored:s.roster[0].diseases,
    matchedSkill:exposeHeroToDisease(b,w,h,()=>0,'crypt_quarrel')};
 });
 expect(result).toEqual({name:'Blight Wretch',infected:true,stored:['creepingCough'],matchedSkill:false});
});

test('source-backed torch quirks and Sanitarium upgrades work in Chromium',async ({page})=>{
 await page.goto('/dungeon.html');
 const out=await page.evaluate(async ()=>{
  const {createCampaignSettlement}=await import('./src/settlement.js');
  const {prepareRosterParty}=await import('./src/hero-roster.js');
  const {conditionalQuirkSpeed}=await import('./src/trait-effects.js');
  const {upgradeSanitarium,sanitariumWardCapacity}=await import('./src/sanitarium-upgrades.js');
  const s=createCampaignSettlement();
  s.roster[0].quirks.positive.push({id:'earlyRiser',locked:false});
  s.roster[1].quirks.negative.push({id:'nocturnal',locked:false});
  const party=prepareRosterParty(s);
  const bright=party.map(u=>conditionalQuirkSpeed(u,76));
  const unlit=party.map(u=>conditionalQuirkSpeed(u,75));
  s.town.week=4;s.busts=40;s.crests=20;
  const bought=upgradeSanitarium(s,'patientCells');
  return {bright,unlit,bought,medical:sanitariumWardCapacity(s,'medicalWard')};
 });
 expect(out).toEqual({bright:[2,-2,0,0],unlit:[0,0,0,0],
  bought:{id:'patientCells',level:1,cost:{busts:10,crests:6}},medical:2});
});
