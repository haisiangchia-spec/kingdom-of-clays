import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,expeditionBonuses,encodeCampaignSave,decodeCampaignSave,upgradeFacility,nextFacilityCost} from '../src/settlement.js';
import {selectQuest} from '../src/quest-board.js';
import {completeCampaignExpedition,campaignProgress} from '../src/campaign-progression.js';
import {prepareRosterParty,returnPartyToRoster,selectHero,resurrectHero,equipTrinket} from '../src/hero-roster.js';
import {advanceTownWeek,recruitFromCoach} from '../src/town-week.js';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle,resolveHunger} from '../src/dungeon.js';
import {leaveLoot} from '../src/inventory.js';
import {rng,startRound,currentActor,prepareActorTurn,passActorTurn,takeTurn,availableTargets,status,ABILITIES} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {chooseHeroAction} from './full-expedition-endurance.test.js';

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
function play(d,seed){
 const random=rng(seed+830000);
 const mix={lower:0,same:0};let encounters=0;
 for(const room of ['gallery','watch','gallery','vault','gallery','watch','sanctum']){
  if(d.phase!=='explore')break;
  if(d.pendingLoot)leaveLoot(d);
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
   }else if(d.pendingLoot)leaveLoot(d);
   else if(d.pendingHunger)resolveHunger(d,d.supplies.food>=4?'eat':'skip');
   else advanceCorridor(d);
  }
  assert.ok(guard<70,'travel stalled');
 }
 if(d.pendingLoot)leaveLoot(d);
 return {encounters,mix};
}
function fillSquad(town){
 for(let i=0;i<4;i++){
  const current=town.roster.find(h=>h.rosterId===town.squad[i]&&!h.unit.dead);
  if(current)continue;
  let candidate=town.roster.find(h=>!h.unit.dead&&!town.squad.includes(h.rosterId));
  if(!candidate&&town.roster.length<8&&town.town.offers.length){
   candidate=recruitFromCoach(town,town.town.offers[0].offerId);
  }
  if(!candidate)return false;
  town.squad[i]=null;
  selectHero(town,i,candidate.rosterId);
 }
 return true;
}
function prepareTown(town){
 // All upgrades and services go through public gameplay actions, using earned resources.
 for(const facility of ['guild','temple','market']){
  const cost=nextFacilityCost(town,facility);
  if(cost&&Object.entries(cost).every(([resource,amount])=>(town[resource]??0)>=amount))
   upgradeFacility(town,facility);
 }
 for(const hero of town.roster){
  if(hero.unit.dead&&town.facilities.temple>0&&town.gold>=250)resurrectHero(town,hero.rosterId);
  if(!hero.unit.dead&&town.trinkets.includes('ward-charm')&&!hero.equippedTrinket)
   equipTrinket(town,hero.rosterId);
 }

}
function campaign(seed){
 let town=createCampaignSettlement();
 const history=[];
 for(let week=0;week<20;week++){
  prepareTown(town);
  if(!fillSquad(town))break;
  const veteranWon=town.campaignVictories.includes('veteran-victory');
  const id=veteranWon?'warrens-champion':
   town.completedExpeditions>=3?'warrens-veteran':
   town.completedExpeditions>=1?'warrens-recon':'crypt-recon';
  const quest=selectQuest(town,id);
  const levels=town.squad.map(x=>town.roster.find(h=>h.rosterId===x).level);
  const d=createDungeon(seed*100+week+1,{region:quest.region,tier:quest.tier,
   difficulty:quest.difficulty,party:prepareRosterParty(town,expeditionBonuses(town)),
   proceduralBranches:true,variableCorridors:true});
  d.questId=quest.id;
  const report=play(d,seed*100+week+1);
  if(d.phase==='victory')completeCampaignExpedition(town,d);
  returnPartyToRoster(town,d);
  advanceTownWeek(town,d);
  history.push({week:week+1,quest:id,tier:quest.tier,phase:d.phase,levels,encounters:report.encounters,
   lowerTierEncounters:report.mix.lower});
  town=decodeCampaignSave(encodeCampaignSave(town,null)).settlement;
  if(d.phase==='victory'&&quest.tier==='champion')break;
 }
 return {history,progress:campaignProgress(town),levels:town.roster.map(h=>h.level)};
}
test('seeded player campaigns advance through real Apprentice, Veteran and Champion quest gates',()=>{
 const results=Array.from({length:5},(_,i)=>campaign(i+1));
 const attempts=results.flatMap(x=>x.history);
 const summary={campaigns:results.length,attempts:attempts.length,
  apprentice:attempts.filter(x=>x.tier==='apprentice').length,
  veteran:attempts.filter(x=>x.tier==='veteran').length,
  champion:attempts.filter(x=>x.tier==='champion').length,
  completedChampion:attempts.filter(x=>x.tier==='champion'&&x.phase==='victory').length,
  highestEarnedLevel:Math.max(...results.flatMap(x=>x.levels)),
  lowerTierEncounters:attempts.reduce((n,x)=>n+x.lowerTierEncounters,0)};
 console.log('Organic campaign progression '+JSON.stringify(summary));
 assert.ok(attempts.length>0);
 for(const result of results){
  const h=result.history;
  for(let i=0;i<h.length;i++){
   if(h[i].tier==='veteran')assert.ok(h.slice(0,i).filter(x=>x.phase==='victory').length>=3);
   if(h[i].tier==='champion')assert.ok(h.slice(0,i).some(x=>x.tier==='veteran'&&x.phase==='victory'));
  }
 }
});
