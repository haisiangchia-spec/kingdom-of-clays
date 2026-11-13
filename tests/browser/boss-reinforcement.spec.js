import {test,expect} from '@playwright/test';

test('Goblin Emperor summons only after rear-rank corpse clears',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,availableTargets,takeTurn,formationSlots,startRound,rng}=await import('./src/engine.js');
  const {corpseFromEnemy}=await import('./src/formation.js');
  const b=makeLargeMonsterBattle(31),boss=b.units.find(u=>u.id==='boss'),mage=b.units.find(u=>u.id==='e4');
  mage.hp=0;corpseFromEnemy(mage,b.round);
  const blocked=availableTargets(b,'boss','emperor_call').length===0;
  mage.dead=true;boss.hp=48;
  b.queue=['boss','boss','h1'];
  takeTurn(b,'boss','emperor_call','boss',()=>.5);
  const summoned=b.units.find(u=>u.id==='reinforcement_1');
  const middle={name:summoned?.name,ranks:formationSlots(b,'enemy').map(u=>u?.id),queue:[...b.queue],used:boss.usedSkills.emperor_call,secondSummon:availableTargets(b,'boss','emperor_call').length};
  startRound(b,rng(5));
  return {blocked,middle,summonTurns:b.queue.filter(id=>id==='reinforcement_1').length,bossTurns:b.queue.filter(id=>id==='boss').length};
 });
 expect(result).toEqual({
  blocked:true,
  middle:{name:'Skeleton Swordsman',ranks:['boss','boss','boss','reinforcement_1'],queue:['boss','h1'],used:1,secondSummon:0},
  summonTurns:1,bossTurns:2
 });
});

test('boss can only summon in Desperate phase after a repositioned giant frees a rank',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,availableTargets,formationSlots,takeTurn}=await import('./src/engine.js');
  const {moveWithinFormation,corpseFromEnemy}=await import('./src/formation.js');
  const b=makeLargeMonsterBattle(41),boss=b.units.find(u=>u.id==='boss'),mage=b.units.find(u=>u.id==='e4');
  const shift=moveWithinFormation(b,'boss',1);
  mage.hp=0;corpseFromEnemy(mage,b.round);mage.dead=true;
  const normal=availableTargets(b,'boss','emperor_call');
  boss.hp=48;
  const desperate=availableTargets(b,'boss','emperor_call');
  b.queue=['boss','boss','h1'];
  takeTurn(b,'boss','emperor_call','boss',()=>.5);
  return {shift,normal,desperate,formation:formationSlots(b,'enemy').map(u=>u?.id),count:b.units.filter(u=>u.id==='reinforcement_1').length};
 });
 expect(result).toEqual({shift:1,normal:[],desperate:['boss'],formation:['boss','boss','boss','reinforcement_1'],count:1});
});
