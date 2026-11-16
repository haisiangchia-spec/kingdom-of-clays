import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignProgress,expeditionUnlock,recordCampaignVictory,canStartNextExpedition} from '../src/campaign-progression.js';
import {availableQuests,selectQuest} from '../src/quest-board.js';

const state=(completedExpeditions=0,campaignVictories=[])=>({completedExpeditions,campaignVictories:[...campaignVictories]});

test('campaign unlocks follow Apprentice -> Veteran -> Champion without skipping milestones',()=>{
 const cases=[
  {s:state(),recon:false,veteran:false,champion:false,finished:false},
  {s:state(1),recon:true,veteran:false,champion:false,finished:false},
  {s:state(3),recon:true,veteran:true,champion:false,finished:false},
  {s:state(3,['veteran-victory']),recon:true,veteran:true,champion:true,finished:false},
  {s:state(4,['veteran-victory','champion-victory']),recon:true,veteran:true,champion:true,finished:true}
 ];
 for(const {s,recon,veteran,champion,finished} of cases){
  const quests=availableQuests(s);
  const unlocked=id=>quests.find(q=>q.id===id).unlocked;
  assert.equal(unlocked('warrens-recon'),recon);
  assert.equal(unlocked('warrens-veteran'),veteran);
  assert.equal(unlocked('warrens-champion'),champion);
  assert.equal(campaignProgress(s).finished,finished);
  assert.equal(expeditionUnlock(s,'crypt','veteran').unlocked,false);
  assert.equal(expeditionUnlock(s,'crypt','champion').unlocked,false);
 }
});

test('quest selection rejects locked tiers and accepts them after milestones',()=>{
 assert.throws(()=>selectQuest(state(2),'warrens-veteran'),/three expeditions/);
 assert.equal(selectQuest(state(3),'warrens-veteran').tier,'veteran');
 assert.throws(()=>selectQuest(state(3),'warrens-champion'),/Veteran Blighted Warrens/);
 assert.equal(selectQuest(state(3,['veteran-victory']),'warrens-champion').tier,'champion');
});

test('victory milestones require claimed wins in the matching region and tier and remain unique',()=>{
 const s=state(3);
 assert.throws(()=>recordCampaignVictory(s,{phase:'victory',rewardClaimed:false,tier:'veteran',region:'plague'}),/Claim expedition rewards/);
 recordCampaignVictory(s,{phase:'victory',rewardClaimed:true,tier:'veteran',region:'crypt'});
 assert.deepEqual(s.campaignVictories,[]);
 const win={phase:'victory',rewardClaimed:true,tier:'veteran',region:'plague'};
 recordCampaignVictory(s,win);
 recordCampaignVictory(s,win);
 assert.deepEqual(s.campaignVictories,['veteran-victory']);
 recordCampaignVictory(s,{phase:'victory',rewardClaimed:true,tier:'champion',region:'plague'});
 assert.equal(campaignProgress(s).finished,true);
});

test('new expedition is blocked until rewards, roster and town recovery are settled',()=>{
 const base={phase:'victory',rewardClaimed:false,rosterReturned:true,townWeekProcessed:true};
 assert.equal(canStartNextExpedition(base).allowed,false);
 assert.equal(canStartNextExpedition({...base,rewardClaimed:true,rosterReturned:false}).allowed,false);
 assert.equal(canStartNextExpedition({...base,rewardClaimed:true,townWeekProcessed:false}).allowed,false);
 assert.equal(canStartNextExpedition({...base,rewardClaimed:true}).allowed,true);
 assert.equal(canStartNextExpedition({phase:'exploring'}).allowed,false);
});
