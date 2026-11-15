import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {campaignProgress,campaignMilestoneProgress,expeditionUnlock,recordCampaignVictory,completeCampaignExpedition,canStartNextExpedition} from '../src/campaign-progression.js';
import {availableQuests,selectQuest} from '../src/quest-board.js';

test('campaign starts with only Apprentice Crypt quests available',()=>{
 const s=createCampaignSettlement();
 assert.equal(campaignProgress(s).finished,false);
 assert.deepEqual(availableQuests(s).filter(q=>q.unlocked).map(q=>q.id),['crypt-recon','crypt-purge']);
 assert.throws(()=>selectQuest(s,'warrens-veteran'),/Complete/);
});
test('expedition milestones unlock Apprentice Warrens then Veteran',()=>{
 const s=createCampaignSettlement();
 s.completedExpeditions=1;
 assert.equal(expeditionUnlock(s,'plague','apprentice').unlocked,true);
 assert.equal(expeditionUnlock(s,'plague','veteran').unlocked,false);
 s.completedExpeditions=3;
 assert.equal(expeditionUnlock(s,'plague','veteran').unlocked,true);
 assert.equal(expeditionUnlock(s,'plague','champion').unlocked,false);
});
test('only claimed victories advance tier milestones and campaign finish',()=>{
 const s=createCampaignSettlement();
 s.completedExpeditions=3;
 assert.throws(()=>recordCampaignVictory(s,{phase:'victory',tier:'veteran',region:'plague',rewardClaimed:false}),/Claim/);
 assert.equal(s.campaignVictories.length,0);
 const veteran={phase:'victory',tier:'veteran',region:'plague',rewardClaimed:true};
 recordCampaignVictory(s,veteran);
 recordCampaignVictory(s,veteran);
 assert.deepEqual(s.campaignVictories,['veteran-victory']);
 assert.equal(expeditionUnlock(s,'plague','champion').unlocked,true);
 recordCampaignVictory(s,{phase:'victory',tier:'champion',region:'plague',rewardClaimed:true});
 assert.equal(campaignProgress(s).finished,true);
 assert.equal(campaignMilestoneProgress(s).every(x=>x.complete&&x.current===x.target),true);
});
test('campaign unlocks persist across save/load',()=>{
 const s=createCampaignSettlement();
 s.completedExpeditions=3;
 recordCampaignVictory(s,{phase:'victory',tier:'veteran',region:'plague',rewardClaimed:true});
 const restored=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.equal(selectQuest(restored,'warrens-champion').id,'warrens-champion');
 assert.deepEqual(restored.campaignVictories,['veteran-victory']);
});
test('invalid regions and tiers cannot unlock',()=>{
 const s=createCampaignSettlement();
 assert.equal(expeditionUnlock(s,'unknown','apprentice').unlocked,false);
 assert.equal(expeditionUnlock(s,'plague','unknown').unlocked,false);
 assert.equal(expeditionUnlock(s,'crypt','champion').unlocked,false);
});

test('claiming an expedition pays rewards and advances progress exactly once',()=>{
 const settlement=createCampaignSettlement();
 const expedition={phase:'victory',region:'crypt',tier:'apprentice',rewardClaimed:false,pendingLoot:null,inventory:[{kind:'gold',quantity:120},{kind:'crest',quantity:2}],log:[]};
 const goldBefore=settlement.gold;
 const result=completeCampaignExpedition(settlement,expedition);
 assert.equal(result.report.totalGold,120);
 assert.equal(settlement.gold,goldBefore+120);
 assert.equal(settlement.completedExpeditions,1);
 assert.equal(result.progress.milestones[0].complete,true);
 assert.throws(()=>completeCampaignExpedition(settlement,expedition),/unclaimed victory/);
 assert.equal(settlement.completedExpeditions,1);
 assert.equal(settlement.gold,goldBefore+120);
});
test('pending loot prevents reward claim and milestone advancement',()=>{
 const settlement=createCampaignSettlement();
 const expedition={phase:'victory',region:'plague',tier:'veteran',rewardClaimed:false,pendingLoot:{kind:'gold',quantity:10},inventory:[],log:[]};
 assert.throws(()=>completeCampaignExpedition(settlement,expedition),/pending loot/);
 assert.equal(settlement.completedExpeditions,0);
 assert.deepEqual(settlement.campaignVictories,[]);
 assert.equal(expedition.rewardClaimed,false);
});

test('next expedition requires collecting victory rewards',()=>{
 assert.equal(canStartNextExpedition(null).allowed,true);
 assert.equal(canStartNextExpedition({phase:'explore'}).allowed,false);
 assert.equal(canStartNextExpedition({phase:'combat'}).allowed,false);
 assert.equal(canStartNextExpedition({phase:'victory',rewardClaimed:false}).allowed,false);
 assert.equal(canStartNextExpedition({phase:'victory',rewardClaimed:true}).allowed,true);
 assert.equal(canStartNextExpedition({phase:'defeat'}).allowed,true);
});

test('hero recovery and town week must complete before a replacement expedition',()=>{
 for(const phase of ['victory','defeat']){
  assert.match(canStartNextExpedition({phase,rewardClaimed:true,rosterReturned:false,townWeekProcessed:false}).reason,/roster/);
  assert.match(canStartNextExpedition({phase,rewardClaimed:true,rosterReturned:true,townWeekProcessed:false}).reason,/settlement recovery/);
  assert.equal(canStartNextExpedition({phase,rewardClaimed:true,rosterReturned:true,townWeekProcessed:true}).allowed,true);
 }
});

test('campaign victory claim validates actual quest objectives and tier',()=>{
 const settlement=createCampaignSettlement();
 const expedition={phase:'victory',questId:'warrens-veteran',region:'plague',tier:'veteran',cleared:['watch','vault'],rewardClaimed:false,pendingLoot:null,inventory:[],log:[]};
 assert.throws(()=>completeCampaignExpedition(settlement,expedition),/objectives are incomplete/);
 assert.equal(settlement.completedExpeditions,0);
 assert.equal(expedition.rewardClaimed,false);
 expedition.cleared.push('sanctum');
 expedition.tier='champion';
 assert.throws(()=>completeCampaignExpedition(settlement,expedition),/does not match/);
 expedition.tier='veteran';
 completeCampaignExpedition(settlement,expedition);
 assert.deepEqual(settlement.campaignVictories,['veteran-victory']);
 assert.equal(settlement.completedExpeditions,1);
});
