import {test,expect} from '@playwright/test';
test('final level-five laboratory includes Hex Mage Treasure Hunter Spiritbound and 105 upgrades',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Spiritbound / Hex Mage / Treasure Hunter Lv5',exact:true}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 const result=await page.evaluate(async()=>{
  const {makeFinalProgressionBattle,getActorSkill}=await import('./src/engine.js');
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  const b=makeFinalProgressionBattle(),heroes=b.units.filter(u=>u.side==='hero');
  return {upgraded:heroes.reduce((sum,u)=>sum+Object.keys(u.skillLevels).length,0),
    coverage:SKILL_CATALOG.filter(s=>s.verifiedLevels.length===5).length,
    spirit:getActorSkill(heroes[0],'spirit_awakening').beastTransform.heal,
    treasure:getActorSkill(heroes[1],'alchemical_fumes').status.value,
    occult:getActorSkill(heroes[2],'forbidden_restoration').max,
    warrior:Object.keys(heroes[3].skillLevels).length};
 });
 expect(result).toEqual({upgraded:21,coverage:105,spirit:10,treasure:4,occult:22,warrior:0});
 expect(errors).toEqual([]);
});
test('max-level Spiritbound transforms into beast with improved combat bonuses',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeFinalProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeFinalProgressionBattle(),hero=b.units.find(u=>u.id==='h1');
  hero.hp=5;b.queue=['h1'];takeTurn(b,'h1','spirit_awakening','h1',()=>.3);
  return {form:hero.form,hp:hero.hp,speed:effectModifier(hero,'speed'),
   damage:effectModifier(hero,'damage'),blightResist:effectModifier(hero,'blightResist'),stillTurn:b.queue[0]};
 });
 expect(result).toEqual({form:'beast',hp:15,speed:5,damage:25,blightResist:30,stillTurn:'h1'});
});
test('max-level Hex Mage restoration and Treasure Hunter reverse guard apply level-five data',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeFinalProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {guardTarget,effectModifier}=await import('./src/status.js');
  const b=makeFinalProgressionBattle(),hero=b.units.find(u=>u.id==='h1');
  hero.hp=2;b.queue=['h3'];takeTurn(b,'h3','forbidden_restoration','h1',()=>.99);
  const healed=hero.hp;
  b.queue=['h2'];takeTurn(b,'h2','take_cover','h4',()=>.3);
  const hunter=b.units.find(u=>u.id==='h2'),guard=b.units.find(u=>u.id==='h4');
  return {healed,guardian:guardTarget(b,hunter).id,prot:effectModifier(guard,'prot'),marked:guard.marked};
 });
 expect(result).toEqual({healed:24,guardian:'h4',prot:20,marked:3});
});
