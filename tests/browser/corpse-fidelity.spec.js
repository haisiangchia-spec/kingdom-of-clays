import {test,expect} from '@playwright/test';

test('corpses acquire DD1 resistances and ordinary critical hits give no stress relief',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,takeTurn,availableTargets}=await import('./src/engine.js');
  const {corpseFromEnemy}=await import('./src/formation.js');
  const b=makeBattle(14),enemy=b.units.find(u=>u.id==='e1'),hero=b.units.find(u=>u.id==='h1');
  enemy.resist={stun:90,bleed:85,blight:70,move:20,debuff:20};
  corpseFromEnemy(enemy,0);
  const resists={...enemy.resist};
  hero.stress=25;hero.crit=100;
  const legal=availableTargets(b,'h1','heavy_slash').includes(enemy.id);
  b.queue=['h1'];takeTurn(b,'h1','heavy_slash',enemy.id,()=>.1);
  return {resists,legal,stress:hero.stress};
 });
 expect(result).toEqual({
  resists:{stun:200,bleed:0,blight:0,move:200,debuff:200},
  legal:true,stress:25
 });
});
