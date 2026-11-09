import {consumeStun} from './status.js';
import {makeBattle,makeLargeMonsterBattle,makeSecondClassBattle,makeThirdClassBattle,makeFourthClassBattle,rng,startRound,currentActor,rank,ranks,availableTargets,takeTurn,beginTurn,status,ABILITIES} from './engine.js';
let seed=(Date.now()>>>0)||1,random=rng(seed),battle=makeBattle(seed),selected=null,preparedActorId=null,mode='normal';
const skills={h1:['heavy_slash','countering_advance','battle_shout','guardian_parry','riposte_stance','swordmasters_orders','steadfast_resolve'],h2:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],h3:['eagle_eye_shot','hunters_mark'],h4:['greater_heal','group_healing','sacred_strike'],e1:['enemy_strike'],e2:['enemy_strike'],e3:['enemy_strike'],e4:['enemy_stress','enemy_strike'],boss:['enemy_strike']};
const classLabSkills={h1:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],h2:['armour_piercing_stab','shadow_lunge','twin_dagger_flurry','vanishing_step','precision_throw','venom_needle','antidote_preparation'],h3:['corrosive_bolt','toxic_explosion','blinding_mist','arcane_blade','purification_spell','empowerment_spell','displacement_spell'],h4:['eagle_eye_shot','arrow_barrage','hunters_mark','entangling_shot','instinctive_shot','field_dressing','signal_arrow']};
const thirdLabSkills={h1:['savage_cleave','rising_axe','terrifying_war_cry','rending_slash','berserkers_charge','battle_frenzy','bloodletting_blow'],h2:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],h3:['hunters_execution','identify_weakness','grappling_hook','brutal_uppercut','flash_bomb','finishing_strike','spiked_trap'],h4:['sacred_strike','divine_judgement','radiant_flash','greater_heal','group_healing','revealing_light','blessing_strike']};
const fourthLabSkills={h1:['dark_slash','shadow_bolt','point_blank_burst','shadow_volley','focused_assault','shadowstep_counter','bleeding_edge'],h2:['wolfs_assault','pack_harassment','hunt_command','comforting_howl','guardian_wolf','beasts_recovery','staff_strike'],h3:['flourishing_strike','whirling_blades','grand_finale','heroic_solo','cutting_refrain','song_of_courage','soothing_melody'],h4:['sacred_strike','divine_judgement','radiant_flash','greater_heal','group_healing','revealing_light','blessing_strike']};
const skillsFor=id=>mode==='fourthLab'&&fourthLabSkills[id]?fourthLabSkills[id]:mode==='thirdLab'&&thirdLabSkills[id]?thirdLabSkills[id]:mode==='classLab'&&classLabSkills[id]?classLabSkills[id]:skills[id]??[];
const $=id=>document.getElementById(id);
const label=u=>`${u.name} · ${u.hp}/${u.maxHp} HP${u.deathDoor?' · DEATH’S DOOR':''}${u.stun?' · STUN':''}${u.marked?' · MARKED':''}`;
function ai(){let guard=0;while(status(battle)==='ongoing'&&currentActor(battle)?.side==='enemy'&&guard++<20){const a=currentActor(battle);beginTurn(battle,a.id,random);if(a.dead){battle.queue.shift();continue;}let opts=skillsFor(a.id).flatMap(k=>availableTargets(battle,a.id,k).map(t=>({k,t})));if(!opts.length){a.acted=true;battle.queue.shift();battle.log.push(`${a.name} passes`);continue;}let v=opts[Math.floor(random()*opts.length)];takeTurn(battle,a.id,v.k,v.t,random);}}
function ensure(){
 let iterations=0;
 while(status(battle)==='ongoing'&&iterations++<50){
   if(!currentActor(battle))startRound(battle,random);
   ai();
   const actor=currentActor(battle);
   if(!actor)continue;
   if(actor.side!=='hero')continue;
   if(preparedActorId!==actor.id){
     beginTurn(battle,actor.id,random);
     preparedActorId=actor.id;
   }
   if(actor.dead){battle.queue.shift();preparedActorId=null;continue;}
   if(actor.stun>0){
     consumeStun(actor);actor.acted=true;battle.queue.shift();
     battle.log.push(`${actor.name} loses a turn to stun`);
     preparedActorId=null;continue;
   }
   return;
 }
}
function act(k,t){const a=currentActor(battle);if(!a)return;try{takeTurn(battle,a.id,k,t,random);selected=null;preparedActorId=null;ensure();render();}catch(e){battle.log.push('Error: '+e.message);render();}}
function render(){const active=currentActor(battle);$('phase').textContent=`${status(battle).toUpperCase()} · Round ${battle.round} · ${active?active.name+' to act':'Battle complete'} · Torch ${battle.torch??75} · Seed ${seed}`;for(const side of ['hero','enemy']){$(side).innerHTML='';for(const u of [...ranks(battle,side)].reverse()){const b=document.createElement('div');b.className='unit '+(u.id===active?.id?'active':'');b.innerHTML=`<strong>${u.name}</strong><span>Rank ${rank(battle,u.id)+1}${u.size>1?'–'+(rank(battle,u.id)+u.size):''}</span><div class="meter"><i style="width:${100*u.hp/u.maxHp}%"></i></div><small>${label(u)}${u.side==='hero'?' · '+u.stress+' Stress':''}</small>`;$(side).append(b);}}$('actions').innerHTML='';if(active?.side==='hero'&&status(battle)==='ongoing'){const choices=skillsFor(active.id);for(const k of choices){let targets=availableTargets(battle,active.id,k);let b=document.createElement('button');b.textContent=ABILITIES[k].name;b.disabled=!targets.length;b.onclick=()=>{selected=k;render();};if(k===selected)b.classList.add('picked');$('actions').append(b);}if(selected){let d=document.createElement('div');d.className='targets';d.textContent='Choose target: ';for(const id of availableTargets(battle,active.id,selected)){const u=battle.units.find(x=>x.id===id);let b=document.createElement('button');b.textContent=ABILITIES[selected].targetMode==='all'?'All eligible enemies':u.name;b.onclick=()=>act(selected,id);d.append(b);}$('actions').append(d);}}$('log').innerHTML=battle.log.slice(-25).reverse().map(x=>`<div>${x.replaceAll('<','&lt;')}</div>`).join('');}
function restart(nextMode=mode){mode=nextMode;seed=(Math.floor(Math.random()*4294967295)>>>0)||1;random=rng(seed);battle=mode==='boss'?makeLargeMonsterBattle(seed):mode==='classLab'?makeSecondClassBattle(seed):mode==='thirdLab'?makeThirdClassBattle(seed):mode==='fourthLab'?makeFourthClassBattle(seed):makeBattle(seed);selected=null;preparedActorId=null;startRound(battle,random);ensure();render();}
$('restart').onclick=()=>restart();
$('large-demo').onclick=()=>restart('boss');
$('class-demo').onclick=()=>restart('classLab');
$('class-demo-3').onclick=()=>restart('thirdLab');
$('class-demo-4').onclick=()=>restart('fourthLab');
startRound(battle,random);ensure();render();
