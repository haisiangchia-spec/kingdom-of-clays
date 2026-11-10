import {test,expect} from '@playwright/test';

test('buffs and stealth tick at end of turn, while bleed ticks at beginning',async ({page})=>{
 await page.goto('/');
 const outcome=await page.evaluate(async ()=>{
  const {makeSecondClassBattle,beginTurn,finishActorTurn,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeSecondClassBattle(),thief=b.units.find(x=>x.id==='h2');
  thief.dot=[{type:'bleed',turns:2,value:2}];thief.hp=15;
  b.queue=['h2'];beginTurn(b,'h2',()=>.5);
  const hpAfterStart=thief.hp;
  takeTurn(b,'h2','vanishing_step','h2',()=>.5);
  const afterCast={stealth:thief.stealthed,dodge:effectModifier(thief,'dodge'),hp:thief.hp,dotTurns:thief.dot[0]?.turns};
  beginTurn(b,'h2',()=>.5);
  const beforeFinish=thief.stealthed;
  finishActorTurn(thief);
  return {hpAfterStart,afterCast,beforeFinish,afterFinish:thief.stealthed};
 });
 expect(outcome.hpAfterStart).toBe(13);
 expect(outcome.afterCast.stealth).toBe(1);
 expect(outcome.afterCast.dodge).toBe(10);
 expect(outcome.afterCast.dotTurns).toBe(1);
 expect(outcome.beforeFinish).toBe(1);
 expect(outcome.afterFinish).toBe(0);
});
test('AoE can use visible second enemy as anchor while hitting stealthed first',async ({page})=>{
 await page.goto('/');
 const data=await page.evaluate(async ()=>{
  const {makeBattle,availableTargets,takeTurn}=await import('./src/engine.js');
  const b=makeBattle(),enemy=b.units.find(x=>x.id==='e1');
  enemy.stealthed=2;b.queue=['h2'];
  const anchor=availableTargets(b,'h2','sweeping_assault');
  const before=enemy.hp;
  takeTurn(b,'h2','sweeping_assault','e2',()=>.3);
  return {anchor,hitStealthed:enemy.hp<before};
 });
 expect(data).toEqual({anchor:['e2'],hitStealthed:true});
});
test('stunned actor still loses guard and buff duration at skipped turn end',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,prepareActorTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeBattle(),h=b.units.find(x=>x.id==='h1');
  h.stun=1;h.guard={targetId:'h2',turns:1};
  h.effects=[{kind:'buff',turns:1,modifiers:{prot:15}}];b.queue=['h1','e1'];
  const outcome=prepareActorTurn(b,'h1',()=>.5);
  return {outcome,guard:h.guard,prot:effectModifier(h,'prot'),next:b.queue[0]};
 });
 expect(result).toEqual({outcome:'stunned',guard:null,prot:0,next:'e1'});
});
