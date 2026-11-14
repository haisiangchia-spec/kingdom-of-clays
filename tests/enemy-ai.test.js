import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEnemyAction,bossPhase} from '../src/enemy-ai.js';
import {makeBattle,makeLargeMonsterBattle,makeGeneratedEncounter,rank,ABILITIES,availableTargets,rng} from '../src/engine.js';
import {moveWithinFormation} from '../src/formation.js';

test('enemy decision selects skill uniformly before target, not over all skill-target pairs',()=>{
 const state={};
 const abilities={single:{},many:{}};
 const targets=(_s,_id,key)=>key==='single'?['h1']:['h1','h2','h3','h4'];
 const values=[.49,.9];let i=0;
 assert.deepEqual(chooseEnemyAction(state,'e1',['single','many'],()=>values[i++],abilities,targets),{key:'single',targetId:'h1'});
});
test('weighted skill selection uses skill weights but not target counts',()=>{
 const abilities={rare:{aiWeight:1},common:{aiWeight:3}};
 const targets=(_s,_id,key)=>key==='rare'?['h1','h2','h3','h4']:['h4'];
 assert.deepEqual(chooseEnemyAction({},'e1',['rare','common'],()=>.2,abilities,targets),{key:'rare',targetId:'h1'});
 assert.deepEqual(chooseEnemyAction({},'e1',['rare','common'],()=>.6,abilities,targets),{key:'common',targetId:'h4'});
});
test('enemy skips illegal and zero-weight moves, and returns null for no legal action',()=>{
 const abilities={bad:{aiWeight:0},legal:{},unknown:null};
 const targets=(_s,_id,key)=>key==='legal'?['h2']:[];
 assert.deepEqual(chooseEnemyAction({},'e1',['bad','missing','legal'],()=>0,abilities,targets),{key:'legal',targetId:'h2'});
 assert.equal(chooseEnemyAction({},'e1',['bad','missing'],()=>0,abilities,targets),null);
});
test('real enemy skill choice is deterministic for a seed and targets are legal',()=>{
 const b=makeBattle(42),a=b.units.find(u=>u.id==='e4');
 const keys=['enemy_stress','enemy_strike'];
 const choose=()=>chooseEnemyAction(b,a.id,keys,rng(781),ABILITIES,availableTargets);
 const first=choose();
 assert.deepEqual(first,choose());
 assert.ok(keys.includes(first.key));
 assert.ok(availableTargets(b,a.id,first.key).includes(first.targetId));
});

test('Skeleton Archer prioritizes rear ranks but never targets an illegal rank',()=>{
 const state=makeBattle(55),archer=state.units.find(u=>u.id==='e3');
 const sequence=[.2,.7];let i=0;
 const result=chooseEnemyAction(state,archer.id,['enemy_strike'],()=>sequence[i++],ABILITIES,availableTargets);
 assert.equal(result.key,'enemy_strike');
 assert.equal(result.targetId,'h4','70% weighted draw favors the rearmost hero');
 assert.ok(availableTargets(state,archer.id,result.key).includes(result.targetId));
});
test('Court Mage skill preference and high-stress targeting use independent rolls',()=>{
 const state=makeBattle(55),mage=state.units.find(u=>u.id==='e4');
 state.units.find(u=>u.id==='h4').stress=100;
 const sequence=[.6,.9];let i=0;
 const result=chooseEnemyAction(state,mage.id,['enemy_stress','enemy_strike'],()=>sequence[i++],ABILITIES,availableTargets);
 assert.deepEqual(result,{key:'enemy_stress',targetId:'h4'});
});
test('profiles gracefully fall back to uniform choice on unknown monsters',()=>{
 const state=makeBattle(55),enemy=state.units.find(u=>u.id==='e1');
 enemy.name='Unknown Monster';
 const result=chooseEnemyAction(state,'e1',['enemy_strike'],()=>.75,ABILITIES,availableTargets);
 assert.deepEqual(result,{key:'enemy_strike',targetId:'h4'});
});
test('target preferences update after party order changes',()=>{
 const state=makeBattle(55);
 const archer=state.units.find(u=>u.id==='e3');
 const rear=state.units.find(u=>u.id==='h4');
 state.units.splice(state.units.indexOf(rear),1);
 state.units.unshift(rear);
 const result=chooseEnemyAction(state,archer.id,['enemy_strike'],()=>.99,ABILITIES,availableTargets);
 assert.equal(result.targetId,'h3','after reordering, the new rear hero is preferred');
});

