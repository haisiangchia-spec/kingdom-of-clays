// Provisional monster tactics; profile weights are authored for Clays test
// encounters, NOT asserted to be the original DD1 monster AI probabilities.
// Select a legal skill first, then a target independently. This avoids giving
// four-target skills four times the selection chance of single-target skills.
const PROFILES=Object.freeze({
  'Outlaw Duelist':Object.freeze({
    // Verified *relative skill weights* for DD1 Veteran/Champion Brigand
    // Cutthroat. Clays uses its own reskinned ability names.
    turnWeights:Object.freeze({
      1:Object.freeze({duelist_sweep:7,duelist_uppercut:1,duelist_shank:2,duelist_poke:1}),
      2:Object.freeze({duelist_sweep:2,duelist_uppercut:1,duelist_shank:6,duelist_poke:1}),
      later:Object.freeze({duelist_sweep:2,duelist_uppercut:1,duelist_shank:2,duelist_poke:1})
    })
  }),
  'Skeleton Swordsman':Object.freeze({targetDesires:Object.freeze([{type:'marked',weight:4}]),skillDesires:Object.freeze([{type:'ally_dead',skill:'skeleton_guard_break',allyProfile:'mage',weight:3}])}),
  'Skeleton Archer':Object.freeze({targetPreference:'rear',targetDesires:Object.freeze([{type:'resistance',stat:'debuff',direction:'low',weight:2,skills:['skeleton_pin_arrow']}])}),
  'Skeleton Court Mage':Object.freeze({skillWeights:Object.freeze({court_curse:3,court_blight:1,enemy_stress:3,enemy_strike:1}),targetPreference:'stressed',skillDesires:Object.freeze([{type:'target_status',skill:'court_curse',status:'blight',weight:2}])}),
  'Goblin Emperor':Object.freeze({
    phaseWeights:Object.freeze({
      commanding:Object.freeze({emperor_slam:1,emperor_roar:3,emperor_call:0}),
      desperate:Object.freeze({emperor_slam:4,emperor_roar:1,emperor_call:3})
    }),targetPreference:'weakest',skillDesires:Object.freeze([{type:'performing_turn',skill:'emperor_slam',turn:2,weight:1.5}])
  })
});
export const ENEMY_TACTICS=PROFILES;

// HP-threshold boss tactics are a Kingdom of Clays test fixture, NOT an
// original-DD1 Goblin Emperor rule. Evaluate from current HP each action.
export function bossPhase(actor){
 if(!actor||actor.enemyProfile!=='emperor')return null;
 return actor.hp>0&&actor.hp<=actor.maxHp/2?'desperate':'commanding';
}

// DD1 monster brains support marked_target and resistance_target desires.
// These are configurable approximation weights; actual monster-brain values
// must be transcribed from the source data before claiming full parity.
export function targetDesireWeight(unit,skillKey,desires=[]){
 let weight=1;
 for(const desire of desires??[]){
   if(desire.skills&&!desire.skills.includes(skillKey))continue;
   if(!Number.isFinite(desire.weight)||desire.weight<=0)continue;
   if(desire.type==='marked'&&unit.marked>0)weight*=desire.weight;
   if(desire.type==='resistance'){
     const resistance=unit.resist?.[desire.stat];
     if(!Number.isFinite(resistance))continue;
     // Give the least resistant eligible target greater relative weight.
     // Does not pretend to reproduce the game's internal desire formula.
     if(desire.direction==='low')weight*=1+(100-Math.min(100,Math.max(0,resistance)))/100*(desire.weight-1);
     else if(desire.direction==='high')weight*=1+Math.min(100,Math.max(0,resistance))/100*(desire.weight-1);
   }
 }
 return weight;
}

// DD1 monster brains describe conditional SKILL desires as well as target
// desires. These multipliers are Clays approximations, not vanilla weights.
// A desire can affect only an already-legal action and never grants new ranks.
export function skillDesireWeight(state,actor,skillKey,legalTargets,desires=[]){
 let weight=1;
 for(const desire of desires??[]){
   if(desire.skill!==skillKey||!Number.isFinite(desire.weight)||desire.weight<=0)continue;
   const units=state?.units??[];
   const allies=units.filter(u=>u.side===actor?.side&&u.id!==actor?.id&&!u.corpse);
   let matches=false;
   if(desire.type==='ally_alive')matches=allies.some(u=>!u.dead&&u.enemyProfile===desire.allyProfile);
   if(desire.type==='ally_dead')matches=!allies.some(u=>!u.dead&&u.enemyProfile===desire.allyProfile);
   if(desire.type==='target_status'){
     matches=legalTargets.some(id=>{
       const target=units.find(u=>u.id===id);
       if(!target||target.dead||target.corpse)return false;
       if(desire.status==='marked')return target.marked>0;
       if(desire.status==='stunned')return target.stun>0;
       if(desire.status==='bleed'||desire.status==='blight')return target.dot?.some(d=>d.type===desire.status&&d.turns>0);
       return false;
     });
   }
   if(desire.type==='performing_turn')matches=(actor?.actionsTaken??0)+1===desire.turn;
   if(matches)weight*=desire.weight;
 }
 return weight;
}

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
    const turnWeights=profile.turnWeights?.[(actor?.actionsTaken??0)+1]??profile.turnWeights?.later;
    const baseWeight=turnWeights?.[key]??profile.phaseWeights?.[bossPhase(actor)]?.[key]??profile.skillWeights?.[key]??skill.aiWeight??1;
    const weight=baseWeight*skillDesireWeight(state,actor,key,targets,profile.skillDesires);
    if(!targets.length||!Number.isFinite(weight)||weight<=0)continue;
    choices.push({key,targets,weight});
  }
  const picked=weightedChoice(choices,x=>x.weight,random);
  if(!picked)return null;
  // Preference multipliers are deliberately small, and only apply to legal
  // targets; rank is always derived from the current formation, not spawn rank.
  const target=weightedChoice(picked.targets,id=>{
    if(!actor)return 1;
    const unit=state.units.find(u=>u.id===id);
    if(!unit||unit.dead||unit.corpse)return 0;
    let weight=targetDesireWeight(unit,picked.key,profile.targetDesires);
    if(profile.targetPreference==='rear'){
      const allies=state.units.filter(u=>u.side===unit.side&&!u.dead&&!u.corpse);
      weight*=1+allies.indexOf(unit); // current formation, not initial rank
    }
    if(profile.targetPreference==='stressed')weight*=1+Math.floor((unit.stress??0)/25);
    if(profile.targetPreference==='weakest')weight*=1+Math.max(0,Math.floor((1-unit.hp/Math.max(1,unit.maxHp))*4));
    return weight;
  },random);
  return {key:picked.key,targetId:target};
}
