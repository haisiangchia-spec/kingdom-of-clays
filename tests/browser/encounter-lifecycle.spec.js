import {test,expect} from '@playwright/test';

test('rank-blocked archer passes through the shared action lifecycle in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,prepareActorTurn,passActorTurn,currentActor,availableTargets}=await import('./src/engine.js');
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const {ABILITIES}=await import('./src/engine.js');
  const b=makeBattle(50),archer=b.units.find(u=>u.id==='e3');
  b.units.splice(b.units.indexOf(archer),1);
  b.units.splice(4,0,archer);
  archer.marked=2;b.queue=['e3','h1'];
  const outcome=prepareActorTurn(b,'e3',()=>.5);
  const option=chooseEnemyAction(b,'e3',archer.enemySkills,()=>.5,ABILITIES,availableTargets);
  if(!option)passActorTurn(b,'e3');
  return {outcome,option,marked:archer.marked,acted:archer.acted,next:currentActor(b)?.id};
 });
 expect(result).toEqual({outcome:'ready',option:null,marked:1,acted:true,next:'h1'});
});

test('boss defeat keeps summoned survivor as an active encounter enemy',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,takeTurn,status,startRound,rng}=await import('./src/engine.js');
  const b=makeLargeMonsterBattle(51),boss=b.units.find(u=>u.id==='boss');
  b.units.find(u=>u.id==='e4').dead=true;
  boss.hp=48;b.queue=['boss','boss','h1'];
  takeTurn(b,'boss','emperor_call','boss',()=>.5);
  boss.dead=true;
  const whileAlive=status(b);
  startRound(b,rng(51));
  const turns={boss:b.queue.filter(x=>x==='boss').length,summon:b.queue.filter(x=>x==='reinforcement_1').length};
  b.units.find(u=>u.id==='reinforcement_1').dead=true;
  return {whileAlive,turns,after:status(b)};
 });
 expect(result).toEqual({whileAlive:'ongoing',turns:{boss:0,summon:1},after:'victory'});
});
