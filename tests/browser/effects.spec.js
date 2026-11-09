import {test,expect} from '@playwright/test';

test('multi-target combat resolves two hits and ignores a conventional guard',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,takeTurn}=await import('./src/engine.js');
  const b=makeBattle(12),warrior=b.units.find(u=>u.id==='h2');
  b.units.find(u=>u.id==='e2').guard={targetId:'e1',turns:2};
  b.queue=[warrior.id];const before=b.units.filter(u=>u.side==='enemy').map(u=>u.hp);
  takeTurn(b,warrior.id,'sweeping_assault','e1',()=>0);
  return {before,after:b.units.filter(u=>u.side==='enemy').map(u=>u.hp),
    intercepted:b.log.some(e=>e.includes('intercepts'))};
 });
 expect(result.after[0]).toBeLessThan(result.before[0]);
 expect(result.after[1]).toBeLessThan(result.before[1]);
 expect(result.after[2]).toBe(result.before[2]);
 expect(result.intercepted).toBe(false);
});
test('restoration heals before bleed tick in the actual browser engine',async ({page})=>{
 await page.goto('/');
 const state=await page.evaluate(async ()=>{
  const {makeBattle,beginTurn}=await import('./src/engine.js');
  const {addRestoration}=await import('./src/combat-effects.js');
  const b=makeBattle(13),hero=b.units[0];
  hero.hp=0;hero.deathDoor=true;hero.dot=[{type:'bleed',value:2,turns:1}];
  addRestoration(hero,3,1);beginTurn(b,hero.id,()=>.99);
  return {hp:hero.hp,dead:hero.dead,deathDoor:hero.deathDoor};
 });
 expect(state).toEqual({hp:1,dead:false,deathDoor:false});
});
