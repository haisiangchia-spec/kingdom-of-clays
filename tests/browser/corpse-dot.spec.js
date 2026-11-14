import {test,expect} from '@playwright/test';

test('corpse blight is applied and ticks at round boundary without an initiative action',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeSecondClassBattle,takeTurn,startRound,rng}=await import('./src/engine.js');
  const {corpseFromEnemy}=await import('./src/formation.js');
  const b=makeSecondClassBattle(48),corpse=b.units.find(u=>u.id==='e1');
  corpseFromEnemy(corpse,0);
  b.queue=['h2'];
  takeTurn(b,'h2','venom_needle','corpse_e1',()=>.2);
  const applied={dot:corpse.dot.map(x=>({...x})),hp:corpse.hp};
  startRound(b,rng(48));
  return {applied,after:{hp:corpse.hp,dot:corpse.dot.map(x=>({...x})),initiative:b.queue.includes('corpse_e1')}};
 });
 expect(result.applied.dot).toEqual([{type:'blight',value:2,turns:4}]);
 expect(result.after.hp).toEqual(result.applied.hp-2);
 expect(result.after.dot).toEqual([{type:'blight',value:2,turns:3}]);
 expect(result.after.initiative).toBe(false);
});
