// Provisional monster tactics; profile weights are authored for Clays test
// encounters, NOT asserted to be the original DD1 monster AI probabilities.
// Select a legal skill first, then a target independently. This avoids giving
// four-target skills four times the selection chance of single-target skills.
const PROFILES=Object.freeze({
  'Skeleton Archer':Object.freeze({targetPreference:'rear'}),
  'Skeleton Court Mage':Object.freeze({skillWeights:Object.freeze({court_curse:3,court_blight:1,enemy_stress:3,enemy_strike:1}),targetPreference:'stressed'})
});
export const ENEMY_TACTICS=PROFILES;

function weightedChoice(items,weightFor,random){
  const weighted=items.map(item=>({item,weight:weightFor(item)}))
    .filter(x=>Number.isFinite(x.weight)&&x.weight>0);
  if(!weighted.length)return null;
  let roll=random()*weighted.reduce((sum,x)=>sum+x.weight,0);
  for(const x of weighted){roll-=x.weight;if(roll<0)return x.item;}
  return weighted[weighted.length-1].item;
}

export function chooseEnemyAction(state,actorId,skillIds,random,abilities,availableTargets,profiles=ENEMY_TACTICS){
  const actor=state?.units?.find(u=>u.id===actorId);
  const profile=actor&&profiles[actor.name]||{};
  const choices=[];
  for(const key of skillIds){
    const skill=abilities[key];
    if(!skill)continue;
    const targets=availableTargets(state,actorId,key);
    const weight=profile.skillWeights?.[key]??skill.aiWeight??1;
    if(!targets.length||!Number.isFinite(weight)||weight<=0)continue;
    choices.push({key,targets,weight});
  }
  const picked=weightedChoice(choices,x=>x.weight,random);
  if(!picked)return null;
  // Preference multipliers are deliberately small, and only apply to legal
  // targets; rank is always derived from the current formation, not spawn rank.
  const target=weightedChoice(picked.targets,id=>{
    if(!actor||!profile.targetPreference)return 1;
    const unit=state.units.find(u=>u.id===id);
    if(!unit)return 0;
    if(profile.targetPreference==='rear'){
      const allies=state.units.filter(u=>u.side===unit.side&&!u.dead&&!u.corpse);
      return 1+allies.indexOf(unit); // more rearward targets receive higher weight
    }
    if(profile.targetPreference==='stressed')return 1+Math.floor((unit.stress??0)/25);
    return 1;
  },random);
  return {key:picked.key,targetId:target};
}
