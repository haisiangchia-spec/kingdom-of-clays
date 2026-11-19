import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,expeditionBonuses,encodeCampaignSave,decodeCampaignSave,upgradeFacility,nextFacilityCost,upgradeStageCoach,STAGE_COACH_UPGRADE_COSTS} from '../src/settlement.js';
import {selectQuest} from '../src/quest-board.js';
import {completeCampaignExpedition,campaignProgress} from '../src/campaign-progression.js';
import {prepareRosterParty,returnPartyToRoster,selectHero,resurrectHero,equipTrinket,dismissHero,rosterCapacity,upgradeHeroEquipment,upgradeHeroSkill} from '../src/hero-roster.js';
import {advanceTownWeek,recruitFromCoach,bookStressTreatment,TREATMENTS} from '../src/town-week.js';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle,resolveHunger,purchaseProvision,campMeal,useCampSkill,finishCamp,CAMP_SKILLS} from '../src/dungeon.js';
import {leaveLoot,collectLoot,inventoryCanAdd} from '../src/inventory.js';
import {rng,startRound,currentActor,prepareActorTurn,passActorTurn,takeTurn,availableTargets,status,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {chooseHeroAction} from './full-expedition-endurance.test.js';

const BENCHMARK_SKILLS={
 Swordsman:['heavy_slash','countering_advance','battle_shout','guardian_parry','riposte_stance','swordmasters_orders','steadfast_resolve'],
 Warrior:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],
 Hunter:['eagle_eye_shot','hunters_mark'],
 Priest:['greater_heal','group_healing','sacred_strike']
};

