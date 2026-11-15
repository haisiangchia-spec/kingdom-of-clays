import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {campaignProgress,campaignMilestoneProgress,expeditionUnlock,recordCampaignVictory} from '../src/campaign-progression.js';
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
