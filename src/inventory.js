// Kingdom of Clays provisional expedition inventory.
// Capacity and stack sizes are not yet sourced from DD1 game data.
// Supplies remain in the legacy fields; this module presents a unified view
// while valuables use explicit stacks. No duplicated supply counters.
export const INVENTORY_CAPACITY=8;
export const ITEM_RULES=Object.freeze({
 food:Object.freeze({name:'Food',stack:4}),
 torch:Object.freeze({name:'Torch',stack:2}),
 holyWater:Object.freeze({name:'Holy Water',stack:1}),
 gold:Object.freeze({name:'Gold',stack:100,value:1}),
 gem:Object.freeze({name:'Moonstone',stack:3,value:125}),
 crest:Object.freeze({name:'Crest',stack:6}),
 deed:Object.freeze({name:'Deed',stack:4}),
 bust:Object.freeze({name:'Bust',stack:6}),
 trinket:Object.freeze({name:'Ward Charm',stack:1,value:250})
});
const valid=(kind,quantity)=>!!ITEM_RULES[kind]&&Number.isInteger(quantity)&&quantity>0;
function sourceQuantity(d,kind){
 if(kind==='holyWater')return d.curioSupplies?.holyWater??0;
 return d.supplies?.[kind]??0;
}
export function inventoryStacks(d){
 const items=[];
 for(const kind of ['food','torch','holyWater']){
  let qty=sourceQuantity(d,kind),index=0;
  while(qty>0){const n=Math.min(qty,ITEM_RULES[kind].stack);items.push({kind,quantity:n,id:kind+':'+index++});qty-=n;}
 }
 for(const [i,stack] of (d.inventory??[]).entries())items.push({kind:stack.kind,quantity:stack.quantity,id:'treasure:'+i});
 return items;
}
export function inventoryUsed(d){return inventoryStacks(d).length;}
export function inventoryCanAdd(d,kind,quantity){
 if(!valid(kind,quantity))throw Error('Invalid inventory item');
 if(['food','torch','holyWater'].includes(kind))throw Error('Only rewards can be collected with this action');
 let remaining=quantity;
 for(const stack of d.inventory??[])if(stack.kind===kind)remaining-=Math.min(remaining,ITEM_RULES[kind].stack-stack.quantity);
 return inventoryUsed(d)+Math.ceil(Math.max(0,remaining)/ITEM_RULES[kind].stack)<=INVENTORY_CAPACITY;
}
export function offerLoot(d,kind,quantity){
 if(!valid(kind,quantity)||['food','torch','holyWater'].includes(kind))throw Error('Invalid loot');
 if(d.pendingLoot)throw Error('Resolve current loot first');
 d.pendingLoot={kind,quantity};
 d.log.push('Found '+quantity+' '+ITEM_RULES[kind].name+': collect or leave');
 return d;
}
export function collectLoot(d){
 const offer=d.pendingLoot;
 if(!offer)throw Error('No pending loot');
 if(!inventoryCanAdd(d,offer.kind,offer.quantity))throw Error('Inventory full; discard a stack first');
 d.inventory??=[];
 let remaining=offer.quantity;
 for(const stack of d.inventory){
  if(stack.kind!==offer.kind)continue;
  const add=Math.min(remaining,ITEM_RULES[offer.kind].stack-stack.quantity);
  stack.quantity+=add;remaining-=add;
 }
 while(remaining>0){
  const add=Math.min(remaining,ITEM_RULES[offer.kind].stack);
  d.inventory.push({kind:offer.kind,quantity:add});remaining-=add;
 }
 if(offer.kind==='gold')d.loot=(d.loot??0)+offer.quantity;
 d.pendingLoot=null;
 d.log.push('Collected '+offer.quantity+' '+ITEM_RULES[offer.kind].name);
 return d;
}
export function leaveLoot(d){
 if(!d.pendingLoot)throw Error('No pending loot');
 d.log.push('Left '+d.pendingLoot.quantity+' '+ITEM_RULES[d.pendingLoot.kind].name+' behind');
 d.pendingLoot=null;
 return d;
}
export function discardInventoryStack(d,id){
 if(d.phase!=='explore')throw Error('Cannot discard items during combat');
 if(typeof id!=='string')throw Error('Invalid inventory slot');
 const stacks=inventoryStacks(d),found=stacks.find(s=>s.id===id);
 if(!found)throw Error('Inventory slot not found');
 if(id.startsWith('treasure:')){
  const index=Number(id.slice(9));
  const [removed]=d.inventory.splice(index,1);
  if(removed.kind==='gold')d.loot=Math.max(0,(d.loot??0)-removed.quantity);
 }else if(found.kind==='holyWater')d.curioSupplies.holyWater-=found.quantity;
 else d.supplies[found.kind]-=found.quantity;
 d.log.push('Discarded '+found.quantity+' '+ITEM_RULES[found.kind].name);
 return d;
}

// Reward valuation is intentionally separated from carry capacity. Heirlooms
// and trinkets transfer to the settlement rather than becoming spendable gold.
export function expeditionRewardSummary(d){
 const summary={gold:0,gems:0,crests:0,deeds:0,trinkets:0,gemValue:0,trinketValue:0,totalGold:0};
 for(const stack of d.inventory??[]){
  if(!ITEM_RULES[stack.kind])continue;
  if(stack.kind==='gold')summary.gold+=stack.quantity;
  if(stack.kind==='gem'){summary.gems+=stack.quantity;summary.gemValue+=stack.quantity*ITEM_RULES.gem.value;}
  if(stack.kind==='crest')summary.crests+=stack.quantity;
  if(stack.kind==='deed')summary.deeds+=stack.quantity;
  if(stack.kind==='bust')summary.busts=(summary.busts??0)+stack.quantity;
  if(stack.kind==='trinket'){summary.trinkets+=stack.quantity;summary.trinketValue+=stack.quantity*ITEM_RULES.trinket.value;}
 }
 summary.totalGold=summary.gold+summary.gemValue;
 return summary;
}
export function claimExpeditionRewards(d,settlement){
 if(d.phase!=='victory')throw Error('Complete expedition before settlement transfer');
 if(d.pendingLoot)throw Error('Resolve pending loot before settlement transfer');
 if(d.rewardClaimed)throw Error('Expedition rewards have already been claimed');
 if(!settlement||!Number.isFinite(settlement.gold)||!Number.isFinite(settlement.crests)||!Number.isFinite(settlement.deeds)||!Array.isArray(settlement.trinkets))throw Error('Invalid settlement');
 const report=expeditionRewardSummary(d);
 settlement.gold+=report.totalGold;
 settlement.crests+=report.crests;
 settlement.deeds+=report.deeds;
 if(Object.hasOwn(settlement,'busts'))settlement.busts+=(report.busts??0);
 for(let i=0;i<report.trinkets;i++)settlement.trinkets.push('ward-charm');
 d.rewardClaimed=true;
 d.rewardReport=report;
 d.log.push('Expedition spoils delivered to the settlement');
 return report;
}
export function createSettlement(){return {gold:0,crests:0,deeds:0,trinkets:[]};}
