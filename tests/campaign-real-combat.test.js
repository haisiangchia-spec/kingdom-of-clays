import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle} from '../src/dungeon.js';
import {rng,status,startRound,currentActor,prepareActorTurn,availableTargets,takeTurn,passActorTurn,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';

const HERO_SKILLS={
 Swordsman:['heavy_slash','countering_advance','battle_shout','guardian_parry','riposte_stance','swordmasters_orders','steadfast_resolve'],
 Warrior:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],
 Hunter:['eagle_eye_shot','hunters_mark'],
 Priest:['greater_heal','group_healing','sacred_strike']
};
function playEncounter(d){
 const battle=dungeonBattle(d),random=rng(d.seed^0x9e3779b9);
 let actions=0;
 while(status(battle)==='ongoing'&&actions++<300){
  if(!currentActor(battle))startRound(battle,random);
  const actor=currentActor(battle);
  if(!actor)continue;
  if(prepareActorTurn(battle,actor.id,random)!=='ready')continue;
  if(actor.side==='enemy'){
   const action=chooseEnemyAction(battle,actor.id,actor.enemySkills??[],random,ABILITIES,availableTargets);
   if(action)takeTurn(battle,actor.id,action.key,action.targetId,random);
   else passActorTurn(battle,actor.id);
  }else{
   const candidates=(HERO_SKILLS[actor.heroClass??actor.name]??[]).flatMap(key=>
    availableTargets(battle,actor.id,key).map(targetId=>({key,targetId})));
   const offensive=candidates.find(c=>battle.units.find(u=>u.id===c.targetId)?.side==='enemy');
   const chosen=offensive??candidates[0];
   if(chosen)takeTurn(battle,actor.id,chosen.key,chosen.targetId,random);
   else passActorTurn(battle,actor.id);
  }
 }
 assert.ok(actions<300,'combat exceeded action budget');
 assert.notEqual(status(battle),'ongoing');
 resolveDungeonBattle(d);
 return {outcome:status(battle),actions};
}
test('real hero and enemy turns resolve initial dungeon encounters for each tier',()=>{
 for(const [tier,region] of [['apprentice','crypt'],['apprentice','plague'],['veteran','plague'],['champion','plague']]){
  for(const seed of [11,23,37]){
   const d=createDungeon(seed,{tier,region,difficulty:'scout'});
   beginCorridor(d,'gallery');
   advanceCorridor(d);
   assert.equal(d.phase,'combat',tier+' '+region+' '+seed);
   const report=playEncounter(d);
   assert.ok(['victory','defeat'].includes(report.outcome));
   assert.equal(d.pendingBattle,null);
   assert.ok(['explore','victory','defeat'].includes(d.phase));
  }
 }
});
