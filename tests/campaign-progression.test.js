import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {campaignProgress,recordCampaignVictory,expeditionUnlock,campaignMilestoneProgress,canStartNextExpedition,completeCampaignExpedition} from '../src/campaign-progression.js';
import {prepareRosterParty,returnPartyToRoster} from '../src/hero-roster.js';
import {advanceTownWeek} from '../src/town-week.js';
import {createDungeon} from '../src/dungeon.js';
import {offerLoot,collectLoot} from '../src/inventory.js';
import {selectQuest} from '../src/quest-board.js';
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

test('real campaign reward claim transfers spoils and progress exactly once across reload',()=>{
 const settlement=createCampaignSettlement();
 const expedition=createDungeon(211,{tier:'apprentice',region:'crypt',interactiveEvents:true});
 offerLoot(expedition,'gold',100);collectLoot(expedition);
 offerLoot(expedition,'crest',2);collectLoot(expedition);
 expedition.phase='victory';
 expedition.cleared=['sanctum'];
 expedition.questId='crypt-recon';
 assert.equal(canStartNextExpedition(expedition).allowed,false);
 const {report,progress}=completeCampaignExpedition(settlement,expedition);
 assert.equal(report.totalGold,100);
 assert.equal(settlement.gold,100);
 assert.equal(settlement.crests,2);
 assert.equal(settlement.completedExpeditions,1);
 assert.equal(progress.milestones.find(m=>m.id==='first-expedition').complete,true);
 assert.throws(()=>completeCampaignExpedition(settlement,expedition),/unclaimed victory/);
 const saved=decodeCampaignSave(encodeCampaignSave(settlement,expedition));
 assert.equal(saved.settlement.gold,100);
 assert.equal(saved.settlement.crests,2);
 assert.equal(saved.settlement.completedExpeditions,1);
 assert.equal(saved.expedition.rewardClaimed,true);
 assert.throws(()=>completeCampaignExpedition(saved.settlement,saved.expedition),/unclaimed victory/);
 assert.equal(saved.settlement.gold,100);
 assert.equal(saved.settlement.completedExpeditions,1);
});

