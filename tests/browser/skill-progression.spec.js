import {test,expect} from '@playwright/test';

test('verified level-five laboratory loads and labels upgraded abilities',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Verified Lv5 Skills'}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 const loaded=await page.evaluate(async ()=>{
  const {makeProgressionBattle,getActorSkill,ABILITIES}=await import('./src/engine.js');
  const b=makeProgressionBattle();
  return {hero:b.units.find(u=>u.id==='h1').skillLevels,
    base:ABILITIES.heavy_slash.acc,
    upgraded:getActorSkill(b.units.find(u=>u.id==='h1'),'heavy_slash').acc};
 });
 expect(loaded).toEqual({hero:{heavy_slash:5,countering_advance:5},base:85,upgraded:105});
 expect(errors).toEqual([]);
});
test('level-five healing uses exact reference numbers in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeProgressionBattle,takeTurn}=await import('./src/engine.js');
  const b=makeProgressionBattle(),victim=b.units.find(x=>x.id==='h1');
  victim.hp=5;b.queue=['h4'];
  takeTurn(b,'h4','greater_heal','h1',()=>.3);
  return {hp:victim.hp,skillLevel:b.units.find(x=>x.id==='h4').skillLevels.greater_heal};
 });
 expect(result).toEqual({hp:13,skillLevel:5});
});
test('unverified skill upgrade is blocked without changing actor state',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,setActorSkillLevel,ABILITIES}=await import('./src/engine.js');
  const b=makeBattle(),u=b.units.find(x=>x.id==='h2');
  let error='';
  try{setActorSkillLevel(b,'h2','sweeping_assault',5);}catch(e){error=e.message;}
  return {error,levels:u.skillLevels,base:ABILITIES.sweeping_assault.mod};
 });
 expect(result.error).toContain('Unverified skill upgrade');
 expect(result.levels).toEqual({});
 expect(result.base).toBe(-.4);
});
