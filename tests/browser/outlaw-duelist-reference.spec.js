import {test,expect} from '@playwright/test';

test('Outlaw Patrol button loads source-anchored DD1 Veteran Cutthroat reference',async ({page})=>{
 await page.goto('/');
 await page.locator('#outlaw-patrol-demo').click();
 await expect(page.locator('#enemy .unit').filter({hasText:'Outlaw Duelist'})).toHaveCount(1);
 await expect(page.locator('#enemy .unit')).toHaveCount(4);
});

test('duelist chooses exact turn-weighted skill and forced rear fallback in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,ABILITIES,availableTargets,rank}=await import('./src/engine.js');
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const {moveWithinFormation}=await import('./src/formation.js');
  const b=makeUndeadEncounter(91,'outlawPatrol'),d=b.units.find(u=>u.enemyProfile==='duelist');
  const choose=roll=>chooseEnemyAction(b,d.id,d.enemySkills,()=>roll,ABILITIES,availableTargets).key;
  const first=[choose(.69),choose(.75),choose(.85)];
  d.actionsTaken=1;
  const second=[choose(.20),choose(.29),choose(.35)];
  d.actionsTaken=2;
  const later=[choose(.39),choose(.50),choose(.75)];
  moveWithinFormation(b,d.id,3);
  return {first,second,later,rearRank:rank(b,d.id),rearSkill:choose(.99)};
 });
 expect(result).toEqual({
  first:['duelist_sweep','duelist_uppercut','duelist_shank'],
  second:['duelist_sweep','duelist_uppercut','duelist_shank'],
  later:['duelist_sweep','duelist_uppercut','duelist_shank'],
  rearRank:3,rearSkill:'duelist_poke'
 });
});

test('Veteran Shank target bonuses add up and never guarantee a marked target',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,ABILITIES,availableTargets}=await import('./src/engine.js');
  const {chooseEnemyAction,additiveTargetWeight,ENEMY_TACTICS}=await import('./src/enemy-ai.js');
  const b=makeUndeadEncounter(91,'outlawPatrol'),d=b.units.find(u=>u.enemyProfile==='duelist');
  const ids=availableTargets(b,d.id,'duelist_shank');
  const heroes=ids.map(id=>b.units.find(u=>u.id===id));
  heroes.forEach(h=>{h.resist.bleed=40;h.marked=0;});
  heroes[0].resist.bleed=10;heroes[1].marked=3;
  const desires=ENEMY_TACTICS[d.name].additiveTargetDesires;
  const weights=heroes.map(h=>additiveTargetWeight(b,h,'duelist_shank',ids,desires));
  const choose=(draw)=>{const rs=[.95,draw];let i=0;return chooseEnemyAction(b,d.id,d.enemySkills,()=>rs[i++],ABILITIES,availableTargets);};
  return {weights,early:choose(.02).targetId,marked:choose(.5).targetId};
 });
 expect(result).toEqual({weights:[2,4,1,1],early:'h1',marked:'h2'});
});
