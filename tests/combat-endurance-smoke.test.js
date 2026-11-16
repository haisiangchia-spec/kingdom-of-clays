import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGeneratedEncounter,rng,startRound,currentActor,prepareActorTurn,passActorTurn,takeTurn,availableTargets,status,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';

// Deliberately modest: real combat turns, not fabricated expedition victories.
// Report survival metrics without setting a balance threshold prematurely.
// Tactical test driver: prioritise emergency healing, then low-HP enemies.
// This is a deterministic simulation policy, not a change to player combat rules.
function chooseHeroAction(battle,actor){
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
function fight(seed,tier){
 const battle=makeGeneratedEncounter(seed,'patrol','plague',tier);
 const random=rng(seed+100000);
 let actions=0;
 while(status(battle)==='ongoing'&&actions<500){
  if(!currentActor(battle))startRound(battle,random);
  const actor=currentActor(battle);
  if(!actor)continue;
  if(prepareActorTurn(battle,actor.id,random)!=='ready'){actions++;continue;}
  let action=null;
  if(actor.side==='enemy'){
   action=chooseEnemyAction(battle,actor.id,actor.enemySkills??[],random,ABILITIES,availableTargets);
  }else{
   action=chooseHeroAction(battle,actor);
  }
  if(action)takeTurn(battle,actor.id,action.key,action.targetId,random);
  else passActorTurn(battle,actor.id);
  actions++;
 }
 return {outcome:status(battle),actions,heroes: battle.units.filter(u=>u.side==='hero').map(u=>({hp:u.hp,stress:u.stress,dead:u.dead}))};
}
test('real automated combat resolves across campaign encounter tiers and reports survivability',()=>{
 for(const tier of ['apprentice','veteran','champion']){
  const results=Array.from({length:10},(_,i)=>fight(i+1,tier));
  assert.ok(results.every(x=>x.outcome!=='ongoing'),'combat must terminate: '+tier);
  assert.ok(results.every(x=>x.actions>0&&x.actions<500));
  const wins=results.filter(x=>x.outcome==='victory').length;
  const fallen=results.reduce((n,x)=>n+x.heroes.filter(h=>h.dead).length,0);
  const meanHp=results.reduce((n,x)=>n+x.heroes.reduce((s,h)=>s+h.hp,0)/4,0)/results.length;
  const meanStress=results.reduce((n,x)=>n+x.heroes.reduce((s,h)=>s+h.stress,0)/4,0)/results.length;
  console.log('Combat endurance smoke '+JSON.stringify({tier,samples:results.length,wins,fallen,meanHp,meanStress}));
 }
});

test('champion encounter diagnostics distinguish encounter tiers and action economy',()=>{
 const results=[];
 for(let seed=1;seed<=30;seed++){
  const battle=makeGeneratedEncounter(seed,'patrol','plague','champion');
  const encounterTier=battle.encounterPlan?.tier??'unknown';
  const enemies=battle.units.filter(u=>u.side==='enemy');
  const heroes=battle.units.filter(u=>u.side==='hero');
  const outcome=fight(seed,'champion');
  results.push({seed,encounterTier,outcome:outcome.outcome,actions:outcome.actions,
   enemyCount:enemies.length,enemyTotalHp:enemies.reduce((n,u)=>n+u.hp,0),
   heroTotalHp:heroes.reduce((n,u)=>n+u.hp,0),fallen:outcome.heroes.filter(u=>u.dead).length});
 }
 const groups=Object.groupBy(results,x=>x.encounterTier);
 for(const [tier,items] of Object.entries(groups)){
  console.log('Champion diagnostics '+JSON.stringify({encounterTier:tier,samples:items.length,
   wins:items.filter(x=>x.outcome==='victory').length,
   meanEnemyHp:items.reduce((n,x)=>n+x.enemyTotalHp,0)/items.length,
   meanHeroHp:items.reduce((n,x)=>n+x.heroTotalHp,0)/items.length,
   meanActions:items.reduce((n,x)=>n+x.actions,0)/items.length,
   fallen:items.reduce((n,x)=>n+x.fallen,0)}));
 }
 assert.equal(results.length,30);
 assert.ok(results.every(x=>x.outcome!=='ongoing'));
});

test('seeded combat outcomes and casualty metrics are reproducible',()=>{
 for(const tier of ['apprentice','veteran','champion']){
  for(const seed of [2,7,19]){
   const first=fight(seed,tier);
   const replay=fight(seed,tier);
   assert.deepEqual(replay,first,'combat diverged on '+tier+' seed '+seed);
  }
 }
});
