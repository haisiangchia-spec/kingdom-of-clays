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
function playEncounter(d){
 const battle=dungeonBattle(d),random=rng(d.seed^0x9e3779b9);
 let actions=0,heroSkillsUsed=0,enemySkillsUsed=0;
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
   const offensive=candidates.find(c=>battle.units.find(u=>u.id===c.targetId)?.side==='enemy');
   const chosen=offensive??candidates[0];
   if(chosen){takeTurn(battle,actor.id,chosen.key,chosen.targetId,random);heroSkillsUsed++;}
   else passActorTurn(battle,actor.id);
  }
 }
 assert.ok(actions<300,'combat exceeded action budget');
 assert.ok(heroSkillsUsed>0,'hero bot never used a skill');
 assert.ok(enemySkillsUsed>0,'enemy AI never used a skill');
 assert.notEqual(status(battle),'ongoing');
 resolveDungeonBattle(d);
 return {outcome:status(battle),actions,heroSkillsUsed,enemySkillsUsed};
}
test('real hero and enemy turns resolve initial dungeon encounters for each tier',()=>{
 const metrics=[];
 for(const [tier,region] of [['apprentice','crypt'],['apprentice','plague'],['veteran','plague'],['champion','plague']]){
  for(const seed of [11,23,37,41,53,67,71,83,97,109]){
   const d=createDungeon(seed,{tier,region,difficulty:'scout'});
   beginCorridor(d,'gallery');
   advanceCorridor(d);
   assert.equal(d.phase,'combat',tier+' '+region+' '+seed);
   const report=playEncounter(d);
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

test('seeded real-turn encounters replay deterministically across tiers',()=>{
 for(const [tier,region] of [['apprentice','crypt'],['apprentice','plague'],['veteran','plague'],['champion','plague']]){
  const run=()=>{
   const d=createDungeon(137,{tier,region,difficulty:'scout'});
   beginCorridor(d,'gallery');
   advanceCorridor(d);
   assert.equal(d.phase,'combat');
   const report=playEncounter(d);
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
 let steps=0,battles=0,skills=0;
 while(d.phase==='explore'||d.phase==='combat'){
  assert.ok(++steps<1000,'expedition stalled: '+questId+' '+seed);
  if(d.phase==='combat'){
   const report=playEncounter(d);
   battles++;
   skills+=report.heroSkillsUsed+report.enemySkillsUsed;
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
 return {phase:d.phase,battles,skills,steps,room:d.room,cleared:d.cleared,party:d.party.map(h=>({hp:h.hp,stress:h.stress,dead:h.dead}))};
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
