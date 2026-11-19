import {claimExpeditionRewards,expeditionRewardSummary} from './inventory.js';
// Clays-original campaign progression. DD1 combat rules remain unchanged.
// Completion is a persistent campaign goal, not a claim of DD1 quest parity.
export const CAMPAIGN_MILESTONES=Object.freeze([
 Object.freeze({id:'first-expedition',name:'First Expedition',description:'Complete your first expedition',required:1}),
 Object.freeze({id:'established-company',name:'Established Company',description:'Complete three expeditions',required:3}),
 Object.freeze({id:'veteran-victory',name:'Veteran Trial',description:'Win a Veteran Blighted Warrens expedition',tier:'veteran',region:'plague'}),
 Object.freeze({id:'champion-victory',name:'Champion Trial',description:'Win a Champion Blighted Warrens expedition',tier:'champion',region:'plague'})
]);
export function campaignProgress(settlement){
 const count=settlement?.completedExpeditions??0;
 const victories=settlement?.campaignVictories??[];
 if(!Number.isSafeInteger(count)||count<0||!Array.isArray(victories))throw Error('Invalid campaign progress');
 const milestones=CAMPAIGN_MILESTONES.map(goal=>Object.freeze({...goal,
  complete:goal.required!==undefined?count>=goal.required:victories.includes(goal.id)}));
 return Object.freeze({milestones,completed:milestones.filter(x=>x.complete).length,
  finished:milestones.every(x=>x.complete)});
}
// Read-only progress presentation; does not mutate campaign saves.
export function campaignMilestoneProgress(settlement){
 const state=campaignProgress(settlement);
 const count=settlement?.completedExpeditions??0;
 return state.milestones.map(goal=>Object.freeze({
  ...goal,
  current:goal.required===undefined?(goal.complete?1:0):Math.min(count,goal.required),
  target:goal.required??1,
  nextStep:goal.complete?'Completed':goal.id==='first-expedition'?'Finish an expedition':
   goal.id==='established-company'?'Complete more expeditions':
   goal.id==='veteran-victory'?'Win a Veteran Warrens quest':'Win a Champion Warrens quest'
 }));
}
export function recordCampaignVictory(settlement,expedition){
 if(expedition?.phase!=='victory'||!expedition.rewardClaimed)throw Error('Claim expedition rewards before recording victory');
 if(!Array.isArray(settlement.campaignVictories))settlement.campaignVictories=[];
 for(const goal of CAMPAIGN_MILESTONES){
  if(goal.tier===expedition.tier&&goal.region===expedition.region&&!settlement.campaignVictories.includes(goal.id)){
   settlement.campaignVictories.push(goal.id);
  }
 }
 return campaignProgress(settlement);
}

// Clays-original quest unlocks, independent of DD1 combat balancing.
export function expeditionUnlock(settlement,region,tier){
 if(!['crypt','plague'].includes(region))return Object.freeze({unlocked:false,reason:'Unknown region'});
 if(!['apprentice','veteran','champion'].includes(tier))return Object.freeze({unlocked:false,reason:'Unknown tier'});
 if(region==='crypt'&&tier!=='apprentice')return Object.freeze({unlocked:false,reason:'Only Apprentice Ashen Crypt is implemented'});
 const progress=campaignProgress(settlement);
 const first=progress.milestones.find(x=>x.id==='first-expedition').complete;
 const established=progress.milestones.find(x=>x.id==='established-company').complete;
 const veteran=progress.milestones.find(x=>x.id==='veteran-victory').complete;
 if(region==='plague'&&!first)return Object.freeze({unlocked:false,reason:'Complete one expedition to unlock Blighted Warrens'});
 if(tier==='veteran'&&!established)return Object.freeze({unlocked:false,reason:'Complete three expeditions to unlock Veteran quests'});
 if(tier==='champion'&&!veteran)return Object.freeze({unlocked:false,reason:'Win a Veteran Blighted Warrens expedition to unlock Champion quests'});
 return Object.freeze({unlocked:true,reason:''});
}

