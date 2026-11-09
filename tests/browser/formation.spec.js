import {test,expect} from '@playwright/test';

test('corpse preserves enemy rank and does not prevent victory',async ({page})=>{
 await page.goto('/');
 const got=await page.evaluate(async ()=>{
  const {makeBattle,takeTurn,rank,status}=await import('./src/engine.js');
  const b=makeBattle(),a=b.units.find(x=>x.id==='h2'),e=b.units.find(x=>x.id==='e1');
  a.dmgMin=a.dmgMax=40;b.queue=[a.id];
  takeTurn(b,a.id,'crushing_strike',e.id,()=>0);
  const corpse=e.corpse===true,secondRank=rank(b,'e2');
  for(const x of b.units)if(x.side==='enemy'&&!x.corpse)x.dead=true;
  return {corpse,secondRank,outcome:status(b)};
 });
 expect(got).toEqual({corpse:true,secondRank:1,outcome:'victory'});
});
test('marked attack, stealth targeting and displacement work inside Chromium',async ({page})=>{
 await page.goto('/');
 const got=await page.evaluate(async ()=>{
  const {makeBattle,takeTurn,rank,availableTargets}=await import('./src/engine.js');
  const {attemptDisplacement}=await import('./src/formation.js');
  const b=makeBattle(),hunter=b.units.find(x=>x.id==='h3'),e2=b.units.find(x=>x.id==='e2'),e3=b.units.find(x=>x.id==='e3');
  const before=rank(b,e3.id);
  attemptDisplacement(b,e3,{type:'pull',distance:2,chance:100},()=>0);
  const after=rank(b,e3.id);
  e2.stealthed=2;const forbidden=!availableTargets(b,'h3','eagle_eye_shot').includes(e2.id);
  e2.stealthed=0;e2.marked=3;hunter.dmgMin=hunter.dmgMax=10;
  b.queue=['h3'];const hp=e2.hp;
  takeTurn(b,'h3','eagle_eye_shot',e2.id,()=>.2);
  return {before,after,forbidden,damage:hp-e2.hp};
 });
 expect(got).toEqual({before:2,after:0,forbidden:true,damage:15});
});