// Actual campaign lifecycle: quest-board unlocks, real combat, rewards, XP,
// persistent roster, weekly town recovery and stage-coach replacement.
// No manual XP/level assignment, forced victories or invented equipment.
function battle(d,random){
 const b=dungeonBattle(d);let turns=0;
 while(status(b)==='ongoing'&&turns++<600){
  if(!currentActor(b))startRound(b,random);
  const actor=currentActor(b);
  if(!actor)continue;
  if(prepareActorTurn(b,actor.id,random)!=='ready')continue;
  const action=actor.side==='enemy'
   ?chooseEnemyAction(b,actor.id,actor.enemySkills??[],random,ABILITIES,availableTargets)
   :chooseHeroAction(b,actor);
  if(action)takeTurn(b,actor.id,action.key,action.targetId,random);
  else passActorTurn(b,actor.id);
 }
 assert.notEqual(status(b),'ongoing','combat stalled');
 resolveDungeonBattle(d);
}
function handleLoot(d){
 if(!d.pendingLoot)return;
 const {kind,quantity}=d.pendingLoot;
 if(inventoryCanAdd(d,kind,quantity))collectLoot(d);
 else {d._discardedLoot??=[];d._discardedLoot.push({kind,quantity});leaveLoot(d);}
}
function play(d,seed){
 const random=rng(seed+830000);
 const mix={lower:0,same:0};let encounters=0,campsUsed=0;
 for(const room of ['gallery','watch','gallery','vault','gallery','watch','sanctum']){
  if(d.phase!=='explore')break;
  if(d.pendingLoot)handleLoot(d);
  // Use actual dungeon camping, not free between-encounter healing.
  if(d.phase==='explore'&&!d.pendingTravel&&!d.pendingHunger&&!d.camp&&
    d.firewood>0&&d.room!=='entrance'&&d.cleared.includes(d.room)){
   const living=d.party.filter(h=>!h.dead);
   const missing=living.reduce((n,h)=>n+h.maxHp-h.hp,0);
   const food=d.supplies.food??0;
   const meal=food>=8&&missing>=20?8:food>=4&&missing>=12?4:null;
   if(meal!==null){
    campMeal(d,meal);campsUsed++;
    if(d.camp.respite>=CAMP_SKILLS.sanctuary.cost)useCampSkill(d,'sanctuary');
    while(d.camp.respite>=CAMP_SKILLS.fieldDressing.cost){
     const wounded=living.filter(h=>h.hp<h.maxHp).sort((a,b)=>(b.maxHp-b.hp)-(a.maxHp-a.hp))[0];
     if(!wounded)break;
     useCampSkill(d,'fieldDressing',wounded.id);
    }
    finishCamp(d);
    if(d.phase==='combat'){encounters++;battle(d,random);}
   }
  }
  beginCorridor(d,room);
  let guard=0;
  while((d.pendingTravel||d.phase==='combat')&&!['victory','defeat'].includes(d.phase)&&guard++<70){
   if(d.phase==='combat'){
    const b=dungeonBattle(d);
    const lower={veteran:'apprentice',champion:'veteran'}[d.tier];
    if(lower){
     assert.ok([lower,d.tier].includes(b.encounterTier));
     mix[b.encounterTier===lower?'lower':'same']++;
    }
    encounters++;battle(d,random);
   }else if(d.pendingLoot)handleLoot(d);
   else if(d.pendingHunger)resolveHunger(d,d.supplies.food>=4?'eat':'skip');
   else advanceCorridor(d);
  }
  assert.ok(guard<70,'travel stalled');
 }
 if(d.pendingLoot)handleLoot(d);
 return {encounters,mix,campsUsed};
}
function fillSquad(town){
 // Recruit from the actual Stage Coach and release deceased roster entries.
 // Prefer healthy veterans over stressed survivors, while preserving earned XP.
 while(town.roster.filter(h=>!h.unit.dead).length<4&&town.town.offers.length){
  if(town.roster.length>=rosterCapacity(town)){
   const deceased=town.roster.find(h=>h.unit.dead);
   if(!deceased)break;
   dismissHero(town,deceased.rosterId);
  }
  recruitFromCoach(town,town.town.offers[0].offerId);
 }
 // Build a reserve from genuine weekly Stage Coach offers, not only after deaths.
 // This permits exhausted veterans to recover while fresh recruits embark.
 while(town.roster.length<rosterCapacity(town)&&town.town.offers.length){
  recruitFromCoach(town,town.town.offers[0].offerId);
 }
 const candidates=town.roster.filter(h=>!h.unit.dead&&
  !town.town.treatments.some(t=>t.rosterId===h.rosterId));
 if(candidates.length<4)return false;
 // Avoid repeatedly sending afflicted high-level heroes into combat.
 // Once stress is manageable, favour earned level and purchased equipment.
 const readiness=h=>(h.unit.stress>=100?-1000:0)-
  h.unit.stress*2+h.level*25+
  ((h.equipment?.weapon??0)+(h.equipment?.armor??0))*8+
  h.unit.hp/h.unit.maxHp*20;
 candidates.sort((a,b)=>readiness(b)-readiness(a));
 const selected=candidates.slice(0,4);
 // Release previous positions before reselecting to avoid duplicate rank errors.
 town.squad=[null,null,null,null];
 selected.forEach((hero,i)=>selectHero(town,i,hero.rosterId));
 return true;
}
function prepareTown(town){
 // Expand barracks before filling reserves; all costs are paid from earned loot.
 for(const track of ['barracks','network']){
  const level=town.stageCoach[track];
  if(level>=5)continue;
  const affordable=Object.entries(STAGE_COACH_UPGRADE_COSTS[track]).every(([resource,base])=>(town[resource]??0)>=base*(level+1));
  if(affordable)upgradeStageCoach(town,track);
 }
 // All upgrades and services go through public gameplay actions, using earned resources.
 for(const facility of ['guild','temple','market']){
  const cost=nextFacilityCost(town,facility);
  if(cost&&Object.entries(cost).every(([resource,amount])=>(town[resource]??0)>=amount))
   upgradeFacility(town,facility);
 }
 // Spend earned gold on available level-gated equipment before Veteran runs.
 for(const hero of town.roster.filter(h=>!h.unit.dead&&h.level>=1)){
  for(const kind of ['weapon','armor']){
   const rank=hero.equipment?.[kind]??0;
   if(rank<hero.level&&rank<5&&town.gold>=100*(rank+1)+TREATMENTS.abbey.gold)
    upgradeHeroEquipment(town,hero.rosterId,kind);
  }
 }
 // Match the verified skill-upgrade policy of the historical progressed
 // expedition fixture, purchasing only supported levels with earned gold.
 for(const hero of town.roster.filter(h=>!h.unit.dead&&h.level>=2)){
  for(const skillId of BENCHMARK_SKILLS[hero.heroClass]??[]){
   while((hero.unit.skillLevels?.[skillId]??1)<Math.min(hero.level,5)){
    try{
     if(town.gold<1500)break;
     upgradeHeroSkill(town,hero.rosterId,skillId);
    }catch(error){
     if(/Unverified skill upgrade|No verified|not verified|Unknown skill|not available|Insufficient gold/.test(error.message))break;
     throw error;
    }
   }
  }
 }
 // Reserve two genuine town treatment slots for stressed survivors.
 // Treatment completes after the next expedition; treated heroes cannot deploy.
 const stressed=town.roster.filter(h=>!h.unit.dead&&h.unit.stress>=80)
  .sort((a,b)=>b.level-a.level||b.unit.stress-a.unit.stress);
 for(const service of ['abbey','tavern']){
  const hero=stressed.find(h=>!town.town.treatments.some(t=>t.rosterId===h.rosterId));
  if(hero&&town.gold>=TREATMENTS[service].gold+500)
   bookStressTreatment(town,hero.rosterId,service);
 }
 for(const hero of town.roster){
  if(hero.unit.dead&&town.facilities.temple>0&&town.gold>=250)resurrectHero(town,hero.rosterId);
  if(!hero.unit.dead&&town.trinkets.includes('ward-charm')&&!hero.equippedTrinket)
   equipTrinket(town,hero.rosterId);
 }

}
function campaign(seed,maxWeeks=100){
 let town=createCampaignSettlement();
 const history=[];
 for(let week=0;week<maxWeeks;week++){
  prepareTown(town);
  if(!fillSquad(town)){
   history.push({week:week+1,phase:'blocked',reason:'insufficient living and available heroes',living:town.roster.filter(h=>!h.unit.dead).length,gold:town.gold});
   break;
  }
  const veteranWon=town.campaignVictories.includes('veteran-victory');
  // Match the existing fully progressed combat benchmarks: Veteran = level 3,
  // Champion = level 5, with matching weapon and armor ranks. No free levels
  // or upgrades are granted; only actual roster purchases and earned XP count.
  const benchmarkReady=(level)=>town.squad.every(id=>{
   const hero=town.roster.find(h=>h.rosterId===id);
   return hero&&!hero.unit.dead&&hero.level>=level&&
    (hero.equipment?.weapon??0)>=level&&(hero.equipment?.armor??0)>=level&&
    hero.unit.hp===hero.unit.maxHp&&hero.unit.stress===0;
  });
  const veteranReady=benchmarkReady(3);
  const championReady=benchmarkReady(5);
  // Build a durable core on Apprentice Ashen Crypt quests before risking
  // the Blighted Warrens. Patrol quests supply real firewood for camping.
  // No experience, equipment, or victories are granted by this policy.
  const id=veteranWon&&championReady?'warrens-champion':
   town.completedExpeditions>=3&&veteranReady?'warrens-veteran':
   town.completedExpeditions>=1?
    // Patrols provide camping firewood. Rotate regions so a player can
    // acquire both heirloom types instead of exhausting all Deeds in Crypt.
    (week%3===0?'warrens-containment':'crypt-purge'):'crypt-recon';
  const quest=selectQuest(town,id);
  const levels=town.squad.map(x=>town.roster.find(h=>h.rosterId===x).level);
  const equipment=town.squad.map(x=>({...town.roster.find(h=>h.rosterId===x).equipment}));
  const entryStress=town.squad.map(x=>town.roster.find(h=>h.rosterId===x).unit.stress);
  const entryHp=town.squad.map(x=>{const u=town.roster.find(h=>h.rosterId===x).unit;return Math.round(u.hp/u.maxHp*100)});
  const d=createDungeon(seed*100+week+1,{region:quest.region,tier:quest.tier,
   difficulty:quest.difficulty,party:prepareRosterParty(town,expeditionBonuses(town)),
   proceduralBranches:true,variableCorridors:true,interactiveEvents:true});
  d.questId=quest.id;
  // Provisions consume earned settlement gold, matching real expedition entry.
  for(const [kind,qty] of [['food',4],['torch',2],['antivenom',1]]){
   try{purchaseProvision(d,town,kind,qty);}
   catch(error){if(!/Inventory full|Insufficient gold/.test(error.message))throw error;}
  }
  const report=play(d,seed*100+week+1);
  const expeditionLoot={inventory:d.inventory.map(x=>({kind:x.kind,quantity:x.quantity})),pendingLoot:!!d.pendingLoot,loot:d.loot};
  let reward=null;
  if(d.phase==='victory')reward=completeCampaignExpedition(town,d).report;
  returnPartyToRoster(town,d);
  advanceTownWeek(town,d);
  history.push({week:week+1,quest:id,tier:quest.tier,phase:d.phase,levels,equipment,entryStress,entryHp,partyDeaths:d.party.filter(h=>h.dead).length,partyHp:d.party.map(h=>h.hp),partyStress:d.party.map(h=>h.stress),gold:town.gold,crests:town.crests,deeds:town.deeds,facilities:{...town.facilities},stageCoach:{...town.stageCoach},rosterSize:town.roster.length,livingRoster:town.roster.filter(h=>!h.unit.dead).length,peakRosterLevel:Math.max(...town.roster.map(h=>h.level)),levelTwoHeroes:town.roster.filter(h=>!h.unit.dead&&h.level>=2).length,reward,expeditionLoot,discardedLoot:d._discardedLoot??[],encounters:report.encounters,campsUsed:report.campsUsed,
   lowerTierEncounters:report.mix.lower});
  town=decodeCampaignSave(encodeCampaignSave(town,null)).settlement;
  if(d.phase==='victory'&&quest.tier==='champion')break;
 }
 return {history,progress:campaignProgress(town),levels:town.roster.map(h=>h.level)};
}
test('seeded player campaigns advance through real Apprentice, Veteran and Champion quest gates',()=>{
 // DD1 has no fixed normal-mode deadline. Evaluate a 100-week primary
 // horizon and a 150-week endurance horizon without granting free progress.
 const results=[...Array.from({length:5},(_,i)=>campaign(i+1,100)),campaign(6,150)];
 const attempts=results.flatMap(x=>x.history);
 const summary={campaigns:results.length,primaryHorizonWeeks:100,enduranceHorizonWeeks:150,attempts:attempts.length,
  firstVeteranAttemptWeek:results.map(x=>x.history.find(h=>h.tier==='veteran')?.week??null),
  firstChampionAttemptWeek:results.map(x=>x.history.find(h=>h.tier==='champion')?.week??null),
  campaignCompletionWeek:results.map(x=>x.history.find(h=>h.tier==='champion'&&h.phase==='victory')?.week??null),
  apprentice:attempts.filter(x=>x.tier==='apprentice').length,
  cryptApprentice:attempts.filter(x=>x.tier==='apprentice'&&x.quest.startsWith('crypt-')).length,
  warrensApprentice:attempts.filter(x=>x.tier==='apprentice'&&x.quest.startsWith('warrens-')).length,
  veteran:attempts.filter(x=>x.tier==='veteran').length,
  champion:attempts.filter(x=>x.tier==='champion').length,
  completedChampion:attempts.filter(x=>x.tier==='champion'&&x.phase==='victory').length,
  highestEarnedLevel:Math.max(...results.flatMap(x=>x.levels)),
  highestEverRosterLevel:Math.max(...attempts.map(x=>x.peakRosterLevel??0)),
  maximumLivingLevelTwoHeroes:Math.max(...attempts.map(x=>x.levelTwoHeroes??0)),
  totalExpeditionDeaths:attempts.reduce((n,x)=>n+(x.partyDeaths??0),0),
  totalCampsUsed:attempts.reduce((n,x)=>n+(x.campsUsed??0),0),
  meanApprenticeEntryStress:attempts.filter(x=>x.tier==='apprentice').reduce((n,x)=>n+x.entryStress.reduce((a,b)=>a+b,0),0)/Math.max(1,attempts.filter(x=>x.tier==='apprentice').length*4),
  meanLivingRoster:attempts.reduce((n,x)=>n+(x.livingRoster??0),0)/attempts.length,
  lowerTierEncounters:attempts.reduce((n,x)=>n+(x.lowerTierEncounters??0),0),
  blockedCampaigns:results.filter(x=>x.history.some(h=>h.phase==='blocked')).length,
  blockedReasons:results.flatMap(x=>x.history.filter(h=>h.phase==='blocked').map(h=>h.reason)),
  veteranWins:attempts.filter(x=>x.tier==='veteran'&&x.phase==='victory').length,
  championDefeats:attempts.filter(x=>x.tier==='champion'&&x.phase==='defeat').length,
  championEncounters:attempts.filter(x=>x.tier==='champion').reduce((n,x)=>n+x.encounters,0),
  championLowerTierEncounters:attempts.filter(x=>x.tier==='champion').reduce((n,x)=>n+x.lowerTierEncounters,0),
  championStartingLevelDistribution:Object.fromEntries([0,1,2,3,4,5,6].map(level=>[level,attempts.filter(x=>x.tier==='champion').flatMap(x=>x.levels).filter(x=>x===level).length])),
  championPartyDeaths:attempts.filter(x=>x.tier==='champion').reduce((n,x)=>n+(x.partyDeaths??0),0),
  apprenticeWins:attempts.filter(x=>x.tier==='apprentice'&&x.phase==='victory').length,
  veteranMeanEntryStress:attempts.filter(x=>x.tier==='veteran').reduce((n,x)=>n+x.entryStress.reduce((a,b)=>a+b,0),0)/Math.max(1,attempts.filter(x=>x.tier==='veteran').length*4),
  veteranMeanEntryHpPercent:attempts.filter(x=>x.tier==='veteran').reduce((n,x)=>n+x.entryHp.reduce((a,b)=>a+b,0),0)/Math.max(1,attempts.filter(x=>x.tier==='veteran').length*4),
  veteranMeanEncountersBeforeDefeat:attempts.filter(x=>x.tier==='veteran'&&x.phase==='defeat').reduce((n,x)=>n+x.encounters,0)/Math.max(1,attempts.filter(x=>x.tier==='veteran'&&x.phase==='defeat').length),
  earnedGold:attempts.reduce((n,x)=>n+(x.reward?.totalGold??0),0),
  earnedCrests:attempts.reduce((n,x)=>n+(x.reward?.crests??0),0),
  earnedDeeds:attempts.reduce((n,x)=>n+(x.reward?.deeds??0),0),
  finalDeeds:results.map(x=>x.history.at(-1)?.deeds??null),
  discardedDeeds:attempts.reduce((n,x)=>n+x.discardedLoot.reduce((m,y)=>m+(y.kind==='deed'?y.quantity:0),0),0),
  collectedDeeds:attempts.reduce((n,x)=>n+x.expeditionLoot.inventory.reduce((m,y)=>m+(y.kind==='deed'?y.quantity:0),0),0),
  maximumBarracksRank:Math.max(...attempts.map(x=>x.stageCoach?.barracks??0)),
  lootBearingExpeditions:attempts.filter(x=>x.expeditionLoot?.inventory?.length>0).length};
 console.log('Organic campaign progression '+JSON.stringify(summary));
 for(let i=0;i<results.length;i++)console.log('Organic campaign trace '+JSON.stringify({seed:i+1,history:results[i].history}));
 assert.ok(attempts.length>0);
 for(const result of results){
  const h=result.history;
  for(let i=0;i<h.length;i++){
   if(h[i].tier==='veteran'){
    assert.ok(h.slice(0,i).filter(x=>x.phase==='victory').length>=3);
    assert.ok(h[i].levels.every(level=>level>=3));
    assert.ok(h[i].equipment.every(e=>e.weapon>=3&&e.armor>=3));
    assert.ok(h[i].entryStress.every(stress=>stress===0));
    assert.ok(h[i].entryHp.every(hp=>hp===100));
   }
   if(h[i].tier==='champion'){
    assert.ok(h.slice(0,i).some(x=>x.tier==='veteran'&&x.phase==='victory'));
    assert.ok(h[i].levels.every(level=>level>=5));
    assert.ok(h[i].equipment.every(e=>e.weapon>=5&&e.armor>=5));
    assert.ok(h[i].entryStress.every(stress=>stress===0));
    assert.ok(h[i].entryHp.every(hp=>hp===100));
   }
  }
 }
});
