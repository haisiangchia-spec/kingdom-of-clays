import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle,resolveHunger} from '../src/dungeon.js';
import {leaveLoot} from '../src/inventory.js';
import {rng,startRound,currentActor,prepareActorTurn,passActorTurn,takeTurn,availableTargets,status,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';

// Expedition test uses real combat outcomes and persistent party HP/stress.
// No fabricated victories, enemy deletion, or automatic hero restoration.
export function chooseHeroAction(battle,actor){
 const allies=battle.units.filter(u=>u.side==='hero'&&!u.dead);
 const enemies=battle.units.filter(u=>u.side==='enemy'&&!u.dead&&!u.corpse);
 const wounded=[...allies].filter(u=>u.hp<u.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
 const healing=actor.classId==='priest'?['greater_heal','group_healing']:
  actor.classId==='warrior'?['warrior_recovery']:
  actor.classId==='hunter'?['field_dressing']:[];
 if(wounded.length&&wounded[0].hp/wounded[0].maxHp<0.4){
  for(const key of healing){
   const targets=availableTargets(battle,actor.id,key);
   if(key==='group_healing'&&allies.filter(u=>u.hp/u.maxHp<0.65).length<2)continue;
   const target=wounded.find(u=>targets.includes(u.id));
   if(target)return {key,targetId:target.id};
  }
 }
 const skills=Object.entries(ABILITIES).filter(([,skill])=>skill.classId===actor.classId&&
  !['heal','groupHeal','stressHeal','guard','partyBuff','selfBuff','mark','debuffAll'].includes(skill.kind));
 let best=null;
 for(const [key,skill] of skills){
  const targets=availableTargets(battle,actor.id,key);
  for(const target of enemies){
   if(!targets.includes(target.id))continue;
   const score=(1-target.hp/target.maxHp)*30+(target.hp<=8?12:0)+
    (skill.status?.type==='stun'&&!target.stun?8:0)+(skill.mod??0)*12+
    (skill.acc??85)*0.03;
   if(!best||score>best.score)best={key,targetId:target.id,score};
  }
 }
 return best&&{key:best.key,targetId:best.targetId};
}

function runBattle(d,random){
 const battle=dungeonBattle(d);
 let actions=0;
 while(status(battle)==='ongoing'&&actions<600){
  if(!currentActor(battle))startRound(battle,random);
  const actor=currentActor(battle);
  if(!actor)continue;
  if(prepareActorTurn(battle,actor.id,random)!=='ready'){actions++;continue;}
  const action=actor.side==='enemy'
   ?chooseEnemyAction(battle,actor.id,actor.enemySkills??[],random,ABILITIES,availableTargets)
   :chooseHeroAction(battle,actor);
  if(action)takeTurn(battle,actor.id,action.key,action.targetId,random);
  else passActorTurn(battle,actor.id);
  actions++;
 }
 assert.notEqual(status(battle),'ongoing','combat failed to terminate');
 resolveDungeonBattle(d);
 return actions;
}
function expedition(seed,tier){
 const d=createDungeon(seed,{region:'plague',tier,difficulty:'scout',proceduralBranches:true,variableCorridors:true});
 d.questId=tier==='champion'?'warrens-champion':'warrens-veteran';
 const random=rng(seed+500000);
 const counts={lower:0,same:0};
 const lower=tier==='champion'?'veteran':'apprentice';
 let battles=0,actions=0;
 for(const room of ['gallery','watch','gallery','vault','gallery','watch','sanctum']){
  if(d.phase==='defeat'||d.phase==='victory')break;
  if(d.pendingLoot)leaveLoot(d);
  beginCorridor(d,room);
  let guard=0;
  while((d.pendingTravel||d.phase==='combat')&&d.phase!=='defeat'&&d.phase!=='victory'&&guard++<60){
   if(d.phase==='combat'){
    const battle=dungeonBattle(d);
    assert.ok([tier,lower].includes(battle.encounterTier));
    counts[battle.encounterTier===lower?'lower':'same']++;
    battles++;
    actions+=runBattle(d,random);
   }else if(d.pendingLoot)leaveLoot(d);
   else if(d.pendingHunger){
    if(d.supplies.food>=4)resolveHunger(d,'eat');
    else resolveHunger(d,'skip');
   }else advanceCorridor(d);
  }
  assert.ok(guard<60,'expedition navigation stalled');
 }
 return {outcome:d.phase,battles,actions,counts,fallen:d.party.filter(u=>u.dead).length,
  remainingHp:d.party.reduce((n,u)=>n+u.hp,0),stress:d.party.reduce((n,u)=>n+u.stress,0)};
}
test('real Veteran and Champion expeditions retain mixed-tier encounter generation and party attrition',()=>{
 for(const tier of ['veteran','champion']){
  const results=Array.from({length:10},(_,i)=>expedition(i+1,tier));
  const encounters=results.reduce((n,x)=>n+x.battles,0);
  const lower=results.reduce((n,x)=>n+x.counts.lower,0);
  const report={tier,expeditions:results.length,completed:results.filter(x=>x.outcome==='victory').length,
   defeated:results.filter(x=>x.outcome==='defeat').length,encounters,lowerTierEncounters:lower,
   lowerPercent:encounters?100*lower/encounters:null,
   fallen:results.reduce((n,x)=>n+x.fallen,0),
   meanRemainingHp:results.reduce((n,x)=>n+x.remainingHp,0)/results.length,
   meanStress:results.reduce((n,x)=>n+x.stress,0)/results.length};
  console.log('Full expedition endurance '+JSON.stringify(report));
  assert.ok(results.every(x=>x.battles>0),'expedition must include actual battles');
  assert.ok(results.every(x=>['victory','defeat','explore'].includes(x.outcome)),'unexpected expedition state');
  assert.equal(results.reduce((n,x)=>n+x.counts.lower+x.counts.same,0),encounters);
 }
});
