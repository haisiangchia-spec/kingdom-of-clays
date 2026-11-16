import {ENEMY_SKILLS} from '../src/enemy-skills.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle,dungeonCorridors,questObjectiveProgress,resolveHunger,useProvision,purchaseProvision,campMeal,useCampSkill,finishCamp,CAMP_SKILLS,DUNGEON_ROOMS} from '../src/dungeon.js';
import {makeGeneratedEncounter,rng,status,startRound,currentActor,prepareActorTurn,availableTargets,takeTurn,passActorTurn,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {leaveLoot} from '../src/inventory.js';
import {QUESTS} from '../src/quest-board.js';
import {hitChance,effectiveCombatStats,criticalChance} from '../src/dd1-math.js';

import {createCampaignSettlement} from '../src/settlement.js';
import {prepareRosterParty,upgradeHeroEquipment,upgradeHeroSkill} from '../src/hero-roster.js';

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
 const enemyComposition=battle.units.filter(u=>u.side==='enemy').map(u=>u.enemyProfile??u.name);
 const startingHeroHp=battle.units.filter(u=>u.side==='hero').reduce((n,u)=>n+Math.max(0,u.hp),0);
 let actions=0,heroSkillsUsed=0,enemySkillsUsed=0,healsUsed=0;
 const heroSkillCounts={},enemySkillCounts={};
 while(status(battle)==='ongoing'&&actions++<300){
  if(!currentActor(battle))startRound(battle,random);
  const actor=currentActor(battle);
  if(!actor)continue;
  if(prepareActorTurn(battle,actor.id,random)!=='ready')continue;
  if(actor.side==='enemy'){
   const action=chooseEnemyAction(battle,actor.id,actor.enemySkills??[],random,ABILITIES,availableTargets);
   if(action){takeTurn(battle,actor.id,action.key,action.targetId,random);enemySkillsUsed++;enemySkillCounts[action.key]=(enemySkillCounts[action.key]??0)+1;}
   else passActorTurn(battle,actor.id);
  }else{
   const candidates=(HERO_SKILLS[actor.heroClass??actor.name]??[]).flatMap(key=>
    availableTargets(battle,actor.id,key).map(targetId=>({key,targetId})));
   // A basic survival policy: the Priest heals wounded allies, including heroes
   // at 0 HP on Death's Door, before attacking.
   // Without this, expedition win rates measure an intentionally non-healing bot.
   const wounded=battle.units.filter(u=>u.side==='hero'&&!u.dead&&u.hp<u.maxHp)
    .sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp));
   const groupHeal=(actor.heroClass??actor.name)==='Priest'&&
     wounded.filter(u=>u.hp/u.maxHp<=.70).length>=3
      ?candidates.find(c=>c.key==='group_healing'):null;
   const heal=(actor.heroClass??actor.name)==='Priest'
    ?groupHeal??wounded.filter(u=>u.hp/u.maxHp<=.65)
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
    // Prioritize the Champion Skiver's dangerous party-wide blight,
    // then finish off weakened enemies to reduce incoming actions.
    const priority=u=>u.enemyProfile==='plagueSkiver'||u.profileId==='plagueSkiver'||u.name==='Blight Javelineer'?1:0;
    return priority(bb)-priority(aa)||aa.hp/aa.maxHp-bb.hp/bb.maxHp;
   })[0];
   // Avoid wasting turns on non-offensive buffs when no living enemy can
   // be reached: such turns can otherwise mask a formation deadlock.
   // Baseline policy: preserve damage focus rather than overusing stun.
   const chosen=heal??offensive??candidates[0];
   if(chosen){takeTurn(battle,actor.id,chosen.key,chosen.targetId,random);heroSkillsUsed++;heroSkillCounts[chosen.key]=(heroSkillCounts[chosen.key]??0)+1;if(chosen===heal)healsUsed++;}
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
 return {outcome:status(battle),actions,heroSkillsUsed,enemySkillsUsed,healsUsed,enemyComposition,heroSkillCounts,enemySkillCounts,startingHeroHp,
  endingHeroHp:battle.units.filter(u=>u.side==='hero').reduce((n,u)=>n+Math.max(0,u.hp),0),
  fallenHeroes:battle.units.filter(u=>u.side==='hero'&&u.dead).length};
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
  // This corridor may trigger a random encounter before reaching the room.
  // If it does not, the watch room guarantees the next battle.
  while(d.phase==='explore'&&d.pendingTravel)advanceCorridor(d);
  assert.equal(d.phase,'combat','expected corridor or watch-room encounter');
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
function runFullExpedition(seed,questId,tier,region,{party=null,enableCamping=false,enableProvisions=false}={}){
 const quest=QUESTS.find(q=>q.id===questId);
 assert.ok(quest,'Unknown quest in expedition simulation: '+questId);
 assert.equal(quest.tier,tier);
 assert.equal(quest.region,region);
 const d=createDungeon(seed,{tier,region,difficulty:quest.difficulty,proceduralBranches:true,variableCorridors:true,interactiveEvents:true,...(party?{party}:{})});
 assert.equal(d.difficulty,quest.difficulty,'expedition difficulty did not match quest board');
 d.questId=questId;
 if(enableProvisions){
  const budget={gold:2000};
  for(const [kind,qty] of [['antivenom',2],['bandage',1],['medicinalHerbs',1]]){
   try{purchaseProvision(d,budget,kind,qty);}catch(e){
    if(!/Inventory full/.test(e.message))throw e;
   }
  }
 }
 let encounterAttrition=[],firstEncounterReport=null,firstEnemyComposition=null,finalEnemyComposition=[],steps=0,battles=0,skills=0,heroSkills=0,enemySkills=0,heals=0,torchesUsed=0,foodHeals=0,campsUsed=0,curativesUsed=0,skiverEncounters=0,fourEnemyEncounters=0;
 while(d.phase==='explore'||d.phase==='combat'){
  assert.ok(++steps<1000,'expedition stalled: '+questId+' '+seed);
  if(d.phase==='combat'){
   const report=playEncounter(d);
   if(!firstEnemyComposition){firstEnemyComposition=report.enemyComposition;firstEncounterReport={outcome:report.outcome,actions:report.actions,heroSkills:report.heroSkillsUsed,enemySkills:report.enemySkillsUsed,heals:report.healsUsed,hpBefore:report.startingHeroHp,hpAfter:report.endingHeroHp,fallen:report.fallenHeroes,heroSkillsUsed:report.heroSkillCounts,enemySkillsUsed:report.enemySkillCounts};}
   finalEnemyComposition=report.enemyComposition;
   encounterAttrition.push({battle:battles+1,enemies:report.enemyComposition,hpBefore:report.startingHeroHp,hpAfter:report.endingHeroHp,fallen:report.fallenHeroes,heroActions:report.heroSkillsUsed,enemyActions:report.enemySkillsUsed,heals:report.healsUsed});
   if(report.enemyComposition.includes('plagueSkiver'))skiverEncounters++;
   if(report.enemyComposition.length===4)fourEnemyEncounters++;
   battles++;
   skills+=report.heroSkillsUsed+report.enemySkillsUsed;
   heroSkills+=report.heroSkillsUsed;
   enemySkills+=report.enemySkillsUsed;
   heals+=report.healsUsed;
   continue;
  }
  if(d.pendingLoot){leaveLoot(d);continue;}
  if(d.pendingHunger){resolveHunger(d,(d.supplies.food??0)>=4?'eat':'skip');continue;}
  if(enableProvisions){
   let cured=false;
   for(const hero of d.party.filter(h=>!h.dead)){
    const dot=hero.dot??[];
    const effects=hero.effects??[];
    const kind=dot.some(x=>x.type==='blight')?'antivenom':
      dot.some(x=>x.type==='bleed')?'bandage':
      effects.some(x=>x.kind==='debuff')?'medicinalHerbs':null;
    if(kind&&(d.supplies[kind]??0)>0){
     useProvision(d,kind,hero.id);curativesUsed++;cured=true;break;
    }
   }
   if(cured)continue;
  }
  if(enableCamping&&d.firewood>0&&d.room!=='entrance'&&(d.cleared.includes(d.room)||DUNGEON_ROOMS[d.room]?.encounter===false)&&
     !d.pendingTravel){
   const living=d.party.filter(h=>!h.dead);
   const wounded=living.filter(h=>h.hp<h.maxHp);
   const totalMissing=living.reduce((n,h)=>n+h.maxHp-h.hp,0);
   // Camp proactively after a damaging encounter. Meal costs are based on
   // living party size; reserve food for hunger, and use a zero-food rest
   // only when the remaining respite healing outweighs the meal penalty.
   const food=d.supplies.food??0;
   const meal=food>=8&&totalMissing>=20?8:
     food>=4&&totalMissing>=12?4:
     food>=2&&totalMissing>=20?2:null;
   if(meal!==null){
    campMeal(d,meal);campsUsed++;
    if(d.camp.respite>=CAMP_SKILLS.sanctuary.cost)useCampSkill(d,'sanctuary');
    while(d.camp.respite>=CAMP_SKILLS.fieldDressing.cost){
     const target=d.party.filter(h=>!h.dead&&h.hp<h.maxHp)
       .sort((a,b)=>(b.maxHp-b.hp)-(a.maxHp-a.hp))[0];
     if(!target)break;
     useCampSkill(d,'fieldDressing',target.id);
    }
    finishCamp(d);continue;
   }
  }
  // Provisional benchmark policy: use spare rations before another fight
  // when a hero falls below half HP, retaining four for the next hunger check.
  const critical=d.party.filter(h=>!h.dead&&h.hp<=Math.floor(h.maxHp/2)&&h.hp<h.maxHp)
    .sort((a,b)=>a.hp-b.hp)[0];
  if(critical&&(d.supplies.food??0)>4){
   useProvision(d,'food',critical.id);
   foodHeals++;
   continue;
  }
  // The benchmark player uses purchased torches before entering dark corridors.
  // Otherwise late-tier survival is confounded by avoidable low-light penalties.
  if((d.supplies.torch??0)>0&&d.torch<=50){useProvision(d,'torch');torchesUsed++;continue;}
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
 return {phase:d.phase,difficulty:quest.difficulty,battles,skills,heroSkills,enemySkills,heals,torchesUsed,foodHeals,campsUsed,curativesUsed,skiverEncounters,fourEnemyEncounters,encounterAttrition,firstEncounterReport,firstEnemyComposition,finalEnemyComposition,steps,food:d.supplies.food,torch:d.torch,room:d.room,cleared:d.cleared,party:d.party.map(h=>({hp:h.hp,stress:h.stress,dead:h.dead}))};
}
test('expedition benchmark uses each quest difficulty, not the default scout setting',()=>{
 for(const quest of QUESTS){
  const result=runFullExpedition(151,quest.id,quest.tier,quest.region);
  assert.equal(result.difficulty,quest.difficulty,'incorrect benchmark difficulty for '+quest.id);
 }
});

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
   meanTorchesUsed:mean(r=>r.torchesUsed),
   meanFoodHeals:mean(r=>r.foodHeals),
   meanSkiverEncounters:mean(r=>r.skiverEncounters),
   meanFourEnemyEncounters:mean(r=>r.fourEnemyEncounters),
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

// Progression audit: these simulations currently instantiate fresh encounter
// templates rather than the persistent roster. Keep that distinction explicit
// so late-tier balance results are not mistaken for upgraded-party outcomes.
test('late-tier balance fixture uses unprogressed baseline heroes',()=>{
 for(const tier of ['veteran','champion']){
  const dungeon=createDungeon(223,{tier,region:'plague',difficulty:'scout'});
  const baseline=createDungeon(223,{tier:'apprentice',region:'plague',difficulty:'scout'});
  assert.deepEqual(dungeon.party.map(h=>({hp:h.hp,maxHp:h.maxHp,dmgMin:h.dmgMin,dmgMax:h.dmgMax,skillLevels:h.skillLevels})),
   baseline.party.map(h=>({hp:h.hp,maxHp:h.maxHp,dmgMin:h.dmgMin,dmgMax:h.dmgMax,skillLevels:h.skillLevels})),
   'late-tier fixture unexpectedly changed hero combat readiness');
  assert.ok(dungeon.party.every(h=>h.rosterId===undefined),
   'late-tier fixture unexpectedly uses persistent roster heroes');
 }
});

test('equipment upgrades improve actual hit probability against evasive enemies',()=>{
 const settlement=createCampaignSettlement();
 settlement.gold=100000;
 const hero=settlement.roster[0];
 hero.level=5;
 const before=hitChance({accuracy:85,accModifier:effectiveCombatStats(hero.unit).accuracy,dodge:31.25});
 for(let i=0;i<5;i++)upgradeHeroEquipment(settlement,hero.rosterId,'weapon');
 const after=hitChance({accuracy:85,accModifier:effectiveCombatStats(hero.unit).accuracy,dodge:31.25});
 assert.ok(after>before,'weapon progression must affect real combat hit chance');
 assert.ok(after<=100,'hit chance must remain capped');
 assert.equal(effectiveCombatStats(hero.unit).accuracy,25);
});

test('weapon upgrades improve actual critical hit probability',()=>{
 const settlement=createCampaignSettlement();
 settlement.gold=100000;
 const hero=settlement.roster[0];
 hero.level=5;
 const baseCrit=hero.unit.crit;
 const before=criticalChance({baseCrit});
 for(let i=0;i<5;i++)upgradeHeroEquipment(settlement,hero.rosterId,'weapon');
 const after=criticalChance({baseCrit:hero.unit.crit});
 assert.equal(hero.unit.crit,baseCrit+5);
 assert.equal(after-before,5,'weapon crit progression must reach combat crit calculation');
});

test('armor upgrades improve actual dodge protection against Champion attacks',()=>{
 const settlement=createCampaignSettlement();
 settlement.gold=100000;
 const hero=settlement.roster[0];
 hero.level=5;
 const enemyAccuracy=95;
 const baseDodge=hero.unit.dodge;
 const before=hitChance({accuracy:enemyAccuracy,dodge:baseDodge});
 for(let i=0;i<5;i++)upgradeHeroEquipment(settlement,hero.rosterId,'armor');
 const after=hitChance({accuracy:enemyAccuracy,dodge:hero.unit.dodge});
 assert.equal(hero.unit.dodge,baseDodge+10);
 assert.ok(Number.isFinite(hero.unit.dodge));
 assert.ok(after<before,'armor dodge upgrades must lower real enemy hit chance');
 assert.ok(after>=5,'enemy hit chance must respect minimum hit cap');
});

test('veteran and champion progression fixtures carry upgraded persistent roster stats',()=>{
 for(const [tier,level] of [['veteran',3],['champion',5]]){
  const settlement=createCampaignSettlement();
  settlement.gold=100000;
  for(const hero of settlement.roster){
   hero.level=level;
   for(let i=0;i<level;i++){
    upgradeHeroEquipment(settlement,hero.rosterId,'weapon');
    upgradeHeroEquipment(settlement,hero.rosterId,'armor');
   }
  }
  const party=prepareRosterParty(settlement);
  const dungeon=createDungeon(223,{tier,region:'plague',difficulty:'scout',party});
  const baseline=createDungeon(223,{tier,region:'plague',difficulty:'scout'});
  for(let i=0;i<4;i++){
   assert.equal(dungeon.party[i].rosterLevel,level);
   assert.equal(dungeon.party[i].dmgMin,baseline.party[i].dmgMin+level);
   assert.equal(dungeon.party[i].dmgMax,baseline.party[i].dmgMax+level*2);
   assert.equal(dungeon.party[i].maxHp,baseline.party[i].maxHp+level*3);
   assert.equal(dungeon.party[i].accMod,baseline.party[i].accMod+level*5);
   assert.equal(dungeon.party[i].crit,baseline.party[i].crit+level);
   assert.equal(dungeon.party[i].dodge,baseline.party[i].dodge+level*2);
  }
 }
});

test('report full expedition attrition with upgraded persistent roster parties',()=>{
 const seeds=[11,23,37,41,53,67,71,83,97,109];
 for(const [questId,tier,level] of [['warrens-veteran','veteran',3],['warrens-champion','champion',5]]){
  const settlement=createCampaignSettlement();
  settlement.gold=100000;
  for(const hero of settlement.roster){
   hero.level=level;
   for(let i=0;i<level;i++){
    upgradeHeroEquipment(settlement,hero.rosterId,'weapon');
    upgradeHeroEquipment(settlement,hero.rosterId,'armor');
   }
  }
  const results=seeds.map(seed=>runFullExpedition(seed,questId,tier,'plague',{party:prepareRosterParty(settlement)}));
  const victories=results.filter(r=>r.phase==='victory').length;
  const mean=fn=>Number((results.reduce((sum,r)=>sum+fn(r),0)/results.length).toFixed(2));
  const report={questId,tier,level,n:results.length,victories,defeats:results.length-victories,
   meanFallen:mean(r=>r.party.filter(h=>h.dead).length),
   meanRemainingHp:mean(r=>r.party.reduce((sum,h)=>sum+Math.max(0,h.hp),0)),
   meanStress:mean(r=>r.party.reduce((sum,h)=>sum+h.stress,0)),
   outcomes:results.map((r,i)=>({seed:seeds[i],result:r.phase,battles:r.battles}))};
  assert.equal(report.victories+report.defeats,report.n);
  console.log('Progressed full expedition attrition',JSON.stringify(report));
 }
});

test('audit tier encounter composition and enemy action economy without modifying balance',()=>{
 for(const tier of ['apprentice','veteran','champion']){
  const counts={},actions={},hp={};
  for(const seed of [11,23,37,41,53,67,71,83,97,109]){
   const encounter=createDungeon(seed,{tier,region:'plague',difficulty:'scout'});
   const battle=createDungeon(seed,{tier,region:'plague',difficulty:'scout'});
   // Generate a seeded combat encounter directly, independently of travel.
   const generated=makeGeneratedEncounter(seed,'scout','plague',tier);
   for(const enemy of generated.units.filter(u=>u.side==='enemy')){
    const name=enemy.name;
    counts[name]=(counts[name]??0)+1;
    actions[name]=(actions[name]??0)+(enemy.actionsPerRound??1);
    hp[name]=(hp[name]??0)+enemy.maxHp;
   }
   assert.equal(encounter.party.length,battle.party.length);
  }
  console.log('Tier enemy composition audit',JSON.stringify({tier,counts,actions,hp}));
 }
});

test('report higher-tier expedition attrition with equipment and verified skill upgrades',()=>{
 const seeds=[11,23,37,41,53,67,71,83,97,109];
 // Upgrade every skill the benchmark bot can actually select, not just two per class.
 const skillsByClass=HERO_SKILLS;
 for(const [questId,tier,level] of [['warrens-veteran','veteran',3],['warrens-champion','champion',5]]){
  const settlement=createCampaignSettlement();
  settlement.gold=100000;
  const upgraded=[];
  for(const hero of settlement.roster){
   hero.level=level;
   for(let i=0;i<level;i++){
    upgradeHeroEquipment(settlement,hero.rosterId,'weapon');
    upgradeHeroEquipment(settlement,hero.rosterId,'armor');
   }
   for(const skillId of skillsByClass[hero.heroClass]??[]){
    for(let target=2;target<=level;target++){
     try{upgradeHeroSkill(settlement,hero.rosterId,skillId);upgraded.push(hero.heroClass+':'+skillId+':'+target);}
     catch(error){
      if(!/Unverified skill upgrade|No verified|not verified|Unknown skill|not available/.test(error.message))throw error;
      break;
     }
    }
   }
  }
  // Each seed is an independent, fully recovered expedition, not a continuation
  // of the previous seed's injuries, deaths, or stress.
  for(const hero of settlement.roster){
   assert.equal(hero.equipment.weapon,level);
   assert.equal(hero.equipment.armor,level);
   hero.unit.hp=hero.unit.maxHp;
   hero.unit.stress=0;
   hero.unit.dead=false;
   for(const skillId of skillsByClass[hero.heroClass]??[]){
    assert.ok((hero.unit.skillLevels?.[skillId]??1)>=1,'missing usable skill '+skillId);
   }
  }
  const freshParty=()=>prepareRosterParty(settlement);
  for(const hero of freshParty()){
   assert.equal(hero.hp,hero.maxHp,'benchmark hero is not fully healed');
   assert.equal(hero.stress,0,'benchmark hero starts with stress');
   assert.equal(hero.dead,false,'benchmark hero starts dead');
  }
  const results=seeds.map(seed=>runFullExpedition(seed,questId,tier,'plague',{party:freshParty(),enableCamping:true,enableProvisions:true}));
  const wins=results.filter(r=>r.phase==='victory').length;
  console.log('Fully progressed expedition attrition',JSON.stringify({questId,tier,level,n:seeds.length,wins,defeats:seeds.length-wins,upgraded,
   meanBattles:Number((results.reduce((n,r)=>n+r.battles,0)/results.length).toFixed(2)),
   meanSkiverEncounters:Number((results.reduce((n,r)=>n+r.skiverEncounters,0)/results.length).toFixed(2)),
   meanFourEnemyEncounters:Number((results.reduce((n,r)=>n+r.fourEnemyEncounters,0)/results.length).toFixed(2)),
   meanTorchesUsed:Number((results.reduce((n,r)=>n+r.torchesUsed,0)/results.length).toFixed(2)),
   meanFoodHeals:Number((results.reduce((n,r)=>n+r.foodHeals,0)/results.length).toFixed(2)),
   meanCampsUsed:Number((results.reduce((n,r)=>n+r.campsUsed,0)/results.length).toFixed(2)),
   meanCurativesUsed:Number((results.reduce((n,r)=>n+r.curativesUsed,0)/results.length).toFixed(2)),
   meanHeroSkills:Number((results.reduce((n,r)=>n+r.heroSkills,0)/results.length).toFixed(2)),
   meanEnemySkills:Number((results.reduce((n,r)=>n+r.enemySkills,0)/results.length).toFixed(2)),
   meanRemainingHp:Number((results.reduce((n,r)=>n+r.party.reduce((hp,h)=>hp+Math.max(0,h.hp),0),0)/results.length).toFixed(2)),
   meanDeaths:Number((results.reduce((n,r)=>n+r.party.filter(h=>h.dead).length,0)/results.length).toFixed(2)),
   outcomes:results.map((r,i)=>({seed:seeds[i],phase:r.phase,battles:r.battles,skivers:r.skiverEncounters,fourEnemy:r.fourEnemyEncounters,torches:r.torchesUsed,foodHeals:r.foodHeals,encounters:r.encounterAttrition,firstEncounter:r.firstEncounterReport,firstEnemyComposition:r.firstEnemyComposition,finalEnemyComposition:r.finalEnemyComposition,deaths:r.party.filter(h=>h.dead).length}))}));
  assert.equal(results.length,seeds.length);
 }
});

test('audit Champion Skiver multi-target burst without changing combat rules',()=>{
 const skills=['plague_skiver_roast','plague_skiver_cripple','plague_skiver_flight'];
 const attacks=skills.map(id=>{
  const skill=ENEMY_SKILLS[id];
  assert.ok(skill,'Missing enemy skill '+id);
  return {id,name:skill.name,min:skill.damageMin,max:skill.damageMax,
   targetMode:skill.targetMode??'single',status:skill.status?.type??null,
   debuff:Boolean(skill.debuff),accuracy:skill.acc};
 });
 const volley=attacks.find(a=>a.id==='plague_skiver_cripple');
 assert.equal(volley.targetMode,'all');
 assert.equal(volley.status,'blight');
 console.log('Champion Skiver burst audit',JSON.stringify(attacks));
});
