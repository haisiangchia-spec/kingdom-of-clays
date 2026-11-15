import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement} from '../src/settlement.js';
import {availableQuests,selectQuest} from '../src/quest-board.js';
test('quest board gates contracts and assigns distinct difficulty',()=>{
 const s=createCampaignSettlement();
 assert.deepEqual(availableQuests(s).filter(q=>q.unlocked).map(q=>q.id),['crypt-recon','crypt-purge']);
 assert.throws(()=>selectQuest(s,'warrens-veteran'),/Complete one expedition/);
 s.completedExpeditions=3;
 assert.deepEqual(availableQuests(s).filter(q=>q.unlocked).map(q=>q.id),['crypt-recon','crypt-purge','warrens-recon','warrens-veteran']);
 assert.equal(selectQuest(s,'warrens-veteran').difficulty,'patrol');
 assert.equal(selectQuest(s,'crypt-purge').difficulty,'patrol');
 s.campaignVictories.push('veteran-victory');
 assert.equal(selectQuest(s,'warrens-champion').difficulty,'gauntlet');
 assert.throws(()=>selectQuest(s,'nonexistent'),/Unknown quest/);
});
