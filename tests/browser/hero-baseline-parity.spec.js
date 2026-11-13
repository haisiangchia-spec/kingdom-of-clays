import {test,expect} from '@playwright/test';

test('Occultist Weakening Curse level one follows original -10 DMG and -10 PROT table',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeFifthClassBattle,takeTurn,ABILITIES}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeFifthClassBattle(),foe=b.units.find(x=>x.id==='e2');
  b.queue=['h3'];takeTurn(b,'h3','enfeebling_hex','e2',()=>.3);
  return {baseCrit:ABILITIES.enfeebling_hex.crit,baseMod:ABILITIES.enfeebling_hex.mod,
   damage:effectModifier(foe,'damage'),prot:effectModifier(foe,'prot')};
 });
 expect(result).toEqual({baseCrit:5,baseMod:-.75,damage:-10,prot:-10});
});
test('Wyrd Reconstruction applies one-point bleed only after application minus resistance roll',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeFifthClassBattle,takeTurn}=await import('./src/engine.js');
  const heal=roll=>{
   const b=makeFifthClassBattle(),a=b.units.find(x=>x.id==='h1');
   a.resist.bleed=50;b.queue=['h3'];
   takeTurn(b,'h3','forbidden_restoration','h1',()=>roll);
   return a.dot.map(x=>({value:x.value,turns:x.turns}));
  };
  return {resisted:heal(.2),applied:heal(.05)};
 });
 expect(result).toEqual({resisted:[],applied:[{value:1,turns:3}]});
});
test('Antiquarian Protect Me marks guardian, grants level-one dodge and limits uses',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeFifthClassBattle,takeTurn,availableTargets}=await import('./src/engine.js');
  const {effectModifier,guardTarget}=await import('./src/status.js');
  const b=makeFifthClassBattle(),a=b.units.find(x=>x.id==='h2'),guardian=b.units.find(x=>x.id==='h1');
  for(let i=0;i<3;i++){
   b.queue=['h2'];a.acted=false;
   takeTurn(b,'h2','take_cover','h1',()=>.3);
  }
  return {dodge:effectModifier(guardian,'dodge'),prot:effectModifier(guardian,'prot'),
   marked:guardian.marked,guard:guardTarget(b,a).id,uses:a.usedSkills.take_cover,
   remaining:availableTargets(b,'h2','take_cover')};
 });
 expect(result).toEqual({dodge:12,prot:30,marked:3,guard:'h1',uses:3,remaining:[]});
});