test('defeated expedition returns survivors, advances town once, and permits a replacement quest',()=>{
 let settlement=createCampaignSettlement();
 const party=prepareRosterParty(settlement);
 const expedition=createDungeon(329,{tier:'apprentice',region:'crypt',party});
 expedition.phase='defeat';
 expedition.party[0].dead=true;
 expedition.party[0].hp=0;
 assert.equal(canStartNextExpedition(expedition).allowed,true); // legacy saves may omit transfer flags
 expedition.rosterReturned=false;
 expedition.townWeekProcessed=false;
 assert.equal(canStartNextExpedition(expedition).allowed,false);
 assert.equal(returnPartyToRoster(settlement,expedition),true);
 assert.equal(settlement.roster[0].unit.dead,true);
 assert.equal(canStartNextExpedition(expedition).allowed,false);
 const previousWeek=settlement.town.week;
 assert.equal(advanceTownWeek(settlement,expedition),true);
 assert.equal(settlement.town.week,previousWeek+1);
 assert.equal(canStartNextExpedition(expedition).allowed,true);
 assert.equal(advanceTownWeek(settlement,expedition),false);
 ({settlement}=decodeCampaignSave(encodeCampaignSave(settlement,expedition)));
 assert.equal(settlement.roster[0].unit.dead,true);
 assert.equal(settlement.town.week,previousWeek+1);
 assert.equal(settlement.completedExpeditions,0);
 assert.equal(campaignProgress(settlement).completed,0);
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

test('five claimed expeditions complete the campaign with real reward transfers, roster returns and saved town weeks',()=>{
 let settlement=createCampaignSettlement();
 let lastExpedition=null;
 const stages=[
  ['crypt-recon','crypt','apprentice',['sanctum']],
  ['warrens-recon','plague','apprentice',['sanctum']],
  ['crypt-purge','crypt','apprentice',['watch','vault']],
  ['warrens-veteran','plague','veteran',['watch','vault','sanctum']],
  ['warrens-champion','plague','champion',['watch','vault','sanctum']]
 ];
 const firstWeek=settlement.town.week;
 for(const [index,[questId,region,tier,objectives]] of stages.entries()){
  assert.equal(selectQuest(settlement,questId).unlocked,true);
  assert.equal(canStartNextExpedition(lastExpedition).allowed,true);
  const party=prepareRosterParty(settlement);
  const expedition=createDungeon(500+index,{region,tier,party,interactiveEvents:true});
  expedition.questId=questId;
  expedition.phase='victory';
  expedition.cleared=[...objectives];
  expedition.rosterReturned=false;
  expedition.townWeekProcessed=false;
  expedition.rewardClaimed=false;
  expedition.traitsProcessed=true;
  assert.equal(returnPartyToRoster(settlement,expedition),true);
  assert.equal(advanceTownWeek(settlement,expedition),true);
  assert.equal(canStartNextExpedition(expedition).allowed,false);
  const previousGold=settlement.gold;
  offerLoot(expedition,'gold',100);
  collectLoot(expedition);
  const {progress}=completeCampaignExpedition(settlement,expedition);
  assert.equal(settlement.gold,previousGold+100);
  assert.equal(settlement.completedExpeditions,index+1);
  assert.equal(progress.finished,index===stages.length-1);
  assert.throws(()=>completeCampaignExpedition(settlement,expedition),/unclaimed victory/);
  assert.equal(canStartNextExpedition(expedition).allowed,true);
  ({settlement,expedition:lastExpedition}=decodeCampaignSave(encodeCampaignSave(settlement,expedition)));
  assert.equal(settlement.town.week,firstWeek+index+1);
  assert.equal(lastExpedition.rewardClaimed,true);
 }
 assert.equal(campaignProgress(settlement).finished,true);
 assert.deepEqual(settlement.campaignVictories,['veteran-victory','champion-victory']);
 assert.equal(settlement.completedExpeditions,5);
});

test('unsupported Crypt Veteran and Champion victories cannot claim rewards or alter progress',()=>{
 for(const tier of ['veteran','champion']){
  const settlement=createCampaignSettlement();
  const expedition=createDungeon(901,{region:'crypt',tier:'apprentice',interactiveEvents:true});
  expedition.region='crypt';
  expedition.tier=tier;
  expedition.phase='victory';
  expedition.cleared=['sanctum'];
  offerLoot(expedition,'gold',100);
  collectLoot(expedition);
  assert.throws(()=>completeCampaignExpedition(settlement,expedition),/Only Apprentice Ashen Crypt/);
  assert.notEqual(expedition.rewardClaimed,true);
  assert.equal(settlement.completedExpeditions,0);
  assert.equal(settlement.gold,0);
  assert.deepEqual(settlement.campaignVictories,[]);
 }
});

test('campaign can recover from a failed expedition without granting progress or duplicating a town week',()=>{
 let settlement=createCampaignSettlement();
 const firstParty=prepareRosterParty(settlement);
 const defeat=createDungeon(1401,{region:'crypt',tier:'apprentice',party:firstParty});
 defeat.phase='defeat';
 defeat.rosterReturned=false;
 defeat.townWeekProcessed=false;
 defeat.party[0].unit && (defeat.party[0].unit.stress=60);
 assert.equal(returnPartyToRoster(settlement,defeat),true);
 assert.equal(advanceTownWeek(settlement,defeat),true);
 const afterDefeatWeek=settlement.town.week;
 assert.equal(advanceTownWeek(settlement,defeat),false);
 assert.equal(settlement.completedExpeditions,0);
 assert.equal(campaignProgress(settlement).completed,0);
 assert.equal(canStartNextExpedition(defeat).allowed,true);
 ({settlement}=decodeCampaignSave(encodeCampaignSave(settlement,defeat)));
 assert.equal(settlement.town.week,afterDefeatWeek);
 assert.equal(selectQuest(settlement,'crypt-recon').unlocked,true);
 assert.equal(selectQuest(settlement,'warrens-recon').unlocked,false);
 const recoveryParty=prepareRosterParty(settlement);
 assert.equal(recoveryParty.length,4);
 const recovery=createDungeon(1402,{region:'crypt',tier:'apprentice',party:recoveryParty,interactiveEvents:true});
 recovery.questId='crypt-recon';
 recovery.cleared=['sanctum'];
 recovery.phase='victory';
 recovery.rosterReturned=false;
 recovery.townWeekProcessed=false;
 recovery.traitsProcessed=true;
 assert.equal(returnPartyToRoster(settlement,recovery),true);
 assert.equal(advanceTownWeek(settlement,recovery),true);
 const {progress}=completeCampaignExpedition(settlement,recovery);
 assert.equal(progress.milestones.find(x=>x.id==='first-expedition').complete,true);
 assert.equal(settlement.completedExpeditions,1);
 assert.equal(settlement.town.week,afterDefeatWeek+1);
 assert.equal(selectQuest(settlement,'warrens-recon').unlocked,true);
});
