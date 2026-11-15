import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle,dungeonCorridors,questObjectiveProgress,resolveHunger} from '../src/dungeon.js';
import {rng,status,startRound,currentActor,prepareActorTurn,availableTargets,takeTurn,passActorTurn,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {leaveLoot} from '../src/inventory.js';

const HERO_SKILLS={
 Swordsman:['heavy_slash','countering_advance','battle_shout','guardian_parry','riposte_stance','swordmasters_orders','steadfast_resolve'],
 Warrior:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],
 Hunter:['eagle_eye_shot','hunters_mark'],
 Priest:['greater_heal','group_healing','sacred_strike']
};
function playEncounter(d,{requireBothSides=false}={}){
 // Match the actual encounter's seeded RNG, not the expedition seed.
 // Dungeon encounters already derive independent seeds from source and serial.
 const battle=dungeonBattle(d);
 const random=rng(battle.seed);
 let actions=0,heroSkillsUsed=0,enemySkillsUsed=0,healsUsed=0;
 while(status(battle)==='ongoing'&&actions++<300){
  if(!currentActor(battle))startRound(battle,random);
  const actor=currentActor(battle);
  if(!actor)continue;
  if(prepareActorTurn(battle,actor.id,random)!=='ready')continue;
  if(actor.side==='enemy'){
   const action=chooseEnemyAction(battle,actor.id,actor.enemySkills??[],random,ABILITIES,availableTargets);
   if(action){takeTurn(battle,actor.id,action.key,action.targetId,random);enemySkillsUsed++;}
   else passActorTurn(battle,actor.id);
  }else{
   const candidates=(HERO_SKILLS[actor.heroClass??actor.name]??[]).flatMap(key=>
    availableTargets(battle,actor.id,key).map(targetId=>({key,targetId})));
   // A basic survival policy: the Priest heals wounded allies, including heroes
   // at 0 HP on Death's Door, before attacking.
   // Without this, expedition win rates measure an intentionally non-healing bot.
   const wounded=battle.units.filter(u=>u.side==='hero'&&!u.dead&&u.hp<u.maxHp)
    .sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp));
   const heal=(actor.heroClass??actor.name)==='Priest'
    ?wounded.filter(u=>u.hp/u.maxHp<=.65)
      .flatMap(u=>candidates.filter(c=>c.key==='greater_heal'&&c.targetId===u.id))[0]
    :null;
   // Focus fire on the most wounded reachable enemy instead of always
   // choosing the first legal attack in a fixed skill/target enumeration.
   const offensive=candidates.filter(c=>{
    const target=battle.units.find(u=>u.id===c.targetId);
    return target?.side==='enemy'&&!target.dead&&!target.corpse;
   }).sort((a,b)=>{
    const aa=battle.units.find(u=>u.id===a.targetId);
    const bb=battle.units.find(u=>u.id===b.targetId);
    return aa.hp/aa.maxHp-bb.hp/bb.maxHp;
   })[0];
   // Avoid wasting turns on non-offensive buffs when no living enemy can
   // be reached: such turns can otherwise mask a formation deadlock.
   const chosen=heal??offensive??candidates[0];
   if(chosen){takeTurn(battle,actor.id,chosen.key,chosen.targetId,random);heroSkillsUsed++;if(chosen===heal)healsUsed++;}
   else passActorTurn(battle,actor.id);
  }
 }
 assert.ok(actions<300,'combat exceeded action budget');
 if(requireBothSides){
  assert.ok(heroSkillsUsed>0,'hero bot never used a skill');
  assert.ok(enemySkillsUsed>0,'enemy AI never used a skill');
 }
 assert.notEqual(status(battle),'ongoing');
 resolveDungeonBattle(d);
 return {outcome:status(battle),actions,heroSkillsUsed,enemySkillsUsed,healsUsed};
}
test('real hero and enemy turns resolve initial dungeon encounters for each tier',()=>{
 const metrics=[];
 for(const [tier,region] of [['apprentice','crypt'],['apprentice','plague'],['veteran','plague'],['champion','plague']]){
  for(const seed of [11,23,37,41,53,67,71,83,97,109]){
   const d=createDungeon(seed,{tier,region,difficulty:'scout'});
   beginCorridor(d,'gallery');
   advanceCorridor(d);
   assert.equal(d.phase,'combat',tier+' '+region+' '+seed);
   const report=playEncounter(d,{requireBothSides:true});
   assert.ok(['victory','defeat'].includes(report.outcome));
   metrics.push({tier,region,seed,outcome:report.outcome,actions:report.actions,heroSkillsUsed:report.heroSkillsUsed,enemySkillsUsed:report.enemySkillsUsed,fallen:d.party.filter(h=>h.dead).length,remainingHp:d.party.reduce((sum,h)=>sum+Math.max(0,h.hp),0),stress:d.party.reduce((sum,h)=>sum+(h.stress??0),0)});
   assert.equal(d.pendingBattle,null);
   assert.ok(['explore','victory','defeat'].includes(d.phase));
  }
 }
 // Report descriptive encounter metrics without asserting arbitrary win-rate targets.
 // These are a simple fixed-policy bot, not representative player performance.
 for(const [tier,region] of [['apprentice','crypt'],['apprentice','plague'],['veteran','plague'],['champion','plague']]){
  const sample=metrics.filter(m=>m.tier===tier&&m.region===region);
  const mean=key=>Number((sample.reduce((total,m)=>total+m[key],0)/sample.length).toFixed(2));
  console.log('Encounter baseline',JSON.stringify({tier,region,n:sample.length,wins:sample.filter(m=>m.outcome==='victory').length,meanActions:mean('actions'),meanHeroSkills:mean('heroSkillsUsed'),meanEnemySkills:mean('enemySkillsUsed'),meanFallen:mean('fallen'),meanRemainingHp:mean('remainingHp'),meanStress:mean('stress')}));
 }
});

