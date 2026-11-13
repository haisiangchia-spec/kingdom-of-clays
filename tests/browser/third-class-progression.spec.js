import {test,expect} from '@playwright/test';

test('Slayer Berserker Dark Knight level-five laboratory exposes 21 upgrades',async ({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Slayer / Berserker / Dark Knight Lv5'}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 const result=await page.evaluate(async()=>{
  const {makeThirdProgressionBattle,getActorSkill}=await import('./src/engine.js');
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  const b=makeThirdProgressionBattle(),heroes=b.units.filter(x=>x.side==='hero');
  return {
   upgraded:heroes.reduce((total,x)=>total+Object.keys(x.skillLevels).length,0),
   totalVerified:SKILL_CATALOG.filter(x=>x.verifiedLevels.length===5).length,
   warrior:Object.keys(heroes.find(x=>x.id==='h2').skillLevels).length,
   hunterHuman:getActorSkill(heroes.find(x=>x.id==='h3'),'hunters_execution').vsTypes.human,
   hellionBleed:getActorSkill(heroes.find(x=>x.id==='h1'),'bloodletting_blow').status.value,
   highwayRiposte:getActorSkill(heroes.find(x=>x.id==='h4'),'shadowstep_counter').riposteCrit
  };
 });
 expect(result).toEqual({upgraded:21,totalVerified:105,warrior:0,hunterHuman:.35,hellionBleed:5,highwayRiposte:5});
 expect(errors).toEqual([]);
});
test('level-five Berserker Adrenaline Rush heals and provides attack buff',async ({page})=>{
 await page.goto('/');
 const value=await page.evaluate(async()=>{
  const {makeThirdProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeThirdProgressionBattle(),hero=b.units.find(x=>x.id==='h1');
  hero.hp=10;b.queue=['h1'];
  takeTurn(b,'h1','battle_frenzy','h1',()=>.3);
  return {hp:hero.hp,acc:effectModifier(hero,'accuracy'),damage:effectModifier(hero,'damage')};
 });
 expect(value).toEqual({hp:14,acc:10,damage:30});
});
test('level-five Dark Knight gains upgraded riposte and Tracking Shot buffs',async ({page})=>{
 await page.goto('/');
 const value=await page.evaluate(async()=>{
  const {makeThirdProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeThirdProgressionBattle(),hero=b.units.find(x=>x.id==='h4');
  b.queue=['h4'];takeTurn(b,'h4','focused_assault','e2',()=>.3);
  const buffs={accuracy:effectModifier(hero,'accuracy'),crit:effectModifier(hero,'crit'),damage:effectModifier(hero,'damage')};
  hero.acted=false;b.queue=['h4'];takeTurn(b,'h4','shadowstep_counter','e1',()=>.3);
  return {buffs,riposteCrit:hero.riposteCrit,riposteMod:hero.riposteMod};
 });
 expect(value.buffs).toEqual({accuracy:10,crit:8,damage:20});
 expect(value.riposteCrit).toBe(5);
 expect(value.riposteMod).toBeCloseTo(-.15);
});
test('level-five Monster Slayer Mark for Death reduces target PROT and buffs speed',async ({page})=>{
 await page.goto('/');
 const value=await page.evaluate(async()=>{
  const {makeThirdProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeThirdProgressionBattle(),hero=b.units.find(x=>x.id==='h3'),foe=b.units.find(x=>x.id==='e1');
  b.queue=['h3'];takeTurn(b,'h3','identify_weakness','e1',()=>.2);
  return {mark:foe.marked,prot:effectModifier(foe,'prot'),speed:effectModifier(hero,'speed')};
 });
 expect(value).toEqual({mark:3,prot:-20,speed:5});
});