test('Goblin Emperor phase changes only at or below half HP',()=>{
 const b=makeLargeMonsterBattle(18),boss=b.units.find(x=>x.id==='boss');
 assert.equal(bossPhase(boss),'commanding');
 boss.hp=49;assert.equal(bossPhase(boss),'commanding');
 boss.hp=48;assert.equal(bossPhase(boss),'desperate');
 boss.hp=1;assert.equal(bossPhase(boss),'desperate');
 assert.equal(bossPhase(b.units.find(x=>x.id==='e4')),null);
});
test('Goblin Emperor favors roar before half HP and slam afterward',()=>{
 const b=makeLargeMonsterBattle(19),boss=b.units.find(x=>x.id==='boss');
 const choose=()=>chooseEnemyAction(b,'boss',boss.enemySkills,()=>.5,ABILITIES,availableTargets);
 assert.equal(choose().key,'emperor_roar','normal phase weights 1:3');
 boss.hp=48;
 assert.equal(choose().key,'emperor_slam','desperate phase weights 4:1');
 assert.ok(availableTargets(b,'boss',choose().key).includes(choose().targetId));
});
test('boss target preference favors injured legal heroes without excluding healthy heroes',()=>{
 const b=makeLargeMonsterBattle(20),boss=b.units.find(x=>x.id==='boss');
 const first=b.units.find(x=>x.id==='h1'),second=b.units.find(x=>x.id==='h2');
 first.hp=1;
 // Skill roll .1 selects slam, target roll .5 selects first injured hero.
 const picks=[.1,.5];let n=0;
 const selected=chooseEnemyAction(b,'boss',boss.enemySkills,()=>picks[n++],ABILITIES,availableTargets);
 assert.equal(selected.key,'emperor_slam');
 assert.equal(selected.targetId,'h1');
 assert.ok(second.hp>first.hp);
});
test('boss phase selection re-evaluates dynamically between two action slots',()=>{
 const b=makeLargeMonsterBattle(21),boss=b.units.find(x=>x.id==='boss');
 b.queue=['boss','boss'];
 const before=chooseEnemyAction(b,'boss',boss.enemySkills,()=>.5,ABILITIES,availableTargets);
 boss.hp=48;
 const after=chooseEnemyAction(b,'boss',boss.enemySkills,()=>.5,ABILITIES,availableTargets);
 assert.equal(before.key,'emperor_roar');
 assert.equal(after.key,'emperor_slam');
 assert.deepEqual(b.queue,['boss','boss']);
});

test('Javelineer AI chooses only legal rank-dependent attacks',()=>{
 const battle=makeGeneratedEncounter(1000003,'patrol','plague','champion');
 const foe=battle.units.find(u=>u.enemyProfile==='plagueSkiver');
 assert.ok(foe);
 // In the back, Goring Retreat is illegal; only javelin or volley may fire.
 for(let n=0;n<20;n++){
  const picked=chooseEnemyAction(battle,foe.id,foe.enemySkills,()=>n/20,ABILITIES,availableTargets);
  assert.ok(picked);
  assert.notEqual(picked.key,'plague_skiver_flight');
  assert.ok(availableTargets(battle,foe.id,picked.key).includes(picked.targetId));
 }
 // Move Javelineer to the front: ranged attacks are no longer legal.
 const first=battle.units.findIndex(u=>u.side==='enemy');
 const old=battle.units.indexOf(foe);
 [battle.units[first],battle.units[old]]=[battle.units[old],battle.units[first]];
 assert.equal(rank(battle,foe.id),0);
 for(let n=0;n<20;n++){
  const picked=chooseEnemyAction(battle,foe.id,foe.enemySkills,()=>n/20,ABILITIES,availableTargets);
  assert.equal(picked.key,'plague_skiver_flight');
  assert.ok(availableTargets(battle,foe.id,picked.key).includes(picked.targetId));
 }
});

test('Javelineer AI honours skill preferences without selecting illegal ranks',()=>{
 const battle=makeGeneratedEncounter(2000006,'patrol','plague','champion');
 const foe=battle.units.find(u=>u.enemyProfile==='plagueSkiver');
 assert.ok(foe);
 const legal=foe.enemySkills.filter(key=>availableTargets(battle,foe.id,key).length);
 assert.ok(legal.includes('plague_skiver_roast'));
 assert.ok(legal.includes('plague_skiver_cripple'));
 const counts={};
 for(let n=0;n<100;n++){
  const picked=chooseEnemyAction(battle,foe.id,foe.enemySkills,()=>((n+.5)/100),ABILITIES,availableTargets);
  assert.ok(picked);
  counts[picked.key]=(counts[picked.key]??0)+1;
 }
 assert.ok((counts.plague_skiver_cripple??0)>(counts.plague_skiver_roast??0),'Volley should be favoured over Javelin at rear ranks');
});


test('Champion Javelineer AI rechecks legal skills after forced front-rank displacement',()=>{
 let exercised=0;
 for(let seed=1;seed<=200;seed++){
  const battle=makeGeneratedEncounter(seed*1000003,'gauntlet','plague','champion');
  const foe=battle.units.find(u=>u.enemyProfile==='plagueSkiver');
  if(!foe)continue;
  moveWithinFormation(battle,foe.id,-4);
  assert.equal(rank(battle,foe.id),0);
  const legal=foe.enemySkills.filter(id=>availableTargets(battle,foe.id,id).length);
  assert.ok(legal.length,'Front-rank Javelineer must retain a legal move');
  for(let choice=0;choice<5;choice++){
   const action=chooseEnemyAction(battle,foe.id,foe.enemySkills,()=>choice/5,ABILITIES,availableTargets);
   assert.ok(action,'AI must return an action');
   assert.ok(legal.includes(action.key),'AI selected an illegal front-rank skill');
   assert.ok(availableTargets(battle,foe.id,action.key).includes(action.targetId));
  }
  exercised++;
 }
 assert.ok(exercised>0);
});