// One entry point for settlement rewards and campaign completion. Validate the
// milestone before mutating either object; duplicate button clicks are rejected.
export function completeCampaignExpedition(settlement,expedition){
 if(expedition?.phase!=='victory'||expedition.rewardClaimed)throw Error('Expedition must be an unclaimed victory');
 if(!Number.isSafeInteger(settlement?.completedExpeditions)||settlement.completedExpeditions<0)throw Error('Invalid expedition count');
 if(!Array.isArray(settlement.campaignVictories))throw Error('Invalid campaign victories');
 if(!Array.isArray(expedition.log))throw Error('Invalid expedition log');
 if(!['crypt','plague'].includes(expedition.region)||!['apprentice','veteran','champion'].includes(expedition.tier))throw Error('Invalid expedition region or tier');
 if(expedition.region==='crypt'&&expedition.tier!=='apprentice')throw Error('Only Apprentice Ashen Crypt expeditions are supported');
 if(expedition.questId!==undefined){
  const contracts={
   'crypt-recon':['crypt','apprentice'],
   'crypt-purge':['crypt','apprentice'],
   'warrens-recon':['plague','apprentice'],
   'warrens-containment':['plague','apprentice'],
   'warrens-veteran':['plague','veteran'],
   'warrens-champion':['plague','champion']
  };
  const expected=contracts[expedition.questId];
  if(!expected||expected[0]!==expedition.region||expected[1]!==expedition.tier)throw Error('Expedition quest does not match region and tier');
  const objectives=['crypt-purge','warrens-containment'].includes(expedition.questId)?['watch','vault']:
   ['warrens-veteran','warrens-champion'].includes(expedition.questId)?['watch','vault','sanctum']:['sanctum'];
  if(!Array.isArray(expedition.cleared)||objectives.some(room=>!expedition.cleared.includes(room)))throw Error('Expedition quest objectives are incomplete');
 }
 if(expedition.pendingLoot)throw Error('Resolve pending loot before settlement transfer');
 // DD1 separates guaranteed, quest-board rewards from collected loot.
 // A validated quest ID guarantees one completion trinket, even when older\n // expedition saves omit questReward. Never invent gold or heirloom amounts.
 const questReward=expedition.questReward??(expedition.questId?{trinkets:1}:null);
 if(questReward!==null){
  if(!questReward||typeof questReward!=='object'||Array.isArray(questReward))throw Error('Invalid quest reward');
  const allowed=['gold','crests','deeds','busts','trinkets'];
  if(Object.keys(questReward).some(key=>!allowed.includes(key)))throw Error('Unknown quest reward');
  for(const [key,value] of Object.entries(questReward)){
   if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid quest reward quantity');
   if(key==='busts'&&!Number.isFinite(settlement.busts))throw Error('Settlement does not support bust rewards');
   if(key==='trinkets'){
    if(!Array.isArray(settlement.trinkets)||value>1000)throw Error('Invalid quest reward trinket quantity');
   }else if(!Number.isSafeInteger(settlement[key])||!Number.isSafeInteger(settlement[key]+value)){
    throw Error('Quest reward exceeds settlement capacity');
   }
  }
 }
 // Preflight the combined carried spoils and quest payout before either is claimed.
 const carried=expeditionRewardSummary(expedition);
 for(const [key,amount] of Object.entries({
  gold:carried.totalGold+(questReward?.gold??0),
  crests:carried.crests+(questReward?.crests??0),
  deeds:carried.deeds+(questReward?.deeds??0),
  ...(Object.hasOwn(settlement,'busts')?{busts:(carried.busts??0)+(questReward?.busts??0)}:{})
 })){
  if(!Number.isSafeInteger(amount)||!Number.isSafeInteger(settlement[key]+amount))throw Error('Combined expedition reward exceeds settlement capacity');
 }
 if(settlement.trinkets.length+carried.trinkets+(questReward?.trinkets??0)>1000)throw Error('Combined expedition trinket reward exceeds settlement capacity');
 const report=claimExpeditionRewards(expedition,settlement);
 if(questReward){
  for(const key of ['gold','crests','deeds','busts'])if(questReward[key])settlement[key]+=questReward[key];
  const rarity=expedition.questId?({\n   'crypt-recon':'common','crypt-purge':'uncommon',\n   'warrens-recon':'common','warrens-containment':'uncommon',\n   'warrens-veteran':'rare','warrens-champion':'ancestral'\n  })[expedition.questId]:null;\n  for(let i=0;i<(questReward.trinkets??0);i++)settlement.trinkets.push(rarity?'ward-charm-'+rarity:'ward-charm');
  expedition.questRewardClaimed=true;
 }
 settlement.completedExpeditions++;
 recordCampaignVictory(settlement,expedition);
 return {report,progress:campaignProgress(settlement)};
}

// Prevent abandoning unclaimed victory spoils by starting a new expedition.
export function canStartNextExpedition(expedition){
 if(!expedition)return Object.freeze({allowed:true,reason:''});
 if(['victory','defeat'].includes(expedition.phase)&&expedition.rosterReturned===false)return Object.freeze({allowed:false,reason:'Return expedition heroes to the roster before starting another expedition'});
 if(['victory','defeat'].includes(expedition.phase)&&expedition.townWeekProcessed===false)return Object.freeze({allowed:false,reason:'Finish settlement recovery before starting another expedition'});
 if(expedition.phase==='defeat')return Object.freeze({allowed:true,reason:''});
 if(expedition.phase==='victory')return expedition.rewardClaimed?
  Object.freeze({allowed:true,reason:''}):
  Object.freeze({allowed:false,reason:'Return expedition rewards to the settlement before starting another expedition'});
 return Object.freeze({allowed:false,reason:'Finish the expedition before starting another'});
}
