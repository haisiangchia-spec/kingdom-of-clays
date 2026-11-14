import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEnemyAction,skillDesireWeight} from '../src/enemy-ai.js';
import {makeBattle,makeLargeMonsterBattle,ABILITIES,availableTargets,takeTurn,startRound,rng} from '../src/engine.js';

const find=(battle,id)=>battle.units.find(u=>u.id===id);

test('ally-death desire changes only eligible swordsman skill weight',()=>{
 const battle=makeBattle(70),sword=find(battle,'e1'),mage=find(battle,'e4');
 const pick=()=>chooseEnemyAction(battle,'e1',sword.enemySkills,()=>.4,ABILITIES,availableTargets);
 assert.equal(pick().key,'skeleton_cleaver');
 mage.dead=true;
 assert.equal(pick().key,'skeleton_guard_break');
 assert.ok(availableTargets(battle,'e1',pick().key).includes(pick().targetId));
});

test('skill desire supports living ally conditions without counting corpses',()=>{
 const battle=makeBattle(71),sword=find(battle,'e1'),mage=find(battle,'e4');
 const desire={type:'ally_alive',skill:'skeleton_cleaver',allyProfile:'mage',weight:5};
 const targets=availableTargets(battle,'e1','skeleton_cleaver');
 assert.equal(skillDesireWeight(battle,sword,'skeleton_cleaver',targets,[desire]),5);
 mage.corpse=true;
 assert.equal(skillDesireWeight(battle,sword,'skeleton_cleaver',targets,[desire]),1);
 mage.corpse=false;mage.dead=true;
 assert.equal(skillDesireWeight(battle,sword,'skeleton_cleaver',targets,[desire]),1);
});

test('status desire reacts to eligible hero status and excludes illegal ranks',()=>{
 const battle=makeBattle(72),archer=find(battle,'e3');
 const profile={'Skeleton Archer':{skillDesires:[
  {type:'target_status',skill:'skeleton_pin_arrow',status:'marked',weight:4}
 ]}};
 const pick=()=>chooseEnemyAction(battle,'e3',archer.enemySkills,()=>.4,ABILITIES,availableTargets,profile);
 assert.equal(pick().key,'skeleton_bone_arrow');
 find(battle,'h1').marked=2; // not a legal arrow target
 assert.equal(pick().key,'skeleton_bone_arrow');
 find(battle,'h4').marked=2;
 assert.equal(pick().key,'skeleton_pin_arrow');
});

test('Bleed and Blight status desires match only active statuses on legal heroes',()=>{
 const battle=makeBattle(73),mage=find(battle,'e4');
 const targets=availableTargets(battle,'e4','court_curse');
 const blight={type:'target_status',skill:'court_curse',status:'blight',weight:3};
 const bleed={type:'target_status',skill:'court_curse',status:'bleed',weight:2};
 assert.equal(skillDesireWeight(battle,mage,'court_curse',targets,[blight,bleed]),1);
 find(battle,'h3').dot.push({type:'blight',value:2,turns:3});
 assert.equal(skillDesireWeight(battle,mage,'court_curse',targets,[blight,bleed]),3);
 find(battle,'h3').dot.push({type:'bleed',value:2,turns:0});
 assert.equal(skillDesireWeight(battle,mage,'court_curse',targets,[blight,bleed]),3);
 find(battle,'h3').dot[1].turns=2;
 assert.equal(skillDesireWeight(battle,mage,'court_curse',targets,[blight,bleed]),6);
});

test('performing-turn desire counts completed skills, not round number',()=>{
 const battle=makeLargeMonsterBattle(74),boss=find(battle,'boss');
 const skill= 'emperor_slam',targets=availableTargets(battle,'boss',skill);
 const desire={type:'performing_turn',skill,turn:2,weight:4};
 battle.round=7;battle.queue=['boss','boss','h1'];
 assert.equal(boss.actionsTaken,0);
 assert.equal(skillDesireWeight(battle,boss,skill,targets,[desire]),1);
 takeTurn(battle,'boss','emperor_roar','h1',()=>.5);
 assert.equal(boss.actionsTaken,1);
 assert.equal(skillDesireWeight(battle,boss,skill,targets,[desire]),4);
 takeTurn(battle,'boss','emperor_roar','h1',()=>.5);
 assert.equal(boss.actionsTaken,2);
 assert.equal(skillDesireWeight(battle,boss,skill,targets,[desire]),1);
 startRound(battle,rng(11));
 assert.equal(boss.actionsTaken,2,'new rounds do not reset performed action count');
});

test('a stunned enemy does not advance its performing-turn counter',()=>{
 const battle=makeBattle(75),sword=find(battle,'e1');
 sword.stun=1;battle.queue=['e1','h1'];
 takeTurn(battle,'e1','skeleton_cleaver','h1',()=>.5);
 assert.equal(sword.actionsTaken,0);
 assert.equal(sword.acted,true);
});

test('unknown and invalid skill desires do not produce illegal choices',()=>{
 const battle=makeBattle(76),archer=find(battle,'e3');
 const profile={'Skeleton Archer':{skillDesires:[
  {type:'ally_dead',skill:'skeleton_bone_arrow',allyProfile:'mage',weight:0},
  {type:'target_status',skill:'skeleton_pin_arrow',status:'marked',weight:Infinity}
 ]}};
 for(const roll of [0,.25,.75,.999]){
  const action=chooseEnemyAction(battle,'e3',['skeleton_bone_arrow','skeleton_pin_arrow'],()=>roll,ABILITIES,availableTargets,profile);
  assert.ok(availableTargets(battle,'e3',action.key).includes(action.targetId));
 }
});
