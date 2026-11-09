import {test,expect} from '@playwright/test';

test('third class laboratory renders Priest, Monster Slayer and Berserker and 4v4 battle',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Priest / Slayer / Berserker'}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 await expect(page.locator('#enemy .unit')).toHaveCount(4);
 for(const name of ['Priest','Monster Slayer','Berserker'])await expect(page.locator('#hero .unit').filter({hasText:name})).toHaveCount(1);
 expect(errors).toEqual([]);
});

test('all 21 abilities are registered and rank restrictions follow DD1',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const [{makeThirdClassBattle,availableTargets,ABILITIES},{THIRD_CLASS_KEYS}]=await Promise.all([
   import('./src/engine.js'),import('./src/class-skills-batch3.js')
  ]);
  const b=makeThirdClassBattle(),ids={priest:'h4',monster_slayer:'h3',berserker:'h1'};
  return Object.fromEntries(Object.entries(THIRD_CLASS_KEYS).map(([cls,keys])=>[
    cls,keys.map(key=>({key,name:ABILITIES[key]?.name,available:availableTargets(b,ids[cls],key).length>0}))
  ]));
 });
 for(const cls of ['priest','monster_slayer','berserker']){
  expect(result[cls]).toHaveLength(7);
  expect(result[cls].every(x=>x.name)).toBe(true);
 }
 for(const key of ['sacred_strike','revealing_light','blessing_strike'])
  expect(result.priest.find(x=>x.key===key).available).toBe(false);
 for(const key of ['brutal_uppercut'])
  expect(result.monster_slayer.find(x=>x.key===key).available).toBe(false);
 expect(result.berserker.find(x=>x.key==='rising_axe').available).toBe(true);
});

test('Berserker exhaustion, Priest healing and Monster Slayer mark all resolve in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeThirdClassBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeThirdClassBattle(3);
  const p=b.units.find(x=>x.id==='h4'),h=b.units.find(x=>x.id==='h1'),m=b.units.find(x=>x.id==='h3');
  h.hp=14;
  b.queue=['h1'];takeTurn(b,'h1','terrifying_war_cry','e1',()=>.3);
  b.queue=['h4'];takeTurn(b,'h4','greater_heal','h1',()=>.3);
  b.queue=['h3'];takeTurn(b,'h3','identify_weakness','e3',()=>.3);
  return {stun:b.units.find(x=>x.id==='e1').stun,exhaustion:effectModifier(h,'damage'),
   healed:h.hp>14,marked:b.units.find(x=>x.id==='e3').marked,priest:p.name,slayer:m.name};
 });
 expect(result).toEqual({stun:1,exhaustion:-20,healed:true,marked:3,priest:'Priest',slayer:'Monster Slayer'});
});
test('skill catalog now contains 105 integrated level-one abilities',async ({page})=>{
 await page.goto('/');
 const data=await page.evaluate(async ()=>{
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  return {total:SKILL_CATALOG.length,integrated:SKILL_CATALOG.filter(s=>s.mechanics==='level1-integrated').length};
 });
 expect(data).toEqual({total:105,integrated:105});
});
