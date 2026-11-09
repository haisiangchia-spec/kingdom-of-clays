// Kingdom of Clays: deterministic, UI-independent combat prototype.
import {clamp,hitChance,rollCrit,directDamage,resistChance,dotDuration,deathBlowResistance,initiativeScore,effectiveCombatStats} from './dd1-math.js';
import {stunResistance,inflictStun,consumeStun,completeUnstunnedTurn,applyGuard,guardTarget,canCounter,tickTimedEffects,effectModifier} from './status.js';
// This is a fidelity scaffold, not a claim of complete DD1 mechanics.
export function rng(seed=1){let s=seed>>>0||1;return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};}
export const randInt=(r,lo,hi)=>lo+Math.floor(r()*(hi-lo+1));
export function unit(id,name,side,stats={}){return {id,name,side,hp:stats.hp??26,maxHp:stats.hp??26,spd:stats.spd??4,dodge:stats.dodge??5,prot:stats.prot??0,accMod:stats.accMod??0,crit:stats.crit??0,dmgMin:stats.dmgMin??4,dmgMax:stats.dmgMax??8,stress:0,resist:{stun:stats.stunResist??20,bleed:stats.bleedResist??20,blight:stats.blightResist??20},dot:[],effects:[],stunRecoveryStacks:0,stun:0,deathDoor:false,mortality:null,deathResist:stats.deathResist??67,dead:false,misses:0,guard:null,stunnedThisTurn:false,affliction:null,virtue:null,acted:false};}
export const ABILITIES={
 heavy_slash:{name:'Heavy Slash',from:[0,1],to:[0,1],acc:85,crit:2,mod:0},
 guardian_parry:{name:"Guardian's Parry",from:[0,1,2,3],to:[0,1,2,3],kind:'guard'},
 riposte_stance:{name:'Riposte Stance',from:[0,1,2],to:[0,1,2],acc:85,mod:-.25,riposte:true},
 crushing_strike:{name:'Crushing Strike',from:[0,1],to:[0,1],acc:85,mod:0},
 concussive_blow:{name:'Concussive Blow',from:[0,1],to:[0,1],acc:80,mod:-.5,status:{type:'stun',chance:100}},
 eagle_eye_shot:{name:'Eagle-Eye Shot',from:[1,2,3],to:[1,2,3],acc:95,crit:5,mod:0},
 hunters_mark:{name:"Hunter's Mark",from:[1,2,3],to:[0,1,2,3],kind:'mark'},
 shadow_lunge:{name:'Shadow Lunge',from:[2,3],to:[0,1,2],acc:90,mod:.4,advance:2},
 precision_throw:{name:'Precision Throw',from:[1,2,3],to:[1,2,3],acc:90},
 corrosive_bolt:{name:'Corrosive Bolt',from:[2,3],to:[0,1,2],acc:95,mod:-.75,status:{type:'blight',chance:100,value:4,turns:3}},
 blinding_mist:{name:'Blinding Mist',from:[2,3],to:[1,2,3],acc:95,mod:-1,status:{type:'stun',chance:100}},
 greater_heal:{name:'Greater Heal',from:[1,2,3],to:[0,1,2,3],kind:'heal',min:4,max:6},
 group_healing:{name:'Group Healing',from:[2,3],to:[0,1,2,3],kind:'groupHeal',min:1,max:3},
 sacred_strike:{name:'Sacred Strike',from:[0,1],to:[0,1],acc:85},
 enemy_strike:{name:'Strike',from:[0,1,2,3],to:[0,1,2,3],acc:85},
 enemy_stress:{name:'Dark Whisper',from:[0,1,2,3],to:[0,1,2,3],kind:'stress',amount:15,acc:95}
};
export function ranks(state,side){return state.units.filter(u=>u.side===side&&!u.dead);}
export function rank(state,id){const u=state.units.find(u=>u.id===id);return u?ranks(state,u.side).findIndex(x=>x.id===id):-1;}
export function availableTargets(state,actorId,key){const a=state.units.find(x=>x.id===actorId),sk=ABILITIES[key];if(!a||!sk||a.dead||!sk.from.includes(rank(state,a.id)))return [];const side=['heal','groupHeal','guard'].includes(sk.kind)?a.side:(a.side==='hero'?'enemy':'hero');return ranks(state,side).filter(x=>sk.to.includes(rank(state,x.id))).map(x=>x.id);}
export function startRound(state,r){state.round++;state.queue=state.units.filter(x=>!x.dead).map(x=>({id:x.id,score:initiativeScore(x,r)})).sort((a,b)=>b.score-a.score||(state.units.find(x=>x.id===a.id).side==='hero'?-1:1)||rank(state,a.id)-rank(state,b.id)).map(x=>x.id);state.units.forEach(u=>u.acted=false);state.log.push(`Round ${state.round} begins`);return state;}
export function currentActor(s){while(s.queue.length){const u=s.units.find(x=>x.id===s.queue[0]);if(u&&!u.dead&&!u.acted)return u;s.queue.shift();}return null;}
function stress(state,u,amount,r){amount=Math.round(amount*effectiveCombatStats(u).stressMultiplier);u.stress=clamp(u.stress+amount,0,200);if(u.stress>=100&&!u.affliction&&!u.virtue){const virtues=['Bravery','Clarity','Fighting Spirit','Unbreakable Will','Second Wind'];const afflicted=['Panic','Distrust','Self-Preservation','Recklessness','Aggression','Despair','Confusion'];if(r()<.25){u.virtue=virtues[randInt(r,0,4)];state.log.push(`${u.name} found ${u.virtue}!`);}else{u.affliction=afflicted[randInt(r,0,6)];state.log.push(`${u.name} suffers ${u.affliction}!`);}}if(u.stress===200&&u.side==='hero'){if(u.deathDoor){u.dead=true;state.log.push(`${u.name} dies at the Breaking Point!`);}else{u.hp=0;u.deathDoor=true;u.mortality='heartAttackRecovery';u.stress=170;state.log.push(`${u.name} reaches Death's Door from stress!`);}}}
function hurt(s,u,n,r){if(u.dead)return;if(u.side==='hero'&&u.deathDoor&&n>0){if(r()>=deathBlowResistance(u)/100){u.dead=true;s.log.push(`${u.name} suffers a Deathblow!`);}else{s.log.push(`${u.name} resists a Deathblow!`);}return;}u.hp=Math.max(0,u.hp-n);if(u.hp===0){if(u.side==='hero'){u.deathDoor=true;s.log.push(`${u.name} is at Death's Door!`);}else{u.dead=true;s.log.push(`${u.name} falls!`);}}}
export function takeTurn(state,actorId,key,targetId,r){
  const a=currentActor(state);
  if(!a||a.id!==actorId)throw Error('Not this actor’s turn');
  const sk=ABILITIES[key];
  if(!sk)throw Error('Unknown skill');
  if(!availableTargets(state,actorId,key).includes(targetId))throw Error('Illegal target or rank');
  const target=state.units.find(x=>x.id===targetId);
  const wasStunned=a.stun>0;
  if(a.stun>0){consumeStun(a);state.log.push(`${a.name} loses a turn to stun`);}
  else if(sk.kind==='guard'){applyGuard(state,a,target.id,3);state.log.push(`${a.name} guards ${target.name}`);}
  else if(sk.kind==='mark'){target.marked=3;state.log.push(`${target.name} is marked`);}
  else if(sk.kind==='groupHeal'){
    for(const u of ranks(state,a.side)){
      const crit=r()<.05;
      const v=randInt(r,sk.min,sk.max)*(crit?2:1);
      u.hp=Math.min(u.maxHp,u.hp+v);
      if(crit){u.stress=clamp(u.stress-4,0,200);state.log.push(`${u.name} receives a critical heal`);}
      if(u.hp>0&&u.deathDoor){u.deathDoor=false;u.mortality=u.mortality??'deathDoorRecovery';}
    }
    state.log.push(`${a.name} casts ${sk.name}`);
  }
  else if(sk.kind==='heal'){
    const crit=r()<.12;
    const v=randInt(r,sk.min,sk.max)*(crit?2:1);
    target.hp=Math.min(target.maxHp,target.hp+v);
    if(crit){target.stress=clamp(target.stress-4,0,200);state.log.push(`${target.name} receives a critical heal`);}
    if(target.hp>0&&target.deathDoor){target.deathDoor=false;target.mortality=target.mortality??'deathDoorRecovery';}
    state.log.push(`${a.name} heals ${target.name} for ${v}`);
  }else{
    let pendingStatus=null;
    let actual=target;
    if(target.side!==a.side){actual=guardTarget(state,target);if(actual!==target)state.log.push(`${actual.name} intercepts an attack aimed at ${target.name}`);}
    const chance=hitChance({accuracy:sk.acc??85,accModifier:effectiveCombatStats(a).accuracy+effectModifier(a,'accuracy'),dodge:actual.dodge+effectModifier(actual,'dodge'),missStreak:a.misses});
    if(r()*100<chance){
      a.misses=0;
      if(sk.kind==='stress'){
        stress(state,actual,sk.amount,r);
        state.log.push(`${a.name} stresses ${actual.name} (+${sk.amount})`);
      }else{
        const crit=rollCrit({baseCrit:a.crit,skillCrit:sk.crit??0},r);
        const dmg=directDamage({minDamage:a.dmgMin,maxDamage:a.dmgMax,skillMultiplier:1+(sk.mod??0),crit,prot:actual.prot,damageMultiplier:effectiveCombatStats(a).damageMultiplier},r);
        hurt(state,actual,dmg,r);
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
        if(sk.status&&!actual.dead)pendingStatus={...sk.status,crit};
      }
    }else{a.misses++;state.log.push(`${a.name} misses ${actual.name}`);}
    if(canCounter(actual,a,sk))executeRiposte(state,actual,a,r);
    // Riposte happens before secondary effects: killing the attacker prevents its DOT or debuff.
    if(pendingStatus&&!a.dead&&!actual.dead){
      const st=pendingStatus;
      if(r()*100<resistChance({applicationChance:st.chance,resistance:st.type==='stun'?stunResistance(actual):(actual.resist[st.type]??0),crit:st.crit})){
        if(st.type==='stun')inflictStun(actual);
        else actual.dot.push({type:st.type,value:st.value,turns:dotDuration(st.turns,st.crit)});
        state.log.push(`${actual.name} gains ${st.type}`);
      }
    }
  }
  if(sk.advance){
    const side=ranks(state,a.side),idx=side.findIndex(x=>x.id===a.id),next=Math.max(0,idx-sk.advance);
    side.splice(idx,1);side.splice(next,0,a);
    state.units=state.units.filter(x=>x.side!==a.side).concat(side);
  }
  if(sk.riposte)a.riposte=3;
  if(!wasStunned)completeUnstunnedTurn(a);
  a.acted=true;state.queue.shift();return state;
}
function executeRiposte(state,defender,attacker,r){
  const acc=defender.side==='hero'?90:85;
  const chance=hitChance({accuracy:acc,accModifier:effectiveCombatStats(defender).accuracy+effectModifier(defender,'accuracy'),dodge:attacker.dodge+effectModifier(attacker,'dodge')});
  if(r()*100>=chance){state.log.push(`${defender.name} counters ${attacker.name} but misses`);return;}
  const crit=rollCrit({baseCrit:defender.crit},r);
  const damage=directDamage({minDamage:defender.dmgMin,maxDamage:defender.dmgMax,skillMultiplier:.6,crit,prot:attacker.prot,damageMultiplier:effectiveCombatStats(defender).damageMultiplier},r);
  hurt(state,attacker,damage,r);
  state.log.push(`${defender.name} ripostes ${attacker.name}: ${damage}${crit?' CRIT':''}`);
}
export function beginTurn(state,id,r){const u=state.units.find(x=>x.id===id);if(!u||u.dead)return;for(const dot of u.dot){hurt(state,u,dot.value,r);state.log.push(`${u.name} takes ${dot.value} ${dot.type}`);dot.turns--;}u.dot=u.dot.filter(x=>x.turns>0);tickTimedEffects(u);}
export function status(s){const h=ranks(s,'hero').length,e=ranks(s,'enemy').length;return h===0?'defeat':e===0?'victory':'ongoing';}
export function makeBattle(seed=1){const units=[unit('h1','Swordsman','hero',{hp:33,spd:3,prot:10}),unit('h2','Warrior','hero',{hp:33,spd:1}),unit('h3','Hunter','hero',{hp:25,spd:3}),unit('h4','Priest','hero',{hp:24,spd:4}),unit('e1','Skeleton Swordsman','enemy',{hp:16,spd:2,dodge:5}),unit('e2','Skeleton Swordsman','enemy',{hp:16,spd:2,dodge:5}),unit('e3','Skeleton Archer','enemy',{hp:14,spd:4,dodge:8}),unit('e4','Skeleton Court Mage','enemy',{hp:13,spd:5,dodge:9})];return {seed,round:0,units,queue:[],log:['Combat begins!']};}
