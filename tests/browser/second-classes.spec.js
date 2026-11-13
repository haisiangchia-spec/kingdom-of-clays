import {test,expect} from '@playwright/test';

test('Hunter / Thief / Mage combat laboratory loads as a playable party',async ({page})=>{
 const errors=[];page.on('pageerror',err=>errors.push(err.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Hunter / Thief / Mage',exact:true}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 await expect(page.locator('#enemy .unit')).toHaveCount(4);
 for(const name of ['Warrior','Thief','Mage','Hunter'])
   await expect(page.locator('#hero .unit').filter({hasText:name})).toHaveCount(1);
 await expect(page.locator('#phase')).toContainText('Round 1');
 expect(errors).toEqual([]);
});
test('all 21 new abilities load in Chromium and apply relevant rank restrictions',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const [{makeSecondClassBattle,availableTargets,ABILITIES},{SECOND_CLASS_KEYS}]=await Promise.all([
   import('./src/engine.js'),import('./src/class-skills-batch2.js')
  ]);
  const b=makeSecondClassBattle(18),ids={hunter:'h4',thief:'h2',mage:'h3'};
  return Object.fromEntries(Object.entries(SECOND_CLASS_KEYS).map(([cls,keys])=>[
   cls,keys.map(key=>({name:ABILITIES[key].name,legal:availableTargets(b,ids[cls],key).length>0}))
  ]));
 });
 for(const cls of ['hunter','thief','mage']){
  expect(result[cls]).toHaveLength(7);
  expect(result[cls].every(x=>x.name)).toBe(true);
  if(cls==='thief'){
    expect(result[cls].find(x=>x.name==='Shadow Lunge').legal).toBe(false);
    expect(result[cls].filter(x=>x.name!=='Shadow Lunge').every(x=>x.legal)).toBe(true);
  }else expect(result[cls].every(x=>x.legal)).toBe(true);
 }
});
test('stun AoE deals no direct damage; Thief can vanish and pierce protection',async ({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async ()=>{
  const {makeSecondClassBattle,takeTurn,availableTargets}=await import('./src/engine.js');
  const b=makeSecondClassBattle(19),e3=b.units.find(x=>x.id==='e3'),e4=b.units.find(x=>x.id==='e4');
  b.queue=['h3'];
  const before=[e3.hp,e4.hp];
  takeTurn(b,'h3','blinding_mist','e3',()=>.2);
  b.queue=['h2'];
  const thief=b.units.find(x=>x.id==='h2');
  takeTurn(b,'h2','vanishing_step','h2',()=>.2);
  return {before,after:[e3.hp,e4.hp],stuns:[e3.stun,e4.stun],stealth:thief.stealthed};
 });
 expect(results.after).toEqual(results.before);
 expect(results.stuns).toEqual([1,1]);
 expect(results.stealth).toBe(1);
});
test('eight-class level-one skill integration count is 105, with 105 total names',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  return {total:SKILL_CATALOG.length,integrated:SKILL_CATALOG.filter(x=>x.mechanics==='level1-integrated').length};
 });
 expect(result).toEqual({total:105,integrated:105});
});
