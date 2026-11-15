// Campaign quest board: Clays-original objectives and descriptions.
// Does not modify DD1-inspired combat, enemy weights, or reward formulas.
import {expeditionUnlock} from './campaign-progression.js';
export const QUESTS=Object.freeze([
 Object.freeze({id:'crypt-recon',region:'crypt',tier:'apprentice',name:'Ashen Crypt Reconnaissance',objective:'Secure the Forgotten Sanctum',difficulty:'scout'}),
 Object.freeze({id:'crypt-purge',region:'crypt',tier:'apprentice',name:'Ashen Crypt Purge',objective:'Defeat the Watch and Vault guardians',difficulty:'patrol'}),
 Object.freeze({id:'warrens-recon',region:'plague',tier:'apprentice',name:'Blighted Warrens Reconnaissance',objective:'Secure the Rotting Shrine',difficulty:'scout'}),
 Object.freeze({id:'warrens-veteran',region:'plague',tier:'veteran',name:'Veteran Warrens Expedition',objective:'Secure both outposts and the Rotting Shrine against Veteran enemies',difficulty:'patrol'}),
 Object.freeze({id:'warrens-champion',region:'plague',tier:'champion',name:'Champion Warrens Expedition',objective:'Secure both outposts and the Rotting Shrine against Champion enemies',difficulty:'gauntlet'})
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
