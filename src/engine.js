// Kingdom of Clays: deterministic, UI-independent combat prototype.
import {clamp,hitChance,rollCrit,directDamage,resistChance,dotDuration,deathBlowResistance,initiativeScore,effectiveCombatStats,combinedAttackMultiplier} from './dd1-math.js';
import {exposeHeroToDisease,conditionalQuirkSpeed} from './trait-effects.js';
import {stunResistance,inflictStun,consumeStun,completeUnstunnedTurn,applyGuard,guardTarget,canCounter,tickTimedEffects,addTimedEffect,effectModifier} from './status.js';
import {resolveTargets,cleanseUnit,restorationTick,addRestoration} from './combat-effects.js';
import {isSelectable,moveWithinFormation,attemptDisplacement,corpseFromEnemy,clearExpiredCorpses,hasLiveOpponents,rankOf,occupiedRanks,formationSlots,widthOf} from './formation.js';
import {STARTER_CLASS_SKILLS} from './class-skills.js';
import {SECOND_CLASS_SKILLS} from './class-skills-batch2.js';
import {THIRD_CLASS_SKILLS} from './class-skills-batch3.js';
import {FOURTH_CLASS_SKILLS} from './class-skills-batch4.js';
import {FIFTH_CLASS_SKILLS} from './class-skills-batch5.js';
import {SPIRITBOUND_SKILLS} from './class-skills-spiritbound.js';
import {ENEMY_SKILLS} from './enemy-skills.js';
import {spawnProfileEnemy,makeEnemyFormation} from './enemy-roster.js';
import {createEncounterPlan,spawnEncounterPlan} from './encounter-generator.js';
import {createPlagueEncounterPlan} from './dungeon-regions.js';
import {resolveSkillDefinition,equipVerifiedSkillLevel} from './skill-progression.js';
// This is a fidelity scaffold, not a claim of complete DD1 mechanics.
export function rng(seed=1){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
export const randInt=(r,lo,hi)=>lo+Math.floor(r()*(hi-lo+1));
export function unit(id,name,side,stats={}){return {id,name,side,classId:stats.classId??(side==='hero'?name.toLowerCase().replace(/[^a-z0-9]+/g,'_'):null),size:stats.size??1,types:stats.types??[],hp:stats.hp??26,maxHp:stats.hp??26,spd:stats.spd??4,dodge:stats.dodge??5,prot:stats.prot??0,accMod:stats.accMod??0,crit:stats.crit??0,dmgMin:stats.dmgMin??4,dmgMax:stats.dmgMax??8,stress:0,resist:{stun:stats.stunResist??20,bleed:stats.bleedResist??20,blight:stats.blightResist??20,move:stats.moveResist??0,debuff:stats.debuffResist??20},dot:[],restoration:[],effects:[],stunRecoveryStacks:0,stun:0,deathDoor:false,mortality:null,deathDoorRecovery:false,heartAttackRecovery:false,deathResist:stats.deathResist??67,dead:false,misses:0,guard:null,stunnedThisTurn:false,affliction:null,virtue:null,acted:false,actionsTaken:0,actionsPerRound:Math.max(1,Math.min(4,Number.isInteger(stats.actionsPerRound)?stats.actionsPerRound:1)),actionsRemaining:Math.max(1,Math.min(4,Number.isInteger(stats.actionsPerRound)?stats.actionsPerRound:1)),usedSkills:{},skillLevels:{...stats.skillLevels},form:stats.form??null,transformsUsed:0,transformUsedThisTurn:false};}
export const ABILITIES={
 heavy_slash:{name:'Heavy Slash',from:[0,1],to:[0,1],acc:85,crit:2,mod:0},
 guardian_parry:{name:"Guardian's Parry",from:[0,1,2,3],to:[0,1,2,3],kind:'guard'},
 riposte_stance:{name:'Riposte Stance',from:[0,1,2],to:[0,1,2],acc:85,mod:-.25,riposte:true},
 crushing_strike:{name:'Crushing Strike',from:[0,1],to:[0,1],acc:85,mod:0},
 sweeping_assault:{name:'Sweeping Assault',from:[0,1],to:[0,1],targetMode:'all',acc:85,crit:0,mod:-.40},
 purification_spell:{name:'Purification Spell',from:[2,3],to:[0,1,2,3],kind:'cleanse',cleanse:['bleed','blight'],min:1,max:1},
 empowerment_spell:{name:'Empowerment Spell',from:[2,3],to:[0,1,2,3],kind:'buff',buff:{turns:3,modifiers:{accuracy:10}}},
 concussive_blow:{name:'Concussive Blow',from:[0,1],to:[0,1],acc:80,mod:-.5,status:{type:'stun',chance:100}},
 eagle_eye_shot:{name:'Eagle-Eye Shot',from:[1,2,3],to:[1,2,3],acc:95,crit:5,mod:0,vsMarked:0.5},
 hunters_mark:{name:"Hunter's Mark",from:[1,2,3],to:[0,1,2,3],kind:'mark'},
 shadow_lunge:{name:'Shadow Lunge',from:[2,3],to:[0,1,2],acc:90,mod:.4,advance:2},
 grappling_hook:{name:'Grappling Hook',from:[1,2,3],to:[1,2,3],kind:'moveOnly',moveTarget:{type:'pull',distance:2,chance:100}},
 vanishing_step:{name:'Vanishing Step',from:[0,1,2],to:[0,1,2,3],kind:'stealth',selfBack:2,stealthTurns:2},
 precision_throw:{name:'Precision Throw',from:[1,2,3],to:[1,2,3],acc:90},
 corrosive_bolt:{name:'Corrosive Bolt',from:[2,3],to:[0,1,2],acc:95,mod:-.75,status:{type:'blight',chance:100,value:4,turns:3}},
 blinding_mist:{name:'Blinding Mist',from:[2,3],to:[1,2,3],acc:95,mod:-1,status:{type:'stun',chance:100}},
 greater_heal:{name:'Greater Heal',from:[1,2,3],to:[0,1,2,3],kind:'heal',min:4,max:6},
 group_healing:{name:'Group Healing',from:[2,3],to:[0,1,2,3],kind:'groupHeal',min:1,max:3},
 sacred_strike:{name:'Sacred Strike',from:[0,1],to:[0,1],acc:85},
 enemy_strike:{name:'Strike',from:[0,1,2,3],to:[0,1,2,3],acc:85},
 enemy_stress:{name:'Dark Whisper',from:[0,1,2,3],to:[0,1,2,3],kind:'stress',amount:15,acc:95}
};
Object.assign(ABILITIES,STARTER_CLASS_SKILLS,SECOND_CLASS_SKILLS,THIRD_CLASS_SKILLS,FOURTH_CLASS_SKILLS,FIFTH_CLASS_SKILLS,SPIRITBOUND_SKILLS,ENEMY_SKILLS);
export function getActorSkill(actor,key){return resolveSkillDefinition(ABILITIES,key,actor.skillLevels?.[key]??1);}
export function setActorSkillLevel(state,actorId,key,level){
 const actor=state.units.find(u=>u.id===actorId);
 if(!actor||actor.side!=='hero'||actor.dead)throw Error('Active hero not found');
 return equipVerifiedSkillLevel(actor,key,level,ABILITIES);
}
export function ranks(state,side){return state.units.filter(u=>u.side===side&&!u.dead);}
export function rank(state,id){return rankOf(state,id);}
export {occupiedRanks,formationSlots};
export function availableTargets(state,actorId,key){const a=state.units.find(x=>x.id===actorId),sk=a&&ABILITIES[key]?getActorSkill(a,key):null;if(!a||!sk||a.dead||a.corpse||!occupiedRanks(state,a.id).some(i=>sk.from.includes(i)))return [];
if(sk.classId&&a.classId!==sk.classId)return [];
if(sk.form&&sk.form!=='either'&&a.form!==sk.form)return [];
if(sk.kind==='transform'&&(a.form!=='human'&&a.form!=='beast'||a.transformUsedThisTurn))return [];if(sk.maxUses&&(a.usedSkills?.[key]??0)>=sk.maxUses)return [];
 if(sk.kind==='summon'){
   // A summoning skill is unusable outside its own HP phase, regardless
   // of who controls the actor or how many formation slots are vacant.
   if(a.side!=='enemy'||(sk.maxHpFraction!=null&&a.hp/a.maxHp>sk.maxHpFraction)||formationSlots(state,a.side).every(Boolean))return [];
   return [a.id];
 }
const side=['heal','groupHeal','guard','cleanse','buff','restore','partyBuff','selfBuff','stressHeal','selfCleanseBuff','rallyFlare','stealth','partyStressChance','selfHeal','stressOnly','variableHeal','selfHealStress','reverseGuard','transform'].includes(sk.kind)?a.side:(a.side==='hero'?'enemy':'hero');const candidates=ranks(state,side).filter(x=>occupiedRanks(state,x.id).some(i=>sk.to.includes(i))&&(!x.stealthed||sk.ignoreStealth||side===a.side)&& (!['selfBuff','selfCleanseBuff','stealth','selfHeal','selfHealStress','transform'].includes(sk.kind)||x.id===a.id)&& (sk.kind!=='reverseGuard'||x.id!==a.id));const selectable=candidates.filter(x=>side===a.side||isSelectable(x,sk,side));return (sk.targetMode==='all'||sk.kind==='randomAttack'||sk.kind==='rallyFlare'?selectable.slice(0,1):selectable).map(x=>x.id);}
export function startRound(state,r){
 // Corpse DoT ticks at the next round boundary: a provisional scheduling
 // approximation because corpses never receive initiative turns.
 for(const corpse of state.units.filter(u=>u.corpse&&!u.dead)){
   for(const dot of corpse.dot??[]){
     if(corpse.dead)break;
     corpse.hp=Math.max(0,corpse.hp-dot.value);
     dot.turns--;
     state.log.push(`${corpse.name} takes ${dot.value} ${dot.type}`);
     if(corpse.hp===0){
       corpse.dead=true;
       state.log.push(`${corpse.name} is destroyed by ${dot.type}`);
     }
   }
   corpse.dot=(corpse.dot??[]).filter(dot=>dot.turns>0);
 }
 state.round++;
 clearExpiredCorpses(state);
 // One initiative roll per combatant. Multi-action monsters take their slots
 // consecutively and process start/end-of-turn effects just once per round.
 state.units.forEach(u=>{u.acted=false;u.actionsRemaining=u.actionsPerRound??1;});
 state.queue=state.units.filter(x=>!x.dead&&!x.corpse)
  .map(x=>({id:x.id,score:initiativeScore({...x,spd:x.spd+effectModifier(x,'speed')+conditionalQuirkSpeed(x,state.torch)},r)}))
  .sort((a,b)=>b.score-a.score||(state.units.find(x=>x.id===a.id).side==='hero'?-1:1)||rank(state,a.id)-rank(state,b.id))
  .flatMap(x=>Array(state.units.find(u=>u.id===x.id).actionsPerRound??1).fill(x.id));
 state.log.push(`Round ${state.round} begins`);
 return state;
}
function finishActionSlot(state,actor,skipRemaining=false){
 actor.actionsRemaining=Math.max(0,(actor.actionsRemaining??actor.actionsPerRound??1)-1);
 state.queue.shift();
 if(skipRemaining){
   while(state.queue[0]===actor.id)state.queue.shift();
   actor.actionsRemaining=0;
 }
 if(actor.actionsRemaining===0){
   finishActorTurn(actor);
   actor.acted=true;
 }
}
export function currentActor(s){while(s.queue.length){const u=s.units.find(x=>x.id===s.queue[0]);if(u&&!u.dead&&!u.acted)return u;s.queue.shift();}return null;}
// An actor unable to use any legal skill forfeits its remaining action slots.
// This uses the same finalization path as a stunned turn: no extra start-of-turn
// DOT tick, and timed status effects expire once, even for multi-action bosses.
export function passActorTurn(state,actorId){
 const actor=currentActor(state);
 if(!actor||actor.id!==actorId)throw Error('Not this actor’s turn');
 finishActionSlot(state,actor,true);
 state.log.push(`${actor.name} passes`);
 return state;
}
export function stress(state,u,amount,r){
 if(u.dead||amount<=0)return;
 amount=Math.round(amount*effectiveCombatStats(u).stressMultiplier*(1-clamp(effectModifier(u,'stressResist'),0,90)/100));
 u.stress=clamp(u.stress+amount,0,200);
 if(u.stress>=100&&!u.affliction&&!u.virtue){
  const virtues=['Bravery','Clarity','Fighting Spirit','Unbreakable Will','Second Wind'];
  const afflicted=['Panic','Distrust','Self-Preservation','Recklessness','Aggression','Despair','Confusion'];
  if(r()<.25){
    u.virtue=virtues[randInt(r,0,4)];
    u.stress=45;
    for(const ally of ranks(state,u.side))if(ally.id!==u.id&&!ally.dead)ally.stress=clamp(ally.stress-6,0,200);
    state.log.push(`${u.name} found ${u.virtue}!`);
  }else{
    u.affliction=afflicted[randInt(r,0,6)];
    state.log.push(`${u.name} suffers ${u.affliction}!`);
    if(u.form==='beast')revertSpiritbound(state,u,'affliction');
  }
 }
 if(u.stress>=200&&u.side==='hero'){
  if(u.virtue){
    u.virtue=null;
    u.stress=0;
    state.log.push(`${u.name}'s virtue fades, avoiding a heart attack`);
  }else if(u.deathDoor||u.hp===0){
    u.dead=true;
    state.log.push(`${u.name} dies of a heart attack!`);
  }else{
    u.hp=0;
    u.deathDoor=true;
    u.heartAttackRecovery=true;
    u.stress=170;
    state.log.push(`${u.name} reaches Death's Door from a heart attack!`);
  }
 }
}
function hurt(s,u,n,r,suppressCorpse=false,physicalHit=false){if(u.dead)return;if(u.side==='hero'&&u.deathDoor&&(n>0||physicalHit)){if(r()>=deathBlowResistance(u)/100){u.dead=true;s.log.push(`${u.name} suffers a Deathblow!`);}else{s.log.push(`${u.name} resists a Deathblow!`);}return;}u.hp=Math.max(0,u.hp-n);if(u.hp===0){if(u.side==='hero'){u.deathDoor=true;s.log.push(`${u.name} is at Death's Door!`);}else{u.dead=true;s.log.push(`${u.name} falls!`);if(!suppressCorpse&&corpseFromEnemy(u,s.round))s.log.push(`${u.name} remains in formation`);}}}
export function takeTurn(state,actorId,key,targetId,r){
  const a=currentActor(state);
  if(!a||a.id!==actorId)throw Error('Not this actor’s turn');
  const sk=getActorSkill(a,key);
  if(!availableTargets(state,actorId,key).includes(targetId))throw Error('Illegal target or rank');
  let target=state.units.find(x=>x.id===targetId);
  if(sk.kind==='randomAttack'){
    const possible=ranks(state,a.side==='hero'?'enemy':'hero').filter(u=>!u.corpse);
    if(possible.length)target=possible[Math.floor(r()*possible.length)];
  }
  const wasStunned=a.stun>0;
  // A stunned actor forfeits the action: do not spend limited uses or torch.
  // prepareActorTurn normally handles stun before skill selection, but this
  // defensive path must preserve the same semantics for direct callers.
  if(a.stun===0){
    if(sk.maxUses){a.usedSkills??={};a.usedSkills[key]=(a.usedSkills[key]??0)+1;}
    if(sk.torch)state.torch=clamp((state.torch??75)+sk.torch,0,100);
  }
  if(a.stun>0){
    consumeStun(a);
    finishActionSlot(state,a,true);
    state.log.push(`${a.name} loses a turn to stun`);
    return state; // Do not apply movement, marks, riposte or any post-skill effects.
  }
  else if(sk.kind==='transform'){
    if(a.form==='human'){
      a.form='beast';
      for(const ally of ranks(state,a.side))if(ally.id!==a.id)stress(state,ally,8,r);
      const transform=sk.beastTransform??{heal:5,speed:1,blightResist:20,damage:10};
      a.hp=Math.min(a.maxHp,a.hp+transform.heal);
      if(a.deathDoor&&a.hp>0){a.deathDoor=false;a.mortality??='deathDoorRecovery';}
      addTimedEffect(a,{kind:'buff',spiritFormBuff:true,turns:4,modifiers:{speed:transform.speed,blightResist:transform.blightResist}});
      addTimedEffect(a,{kind:'buff',spiritFormBuff:true,turns:3,modifiers:{damage:transform.damage}});
      state.log.push(`${a.name} awakens the beast spirit (+8 ally stress)`);
    }else{
      a.form='human';
      a.effects=a.effects.filter(e=>!e.spiritFormBuff&&!e.rakeStack);
      const speedPenalty=sk.humanTransform?.speedPenalty??-4;
      if(speedPenalty!==0)addTimedEffect(a,{kind:'debuff',turns:4,selfInflicted:true,modifiers:{speed:speedPenalty}});
      for(const ally of ranks(state,a.side))if(ally.id!==a.id)ally.stress=clamp(ally.stress-2,0,200);
      state.log.push(`${a.name} returns to human form (-2 ally stress)`);
    }
    a.transformsUsed++;a.transformUsedThisTurn=true;
  }
  else if(sk.kind==='summon'){
    // Reinforcements only arrive in a genuinely empty rank: corpses occupy
    // formation slots until removed, and summons never erase live combatants.
    // A newly summoned enemy joins next round's initiative, not this queue.
    const serial=(state.summonSerial??0)+1;
    const id='reinforcement_'+serial;
    const summoned=spawnProfileEnemy(unit,id,sk.summonProfile);
    state.summonSerial=serial;
    state.units.push(summoned);
    state.log.push(`${a.name} summons ${summoned.name} to the rear!`);
  }
  else if(sk.kind==='guard'){applyGuard(state,a,target.id,sk.guardTurns??3);if(sk.protectBuff)addTimedEffect(a,{...sk.protectBuff,kind:'buff'});state.log.push(`${a.name} guards ${target.name}`);}
  else if(sk.kind==='reverseGuard'){
    applyGuard(state,target,a.id,sk.guardTurns??2);
    if(sk.protectBuff)addTimedEffect(target,{...sk.protectBuff,kind:'buff'});
    if(sk.markTarget)target.marked=sk.markTarget;
    state.log.push(`${target.name} protects ${a.name}`);
  }
  else if(sk.kind==='mark'){
    // Direct single-target marking skills are intercepted by Guard, including
    // their damage, hit roll, Mark and attached debuffs. AoE bypasses Guard.
    const actual=sk.bypassGuard?target:guardTarget(state,target);
    if(actual!==target)state.log.push(`${actual.name} intercepts ${sk.name} aimed at ${target.name}`);
    const chance=hitChance({accuracy:sk.acc??100,accModifier:effectiveCombatStats(a).accuracy+effectModifier(a,'accuracy'),dodge:actual.dodge+effectModifier(actual,'dodge'),missStreak:a.misses});
    if(r()*100<chance){
      a.misses=0;
      // Some DD1 marks (e.g. Occultist Vulnerability Hex) deal physical
      // damage; pure utility marks remain non-damaging.
      if(Number.isFinite(sk.mod)&&sk.mod>-1){
        const critical=rollCrit({baseCrit:a.crit+effectModifier(a,'crit')+effectModifier(actual,'critReceived'),skillCrit:sk.crit??0},r);
        const multiplier=combinedAttackMultiplier(sk.mod,[effectModifier(a,'damage')]);
        const dmg=directDamage({minDamage:sk.damageMin??a.dmgMin,maxDamage:sk.damageMax??a.dmgMax,skillMultiplier:multiplier*(1+effectModifier(actual,'damageTaken')/100),crit:critical,prot:actual.prot+effectModifier(actual,'prot'),damageMultiplier:effectiveCombatStats(a).damageMultiplier},r);
        hurt(state,actual,dmg,r,critical,true);
        if(dmg>0&&actual.side==='hero'&&!actual.dead)exposeHeroToDisease(state,a,actual,r,key);
        state.log.push(`${a.name} hits ${actual.name} with ${sk.name}: ${dmg}${critical?' CRIT':''}`);
      }
      if(!actual.dead&&!actual.corpse)actual.marked=sk.markTurns??3;
      if(!actual.dead&&!actual.corpse&&sk.debuff&&r()*100<resistChance({applicationChance:sk.debuff.chance,resistance:(actual.resist.debuff??0)+effectModifier(actual,'debuffResist')}))addTimedEffect(actual,{...sk.debuff,kind:'debuff'});
      if(sk.selfBuff)addTimedEffect(a,{...sk.selfBuff,kind:'buff'});
      state.log.push(`${a.name} marks ${actual.name}`);
    }else{a.misses++;state.log.push(`${a.name} fails to mark ${actual.name}`);}
  }
  else if(sk.kind==='stealth'){
    a.stealthed=sk.stealthTurns??2;
    for(const buff of sk.buffs??[])addTimedEffect(a,{...buff,kind:'buff'});
    state.log.push(`${a.name} vanishes into the shadows`);
  }
  else if(sk.kind==='selfCleanseBuff'){
    const removed=cleanseUnit(a,sk.cleanse);
    if(sk.max){a.hp=Math.min(a.maxHp,a.hp+randInt(r,sk.min,sk.max));if(a.hp>0&&a.deathDoor){a.deathDoor=false;a.mortality??='deathDoorRecovery';}}
    addTimedEffect(a,{...sk.buff,kind:'buff'});
    state.log.push(`${a.name} uses ${sk.name}, curing ${removed} effects`);
  }
  else if(sk.kind==='rallyFlare'){
    for(const ally of ranks(state,a.side))if(ally.id!==a.id){
      ally.stun=0;ally.marked=0;
      if(r()*100<(sk.stressHealChance??0))ally.stress=clamp(ally.stress-(sk.stressHeal??0),0,200);
    }
    for(const foe of ranks(state,a.side==='hero'?'enemy':'hero'))if(!foe.corpse)foe.stealthed=0;
    state.log.push(`${a.name} signals the entire party with ${sk.name}`);
  }
  else if(sk.kind==='moveOnly'){
    const changed=attemptDisplacement(state,target,sk.moveTarget,r);
    state.log.push(`${a.name} uses ${sk.name} on ${target.name}: ${changed===0?'resisted or blocked':'moved '+Math.abs(changed)+' rank(s)'}`);
  }
  else if(sk.kind==='partyBuff'){
    for(const ally of ranks(state,a.side))addTimedEffect(ally,{...sk.buff,kind:'buff'});
    state.log.push(`${a.name} uses ${sk.name} on the party`);
  }
  else if(sk.kind==='selfBuff'){
    addTimedEffect(a,{...sk.buff,kind:'buff'});
    state.log.push(`${a.name} uses ${sk.name}`);
  }
  else if(sk.kind==='debuffAll'){
    for(const foe of resolveTargets(state,a,sk,target.id)){
      if(foe.corpse)continue;
      const acc=hitChance({accuracy:sk.acc??85,accModifier:effectiveCombatStats(a).accuracy+effectModifier(a,'accuracy'),dodge:foe.dodge+effectModifier(foe,'dodge')});
      if(r()*100>=acc){state.log.push(`${a.name} misses ${foe.name} with ${sk.name}`);continue;}
      if(r()*100<resistChance({applicationChance:sk.debuff.chance,resistance:foe.resist.debuff??0})){
        addTimedEffect(foe,{...sk.debuff,kind:'debuff'});
        state.log.push(`${foe.name} is weakened by ${sk.name}`);
      }
    }
  }
  else if(sk.kind==='partyStressChance'){
    for(const ally of ranks(state,a.side))if(r()*100<(sk.stressHealChance??0))ally.stress=clamp(ally.stress-sk.stressHeal,0,200);
    state.log.push(`${a.name} comforts the party with ${sk.name}`);
  }
  else if(sk.kind==='stressOnly'){
    target.stress=clamp(target.stress-(sk.stressHeal??0),0,200);
    if(sk.stressResist)addTimedEffect(target,{kind:'buff',turns:3,modifiers:{stressResist:sk.stressResist}});
    state.log.push(`${a.name} soothes ${target.name}`);
  }
  else if(sk.kind==='variableHeal'){
    // DD1 Wyrd Reconstruction is a single-target heal: 12% fixed critical
    // chance, twice the rolled amount, and -4 stress to the recipient.
    // Bleed is a separate skill application/resistance roll, even for 0 heals.
    const critical=r()<.12;
    const rolled=randInt(r,sk.min,sk.max);
    const amount=Math.max(0,Math.round(rolled*(critical?2:1)*(1+effectModifier(target,'healingReceived')/100)));
    target.hp=Math.min(target.maxHp,target.hp+amount);
    if(critical){
      target.stress=clamp(target.stress-4,0,200);
      state.log.push(`${target.name} receives a critical heal`);
    }
    if(target.hp>0&&target.deathDoor){target.deathDoor=false;target.mortality??='deathDoorRecovery';}
    if(r()*100<resistChance({applicationChance:sk.bleedChance??0,resistance:(target.resist.bleed??0)+effectModifier(target,'bleedResist')})){
      target.dot.push({type:'bleed',value:sk.bleedValue??3,turns:sk.bleedTurns??3});
      state.log.push(`${target.name} bleeds after ${sk.name}`);
    }
    state.log.push(`${a.name} restores ${amount} HP to ${target.name}`);
  }
  else if(sk.kind==='selfHealStress'){
    const amount=randInt(r,sk.min,sk.max);
    a.hp=Math.min(a.maxHp,a.hp+amount);
    a.stress=clamp(a.stress-(sk.stressHeal??0),0,200);
    if(a.hp>0&&a.deathDoor){a.deathDoor=false;a.mortality??='deathDoorRecovery';}
    state.log.push(`${a.name} meditates: +${amount} HP, -${sk.stressHeal} stress`);
  }
  else if(sk.kind==='selfHeal'){
    const amount=randInt(r,sk.min,sk.max);
    a.hp=Math.min(a.maxHp,a.hp+amount);
    if(a.hp>0&&a.deathDoor){a.deathDoor=false;a.mortality??='deathDoorRecovery';}
    state.log.push(`${a.name} recovers ${amount} HP`);
  }
  else if(sk.kind==='stressHeal'){
    const amount=randInt(r,sk.min,sk.max);
    target.hp=Math.min(target.maxHp,target.hp+amount);
    if(target.hp>0&&target.deathDoor){target.deathDoor=false;target.mortality??='deathDoorRecovery';}
    target.stress=clamp(target.stress-(sk.stressHeal??0),0,200);
    state.log.push(`${a.name} rallies ${target.name}: +${amount} HP, -${sk.stressHeal} stress`);
  }
  else if(sk.kind==='cleanse'){
    const cleared=cleanseUnit(target,sk.cleanse);
    if(sk.cleanseSelf&&a.id!==target.id)cleanseUnit(a,sk.cleanse);
    if(sk.max){const healed=randInt(r,sk.min,sk.max);target.hp=Math.min(target.maxHp,target.hp+healed);if(target.hp>0&&target.deathDoor){target.deathDoor=false;target.mortality??='deathDoorRecovery';}}
    state.log.push(`${a.name} uses ${sk.name} on ${target.name}; removed ${cleared} conditions`);
  }
  else if(sk.kind==='buff'){
    addTimedEffect(target,{...sk.buff,kind:'buff'});
    state.log.push(`${a.name} strengthens ${target.name} with ${sk.name}`);
  }
  else if(sk.kind==='restore'){
    addRestoration(target,sk.value,sk.turns??3);
    state.log.push(`${a.name} applies restoration to ${target.name}`);
  }
  else if(sk.kind==='groupHeal'){
    for(const u of ranks(state,a.side)){
      const crit=r()<.05;
      const v=randInt(r,sk.min,sk.max)*(crit?2:1);
      u.hp=Math.min(u.maxHp,u.hp+Math.max(0,Math.round(v*(1+effectModifier(u,'healingReceived')/100))));
      if(crit){u.stress=clamp(u.stress-4,0,200);state.log.push(`${u.name} receives a critical heal`);}
      if(u.hp>0&&u.deathDoor){u.deathDoor=false;u.mortality=u.mortality??'deathDoorRecovery';}
    }
    state.log.push(`${a.name} casts ${sk.name}`);
  }
  else if(sk.kind==='heal'){
    const crit=r()<.12;
    const v=randInt(r,sk.min,sk.max)*(crit?2:1);
    target.hp=Math.min(target.maxHp,target.hp+Math.max(0,Math.round(v*(1+effectModifier(target,'healingReceived')/100))));
    if(sk.afterHealBuff)addTimedEffect(target,{...sk.afterHealBuff,kind:'buff'});
    if(crit){target.stress=clamp(target.stress-4,0,200);state.log.push(`${target.name} receives a critical heal`);}
    if(target.hp>0&&target.deathDoor){target.deathDoor=false;target.mortality=target.mortality??'deathDoorRecovery';}
    state.log.push(`${a.name} heals ${target.name} for ${v}`);
  }else{
    const affected=sk.targetMode==='all'?resolveTargets(state,a,sk,target.id):[target];
    if(sk.clearCorpses){for(const corpse of ranks(state,a.side==='hero'?'enemy':'hero').filter(x=>x.corpse))corpse.dead=true;}
    for(const affectedTarget of affected){
    let pendingStatus=null;
    let actual=affectedTarget;
    if(sk.targetMode!=='all'&&!sk.bypassGuard&&affectedTarget.side!==a.side){actual=guardTarget(state,affectedTarget);if(actual!==target)state.log.push(`${actual.name} intercepts an attack aimed at ${affectedTarget.name}`);}
    const chance=hitChance({accuracy:sk.acc??85,accModifier:effectiveCombatStats(a).accuracy+effectModifier(a,'accuracy'),dodge:actual.dodge+effectModifier(actual,'dodge'),missStreak:a.misses});
    if(r()*100<chance){
      a.misses=0;
      if(sk.kind==='stress'){
        stress(state,actual,sk.amount,r);
        state.log.push(`${a.name} stresses ${actual.name} (+${sk.amount})`);
      }else{
        const crit=!sk.neverCrit&&rollCrit({baseCrit:a.crit+effectModifier(a,'crit')+(actual.marked?effectModifier(actual,'critReceivedWhileMarked')+(sk.critVsMarked??0):0)+(sk.consumeFinale?effectModifier(a,'finaleCrit'):0)+effectModifier(actual,'critReceived'),skillCrit:sk.crit??0},r);
        const typeBonuses=Object.entries(sk.vsTypes??{}).reduce((sum,[tag,bonus])=>sum+(actual.types?.includes(tag)?bonus*100:0),0);
        const guardedBonus=a.guard?effectModifier(a,'damageWhileGuarded'):0;
        const blightBonus=(actual.dot??[]).some(d=>d.type==='blight')?(sk.vsBlighted??0)*100:0;
        const stunBonus=actual.stun>0?(sk.vsStunned??0)*100:0;
        const targetDamageTaken=effectModifier(actual,'damageTaken');
        const bonusPoints=[
          actual.marked>0?(sk.vsMarked??0)*100:0,
          blightBonus,stunBonus,typeBonuses,
          sk.rakeBonus?effectModifier(a,'rakeDamage'):0,
          effectModifier(a,'damage'),guardedBonus,
          sk.consumeFinale?effectModifier(a,'finaleDamage'):0
        ];
        const attackMultiplier=combinedAttackMultiplier(sk.mod??0,bonusPoints);
        const dmg=attackMultiplier===0?0:directDamage({minDamage:sk.damageMin??a.dmgMin,maxDamage:sk.damageMax??a.dmgMax,skillMultiplier:attackMultiplier*(1+targetDamageTaken/100),crit,prot:actual.prot+effectModifier(actual,'prot'),ignoreProt:sk.ignoreProt??false,damageMultiplier:effectiveCombatStats(a).damageMultiplier},r);
        hurt(state,actual,dmg,r,crit,(sk.mod??0)>-1||sk.physicalHit===true);
        if(sk.onHitStress&&actual.side==='hero'&&!actual.dead&&(sk.onHitStressChance==null||r()*100<sk.onHitStressChance))stress(state,actual,sk.onHitStress,r);
        if(dmg>0&&actual.side==='hero'&&!actual.dead)exposeHeroToDisease(state,a,actual,r,key);
        if(sk.selfHealOnHit&&dmg>0){a.hp=Math.min(a.maxHp,a.hp+sk.selfHealOnHit);if(a.hp>0&&a.deathDoor){a.deathDoor=false;a.mortality??='deathDoorRecovery';}}
        if(sk.markOnHit&&!actual.dead&&!actual.corpse)actual.marked=sk.markOnHit;
        if(sk.removeStealth&&actual.stealthed)actual.stealthed=0;
        state.log.push(`${a.name} uses ${sk.name} on ${actual.name}: ${dmg}${crit?' CRIT':''}`);
        if(crit){
          // DD1: hitting a corpse critically grants no stress relief, unless
          // it is an AoE attack that also happens to strike a corpse.
          if(a.side==='hero'&&(!actual.corpse||sk.targetMode==='all')){
            a.stress=clamp(a.stress-3,0,200);
            for(const u of ranks(state,'hero'))if(u.id!==a.id&&r()<.25)u.stress=clamp(u.stress-3,0,200);
          }
          if(actual.side==='hero'){
            stress(state,actual,10,r);
            for(const u of ranks(state,'hero'))if(r()<.50)stress(state,u,5,r);
          }
        }
        if(sk.status&&!actual.dead&&(!actual.corpse||['bleed','blight'].includes(sk.status.type)))pendingStatus={...sk.status,crit};
        if(sk.debuff&&!actual.dead&&!actual.corpse&&r()*100<resistChance({applicationChance:sk.debuff.chance,resistance:(actual.resist.debuff??0)+effectModifier(actual,'debuffResist'),crit})){
          addTimedEffect(actual,{...sk.debuff,kind:'debuff'});
          state.log.push(`${actual.name} is debuffed by ${sk.name}`);
        }
        if(sk.selfBuff&&sk.targetMode!=='all')addTimedEffect(a,{...sk.selfBuff,kind:'buff'});
        if(sk.moveTarget&&!actual.dead&&!actual.corpse){const moved=attemptDisplacement(state,actual,sk.moveTarget,r);if(moved)state.log.push(`${actual.name} moves ${Math.abs(moved)} rank(s)`);}
      }
    }else{a.misses++;state.log.push(`${a.name} misses ${actual.name}`);}
    if(canCounter(actual,a,sk))executeRiposte(state,actual,a,r);
    // Riposte happens before secondary effects: killing the attacker prevents its DOT or debuff.
    if(pendingStatus&&!a.dead&&!actual.dead){
      const st=pendingStatus;
      if(r()*100<resistChance({applicationChance:st.chance,resistance:st.type==='stun'?stunResistance(actual):(actual.resist[st.type]??0)+effectModifier(actual,st.type+'Resist'),crit:st.crit})){
        if(st.type==='stun')inflictStun(actual);
        else actual.dot.push({type:st.type,value:st.value,turns:dotDuration(st.turns,st.crit)});
        state.log.push(`${actual.name} gains ${st.type}`);
      }
    }
    }
  }
  if(sk.selfBuff&&sk.targetMode==='all')addTimedEffect(a,{...sk.selfBuff,kind:'buff'});
  if(sk.rakeBonus)addTimedEffect(a,{kind:'buff',rakeStack:true,turns:sk.rakeDuration??4,modifiers:{rakeDamage:sk.rakeBonus}});
  if(sk.consumeFinale){a.effects=a.effects.filter(e=>!e.finaleStack);}
  if(sk.finaleBuff)addTimedEffect(a,{kind:'buff',finaleStack:true,turns:8,modifiers:{finaleDamage:sk.finaleBuff.damage??0,finaleCrit:sk.finaleBuff.crit??0}});
  if(sk.selfBuff&&['partyBuff','stressOnly'].includes(sk.kind))addTimedEffect(a,{...sk.selfBuff,kind:'buff'});
  if(sk.selfDebuff)addTimedEffect(a,{...sk.selfDebuff,kind:'debuff',selfInflicted:true});
  if(sk.markSelf)a.marked=sk.markSelf;
  if(sk.advance)moveWithinFormation(state,a.id,-sk.advance);
  if(sk.selfBack)moveWithinFormation(state,a.id,sk.selfBack);
  if(sk.riposte){a.riposte=sk.riposteDuration??3;a.riposteAcc=sk.riposteAcc??90;a.riposteMod=sk.riposteMod??-.4;a.riposteCrit=sk.riposteCrit??0;}
  if(sk.onUseBuff)addTimedEffect(a,{...sk.onUseBuff,kind:'buff'});
  if(!wasStunned&&!sk.freeAction)completeUnstunnedTurn(a);
  if(a.stealthed&&sk.kind!=='stealth')a.stealthed=0;
  if(!sk.freeAction){
    a.actionsTaken=(a.actionsTaken??0)+1;
    finishActionSlot(state,a);
  }
  return state;
}
function executeRiposte(state,defender,attacker,r){
  const acc=defender.riposteAcc??(defender.side==='hero'?90:85);
  const chance=hitChance({accuracy:acc,accModifier:effectiveCombatStats(defender).accuracy+effectModifier(defender,'accuracy'),dodge:attacker.dodge+effectModifier(attacker,'dodge')});
  if(r()*100>=chance){state.log.push(`${defender.name} counters ${attacker.name} but misses`);return;}
  const crit=rollCrit({baseCrit:defender.crit,skillCrit:defender.riposteCrit??0},r);
  const damage=directDamage({minDamage:defender.dmgMin,maxDamage:defender.dmgMax,skillMultiplier:1+(defender.riposteMod??-.4),crit,prot:attacker.prot+effectModifier(attacker,'prot'),damageMultiplier:effectiveCombatStats(defender).damageMultiplier},r);
  hurt(state,attacker,damage,r,crit,true);
  state.log.push(`${defender.name} ripostes ${attacker.name}: ${damage}${crit?' CRIT':''}`);
}
// One shared start-of-turn path for player-controlled and AI-controlled units.
// It resolves restoration, DOT and status duration exactly once per scheduled turn.
// Stun consumes the turn BEFORE the controller may choose any skill.
export function prepareActorTurn(state,id,r){
 const actor=currentActor(state);
 if(!actor||actor.id!==id)throw Error('Not this actor’s turn');
 if((actor.actionsRemaining??actor.actionsPerRound??1)===(actor.actionsPerRound??1))beginTurn(state,id,r);
 if(actor.dead||actor.corpse){
   actor.acted=true;
   actor.actionsRemaining=0;
   while(state.queue[0]===actor.id)state.queue.shift();
   return 'dead';
 }
 if(actor.stun>0){
   consumeStun(actor);
   finishActionSlot(state,actor,true);
   state.log.push(`${actor.name} loses a turn to stun`);
   return 'stunned';
 }
 return 'ready';
}
// Ordinary buffs, marks, guards, ripostes and stealth expire at the end of
// their owner's completed turn. Bleed, blight and restoration tick at turn start.
export function finishActorTurn(actor){
 tickTimedEffects(actor);
 if(actor.stealthed>0)actor.stealthed--;
}
export function beginTurn(state,id,r){
 const u=state.units.find(x=>x.id===id);if(!u||u.dead)return;
 u.transformUsedThisTurn=false;
 if(u.form==='beast'){
  stress(state,u,6,r);
  state.log.push(`${u.name} suffers 6 beast-form stress`);
  if(u.affliction){revertSpiritbound(state,u,'affliction');}
 }
 const healed=restorationTick(u);
 if(healed)state.log.push(`${u.name} restores ${healed} HP`);
 for(const dot of u.dot){
  if(u.dead||u.corpse)break;
  hurt(state,u,dot.value,r,true);state.log.push(`${u.name} takes ${dot.value} ${dot.type}`);dot.turns--;
 }
 u.dot=u.dot.filter(x=>x.turns>0);
}
function revertSpiritbound(state,u,reason){
 if(u.form!=='beast')return;
 u.form='human';
 u.effects=u.effects.filter(e=>!e.spiritFormBuff&&!e.rakeStack);
 for(const ally of ranks(state,u.side))if(ally.id!==u.id)ally.stress=clamp(ally.stress-2,0,200);
 state.log.push(`${u.name} reverts to human form (${reason})`);
}
export function status(s){
 const result=!hasLiveOpponents(s,'hero')?'defeat':!hasLiveOpponents(s,'enemy')?'victory':'ongoing';
 if(result!=='ongoing')for(const u of s.units)if(u.form==='beast')revertSpiritbound(s,u,'battle end');
 return result;
}
export function makeSpiritboundBattle(seed=1){
 const b=makeBattle(seed);
 b.units=[unit('h1','Warrior','hero',{hp:33,spd:1}),unit('h2','Spiritbound','hero',{hp:26,spd:7,dmgMin:6,dmgMax:11,form:'human',blightResist:60}),unit('h3','Priest','hero',{hp:24,spd:4}),unit('h4','Hunter','hero',{hp:25,spd:3}),...b.units.filter(u=>u.side==='enemy')];
 b.log.unshift('Spiritbound transformation laboratory');
 return b;
}
export function makeFifthClassBattle(seed=1){
 const b=makeBattle(seed);
 b.units=[unit('h1','Cursed Champion','hero',{hp:35,spd:2,dodge:0,dmgMin:8,dmgMax:14}),unit('h2','Treasure Hunter','hero',{hp:19,spd:5,dodge:10,dmgMin:3,dmgMax:6}),unit('h3','Hex Mage','hero',{hp:19,spd:6,dmgMin:4,dmgMax:7}),unit('h4','Warrior','hero',{hp:33,spd:1}),...b.units.filter(x=>x.side==='enemy')];
 b.log.unshift('Cursed Champion, Treasure Hunter and Hex Mage combat laboratory');
 return b;
}
export function makeFinalProgressionBattle(seed=1){
 const state=makeFifthClassBattle(seed);
 for(const [actorId,cls] of [['h2','treasure_hunter'],['h3','hex_mage']]){
  for(const [key,sk] of Object.entries(ABILITIES))if(sk.classId===cls)setActorSkillLevel(state,actorId,key,5);
 }
 const spirit=state.units.find(u=>u.id==='h1');
 spirit.name='Spiritbound';spirit.classId='spiritbound';
 spirit.hp=spirit.maxHp=26;spirit.spd=7;spirit.dmgMin=6;spirit.dmgMax=11;spirit.form='human';
 for(const [key,sk] of Object.entries(ABILITIES))if(sk.classId==='spiritbound')setActorSkillLevel(state,spirit.id,key,5);
 state.log.unshift('Level-five Spiritbound, Treasure Hunter and Hex Mage laboratory');
 return state;
}
export function makeFourthProgressionBattle(seed=1){
 const state=makeFourthClassBattle(seed);
 const champion=state.units.find(u=>u.id==='h1');
 champion.name='Cursed Champion';champion.classId='cursed_champion';
 champion.hp=champion.maxHp=35;champion.spd=2;champion.dmgMin=8;champion.dmgMax=14;
 for(const [actorId,cls] of [['h1','cursed_champion'],['h2','beastmaster'],['h3','bard']]){
  for(const [id,skill] of Object.entries(ABILITIES))if(skill.classId===cls)setActorSkillLevel(state,actorId,id,5);
 }
 state.log.unshift('Cursed Champion, Beastmaster and Bard level-five upgrade lab');
 return state;
}
export function makeFourthClassBattle(seed=1){
 const b=makeBattle(seed);
 b.units=[unit('h1','Dark Knight','hero',{hp:23,spd:5,dmgMin:5,dmgMax:10}),unit('h2','Beastmaster','hero',{hp:21,spd:5,dmgMin:4,dmgMax:7}),unit('h3','Bard','hero',{hp:19,spd:7,dmgMin:4,dmgMax:7}),unit('h4','Priest','hero',{hp:24,spd:4}),...b.units.filter(x=>x.side==='enemy')];
 b.log.unshift('Dark Knight, Beastmaster and Bard combat laboratory');
 return b;
}
export function makeThirdProgressionBattle(seed=1){
 const b=makeThirdClassBattle(seed);
 const knight=b.units.find(x=>x.id==='h4');
 knight.name='Dark Knight';knight.classId='dark_knight';
 knight.hp=23;knight.maxHp=23;knight.spd=5;knight.dmgMin=5;knight.dmgMax=10;
 for(const [id,skillClass] of [['h1','berserker'],['h3','monster_slayer'],['h4','dark_knight']]){
  for(const [key,skill] of Object.entries(ABILITIES)){
   if(skill.classId===skillClass)setActorSkillLevel(b,id,key,5);
  }
 }
 b.log.unshift('Level-five Monster Slayer, Berserker and Dark Knight laboratory');
 return b;
}
export function makeThirdClassBattle(seed=1){
 const b=makeBattle(seed);
 b.units=[
  unit('h1','Berserker','hero',{hp:26,spd:4,dodge:10,crit:5,dmgMin:6,dmgMax:12,bleedResist:40}),
  unit('h2','Warrior','hero',{hp:33,spd:1}),
  unit('h3','Monster Slayer','hero',{hp:25,spd:5,dmgMin:5,dmgMax:10}),
  unit('h4','Priest','hero',{hp:24,spd:4,dmgMin:4,dmgMax:8}),
  ...b.units.filter(x=>x.side==='enemy')
 ];
 b.log.unshift('Priest, Monster Slayer and Berserker ability laboratory');
 return b;
}
export function makeSecondProgressionBattle(seed=1){
 const state=makeSecondClassBattle(seed);
 for(const [heroId,classId] of [['h2','thief'],['h3','mage'],['h4','hunter']]){
   for(const [key,skill] of Object.entries(SECOND_CLASS_SKILLS))
     if(skill.classId===classId)setActorSkillLevel(state,heroId,key,5);
 }
 state.log.unshift('Level-five Hunter, Thief, Mage progression laboratory (21 upgraded skills)');
 return state;
}
export function makeSecondClassBattle(seed=1){
 const state=makeBattle(seed);
 const replacements=[
  unit('h1','Warrior','hero',{hp:33,spd:1}),
  unit('h2','Thief','hero',{hp:20,spd:8,dodge:10,dmgMin:4,dmgMax:8}),
  unit('h3','Mage','hero',{hp:22,spd:7,dmgMin:4,dmgMax:7}),
  unit('h4','Hunter','hero',{hp:27,spd:3,dmgMin:4,dmgMax:8})
 ];
 state.units=[...replacements,...state.units.filter(x=>x.side==='enemy')];
 state.log=['Hunter, Thief and Mage skill laboratory',...state.log];
 return state;
}
export function makeLargeMonsterBattle(seed=1){
 const state=makeBattle(seed);
 state.units=state.units.filter(u=>u.id!=='e1'&&u.id!=='e2'&&u.id!=='e3');
 state.units.splice(4,0,spawnProfileEnemy(unit,'boss','emperor'));
 state.log=['A giant foe occupies three ranks!',...state.log];
 return state;
}
export function makeProgressionBattle(seed=1){
 const state=makeBattle(seed);
 for(const [heroId,keys] of [
   ['h1',Object.keys(STARTER_CLASS_SKILLS).filter(k=>STARTER_CLASS_SKILLS[k].classId==='swordsman')],
   ['h2',Object.keys(STARTER_CLASS_SKILLS).filter(k=>STARTER_CLASS_SKILLS[k].classId==='warrior')],
   ['h4',Object.keys(THIRD_CLASS_SKILLS).filter(k=>THIRD_CLASS_SKILLS[k].classId==='priest')]
 ])for(const key of keys)setActorSkillLevel(state,heroId,key,5);
 state.log.unshift('Verified level-five skill progression laboratory (21 upgraded skills)');
 return state;
}
// Campaign-ready reference-enemy combat entry point. Composition is
// seeded, weights are Clays fixtures, and hero setup uses the same DD1
// battle-engine baseline as all existing laboratory encounters.
export function makeGeneratedEncounter(seed=1,difficulty='patrol',region='crypt',tier='apprentice'){
  const state=makeBattle(seed);
  if(region!=='plague'&&tier!=='apprentice')throw Error('Encounter tier is supported only for Blighted Warrens');
  if(!['crypt','plague'].includes(region))throw Error('Unknown encounter region: '+region);
  const plan=region==='plague'?createPlagueEncounterPlan(difficulty,rng(seed),tier):createEncounterPlan(difficulty,rng(seed));
  state.units=[...state.units.filter(u=>u.side==='hero'),...spawnEncounterPlan(unit,plan)];
  state.encounterPlan=plan;
  state.log.unshift(`Generated ${difficulty} encounter: ${plan.template}, threat ${plan.threat}`);
  return state;
}
export function makeUndeadEncounter(seed=1,preset='rearguard'){
 const state=makeBattle(seed);
 state.units=[...state.units.filter(u=>u.side==='hero'),...makeEnemyFormation(unit,preset)];
 state.log.unshift('Undead encounter: '+preset);
 return state;
}
export function makeBattle(seed=1){
 const heroes=[
  unit('h1','Swordsman','hero',{hp:33,spd:3,prot:10}),
  unit('h2','Warrior','hero',{hp:33,spd:1}),
  unit('h3','Hunter','hero',{hp:25,spd:3}),
  unit('h4','Priest','hero',{hp:24,spd:4})
 ];
 return {seed,round:0,torch:75,units:[...heroes,...makeEnemyFormation(unit,'standard')],queue:[],log:['Combat begins!']};
}
