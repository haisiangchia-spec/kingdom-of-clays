import {test,expect} from '@playwright/test';
test('Hunter Thief Mage Lv5 laboratory shows complete 21-track progression',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Hunter / Thief / Mage Lv5'}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 const result=await page.evaluate(async()=>{
  const {makeSecondProgressionBattle,getActorSkill}=await import('./src/engine.js');
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  const b=makeSecondProgressionBattle();
  return {
   upgraded:b.units.filter(u=>u.side==='hero').reduce((sum,u)=>sum+Object.keys(u.skillLevels).length,0),
   verified:SKILL_CATALOG.filter(x=>x.verifiedLevels.length===5).length,
   hunter:getActorSkill(b.units.find(x=>x.id==='h4'),'eagle_eye_shot').vsMarked,
   thief:getActorSkill(b.units.find(x=>x.id==='h2'),'venom_needle').status.value,
   mage:getActorSkill(b.units.find(x=>x.id==='h3'),'corrosive_bolt').status.value
  };
 });
 expect(result).toEqual({upgraded:21,verified:42,hunter:1,thief:4,mage:7});
 expect(errors).toEqual([]);
});
test('Hunter level-five Battlefield Bandage heals and applies healing-received bonus',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeSecondProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeSecondProgressionBattle(),h=b.units.find(x=>x.id==='h1');
  h.hp=10;b.queue=['h4'];
  takeTurn(b,'h4','field_dressing','h1',()=>.3);
  return {hp:h.hp,healingReceived:effectModifier(h,'healingReceived')};
 });
 expect(result).toEqual({hp:14,healingReceived:38});
});
test('Mage and Thief level-five DOT and self-stealth upgrades work in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeSecondProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeSecondProgressionBattle(),e=b.units.find(x=>x.id==='e3'),thief=b.units.find(x=>x.id==='h2');
  b.queue=['h3'];takeTurn(b,'h3','toxic_explosion','e3',()=>.2);
  b.queue=['h2'];takeTurn(b,'h2','vanishing_step','h2',()=>.3);
  return {blight:e.dot.find(x=>x.type==='blight')?.value,stealth:thief.stealthed,damage:effectModifier(thief,'damage'),dodge:effectModifier(thief,'dodge')};
 });
 expect(result).toEqual({blight:6,stealth:1,damage:100,dodge:15});
});
