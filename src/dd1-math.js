// DD1 numerical combat rules. Pure functions so browser and Node tests use the same formulas.
// Internal formulas retain the DD1 mechanical basis; UI names are Clays reskins.
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function hitChance({accuracy,dodge=0,accModifier=0,missStreak=0}){
  // DD1 hidden +5 ACC; +4 ACC for each prior consecutive miss.
  return clamp(accuracy+accModifier-dodge+5+4*missStreak,5,100);
}
export function rollHit(args,rng){return rng()*100<hitChance(args);}
export function criticalChance({baseCrit=0,skillCrit=0,bonusCrit=0}) {
  return clamp(baseCrit+skillCrit+bonusCrit,0,100);
}
export function rollCrit(args,rng){return rng()*100<criticalChance(args);}
export function effectiveCombatStats(u){
  const d=u.deathDoor;
  const recovery=!d&&u.mortality==='deathDoorRecovery';
  const heart=!d&&u.mortality==='heartAttackRecovery';
  return {
    accuracy:(u.accMod??0)+(d?-10:recovery?-2:heart?-3:0),
    damageMultiplier:d?.75:recovery?.95:heart?.90:1,
    speed:(u.spd??0)+(d?-5:recovery?-1:heart?-2:0),
    stressMultiplier:d?1.33:recovery?1.10:heart?1.15:1
  };
}
export function directDamage({minDamage,maxDamage,skillMultiplier=1,crit=false,prot=0,ignoreProt=false,damageMultiplier=1},rng){
  // DD1 crit: 150% of the *maximum* attack damage, not a random roll.
  const raw=crit?1.5*maxDamage*skillMultiplier:Math.floor(rng()*(maxDamage-minDamage+1)+minDamage)*skillMultiplier;
  const reduction=ignoreProt?1:1-clamp(prot,0,80)/100;
  // A genuinely non-damaging attack can display 0; this is distinct from a
  // damaging attack reduced to a minimum of 1 by rounding/protection.
  if(raw<=0||damageMultiplier<=0)return 0;
  return Math.max(1,Math.round(raw*damageMultiplier*reduction));
}
export function resistChance({applicationChance,resistance=0,crit=false}) {
  // Crits grant +20 percentage points to status application, not direct damage.
  return clamp(applicationChance+(crit?20:0)-resistance,0,100);
}
export function dotDuration(base=3,crit=false){
  // DD1 critical bleed/blight lasts 50% longer, rounded up for any base duration.
  return crit?Math.ceil(base*1.5):base;
}
export function deathBlowResistance(u){
  return clamp(u.deathResist??67,0,87);
}
export function initiativeScore(u,rng){
  return effectiveCombatStats(u).speed+1+Math.floor(rng()*8);
}
export function moraleCheck(stress,afflicted,virtuous){
  return stress>=100&&!afflicted&&!virtuous;
}
