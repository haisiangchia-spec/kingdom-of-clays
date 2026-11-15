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
