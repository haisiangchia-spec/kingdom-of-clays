import {test,expect} from '@playwright/test';

test('stunned enemy loses turn rather than attacking and heals no damage to target',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
   const {makeBattle,prepareActorTurn,currentActor,takeTurn}=await import('./src/engine.js');
   const b=makeBattle(),enemy=b.units.find(x=>x.id==='e1'),hero=b.units.find(x=>x.id==='h1');
   b.queue=['e1','h1'];enemy.stun=1;enemy.dot=[{type:'blight',value:2,turns:2}];
   const before=hero.hp;
   const result=prepareActorTurn(b,'e1',()=>.5);
   let illegal=false;
   try{takeTurn(b,'e1','enemy_strike','h1',()=>0);}catch(e){illegal=true;}
   return {result,enemyHP:enemy.hp,heroHP:hero.hp,before,next:currentActor(b)?.id,illegal};
 });
 expect(result).toEqual({result:'stunned',enemyHP:14,heroHP:33,before:33,next:'h1',illegal:true});
});
test('hero and enemy use identical turn-start death and stun ordering',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,prepareActorTurn}=await import('./src/engine.js');
  const b=makeBattle(),hero=b.units.find(x=>x.id==='h1');
  b.queue=['h1','e1'];hero.hp=0;hero.deathDoor=true;hero.stun=1;
  hero.dot=[{type:'bleed',value:2,turns:1}];
  const outcome=prepareActorTurn(b,'h1',()=>.99);
  return {outcome,dead:hero.dead,next:b.queue[0]};
 });
 expect(result).toEqual({outcome:'dead',dead:true,next:'e1'});
});
