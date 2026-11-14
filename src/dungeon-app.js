import {createDungeon,adjacentRooms,beginCorridor,advanceCorridor,resolveDungeonBattle,dungeonBattle,DUNGEON_ROOMS,DUNGEON_CURIOS,useProvision,torchBand,scoutCorridor,disarmTrap,resolveHunger,interactCurio} from './dungeon.js';
import {rng,startRound,currentActor,prepareActorTurn,passActorTurn,takeTurn,availableTargets,status,ABILITIES} from './engine.js';
import {chooseEnemyAction} from './enemy-ai.js';
import {inventoryStacks,inventoryUsed,INVENTORY_CAPACITY,ITEM_RULES,collectLoot,leaveLoot,discardInventoryStack,expeditionRewardSummary,claimExpeditionRewards} from './inventory.js';
import {CAMPAIGN_SAVE_KEY,SETTLEMENT_FACILITIES,createCampaignSettlement,decodeCampaignSave,encodeCampaignSave,nextFacilityCost,upgradeFacility,expeditionBonuses} from './settlement.js';

const $=id=>document.getElementById(id);
const HERO_SKILLS={
 h1:['heavy_slash','countering_advance','battle_shout','guardian_parry','riposte_stance','swordmasters_orders','steadfast_resolve'],
 h2:['crushing_strike','sweeping_assault','concussive_blow','iron_fortress','warrior_recovery','charging_blade','rallying_roar'],
 h3:['eagle_eye_shot','hunters_mark'],
 h4:['greater_heal','group_healing','sacred_strike']
};
let expedition,random,preparedId=null,chosenSkill=null,settlement=createCampaignSettlement();
let saveError='';
function bindRandom(){
 const stream=rng(expedition.seed^0x9e3779b9);
 const calls=Math.max(0,Math.min(100000,expedition.randomCalls??0));
 for(let i=0;i<calls;i++)stream();
 random=()=>{expedition.randomCalls=(expedition.randomCalls??0)+1;return stream();};
}
function persistCampaign(){
 try{
  expedition.preparedActorId=preparedId;
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(settlement,expedition));saveError='';}
 catch(e){saveError='Save unavailable: '+e.message;}
}
function restoreCampaign(){
 try{
  const raw=localStorage.getItem(CAMPAIGN_SAVE_KEY);
  if(!raw)return false;
  const restored=decodeCampaignSave(raw);
  settlement=restored.settlement;
  if(!restored.expedition)return false;
  expedition=restored.expedition;
  const actor=dungeonBattle(expedition)?currentActor(dungeonBattle(expedition)):null;
  preparedId=actor?.side==='hero'&&expedition.preparedActorId===actor.id?actor.id:null;
  // Battle-log state and the deterministic RNG cursor resume together.
  bindRandom();
  return true;
 }catch(e){saveError='Existing save could not be loaded: '+e.message;return false;}
}
const el=(tag,text,container,action)=>{
 const node=document.createElement(tag);
 if(text!=null)node.textContent=text;
 if(action)node.addEventListener('click',action);
 if(container)container.append(node);
 return node;
};
function startExpedition(){
 const seed=(Math.floor(Math.random()*0xffffffff)>>>0)||1;
 expedition=createDungeon(seed,{difficulty:'scout',interactiveEvents:true,bonuses:expeditionBonuses(settlement)});
 expedition.randomCalls=0;
 bindRandom();
 preparedId=null;chosenSkill=null;
 render();
}
function syncCombat(){
 const battle=dungeonBattle(expedition);
 if(!battle)return;
 if(status(battle)!=='ongoing'){
   resolveDungeonBattle(expedition);
   preparedId=null;chosenSkill=null;
   return;
 }
 let guard=0;
 while(status(battle)==='ongoing'&&guard++<60){
   if(!currentActor(battle))startRound(battle,random);
   const actor=currentActor(battle);
   if(!actor)break;
   if(actor.side==='hero'){
     if(preparedId!==actor.id){
       const result=prepareActorTurn(battle,actor.id,random);
       if(result!=='ready'){preparedId=null;continue;}
       preparedId=actor.id;
     }
     break;
   }
   if(prepareActorTurn(battle,actor.id,random)!=='ready')continue;
   const action=chooseEnemyAction(battle,actor.id,actor.enemySkills??[],random,ABILITIES,availableTargets);
   if(action)takeTurn(battle,actor.id,action.key,action.targetId,random);
   else passActorTurn(battle,actor.id);
 }
 if(status(battle)!=='ongoing'){
   resolveDungeonBattle(expedition);
   preparedId=null;chosenSkill=null;
 }
}
function act(skill,targetId){
 const b=dungeonBattle(expedition),a=currentActor(b);
 if(!a||a.side!=='hero')return;
 try{
   takeTurn(b,a.id,skill,targetId,random);
   chosenSkill=null;preparedId=null;
   syncCombat();
 }catch(e){b.log.push('Action rejected: '+e.message);}
 render();
}
function pass(){
 const b=dungeonBattle(expedition),a=currentActor(b);
 if(!a||a.side!=='hero')return;
 passActorTurn(b,a.id);preparedId=null;chosenSkill=null;
 syncCombat();render();
}
function render(){
 if(!expedition)return;
 $('dungeon-status').textContent=`${DUNGEON_ROOMS[expedition.room].name} · ${expedition.phase.toUpperCase()} · Torch ${expedition.torch} (${torchBand(expedition.torch)}) · Seed ${expedition.seed}`;
 const map=$('dungeon-rooms');map.replaceChildren();
 for(const [id,room] of Object.entries(DUNGEON_ROOMS)){
   const marker=el('span',room.name,map);
   marker.className=id===expedition.room?'here':expedition.visited.includes(id)?'seen':'';
   if(expedition.cleared.includes(id))marker.textContent+=' ✓';
 }
 const settlementPanel=$('settlement-panel');settlementPanel.replaceChildren();
 el('p',`Treasury: ${settlement.gold} gold · ${settlement.crests} crests · ${settlement.deeds} deeds · ${settlement.trinkets.length} trinkets · ${settlement.completedExpeditions} completed`,settlementPanel);
 for(const [id,facility] of Object.entries(SETTLEMENT_FACILITIES)){
  const level=settlement.facilities[id];
  const row=el('div',`${facility.name} Lv ${level}/${facility.maxLevel}: ${facility.description}`,settlementPanel);
  row.className='dungeon-unit';
  const cost=nextFacilityCost(settlement,id);
  if(cost){
   const text=`Upgrade ${facility.name} (${cost.gold} gold, ${cost.crests} crests, ${cost.deeds} deeds)`;
   const upgrade=el('button',text,row,()=>{
    try{upgradeFacility(settlement,id);}catch(e){expedition.log.push(e.message);}
    render();
   });
   upgrade.disabled=!['victory','defeat'].includes(expedition.phase)||Object.entries(cost).some(([key,amount])=>settlement[key]<amount);
  }
 }
 const save=$('campaign-save-status');
 save.textContent=saveError||'Progress saves automatically in this browser';
 const inventory=$('dungeon-inventory');inventory.replaceChildren();
 el('p',`Inventory: ${inventoryUsed(expedition)}/${INVENTORY_CAPACITY} slots · Gold carried: ${expedition.loot}`,inventory);
 for(const stack of inventoryStacks(expedition)){
   const row=el('div',`${ITEM_RULES[stack.kind].name} ×${stack.quantity} · `,inventory);
   row.className='dungeon-unit';
   const discard=el('button','Discard',row,()=>{
     try{discardInventoryStack(expedition,stack.id);}catch(error){expedition.log.push(error.message);}
     render();
   });
   discard.disabled=expedition.phase!=='explore';
 }
 if(expedition.pendingLoot&&expedition.phase==='explore'){
   const pending=expedition.pendingLoot;
   el('p',`Unclaimed reward: ${pending.quantity} ${ITEM_RULES[pending.kind].name}. Free a slot or leave it behind.`,inventory);
   el('button','Collect treasure',inventory,()=>{
     try{collectLoot(expedition);}catch(error){expedition.log.push(error.message);}
     render();
   });
   el('button','Leave treasure',inventory,()=>{leaveLoot(expedition);render();});
 }
 if(expedition.phase==='victory'){
   const reward=expeditionRewardSummary(expedition);
   el('p',`Settlement rewards: ${reward.totalGold} gold (including gems), ${reward.crests} crests, ${reward.deeds} deeds, ${reward.trinkets} trinkets.`,inventory);
   if(!expedition.rewardClaimed)el('button','Return rewards to settlement',inventory,()=>{
     try{claimExpeditionRewards(expedition,settlement);settlement.completedExpeditions++;}catch(error){expedition.log.push(error.message);}
     render();
   });
   else el('p','Rewards transferred to the settlement ✓',inventory);
 }
 el('p',`Settlement: ${settlement.gold} gold · ${settlement.crests} crests · ${settlement.deeds} deeds · ${settlement.trinkets.length} trinkets`,inventory);
 const decisions=$('dungeon-decisions');decisions.replaceChildren();
 if(expedition.phase==='explore'&&expedition.pendingHunger){
   el('p','Hunger! Feed the party four rations or go without (-3 HP and +15 stress per hero).',decisions);
   const feed=el('button','Eat four food',decisions,()=>{
     try{resolveHunger(expedition,'eat');}catch(error){expedition.log.push(error.message);}render();
   });
   feed.disabled=expedition.supplies.food<4;
   el('button','Go hungry',decisions,()=>{resolveHunger(expedition,'skip');render();});
 }
 if(expedition.phase==='explore'&&!expedition.pendingHunger&&!expedition.pendingTravel&&!expedition.pendingLoot&&DUNGEON_CURIOS[expedition.room]&&!expedition.curiosUsed.includes(expedition.room)){
   el('p','Curio: '+DUNGEON_CURIOS[expedition.room].name,decisions);
   for(const [action,label] of [['leave','Leave untouched'],['touch','Inspect without provision'],['purify','Use holy water (safe reward)']]){
     const btn=el('button',label,decisions,()=>{
       try{interactCurio(expedition,action);}catch(error){expedition.log.push(error.message);}render();
     });
     if(action==='purify')btn.disabled=expedition.curioSupplies.holyWater===0;
   }
 }
 const travel=$('dungeon-travel');travel.replaceChildren();
 if(expedition.phase==='explore'){
   if(expedition.pendingTravel){
     const trip=expedition.pendingTravel;
     el('p',`Corridor: ${DUNGEON_ROOMS[trip.to].name}, step ${trip.progress}/${trip.steps}`,travel);
     const record=expedition.corridors[trip.corridor];
     if(trip.progress===0&&record?.trapRevealed&&!record.hazardChecked){
       el('p','Scouted trap ahead — choose a hero to disarm it.',decisions);
       for(const hero of expedition.party.filter(u=>!u.dead)){
         el('button','Disarm with '+hero.name,decisions,()=>{
           try{disarmTrap(expedition,hero.id);}catch(error){expedition.log.push(error.message);}render();
         });
       }
     }
     const advance=el('button','Advance corridor',travel,()=>{advanceCorridor(expedition);syncCombat();render();});
     advance.disabled=!!expedition.pendingHunger||!!expedition.pendingLoot;
   }else if(!expedition.pendingHunger&&!expedition.pendingLoot){
     for(const adjacent of adjacentRooms(expedition)){
       const record=expedition.corridors[adjacent.corridor];
       el('button','Travel to '+DUNGEON_ROOMS[adjacent.room].name,travel,()=>{
         beginCorridor(expedition,adjacent.room);render();
       });
       if(!record?.scouted){
         el('button','Scout '+DUNGEON_ROOMS[adjacent.room].name,travel,()=>{
           try{scoutCorridor(expedition,adjacent.room);}catch(error){expedition.log.push(error.message);}render();
         });
       }else{
         el('p',`Scouted ${adjacent.corridor}: ${record.encounterRevealed?'foes likely':'no enemy signs'}${record.trapRevealed?', trap detected':''}`,travel);
       }
     }
   }
 }else if(expedition.phase==='combat')el('p','Combat blocks further exploration',travel);
 else el('p',expedition.phase==='victory'?'The Sanctum has been secured.':'The expedition has fallen.',travel);
 const supplies=$('dungeon-supplies');supplies.replaceChildren();
 el('p',`Torches: ${expedition.supplies.torch} · Food: ${expedition.supplies.food} · Holy water: ${expedition.curioSupplies.holyWater} · Loot: ${expedition.loot}`,supplies);
 if(expedition.phase==='explore'){
   const torchButton=el('button','Light torch (+25)',supplies,()=>{
     try{useProvision(expedition,'torch');}catch(error){expedition.log.push(error.message);}
     render();
   });
   torchButton.disabled=expedition.supplies.torch<=0||expedition.torch>=100;
   for(const hero of expedition.party.filter(u=>!u.dead)){
     const foodButton=el('button','Feed '+hero.name+' (+2 HP)',supplies,()=>{
       try{useProvision(expedition,'food',hero.id);}catch(error){expedition.log.push(error.message);}
       render();
     });
     foodButton.disabled=expedition.supplies.food<=0||hero.hp>=hero.maxHp;
   }
 }
 const party=$('dungeon-party');party.replaceChildren();
 for(const hero of expedition.party){
   el('div',`${hero.name}: ${hero.dead?'FALLEN':hero.hp+'/'+hero.maxHp+' HP'} · ${hero.stress} stress`,party).className='dungeon-unit';
 }
 const battle=dungeonBattle(expedition),combat=$('dungeon-combat');combat.replaceChildren();
 $('dungeon-panel-title').textContent=battle?'Combat':expedition.phase==='victory'?'Expedition completed':'Expedition';
 if(battle){
   el('p',`Round ${battle.round} · ${status(battle)}`,combat);
   for(const side of ['hero','enemy']){
     el('h3',side==='hero'?'Adventurers':'Enemies',combat);
     for(const unit of battle.units.filter(u=>u.side===side&&!u.dead&&!u.corpse)){
       el('div',`${unit.name} · ${unit.hp}/${unit.maxHp} HP${side==='hero'?' · '+unit.stress+' stress':''}`,combat).className='dungeon-unit';
     }
   }
   const actor=currentActor(battle);
   if(actor?.side==='hero'&&status(battle)==='ongoing'){
     el('h3',actor.name+' to act',combat);
     for(const key of HERO_SKILLS[actor.id]??[]){
       if(!ABILITIES[key])continue;
       const targets=availableTargets(battle,actor.id,key);
       if(!targets.length)continue;
       const btn=el('button',ABILITIES[key].name+(chosenSkill===key?' ✓':''),combat,()=>{
         chosenSkill=key;render();
       });
       btn.setAttribute('aria-pressed',chosenSkill===key?'true':'false');
     }
     if(chosenSkill&&availableTargets(battle,actor.id,chosenSkill).length){
       el('p','Select target:',combat);
       for(const id of availableTargets(battle,actor.id,chosenSkill)){
         const u=battle.units.find(u=>u.id===id);
         el('button',u.name,combat,()=>act(chosenSkill,id));
       }
     }
     el('button','Pass turn',combat,pass);
   }
   el('h3','Battle log',combat);
   for(const line of battle.log.slice(-10).reverse())el('p',line,combat);
 }else{
   el('p',expedition.phase==='explore'?'Choose an adjacent room or advance through the current corridor.':'Expedition ended.',combat);
 }
 const log=$('dungeon-log');log.replaceChildren();
 for(const line of expedition.log.slice(-12).reverse())el('p',line,log);
 persistCampaign();
 $('campaign-save-status').textContent=saveError||'Progress saves automatically in this browser';
}
$('dungeon-restart').onclick=startExpedition;
if(restoreCampaign()){syncCombat();render();}else startExpedition();