test('successive expedition encounters receive distinct reproducible combat seeds',()=>{
 const collect=()=>{
  const d=createDungeon(223,{difficulty:'scout',region:'crypt'});
  beginCorridor(d,'gallery');
  advanceCorridor(d);
  assert.equal(d.phase,'combat');
  const first=dungeonBattle(d).seed;
  // The test needs only the second encounter seed, not a simulated victory.
  // Clearing the first encounter lets us exercise normal dungeon progression.
  const battle=dungeonBattle(d);
  for(const enemy of battle.units.filter(u=>u.side==='enemy'))enemy.dead=true;
  resolveDungeonBattle(d);
  while(d.pendingTravel)advanceCorridor(d);
  beginCorridor(d,'watch');
  while(d.phase==='explore'&&d.pendingTravel)advanceCorridor(d);
  assert.equal(d.phase,'combat','expected a second encounter');
  const second=dungeonBattle(d).seed;
  assert.notEqual(first,second,'two encounters reused the same combat seed');
  return [first,second];
 };
 assert.deepEqual(collect(),collect(),'encounter seed sequence changed across replays');
});

test('seeded real-turn encounters replay deterministically across tiers',()=>{
 for(const [tier,region] of [['apprentice','crypt'],['apprentice','plague'],['veteran','plague'],['champion','plague']]){
  const run=()=>{
   const d=createDungeon(137,{tier,region,difficulty:'scout'});
   beginCorridor(d,'gallery');
   advanceCorridor(d);
   assert.equal(d.phase,'combat');
   const report=playEncounter(d,{requireBothSides:true});
   return {report,phase:d.phase,party:d.party.map(h=>({hp:h.hp,stress:h.stress,dead:h.dead})),pendingBattle:d.pendingBattle};
  };
  assert.deepEqual(run(),run(),tier+' '+region+' replay diverged');
 }
});

