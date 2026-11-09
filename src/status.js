// DD1-inspired status lifecycle. No UI state, all changes deterministic.
export const statusChance=(application,resistance=0)=>Math.max(0,Math.min(100,application-resistance));
export function stunResistance(u){return (u.resist?.stun??0)+(u.stunRecoveryStacks??0)*50;}
export function inflictStun(u){u.stun=1;u.guard=null;u.riposte=0;return u;}
export function consumeStun(u){
  if(!u.stun)return false;
  u.stun=0;
  u.stunRecoveryStacks=(u.stunRecoveryStacks??0)+1;
  u.guard=null;u.riposte=0;
  return true;
}
export function completeUnstunnedTurn(u){u.stunRecoveryStacks=0;}
export function applyGuard(state,protector,targetId,turns=2){
  // The guard is stored on the protector and redirected only for direct single-target attacks.
  for(const x of state.units){
    if(x.guard?.targetId===targetId||x.guard?.targetId===protector.id||x.id===targetId&&x.guard) x.guard=null;
  }
  protector.guard={targetId,turns};
}
export function guardTarget(state,target){
  const g=state.units.find(x=>x.guard?.targetId===target.id&&!x.dead&&!x.stun&&x.side===target.side);
  return g??target;
}
export function canCounter(defender,attacker,skill){
  return !!(defender.riposte>0&&!defender.stun&&!defender.dead&&!attacker.dead&&defender.side!==attacker.side&&skill.kind!=='stress'&&skill.kind!=='mark'&&skill.kind!=='heal'&&skill.kind!=='groupHeal'&&skill.kind!=='guard');
}
export function tickTimedEffects(u){
  if(u.marked>0)u.marked--;
  if(u.riposte>0)u.riposte--;
  if(u.guard?.turns>0){
    u.guard.turns--;
    if(u.guard.turns===0)u.guard=null;
  }
  if(u.effects?.length){
    u.effects.forEach(x=>x.turns--);
    u.effects=u.effects.filter(x=>x.turns>0);
  }
}
export function addTimedEffect(u,effect){
  u.effects??=[];
  u.effects.push({...effect}); // duplicate buffs/debuffs remain distinct stacks
}
export function effectModifier(u,stat){
  return (u.effects??[]).reduce((sum,e)=>sum+(e.modifiers?.[stat]??0),0);
}
