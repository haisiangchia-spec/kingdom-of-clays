import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {campaignProgress,recordCampaignVictory} from '../src/campaign-progression.js';
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
