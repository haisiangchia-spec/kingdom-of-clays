// DD1 Sanitarium upgrade schedules: Busts and Crests.
// Source: https://darkestdungeon.wiki.gg/wiki/Sanitarium
export const SANITARIUM_UPGRADE_TREES=Object.freeze({
 treatmentLibrary:Object.freeze({name:'Treatment Library',maxLevel:5,
  costs:Object.freeze([[3,3],[8,5],[12,8],[16,10],[21,13]])}),
 medicalDevices:Object.freeze({name:'Medical Devices',maxLevel:5,
  costs:Object.freeze([[3,3],[8,5],[12,8],[16,10],[21,13]])}),
 patientCells:Object.freeze({name:'Patient Cells',maxLevel:4,
  costs:Object.freeze([[10,6],[20,13],[30,19],[60,38]])})
});
export function sanitariumUpgradeLevels(s){
 const levels=s.sanitarium?.upgrades??{};
 return Object.fromEntries(Object.entries(SANITARIUM_UPGRADE_TREES).map(([k,v])=>[k,levels[k]??0]));
}
export function nextSanitariumUpgradeCost(s,id){
 const rule=SANITARIUM_UPGRADE_TREES[id];
 if(!rule)throw Error('Unknown Sanitarium upgrade');
 const level=sanitariumUpgradeLevels(s)[id];
 if(!Number.isInteger(level)||level<0||level>rule.maxLevel)throw Error('Invalid Sanitarium level');
 if(level===rule.maxLevel)return null;
 const [busts,crests]=rule.costs[level];
 return {busts,crests};
}
export function upgradeSanitarium(s,id){
 if((s.town?.week??0)<4)throw Error('Sanitarium unlocks in week 4');
 const cost=nextSanitariumUpgradeCost(s,id);
 if(!cost)throw Error('Sanitarium upgrade is at maximum level');
 if(!Number.isSafeInteger(s.busts)||s.busts<cost.busts||!Number.isSafeInteger(s.crests)||s.crests<cost.crests)
  throw Error('Insufficient Busts or Crests');
 s.busts-=cost.busts;s.crests-=cost.crests;
 s.sanitarium.upgrades??={treatmentLibrary:0,medicalDevices:0,patientCells:0};
 const level=++s.sanitarium.upgrades[id];
 return {id,level,cost};
}
export function sanitariumWardCapacity(s,ward){
 const cells=sanitariumUpgradeLevels(s).patientCells;
 if(ward==='medicalWard')return 1+Math.ceil(cells/2);
 if(ward==='quirkWard')return 1+Math.floor(cells/2);
 throw Error('Unknown Sanitarium ward');
}
export function quirkTreatmentDiscount(s){
 return sanitariumUpgradeLevels(s).treatmentLibrary*.10;
}
export function medicalTreatmentDiscount(s){
 const level=sanitariumUpgradeLevels(s).medicalDevices;
 // Medical Devices alternates discount with extra cure chance:
 // the odd ranks (1,3,5) give a further 13% discount.
 return Math.ceil(level/2)*.13;
}
export function multiDiseaseCureChance(s){
 const level=sanitariumUpgradeLevels(s).medicalDevices;
 // Actual DD1 bonus probabilities require further source audit.
 // These deliberately provisional values only apply at levels 2 and 4.
 return (level>=2?15:0)+(level>=4?15:0);
}
