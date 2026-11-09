// Kingdom of Clays: deterministic, UI-independent combat prototype.
import {clamp,hitChance,rollCrit,directDamage,resistChance,dotDuration,deathBlowResistance,initiativeScore,effectiveCombatStats} from './dd1-math.js';
import {stunResistance,inflictStun,consumeStun,completeUnstunnedTurn,applyGuard,guardTarget,canCounter,tickTimedEffects,addTimedEffect,effectModifier} from './status.js';
import {resolveTargets,cleanseUnit,restorationTick,addRestoration} from './combat-effects.js';
import {isSelectable,moveWithinFormation,attemptDisplacement,corpseFromEnemy,clearExpiredCorpses,hasLiveOpponents,rankOf,occupiedRanks,formationSlots,widthOf} from './formation.js';
import {STARTER_CLASS_SKILLS} from './class-skills.js';
import {SECOND_CLASS_SKILLS} from './class-skills-batch2.js';
// This is a fidelity scaffold, not a claim of complete DD1 mechanics.
export function rng(seed=1){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
export const randInt=(r,lo,hi)=>lo+Math.floor(r()*(hi-lo+1));
export function unit(id,name,side,stats={}){return {id,name,side,size:stats.size??1,types:stats.types??[],hp:stats.hp??26,maxHp:stats.hp??26,spd:stats.spd??4,dodge:stats.dodge??5,prot:stats.prot??0,accMod:stats.accMod??0,crit:stats.crit??0,dmgMin:stats.dmgMin??4,dmgMax:stats.dmgMax??8,stress:0,resist:{stun:stats.stunResist??20,bleed:stats.bleedResist??20,blight:stats.blightResist??20,move:stats.moveResist??0,debuff:stats.debuffResist??20},dot:[],restoration:[],effects:[],stunRecoveryStacks:0,stun:0,deathDoor:false,mortality:null,deathResist:stats.deathResist??67,dead:false,misses:0,guard:null,stunnedThisTurn:false,affliction:null,virtue:null,acted:false,usedSkills:{}};}
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
Object.assign(ABILITIES,STARTER_CLASS_SKILLS,SECOND_CLASS_SKILLS);
export function ranks(state,side){return state.units.filter(u=>u.side===side&&!u.dead);}
export function rank(state,id){return rankOf(state,id);}
export {occupiedRanks,formationSlots};
export function availableTargets(state,actorId,key){const a=state.units.find(x=>x.id===actorId),sk=ABILITIES[key];if(!a||!sk||a.dead||a.corpse||!occupiedRanks(state,a.id).some(i=>sk.from.includes(i)))return [];if(sk.maxUses&&(a.usedSkills?.[key]??0)>=sk.maxUses)return [];
const side=['heal','groupHeal','guard','cleanse','buff','restore','partyBuff','selfBuff','stressHeal','selfCleanseBuff','rallyFlare','stealth'].includes(sk.kind)?a.side:(a.side==='hero'?'enemy':'hero');const candidates=ranks(state,side).filter(x=>occupiedRanks(state,x.id).some(i=>sk.to.includes(i))&&(!x.stealthed||sk.ignoreStealth||side===a.side)&& (!['selfBuff','selfCleanseBuff','stealth'].includes(sk.kind)||x.id===a.id));return (sk.targetMode==='all'||sk.kind==='randomAttack'||sk.kind==='rallyFlare'?candidates.slice(0,1):candidates).filter(x=>side===a.side||isSelectable(x,sk,side)).map(x=>x.id);}
export function startRound(state,r){state.round++;clearExpiredCorpses(state);state.queue=state.units.filter(x=>!x.dead&&!x.corpse).map(x=>({id:x.id,score:initiativeScore({...x,spd:x.spd+effectModifier(x,'speed')},r)})).sort((a,b)=>b.score-a.score||(state.units.find(x=>x.id===a.id).side==='hero'?-1:1)||rank(state,a.id)-rank(state,b.id)).map(x=>x.id);state.units.forEach(u=>u.acted=false);state.log.push(`Round ${state.round} begins`);return state;}
export function currentActor(s){while(s.queue.length){const u=s.units.find(x=>x.id===s.queue[0]);if(u&&!u.dead&&!u.acted)return u;s.queue.shift();}return null;}
function stress(state,u,amount,r){amount=Math.round(amount*effectiveCombatStats(u).stressMultiplier*(1-clamp(effectModifier(u,'stressResist'),0,90)/100));u.stress=clamp(u.stress+amount,0,200);if(u.stress>=100&&!u.affliction&&!u.virtue){const virtues=['Bravery','Clarity','Fighting Spirit','Unbreakable Will','Second Wind'];const afflicted=['Panic','Distrust','Self-Preservation','Recklessness','Aggression','Despair','Confusion'];if(r()<.25){u.virtue=virtues[randInt(r,0,4)];state.log.push(`${u.name} found ${u.virtue}!`);}else{u.affliction=afflicted[randInt(r,0,6)];state.log.push(`${u.name} suffers ${u.affliction}!`);}}if(u.stress===200&&u.side==='hero'){if(u.deathDoor){u.dead=true;state.log.push(`${u.name} dies at the Breaking Point!`);}else{u.hp=0;u.deathDoor=true;u.mortality='heartAttackRecovery';u.stress=170;state.log.push(`${u.name} reaches Death's Door from stress!`);}}}
function hurt(s,u,n,r,suppressCorpse=false){if(u.dead)return;if(u.side==='hero'&&u.deathDoor&&n>0){if(r()>=deathBlowResistance(u)/100){u.dead=true;s.log.push(`${u.name} suffers a Deathblow!`);}else{s.log.push(`${u.name} resists a Deathblow!`);}return;}u.hp=Math.max(0,u.hp-n);if(u.hp===0){if(u.side==='hero'){u.deathDoor=true;s.log.push(`${u.name} is at Death's Door!`);}else{u.dead=true;s.log.push(`${u.name} falls!`);if(!suppressCorpse&&corpseFromEnemy(u,s.round))s.log.push(`${u.name} remains in formation`);}}}
export function takeTurn(state,actorId,key,targetId,r){
  const a=currentActor(state);
  if(!a||a.id!==actorId)throw Error('Not this actor’s turn');
  const sk=ABILITIES[key];
  if(!sk)throw Error('Unknown skill');
  if(!availableTargets(state,actorId,key).includes(targetId))throw Error('Illegal target or rank');
  let target=state.units.find(x=>x.id===targetId);
  if(sk.kind==='randomAttack'){
    const possible=ranks(state,a.side==='hero'?'enemy':'hero').filter(u=>!u.corpse);
    if(possible.length)target=possible[Math.floor(r()*possible.length)];
  }
  const wasStunned=a.stun>0;
  if(sk.maxUses){a.usedSkills??={};a.usedSkills[key]=(a.usedSkills[key]??0)+1;}
  if(sk.torch)state.torch=clamp((state.torch??75)+sk.torch,0,100);
  if(a.stun>0){consumeStun(a);state.log.push(`${a.name} loses a turn to stun`);}
  else if(sk.kind==='guard'){applyGuard(state,a,target.id,sk.guardTurns??3);if(sk.protectBuff)addTimedEffect(a,{...sk.protectBuff,kind:'buff'});state.log.push(`${a.name} guards ${target.name}`);}
  else if(sk.kind==='mark'){
    const chance=hitChance({accuracy:sk.acc??100,accModifier:effectiveCombatStats(a).accuracy+effectModifier(a,'accuracy'),dodge:target.dodge+effectModifier(target,'dodge'),missStreak:a.misses});
    if(r()*100<chance){
      target.marked=sk.markTurns??3;
      if(sk.debuff&&r()*100<resistChance({applicationChance:sk.debuff.chance,resistance:(target.resist.debuff??0)-effectModifier(target,'debuffResist')}))addTimedEffect(target,{...sk.debuff,kind:'debuff'});
      state.log.push(`${a.name} marks ${target.name}`);
    }else state.log.push(`${a.name} fails to mark ${target.name}`);
  }
  else if(sk.kind==='stealth'){
    a.stealthed=sk.stealthTurns??2;
    for(const buff of sk.buffs??[])addTimedEffect(a,{...buff,kind:'buff'});
    state.log.push(`${a.name} vanishes into the shadows`);
  }
  else if(sk.kind==='selfCleanseBuff'){
    const removed=cleanseUnit(a,sk.cleanse);
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
      u.hp=Math.min(u.maxHp,u.hp+Math.round(v*(1+effectModifier(u,'healingReceived')/100)));
      if(crit){u.stress=clamp(u.stress-4,0,200);state.log.push(`${u.name} receives a critical heal`);}
      if(u.hp>0&&u.deathDoor){u.deathDoor=false;u.mortality=u.mortality??'deathDoorRecovery';}
    }
    state.log.push(`${a.name} casts ${sk.name}`);
  }
  else if(sk.kind==='heal'){
    const crit=r()<.12;
    const v=randInt(r,sk.min,sk.max)*(crit?2:1);
    target.hp=Math.min(target.maxHp,target.hp+Math.round(v*(1+effectModifier(target,'healingReceived')/100)));
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
    if(sk.targetMode!=='all'&&affectedTarget.side!==a.side){actual=guardTarget(state,affectedTarget);if(actual!==target)state.log.push(`${actual.name} intercepts an attack aimed at ${affectedTarget.name}`);}
    const chance=hitChance({accuracy:sk.acc??85,accModifier:effectiveCombatStats(a).accuracy+effectModifier(a,'accuracy'),dodge:actual.dodge+effectModifier(actual,'dodge'),missStreak:a.misses});
    if(r()*100<chance){
      a.misses=0;
      if(sk.kind==='stress'){
        stress(state,actual,sk.amount,r);
        state.log.push(`${a.name} stresses ${actual.name} (+${sk.amount})`);
      }else{
        const crit=rollCrit({baseCrit:a.crit+effectModifier(a,'crit')+(actual.marked?effectModifier(actual,'critReceivedWhileMarked')+(sk.critVsMarked??0):0),skillCrit:sk.crit??0},r);
        const typeMultiplier=Object.entries(sk.vsTypes??{}).reduce((mult,[tag,bonus])=>mult*(actual.types?.includes(tag)?1+bonus:1),1);
        const guardedBonus=a.guard?effectModifier(a,'damageWhileGuarded'):0;
        const blightBonus=(actual.dot??[]).some(d=>d.type==='blight')?(sk.vsBlighted??0):0;
        const dmg=(sk.mod??0)<=-1?0:directDamage({minDamage:a.dmgMin,maxDamage:a.dmgMax,skillMultiplier:(1+(sk.mod??0))*(actual.marked>0?1+(sk.vsMarked??0):1)*(1+blightBonus)*typeMultiplier*(1+(effectModifier(a,'damage')+guardedBonus)/100),crit,prot:actual.prot+effectModifier(actual,'prot'),ignoreProt:sk.ignoreProt??false,damageMultiplier:effectiveCombatStats(a).damageMultiplier},r);
        hurt(state,actual,dmg,r,crit);
        state.log.push(`${a.name} uses ${sk.name} on ${actual.name}: ${dmg}${crit?' CRIT':''}`);
        if(crit){
          if(a.side==='hero'){
            a.stress=clamp(a.stress-3,0,200);
            for(const u of ranks(state,'hero'))if(u.id!==a.id&&r()<.25)u.stress=clamp(u.stress-3,0,200);
          }
          if(actual.side==='hero'){
            stress(state,actual,10,r);
            for(const u of ranks(state,'hero'))if(r()<.50)stress(state,u,5,r);
          }
        }
        if(sk.status&&!actual.dead&&!actual.corpse)pendingStatus={...sk.status,crit};
        if(sk.debuff&&!actual.dead&&!actual.corpse&&r()*100<resistChance({applicationChance:sk.debuff.chance,resistance:(actual.resist.debuff??0)-effectModifier(actual,'debuffResist'),crit})){
          addTimedEffect(actual,{...sk.debuff,kind:'debuff'});
          state.log.push(`${actual.name} is debuffed by ${sk.name}`);
        }
        if(sk.selfBuff)addTimedEffect(a,{...sk.selfBuff,kind:'buff'});
        if(sk.moveTarget&&!actual.dead&&!actual.corpse){const moved=attemptDisplacement(state,actual,sk.moveTarget,r);if(moved)state.log.push(`${actual.name} moves ${Math.abs(moved)} rank(s)`);}
      }
    }else{a.misses++;state.log.push(`${a.name} misses ${actual.name}`);}
    if(canCounter(actual,a,sk))executeRiposte(state,actual,a,r);
    // Riposte happens before secondary effects: killing the attacker prevents its DOT or debuff.
    if(pendingStatus&&!a.dead&&!actual.dead){
      const st=pendingStatus;
      if(r()*100<resistChance({applicationChance:st.chance,resistance:st.type==='stun'?stunResistance(actual):(actual.resist[st.type]??0)-effectModifier(actual,st.type+'Resist'),crit:st.crit})){
        if(st.type==='stun')inflictStun(actual);
        else actual.dot.push({type:st.type,value:st.value,turns:dotDuration(st.turns,st.crit)});
        state.log.push(`${actual.name} gains ${st.type}`);
      }
    }
    }
  }
  if(sk.markSelf)a.marked=sk.markSelf;
  if(sk.advance)moveWithinFormation(state,a.id,-sk.advance);
  if(sk.selfBack)moveWithinFormation(state,a.id,sk.selfBack);
  if(sk.riposte){a.riposte=sk.riposteDuration??3;a.riposteAcc=sk.riposteAcc??90;a.riposteMod=sk.riposteMod??-.4;}
  if(!wasStunned)completeUnstunnedTurn(a);
  if(a.stealthed&&sk.kind!=='stealth')a.stealthed=0;
  a.acted=true;state.queue.shift();return state;
}
function executeRiposte(state,defender,attacker,r){
  const acc=defender.riposteAcc??(defender.side==='hero'?90:85);
  const chance=hitChance({accuracy:acc,accModifier:effectiveCombatStats(defender).accuracy+effectModifier(defender,'accuracy'),dodge:attacker.dodge+effectModifier(attacker,'dodge')});
  if(r()*100>=chance){state.log.push(`${defender.name} counters ${attacker.name} but misses`);return;}
  const crit=rollCrit({baseCrit:defender.crit},r);
  const damage=directDamage({minDamage:defender.dmgMin,maxDamage:defender.dmgMax,skillMultiplier:1+(defender.riposteMod??-.4),crit,prot:attacker.prot+effectModifier(attacker,'prot'),damageMultiplier:effectiveCombatStats(defender).damageMultiplier},r);
  hurt(state,attacker,damage,r,crit);
  state.log.push(`${defender.name} ripostes ${attacker.name}: ${damage}${crit?' CRIT':''}`);
}
export function beginTurn(state,id,r){
 const u=state.units.find(x=>x.id===id);if(!u||u.dead)return;
 const healed=restorationTick(u);
 if(healed)state.log.push(`${u.name} restores ${healed} HP`);
 for(const dot of u.dot){
  if(u.dead||u.corpse)break;
  hurt(state,u,dot.value,r,true);state.log.push(`${u.name} takes ${dot.value} ${dot.type}`);dot.turns--;
 }
 u.dot=u.dot.filter(x=>x.turns>0);
 tickTimedEffects(u);
 if(u.stealthed>0)u.stealthed--;
}
export function status(s){return !hasLiveOpponents(s,'hero')?'defeat':!hasLiveOpponents(s,'enemy')?'victory':'ongoing';}
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
 state.units.splice(4,0,unit('boss','Goblin Emperor','enemy',{size:3,hp:96,spd:2,dodge:3,prot:15,moveResist:80,dmgMin:7,dmgMax:13}));
 state.log=['A giant foe occupies three ranks!',...state.log];
 return state;
}
export function makeBattle(seed=1){const units=[unit('h1','Swordsman','hero',{hp:33,spd:3,prot:10}),unit('h2','Warrior','hero',{hp:33,spd:1}),unit('h3','Hunter','hero',{hp:25,spd:3}),unit('h4','Priest','hero',{hp:24,spd:4}),unit('e1','Skeleton Swordsman','enemy',{hp:16,spd:2,dodge:5,types:['unholy']}),unit('e2','Skeleton Swordsman','enemy',{hp:16,spd:2,dodge:5,types:['unholy']}),unit('e3','Skeleton Archer','enemy',{hp:14,spd:4,dodge:8,types:['unholy']}),unit('e4','Skeleton Court Mage','enemy',{hp:13,spd:5,dodge:9,types:['unholy']})];return {seed,round:0,torch:75,units,queue:[],log:['Combat begins!']};}
