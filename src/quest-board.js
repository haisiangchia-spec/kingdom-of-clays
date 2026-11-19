// Campaign quest board: Clays-original objectives and descriptions.
// DD1-inspired guaranteed gold, heirlooms and trinkets, with explicit length metadata.
// Provisional guaranteed gold payouts restore an expedition economy while exact
// DD1 tier/length quest reward tables remain to be verified. Heirloom payouts
// are provisional too; do not mistake these figures for verified DD1 data.
import {expeditionUnlock} from './campaign-progression.js';
export const QUESTS=Object.freeze([
 Object.freeze({id:'crypt-recon',length:'short',region:'crypt',tier:'apprentice',name:'Ashen Crypt Reconnaissance',objective:'Secure the Forgotten Sanctum',questReward:Object.freeze({gold:2000,crests:2,trinkets:1}),trinketRarity:'common',difficulty:'scout'}),
 Object.freeze({id:'crypt-purge',length:'medium',region:'crypt',tier:'apprentice',name:'Ashen Crypt Purge',objective:'Defeat the Watch and Vault guardians',questReward:Object.freeze({gold:3500,crests:4,trinkets:1}),trinketRarity:'uncommon',difficulty:'patrol'}),
 Object.freeze({id:'warrens-recon',length:'short',region:'plague',tier:'apprentice',name:'Blighted Warrens Reconnaissance',objective:'Secure the Rotting Shrine',questReward:Object.freeze({gold:2000,deeds:2,trinkets:1}),trinketRarity:'common',difficulty:'scout'}),
 Object.freeze({id:'warrens-containment',length:'medium',region:'plague',tier:'apprentice',name:'Warrens Containment',objective:'Eliminate the Watch and Vault infestation',questReward:Object.freeze({gold:3500,deeds:4,trinkets:1}),trinketRarity:'uncommon',difficulty:'patrol'}),
 Object.freeze({id:'warrens-veteran',length:'medium',region:'plague',tier:'veteran',name:'Veteran Warrens Expedition',objective:'Secure both outposts and the Rotting Shrine against Veteran enemies',questReward:Object.freeze({gold:5000,deeds:6,trinkets:1}),trinketRarity:'rare',difficulty:'patrol'}),
 Object.freeze({id:'warrens-champion',length:'long',region:'plague',tier:'champion',name:'Champion Warrens Expedition',objective:'Secure both outposts and the Rotting Shrine against Champion enemies',questReward:Object.freeze({gold:7000,deeds:8,trinkets:1}),trinketRarity:'ancestral',difficulty:'gauntlet'})
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
