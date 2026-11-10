import {test,expect} from '@playwright/test';
test('Dark Knight, Beastmaster and Bard laboratory renders correctly',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Dark Knight / Beastmaster / Bard'}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 for(const name of ['Dark Knight','Beastmaster','Bard']){
   await expect(page.locator('#hero .unit').filter({hasText:name})).toHaveCount(1);
 }
 expect(errors).toEqual([]);
});
test('21 new skills are registered and obey class and rank restrictions',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const [{ABILITIES,makeFourthClassBattle,availableTargets},{FOURTH_CLASS_KEYS}]=await Promise.all([
    import('./src/engine.js'),import('./src/class-skills-batch4.js')
  ]);
  const s=makeFourthClassBattle(),ids={dark_knight:'h1',beastmaster:'h2',bard:'h3'};
  return Object.fromEntries(Object.entries(FOURTH_CLASS_KEYS).map(([cls,keys])=>
    [cls,keys.map(key=>({key,name:ABILITIES[key].name,legal:availableTargets(s,ids[cls],key).length>0}))]));
 });
 for(const cls of ['dark_knight','beastmaster','bard']){
  expect(result[cls]).toHaveLength(7);
  expect(result[cls].every(x=>x.name)).toBe(true);
 }
 expect(result.dark_knight.find(x=>x.key==='point_blank_burst').legal).toBe(true);
 expect(result.beastmaster.find(x=>x.key==='comforting_howl').legal).toBe(false);
 expect(result.bard.find(x=>x.key==='grand_finale').legal).toBe(false);
});
test('Bard Solo only buffs self once despite attacking four enemies',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeFourthClassBattle,takeTurn,rank}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const s=makeFourthClassBattle();s.queue=['h3'];
  takeTurn(s,'h3','heroic_solo','e1',()=>.3);
  const a=s.units.find(x=>x.id==='h3');
  return {rank:rank(s,'h3'),dodge:effectModifier(a,'dodge'),
    finale:effectModifier(a,'finaleDamage'),mark:a.marked};
 });
 expect(result).toEqual({rank:0,dodge:20,finale:75,mark:2});
});
test('catalog counts 105 integrated skills and retains 105 base names',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  return {total:SKILL_CATALOG.length,integrated:SKILL_CATALOG.filter(s=>s.mechanics==='level1-integrated').length};
 });
 expect(result).toEqual({total:105,integrated:105});
});
