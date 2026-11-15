import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement} from '../src/settlement.js';
import {availableQuests,selectQuest} from '../src/quest-board.js';
test('quest board gates contracts and assigns distinct difficulty',()=>{
 const s=createCampaignSettlement();
 assert.deepEqual(availableQuests(s).filter(q=>q.unlocked).map(q=>q.id),['crypt-recon']);
 assert.throws(()=>selectQuest(s,'warrens-veteran'),/Complete three/);
 s.completedExpeditions=3;
 assert.deepEqual(availableQuests(s).filter(q=>q.unlocked).map(q=>q.id),['crypt-recon','warrens-recon','warrens-veteran']);
 assert.equal(selectQuest(s,'warrens-veteran').difficulty,'patrol');
 s.campaignVictories.push('veteran-victory');
 assert.equal(selectQuest(s,'warrens-champion').difficulty,'gauntlet');
 assert.throws(()=>selectQuest(s,'nonexistent'),/Unknown quest/);
});
