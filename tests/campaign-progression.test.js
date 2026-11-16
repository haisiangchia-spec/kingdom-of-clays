import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {campaignProgress,recordCampaignVictory,expeditionUnlock,campaignMilestoneProgress,canStartNextExpedition} from '../src/campaign-progression.js';
import {prepareRosterParty,returnPartyToRoster} from '../src/hero-roster.js';
import {advanceTownWeek} from '../src/town-week.js';
import {createDungeon} from '../src/dungeon.js';
test('Clays campaign milestones persist across save and load',()=>{
 const settlement=createCampaignSettlement();
 assert.equal(campaignProgress(settlement).completed,0);
 settlement.completedExpeditions=3;
 recordCampaignVictory(settlement,{phase:'victory',rewardClaimed:true,region:'plague',tier:'veteran'});
 assert.equal(campaignProgress(settlement).completed,3);
 const loaded=decodeCampaignSave(encodeCampaignSave(settlement,null)).settlement;
 assert.deepEqual(loaded.campaignVictories,['veteran-victory']);
 recordCampaignVictory(loaded,{phase:'victory',rewardClaimed:true,region:'plague',tier:'champion'});
 assert.equal(campaignProgress(loaded).finished,true);
 recordCampaignVictory(loaded,{phase:'victory',rewardClaimed:true,region:'plague',tier:'champion'});
 assert.equal(loaded.campaignVictories.length,2);
});
test('Clays campaign milestones reject incomplete expeditions and corrupt saves',()=>{
 const settlement=createCampaignSettlement();
 assert.throws(()=>recordCampaignVictory(settlement,{phase:'victory',rewardClaimed:false,tier:'champion',region:'plague'}),/Claim expedition rewards/);
 assert.throws(()=>recordCampaignVictory(settlement,{phase:'defeat',rewardClaimed:true,tier:'champion',region:'plague'}),/Claim expedition rewards/);
 settlement.campaignVictories=['champion-victory','champion-victory'];
 assert.throws(()=>encodeCampaignSave(settlement,null),/Invalid campaign victories/);
});

test('Campaign unlocks advance from Crypt to Warrens, Veteran, then Champion',()=>{
 const settlement=createCampaignSettlement();
 assert.equal(expeditionUnlock(settlement,'crypt','apprentice').unlocked,true);
 assert.match(expeditionUnlock(settlement,'plague','apprentice').reason,/one expedition/);
 settlement.completedExpeditions=1;
 assert.equal(expeditionUnlock(settlement,'plague','apprentice').unlocked,true);
 assert.equal(expeditionUnlock(settlement,'plague','veteran').unlocked,false);
 settlement.completedExpeditions=3;
 assert.equal(expeditionUnlock(settlement,'plague','veteran').unlocked,true);
 assert.equal(expeditionUnlock(settlement,'plague','champion').unlocked,false);
 recordCampaignVictory(settlement,{phase:'victory',rewardClaimed:true,region:'plague',tier:'veteran'});
 assert.equal(expeditionUnlock(settlement,'plague','champion').unlocked,true);
 assert.equal(expeditionUnlock(settlement,'crypt','champion').unlocked,false);
 assert.equal(expeditionUnlock(settlement,'unknown','apprentice').unlocked,false);
});

test('complete campaign progression survives repeated settlement save/load transitions',()=>{
 let settlement=createCampaignSettlement();
 const persist=()=>{settlement=decodeCampaignSave(encodeCampaignSave(settlement,null)).settlement;};
 const win=(region,tier)=>{
  settlement.completedExpeditions++;
  recordCampaignVictory(settlement,{phase:'victory',rewardClaimed:true,region,tier});
  persist();
 };
 assert.equal(campaignProgress(settlement).finished,false);
 assert.equal(expeditionUnlock(settlement,'plague','apprentice').unlocked,false);
 win('crypt','apprentice');
 assert.equal(expeditionUnlock(settlement,'plague','apprentice').unlocked,true);
 win('plague','apprentice');
 assert.equal(expeditionUnlock(settlement,'plague','veteran').unlocked,false);
 win('crypt','apprentice');
 assert.equal(expeditionUnlock(settlement,'plague','veteran').unlocked,true);
 assert.equal(expeditionUnlock(settlement,'plague','champion').unlocked,false);
 win('plague','veteran');
 assert.equal(expeditionUnlock(settlement,'plague','champion').unlocked,true);
 assert.equal(campaignProgress(settlement).finished,false);
 win('plague','champion');
 assert.equal(campaignProgress(settlement).finished,true);
 assert.equal(campaignProgress(settlement).completed,4);
 assert.equal(settlement.completedExpeditions,5);
 assert.deepEqual(settlement.campaignVictories,['veteran-victory','champion-victory']);
});

test('expedition return, town-week recovery, and next-quest gate survive reload',()=>{
 let settlement=createCampaignSettlement();
 const party=prepareRosterParty(settlement);
 const expedition=createDungeon(127,{tier:'apprentice',region:'crypt',party});
 expedition.phase='victory';
 expedition.rosterReturned=false;
 expedition.townWeekProcessed=false;
 expedition.rewardClaimed=false;
 expedition.traitsProcessed=true;
 assert.equal(canStartNextExpedition(expedition).allowed,false);
 assert.equal(returnPartyToRoster(settlement,expedition),true);
 assert.equal(returnPartyToRoster(settlement,expedition),false);
 assert.equal(canStartNextExpedition(expedition).allowed,false);
 const weekBefore=settlement.town.week;
 assert.equal(advanceTownWeek(settlement,expedition),true);
 assert.equal(advanceTownWeek(settlement,expedition),false);
 assert.equal(settlement.town.week,weekBefore+1);
 assert.equal(canStartNextExpedition(expedition).allowed,false);
 expedition.rewardClaimed=true;
 assert.equal(canStartNextExpedition(expedition).allowed,true);
 ({settlement}=decodeCampaignSave(encodeCampaignSave(settlement,expedition)));
 assert.equal(settlement.town.week,weekBefore+1);
 assert.equal(settlement.roster.length,4);
 assert.equal(prepareRosterParty(settlement).length,4);
});

test('campaign milestone counters show bounded progress and useful next steps',()=>{
 const settlement={completedExpeditions:2,campaignVictories:[]};
 const goals=campaignMilestoneProgress(settlement);
 assert.equal(goals.find(x=>x.id==='first-expedition').current,1);
 assert.equal(goals.find(x=>x.id==='established-company').current,2);
 assert.equal(goals.find(x=>x.id==='established-company').target,3);
 assert.equal(goals.find(x=>x.id==='established-company').complete,false);
 assert.match(goals.find(x=>x.id==='veteran-victory').nextStep,/Veteran/);
 settlement.completedExpeditions=9;
 settlement.campaignVictories=['veteran-victory'];
 assert.equal(campaignMilestoneProgress(settlement).find(x=>x.id==='established-company').current,3);
 assert.equal(campaignMilestoneProgress(settlement).find(x=>x.id==='veteran-victory').current,1);
});
