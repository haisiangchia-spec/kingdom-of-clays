import test from 'node:test';
import assert from 'node:assert/strict';
import {makeLargeMonsterBattle,availableTargets,takeTurn,prepareActorTurn,startRound,formationSlots,rng} from '../src/engine.js';
import {corpseFromEnemy} from '../src/formation.js';
import {chooseEnemyAction,bossPhase} from '../src/enemy-ai.js';
import {ABILITIES} from '../src/engine.js';

const get=(s,id)=>s.units.find(u=>u.id===id);

test('reinforcement cannot displace a full formation or a corpse occupying the fourth rank',()=>{
 const b=makeLargeMonsterBattle(13),mage=get(b,'e4'),boss=get(b,'boss');
 boss.hp=48;
 assert.equal(bossPhase(boss),'desperate');
 assert.deepEqual(availableTargets(b,'boss','emperor_call'),[]);
 assert.throws(()=>{b.queue=['boss','boss'];takeTurn(b,'boss','emperor_call','boss',()=>.2);},/Illegal target or rank/);
 mage.hp=0;
 assert.equal(corpseFromEnemy(mage,b.round),true);
 assert.deepEqual(formationSlots(b,'enemy').map(u=>u?.id),['boss','boss','boss','corpse_e4']);
 assert.deepEqual(availableTargets(b,'boss','emperor_call'),[]);
 assert.equal(b.units.filter(u=>u.id.startsWith('reinforcement_')).length,0);
});

test('after corpse removal, desperate boss can summon exactly one independent rear boneguard',()=>{
 const b=makeLargeMonsterBattle(13),mage=get(b,'e4'),boss=get(b,'boss');
 mage.hp=0;corpseFromEnemy(mage,b.round);mage.dead=true;
 boss.hp=48;b.queue=['boss','boss','h1'];
 assert.deepEqual(availableTargets(b,'boss','emperor_call'),['boss']);
 assert.equal(prepareActorTurn(b,'boss',()=>.5),'ready');
 takeTurn(b,'boss','emperor_call','boss',()=>.2);
 const soldier=get(b,'reinforcement_1');
 assert.ok(soldier);
 assert.equal(soldier.enemyProfile,'swordsman');
 assert.notEqual(soldier.enemySkills,boss.enemySkills);
 assert.deepEqual(formationSlots(b,'enemy').map(u=>u?.id),['boss','boss','boss','reinforcement_1']);
 assert.deepEqual(b.queue,['boss','h1'],'summoned minion does not get an action mid-round');
 assert.equal(boss.usedSkills.emperor_call,1);
 assert.deepEqual(availableTargets(b,'boss','emperor_call'),[]);
 soldier.hp=1;
 assert.notEqual(boss.hp,soldier.hp);
});

test('summon limit remains exhausted even after the reinforcement is defeated',()=>{
 const b=makeLargeMonsterBattle(14),boss=get(b,'boss'),mage=get(b,'e4');
 mage.dead=true;boss.hp=48;b.queue=['boss','boss'];
 takeTurn(b,'boss','emperor_call','boss',()=>.5);
 get(b,'reinforcement_1').dead=true;
 assert.deepEqual(availableTargets(b,'boss','emperor_call'),[]);
 assert.throws(()=>takeTurn(b,'boss','emperor_call','boss',()=>.5),/Illegal target or rank/);
});

test('reinforcement gets one action at the next round initiative without changing boss action count',()=>{
 const b=makeLargeMonsterBattle(15),mage=get(b,'e4');
 mage.dead=true;b.queue=['boss','boss','h1'];
 takeTurn(b,'boss','emperor_call','boss',()=>.5);
 startRound(b,rng(42));
 assert.equal(b.queue.filter(id=>id==='reinforcement_1').length,1);
 assert.equal(b.queue.filter(id=>id==='boss').length,2);
 assert.equal(new Set(b.queue).size,6);
});

test('boss AI only considers calling reinforcements when space exists in desperate phase',()=>{
 const b=makeLargeMonsterBattle(16),boss=get(b,'boss');
 boss.hp=48;
 assert.deepEqual(availableTargets(b,'boss','emperor_call'),[]);
 get(b,'e4').dead=true;
 assert.deepEqual(availableTargets(b,'boss','emperor_call'),['boss']);
 const action=chooseEnemyAction(b,'boss',boss.enemySkills,()=>.9,ABILITIES,availableTargets);
 assert.equal(action.key,'emperor_call');
 assert.equal(action.targetId,'boss');
 boss.hp=96;
 assert.notEqual(chooseEnemyAction(b,'boss',boss.enemySkills,()=>.9,ABILITIES,availableTargets).key,'emperor_call');
});
