import {test,expect} from '@playwright/test';
test('all seven Swordsman and seven Warrior level-one skills are loaded and targetable in Chromium',async ({page})=>{
 await page.goto('/');
 const coverage=await page.evaluate(async ()=>{
  const [{ABILITIES,makeBattle,availableTargets},{STARTER_CLASS_KEYS}]=await Promise.all([
    import('./src/engine.js'),import('./src/class-skills.js')
  ]);
  const b=makeBattle();
  return Object.fromEntries(Object.entries(STARTER_CLASS_KEYS).map(([klass,keys])=>[
    klass,keys.map(key=>({name:ABILITIES[key]?.name,exists:!!ABILITIES[key],
      targetCount:availableTargets(b,klass==='swordsman'?'h1':'h2',key).length}))
  ]));
 });
 for(const klass of ['swordsman','warrior']){
  expect(coverage[klass]).toHaveLength(7);
  expect(coverage[klass].every(v=>v.exists&&v.name)).toBe(true);
  for(const ability of coverage[klass]){
    if(ability.name==='Charging Blade')expect(ability.targetCount).toBe(0);
    else expect(ability.targetCount).toBeGreaterThan(0);
  }
 }
});
test('Crusader self-buff works once, and Man-at-Arms command strengthens allies',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,takeTurn,availableTargets}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeBattle(4);
  b.queue=['h2'];takeTurn(b,'h2','iron_fortress','h2',()=>.1);
  const once=availableTargets(b,'h2','iron_fortress').length===0;
  const prot=effectModifier(b.units.find(x=>x.id==='h2'),'prot');
  b.queue=['h1'];takeTurn(b,'h1','swordmasters_orders','h1',()=>.1);
  return {once,prot,accuracy:effectModifier(b.units.find(x=>x.id==='h4'),'accuracy'),torch:b.torch};
 });
 expect(result).toEqual({once:true,prot:20,accuracy:5,torch:99});
});
