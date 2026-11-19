// Campaign quest board: Clays-original objectives and descriptions.
// One guaranteed trinket per successful quest follows DD1; rarity follows tier/length.
// Provisional guaranteed gold payouts restore an expedition economy while exact
// DD1 tier/length quest reward tables remain to be verified. Heirloom payouts
// remain unconfigured; do not mistake these figures for verified DD1 data.
import {expeditionUnlock} from './campaign-progression.js';
export const QUESTS=Object.freeze([
 Object.freeze({id:'crypt-recon',region:'crypt',tier:'apprentice',name:'Ashen Crypt Reconnaissance',objective:'Secure the Forgotten Sanctum',questReward:Object.freeze({gold:2000,trinkets:1}),trinketRarity:'common',difficulty:'scout'}),
 Object.freeze({id:'crypt-purge',region:'crypt',tier:'apprentice',name:'Ashen Crypt Purge',objective:'Defeat the Watch and Vault guardians',questReward:Object.freeze({gold:3500,trinkets:1}),trinketRarity:'uncommon',difficulty:'patrol'}),
 Object.freeze({id:'warrens-recon',region:'plague',tier:'apprentice',name:'Blighted Warrens Reconnaissance',objective:'Secure the Rotting Shrine',questReward:Object.freeze({gold:2000,trinkets:1}),trinketRarity:'common',difficulty:'scout'}),
 Object.freeze({id:'warrens-containment',region:'plague',tier:'apprentice',name:'Warrens Containment',objective:'Eliminate the Watch and Vault infestation',questReward:Object.freeze({gold:3500,trinkets:1}),trinketRarity:'uncommon',difficulty:'patrol'}),
 Object.freeze({id:'warrens-veteran',region:'plague',tier:'veteran',name:'Veteran Warrens Expedition',objective:'Secure both outposts and the Rotting Shrine against Veteran enemies',questReward:Object.freeze({gold:5000,trinkets:1}),trinketRarity:'rare',difficulty:'patrol'}),
 Object.freeze({id:'warrens-champion',region:'plague',tier:'champion',name:'Champion Warrens Expedition',objective:'Secure both outposts and the Rotting Shrine against Champion enemies',questReward:Object.freeze({gold:7000,trinkets:1}),trinketRarity:'ancestral',difficulty:'gauntlet'})
]);
export function availableQuests(settlement){
 return QUESTS.map(quest=>Object.freeze({...quest,...expeditionUnlock(settlement,quest.region,quest.tier)}));
}
export function selectQuest(settlement,questId){
 const quest=availableQuests(settlement).find(q=>q.id===questId);
 if(!quest)throw Error('Unknown quest');
 if(!quest.unlocked)throw Error(quest.reason);
 return quest;
}
