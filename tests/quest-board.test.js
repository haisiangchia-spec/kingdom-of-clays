import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement} from '../src/settlement.js';
import {availableQuests,selectQuest} from '../src/quest-board.js';
test('quest board gates contracts and assigns distinct difficulty',()=>{
 const s=createCampaignSettlement();
 assert.deepEqual(availableQuests(s).filter(q=>q.unlocked).map(q=>q.id),['crypt-recon','crypt-purge']);
 assert.throws(()=>selectQuest(s,'warrens-veteran'),/Complete one expedition/);
 s.completedExpeditions=3;
 assert.deepEqual(availableQuests(s).filter(q=>q.unlocked).map(q=>q.id),['crypt-recon','crypt-purge','warrens-recon','warrens-containment','warrens-veteran']);
 assert.equal(selectQuest(s,'warrens-veteran').difficulty,'patrol');
 assert.equal(selectQuest(s,'crypt-purge').difficulty,'patrol');
 assert.equal(selectQuest(s,'warrens-containment').difficulty,'patrol');
 s.campaignVictories.push('veteran-victory');
 assert.equal(selectQuest(s,'warrens-champion').difficulty,'gauntlet');
 assert.throws(()=>selectQuest(s,'nonexistent'),/Unknown quest/);
});

test('quest board declares one DD1-style completion trinket with tier-length rarity',()=>{
 const s=createCampaignSettlement();
 s.completedExpeditions=3;
 s.campaignVictories.push('veteran-victory');
 const expected={
  'crypt-recon':'common',
  'crypt-purge':'uncommon',
  'warrens-recon':'common',
  'warrens-containment':'uncommon',
  'warrens-veteran':'rare',
  'warrens-champion':'ancestral'
 };
 for(const quest of availableQuests(s)){
  assert.deepEqual(quest.questReward,{trinkets:1});
  assert.equal(quest.trinketRarity,expected[quest.id]);
  assert.equal(quest.questReward.gold,undefined); // Do not invent DD1 payout figures.
 }
});
