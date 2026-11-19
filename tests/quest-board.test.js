import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,upgradeStageCoach,upgradeFacility} from '../src/settlement.js';
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
  'crypt-recon':{rarity:'common',length:'short',gold:2000,crests:2},
  'crypt-purge':{rarity:'uncommon',length:'medium',gold:3500,crests:4},
  'warrens-recon':{rarity:'common',length:'short',gold:2000,deeds:2},
  'warrens-containment':{rarity:'uncommon',length:'medium',gold:3500,deeds:4},
  'warrens-veteran':{rarity:'rare',length:'medium',gold:5000,deeds:6},
  'warrens-champion':{rarity:'ancestral',length:'long',gold:7000,deeds:8}
 };
 for(const quest of availableQuests(s)){
  const {rarity,length,...reward}=expected[quest.id];
  assert.deepEqual(quest.questReward,{...reward,trinkets:1});
  assert.equal(quest.trinketRarity,rarity);
  assert.equal(quest.length,length);
 }
});

test('DD1-style town construction spends heirlooms but never expedition gold',()=>{
 const town=createCampaignSettlement();
 town.gold=5000;
 town.crests=100;
 town.deeds=100;
 const before=town.gold;
 const coach=upgradeStageCoach(town,'barracks');
 assert.equal(coach.cost.gold,0);
 assert.equal(town.gold,before);
 const facility=upgradeFacility(town,'guild');
 assert.equal(facility.cost.gold,0);
 assert.equal(town.gold,before);
 assert.ok(town.crests<100||town.deeds<100);
});
