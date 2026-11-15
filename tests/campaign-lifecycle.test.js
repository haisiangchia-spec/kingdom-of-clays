import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {createDungeon,questObjectiveProgress} from '../src/dungeon.js';
import {prepareRosterParty,returnPartyToRoster} from '../src/hero-roster.js';
import {advanceTownWeek} from '../src/town-week.js';
import {selectQuest} from '../src/quest-board.js';
import {canStartNextExpedition,completeCampaignExpedition,campaignProgress} from '../src/campaign-progression.js';

// Exercises the real roster, town-week, reward, unlock and save APIs. Combat
// victories are fixtures: this is a campaign lifecycle test, not combat AI E2E.
test('campaign lifecycle progresses from Apprentice to Champion without duplicate payouts',()=>{
 let settlement=createCampaignSettlement();
 const itinerary=['crypt-recon','warrens-recon','warrens-containment','warrens-veteran','warrens-champion'];
 let previousWeek=settlement.town.week;
 for(const [index,id] of itinerary.entries()){
  const quest=selectQuest(settlement,id);
  const expedition=createDungeon(500+index,{
   region:quest.region,tier:quest.tier,difficulty:quest.difficulty,
   party:prepareRosterParty(settlement),interactiveEvents:true
  });
  expedition.questId=id;
  assert.equal(canStartNextExpedition(expedition).allowed,false);
  // Fixture: mark the contract objectives cleared, as the battle engine would.
  expedition.cleared=questObjectiveProgress(expedition).map(x=>x.room);
  expedition.phase='victory';
  assert.equal(canStartNextExpedition(expedition).allowed,false);
  assert.equal(returnPartyToRoster(settlement,expedition),true);
  assert.equal(advanceTownWeek(settlement,expedition),true);
  assert.equal(settlement.town.week,previousWeek+1);
  previousWeek=settlement.town.week;
  assert.equal(canStartNextExpedition(expedition).allowed,false);
  const {progress}=completeCampaignExpedition(settlement,expedition);
  assert.equal(settlement.completedExpeditions,index+1);
  assert.equal(canStartNextExpedition(expedition).allowed,true);
  assert.throws(()=>completeCampaignExpedition(settlement,expedition),/unclaimed victory/);
  assert.equal(progress.finished,index===itinerary.length-1);
  const restored=decodeCampaignSave(encodeCampaignSave(settlement,expedition));
  settlement=restored.settlement;
  assert.equal(restored.expedition.rewardClaimed,true);
  assert.equal(settlement.completedExpeditions,index+1);
 }
 assert.deepEqual(settlement.campaignVictories,['veteran-victory','champion-victory']);
 assert.equal(campaignProgress(settlement).finished,true);
});