function shortestRoute(d,goal){
 const queue=[[d.room]],seen=new Set([d.room]);
 while(queue.length){
  const path=queue.shift(),at=path.at(-1);
  if(at===goal)return path.slice(1);
  for(const edge of dungeonCorridors(d)){
   const next=edge.from===at?edge.to:edge.to===at?edge.from:null;
   if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next]);}
  }
 }
 throw Error('Unreachable quest objective '+goal);
}
function runFullExpedition(seed,questId,tier,region){
 const d=createDungeon(seed,{tier,region,difficulty:'scout',proceduralBranches:true,variableCorridors:true,interactiveEvents:true});
 d.questId=questId;
 let steps=0,battles=0,skills=0,heroSkills=0,enemySkills=0,heals=0;
 while(d.phase==='explore'||d.phase==='combat'){
  assert.ok(++steps<1000,'expedition stalled: '+questId+' '+seed);
  if(d.phase==='combat'){
   const report=playEncounter(d);
   battles++;
   skills+=report.heroSkillsUsed+report.enemySkillsUsed;
   heroSkills+=report.heroSkillsUsed;
   enemySkills+=report.enemySkillsUsed;
   heals+=report.healsUsed;
   continue;
  }
  if(d.pendingLoot){leaveLoot(d);continue;}
  if(d.pendingHunger){resolveHunger(d,(d.supplies.food??0)>=4?'eat':'skip');continue;}
  if(d.pendingTravel){advanceCorridor(d);continue;}
  const objective=questObjectiveProgress(d).find(x=>!x.complete);
  assert.ok(objective,'no incomplete objectives while still exploring');
  const path=shortestRoute(d,objective.room);
  assert.ok(path.length,'objective room is current room but not complete');
  beginCorridor(d,path[0]);
 }
 assert.ok(['victory','defeat'].includes(d.phase));
 assert.ok(battles>0,'expedition skipped combat');
 assert.ok(skills>0,'expedition did not execute combat skills');
 assert.equal(d.pendingBattle,null);
 if(d.phase==='victory')assert.ok(questObjectiveProgress(d).every(x=>x.complete));
 return {phase:d.phase,battles,skills,heroSkills,enemySkills,heals,steps,food:d.supplies.food,torch:d.torch,room:d.room,cleared:d.cleared,party:d.party.map(h=>({hp:h.hp,stress:h.stress,dead:h.dead}))};
}
test('complete seeded expeditions resolve with actual combat, hunger, loot and navigation',()=>{
 for(const [questId,tier,region] of [
  ['crypt-recon','apprentice','crypt'],
  ['crypt-purge','apprentice','crypt'],
  ['warrens-recon','apprentice','plague'],
  ['warrens-containment','apprentice','plague'],
  ['warrens-veteran','veteran','plague'],
  ['warrens-champion','champion','plague']
 ]){
  const first=runFullExpedition(151,questId,tier,region);
  assert.deepEqual(runFullExpedition(151,questId,tier,region),first,'full expedition replay diverged: '+questId);
  console.log('Full expedition baseline',JSON.stringify({questId,...first}));
 }
});

test('report multi-seed full expedition attrition by quest without arbitrary pass thresholds',()=>{
 const quests=[
  ['crypt-recon','apprentice','crypt'],
  ['crypt-purge','apprentice','crypt'],
  ['warrens-recon','apprentice','plague'],
  ['warrens-containment','apprentice','plague'],
  ['warrens-veteran','veteran','plague'],
  ['warrens-champion','champion','plague']
 ];
 const seeds=[11,23,37,41,53,67,71,83,97,109];
 for(const [questId,tier,region] of quests){
  const results=seeds.map(seed=>{
   try{return {seed,...runFullExpedition(seed,questId,tier,region)};}
   catch(error){throw new Error('Full expedition simulation failed for '+questId+' seed '+seed+': '+error.message,{cause:error});}
  });
  const mean=fn=>Number((results.reduce((sum,r)=>sum+fn(r),0)/results.length).toFixed(2));
  const report={
   questId,tier,region,n:results.length,
   outcomes:results.map(r=>({seed:r.seed,result:r.phase,battles:r.battles,fallen:r.party.filter(h=>h.dead).length})),
   victories:results.filter(r=>r.phase==='victory').length,
   defeats:results.filter(r=>r.phase==='defeat').length,
   meanBattles:mean(r=>r.battles),
   meanActions:mean(r=>r.skills),
   meanHeals:mean(r=>r.heals),
   meanFallen:mean(r=>r.party.filter(h=>h.dead).length),
   meanRemainingHp:mean(r=>r.party.reduce((sum,h)=>sum+Math.max(0,h.hp),0)),
   meanStress:mean(r=>r.party.reduce((sum,h)=>sum+(h.stress??0),0)),
   meanFoodRemaining:mean(r=>r.food),
   meanTorchlight:mean(r=>r.torch),
   minRemainingHp:Math.min(...results.map(r=>r.party.reduce((sum,h)=>sum+Math.max(0,h.hp),0))),
   maxStress:Math.max(...results.map(r=>r.party.reduce((sum,h)=>sum+(h.stress??0),0)))
  };
  assert.equal(report.victories+report.defeats,report.n);
  console.log('Full expedition attrition',JSON.stringify(report));
 }
});
