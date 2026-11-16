import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {availableQuests,selectQuest} from '../src/quest-board.js';
import {campaignProgress,recordCampaignVictory,expeditionUnlock} from '../src/campaign-progression.js';

test('quest board unlocks the playable campaign in order across saved settlements',()=>{
 let town=createCampaignSettlement();
 const save=()=>{town=decodeCampaignSave(encodeCampaignSave(town,null)).settlement;};
 const unlocked=id=>availableQuests(town).find(q=>q.id===id)?.unlocked;
 assert.equal(unlocked('crypt-recon'),true);
 assert.equal(unlocked('warrens-recon'),false);
 assert.equal(unlocked('warrens-veteran'),false);
 assert.equal(unlocked('warrens-champion'),false);
 assert.throws(()=>selectQuest(town,'warrens-veteran'),/Complete three expeditions/);
 town.completedExpeditions=1;save();
 assert.equal(unlocked('warrens-recon'),true);
 town.completedExpeditions=3;save();
 assert.equal(unlocked('warrens-veteran'),true);
 assert.equal(unlocked('warrens-champion'),false);
 recordCampaignVictory(town,{phase:'victory',rewardClaimed:true,region:'plague',tier:'veteran'});
 save();
 assert.equal(unlocked('warrens-champion'),true);
 assert.equal(selectQuest(town,'warrens-champion').difficulty,'gauntlet');
 recordCampaignVictory(town,{phase:'victory',rewardClaimed:true,region:'plague',tier:'champion'});
 save();
 assert.equal(campaignProgress(town).finished,true);
 assert.equal(expeditionUnlock(town,'crypt','champion').unlocked,false);
});
