import {test,expect} from '@playwright/test';
test('fifth combat lab renders Champion, Hex Mage and Treasure Hunter',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Champion / Hex Mage / Treasure Hunter'}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 for(const name of ['Cursed Champion','Hex Mage','Treasure Hunter'])await expect(page.locator('#hero .unit').filter({hasText:name})).toHaveCount(1);
 expect(errors).toEqual([]);
});
test('21 class abilities are present and valid rank restrictions are applied',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const [{makeFifthClassBattle,availableTargets,ABILITIES},{FIFTH_CLASS_KEYS}]=await Promise.all([
   import('./src/engine.js'),import('./src/class-skills-batch5.js')
  ]);
  const b=makeFifthClassBattle(15),ids={cursed_champion:'h1',treasure_hunter:'h2',hex_mage:'h3'};
  return Object.fromEntries(Object.entries(FIFTH_CLASS_KEYS).map(([cls,keys])=>[
   cls,keys.map(key=>({key,name:ABILITIES[key]?.name,available:availableTargets(b,ids[cls],key).length>0}))
  ]));
 });
 for(const cls of ['cursed_champion','hex_mage','treasure_hunter']){
  expect(result[cls]).toHaveLength(7);
  expect(result[cls].every(x=>x.name)).toBe(true);
 }
 expect(result.hex_mage.find(x=>x.key==='abyssal_grasp').available).toBe(false);
 expect(result.cursed_champion.find(x=>x.key==='overwhelming_force').available).toBe(true);
 expect(result.treasure_hunter.find(x=>x.key==='take_cover').available).toBe(true);
});
test('reverse guard and occult healing resolve in browser engine',async ({page})=>{
 await page.goto('/');
 const data=await page.evaluate(async ()=>{
  const {makeFifthClassBattle,takeTurn}=await import('./src/engine.js');
  const {guardTarget}=await import('./src/status.js');
  const b=makeFifthClassBattle(),t=b.units.find(x=>x.id==='h2'),hex=b.units.find(x=>x.id==='h3');
  b.queue=['h2'];takeTurn(b,'h2','take_cover','h1',()=>.3);
  const guardian=guardTarget(b,t).id;t.hp=3;
  b.queue=['h3'];takeTurn(b,'h3','forbidden_restoration','h2',()=>.99);
  return {guardian,hp:t.hp,bleed:t.dot.length,hex:hex.name};
 });
 expect(data).toEqual({guardian:'h1',hp:16,bleed:0,hex:'Hex Mage'});
});
test('skill catalog counts 105 of 105 integrated level-one abilities',async ({page})=>{
 await page.goto('/');
 const r=await page.evaluate(async ()=>{
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  return {total:SKILL_CATALOG.length,integrated:SKILL_CATALOG.filter(x=>x.mechanics==='level1-integrated').length};
 });
 expect(r).toEqual({total:105,integrated:105});
});
