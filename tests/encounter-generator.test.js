import test from 'node:test';
import assert from 'node:assert/strict';
import {createEncounterPlan,spawnEncounterPlan,ENCOUNTER_DIFFICULTIES,ENCOUNTER_TABLES,ENCOUNTER_TEMPLATES,THREAT_POINTS} from '../src/encounter-generator.js';
import {makeGeneratedEncounter,unit,rng,formationSlots,availableTargets,startRound,currentActor,prepareActorTurn,ABILITIES,status} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';

test('weighted template boundaries are deterministic and difficulty-specific',()=>{
 for(const difficulty of ENCOUNTER_DIFFICULTIES){
  const table=ENCOUNTER_TABLES[difficulty];
  const total=table.reduce((sum,e)=>sum+e.weight,0);
  let used=0;
  for(const entry of table){
   const p=createEncounterPlan(difficulty,()=> (used+.5*entry.weight)/total);
   assert.equal(p.template,entry.id);
   assert.deepEqual(p.profiles,ENCOUNTER_TEMPLATES[entry.id]);
   used+=entry.weight;
  }
 }
 assert.equal(createEncounterPlan('scout',()=>0).template,'shieldline');
 assert.throws(()=>createEncounterPlan('unknown',()=>.5),/Unknown encounter difficulty/);
 for(const invalid of [-.01,1,NaN,Infinity])assert.throws(()=>createEncounterPlan('patrol',()=>invalid),/Encounter random/);
});

test('generated formations satisfy four-rank capacity and give every enemy at least one attack',()=>{
 for(const difficulty of ENCOUNTER_DIFFICULTIES){
  for(let seed=1;seed<=150;seed++){
   const battle=makeGeneratedEncounter(seed,difficulty);
   const p=battle.encounterPlan,foes=battle.units.filter(u=>u.side==='enemy');
   const slots=formationSlots(battle,'enemy');
   assert.equal(p.difficulty,difficulty);
   assert.equal(p.source,'clays-provisional-encounter-table');
   assert.ok(slots.filter(Boolean).length<=4);
   assert.equal(foes.length,p.profiles.length);
   assert.ok(foes.length>=3&&foes.length<=4);
   assert.equal(new Set(foes.map(u=>u.id)).size,foes.length);
   assert.deepEqual(foes.map(u=>u.enemyProfile),p.profiles);
   assert.equal(p.threat,foes.reduce((sum,u)=>sum+THREAT_POINTS[u.enemyProfile],0));
   for(const foe of foes){
    assert.ok(foe.enemySkills.some(k=>availableTargets(battle,foe.id,k).length>0),
      `${difficulty} seed ${seed} created helpless ${foe.name}`);
   }
  }
 }
});

test('generated encounter is identical across instances with same seed and difficulty',()=>{
 for(const difficulty of ENCOUNTER_DIFFICULTIES){
  for(const seed of [1,7,99,912,21001]){
   const a=makeGeneratedEncounter(seed,difficulty),b=makeGeneratedEncounter(seed,difficulty);
   assert.deepEqual(a.encounterPlan,b.encounterPlan);
   assert.deepEqual(a.units,b.units);
   assert.deepEqual(a.log,b.log);
   startRound(a,rng(41));startRound(b,rng(41));
   assert.deepEqual(a.queue,b.queue);
  }
 }
});

test('generated scout / patrol / gauntlet have increasing expected enemy counts and threat',()=>{
 const stats={};
 for(const difficulty of ENCOUNTER_DIFFICULTIES){
  const entries=ENCOUNTER_TABLES[difficulty];
  const weight=entries.reduce((sum,x)=>sum+x.weight,0);
  const size=entries.reduce((sum,x)=>sum+ENCOUNTER_TEMPLATES[x.id].length*x.weight,0)/weight;
  const threat=entries.reduce((sum,x)=>sum+ENCOUNTER_TEMPLATES[x.id].reduce((s,p)=>s+THREAT_POINTS[p],0)*x.weight,0)/weight;
  stats[difficulty]={size,threat};
 }
 assert.ok(stats.scout.size<stats.patrol.size);
 assert.ok(stats.patrol.size<stats.gauntlet.size);
 assert.ok(stats.scout.threat<stats.patrol.threat);
 assert.ok(stats.patrol.threat<stats.gauntlet.threat);
});

test('duplicate spawned enemies retain independent status and AI skill arrays',()=>{
 const plan=createEncounterPlan('gauntlet',()=>0);
 const foes=spawnEncounterPlan(unit,plan);
 assert.equal(foes.filter(u=>u.enemyProfile==='cryptArbalist').length,2);
 const first=foes.find(u=>u.enemyProfile==='cryptArbalist');
 const second=foes.find(u=>u.enemyProfile==='cryptArbalist'&&u!==first);
 first.enemySkills.pop();first.hp=1;first.stun=1;
 assert.equal(second.enemySkills.length,2);
 assert.equal(second.hp,second.maxHp);
 assert.equal(second.stun,0);
});

test('generated enemies can take a legal AI turn on the shared combat engine',()=>{
 const b=makeGeneratedEncounter(123,'gauntlet');
 startRound(b,rng(2));
 const first=b.units.find(u=>u.side==='enemy');
 b.queue=[first.id,'h1'];
 assert.equal(prepareActorTurn(b,first.id,()=>.5),'ready');
 const choice=chooseEnemyAction(b,first.id,first.enemySkills,()=>.5,ABILITIES,availableTargets);
 assert.ok(choice);
 assert.ok(availableTargets(b,first.id,choice.key).includes(choice.targetId));
 assert.equal(status(b),'ongoing');
});
