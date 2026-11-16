import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGeneratedEncounter,rng,startRound,currentActor,prepareActorTurn,passActorTurn,takeTurn,availableTargets,status,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';

// Deliberately modest: real combat turns, not fabricated expedition victories.
// Report survival metrics without setting a balance threshold prematurely.
const heroSkills={
 swordsman:['heavy_slash','countering_advance'],
 warrior:['crushing_strike','sweeping_assault'],
 hunter:['sniper_shot','aimed_shot'],
 priest:['smite','judgement']
};
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
   const candidates=[...(heroSkills[actor.classId]??[]),...Object.keys(ABILITIES).filter(k=>ABILITIES[k].classId===actor.classId)];
   for(const key of candidates){
    const targets=availableTargets(battle,actor.id,key);
    const enemy=targets.find(id=>battle.units.some(u=>u.id===id&&u.side==='enemy'&&!u.dead));
    if(enemy){action={key,targetId:enemy};break;}
   }
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
