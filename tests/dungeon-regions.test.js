import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_PROFILES} from '../src/enemy-roster.js';
import {DUNGEON_REGIONS,PLAGUE_CHAMPION_TABLES,PLAGUE_TABLES,PLAGUE_TEMPLATES,createPlagueEncounterPlan,regionRoomName,REGION_ROOM_NAMES,regionCurio,regionHazard,validatePlagueFormation} from '../src/dungeon-regions.js';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,interactCurio,scoutCorridor,disarmTrap} from '../src/dungeon.js';
import {makeGeneratedEncounter,makeUndeadEncounter,availableTargets,takeTurn,rng,rank} from '../src/engine.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {ABILITIES} from '../src/engine.js';

test('DD1 Apprentice Drummer and Chopper statistics and all reskinned skills',()=>{
 const drummer=ENEMY_PROFILES.plagueDrummer,chopper=ENEMY_PROFILES.plagueChopper;
 assert.deepEqual([drummer.stats.hp,drummer.stats.dodge,drummer.stats.spd],[15,0,7]);
 assert.deepEqual([chopper.stats.hp,chopper.stats.prot,chopper.stats.spd],[21,15,3]);
 assert.deepEqual([drummer.stats.stunResist,drummer.stats.moveResist],[10,25]);
 assert.equal(ABILITIES.plague_drum_doom.acc,82.5);
 assert.equal(ABILITIES.plague_drum_doom.onHitStressChance,70);
 assert.equal(ABILITIES.plague_drum_doom.targetMode,'all');
 assert.deepEqual(ABILITIES.plague_drum_debilitation.debuff.modifiers,{dodge:-10});
 assert.equal(ABILITIES.plague_butcher_cut.status.type,'bleed');
 assert.equal(ABILITIES.plague_butcher_cut.status.value,2);
 assert.equal(ABILITIES.plague_ball_chain.status.type,'stun');
 assert.equal(ABILITIES.plague_ball_chain.moveTarget.distance,1);
});
test('plague encounter templates are deterministic, legal and differentiated by difficulty',()=>{
 for(const difficulty of ['scout','patrol','gauntlet']){
  const table=PLAGUE_TABLES[difficulty],total=table.reduce((n,e)=>n+e.weight,0);
  let used=0;
  for(const entry of table){
   const p=createPlagueEncounterPlan(difficulty,()=> (used+entry.weight/2)/total);
   assert.equal(p.template,entry.id);
   assert.deepEqual(p.profiles,PLAGUE_TEMPLATES[entry.id]);
   assert.ok(p.threat>0);
   used+=entry.weight;
  }
  for(let seed=1;seed<=60;seed++){
   const battle=makeGeneratedEncounter(seed,difficulty,'plague');
   assert.equal(battle.encounterPlan.region,'plague');
   assert.equal(battle.encounterPlan.source,'clays-provisional-plague-encounter-table');
   const foes=battle.units.filter(x=>x.side==='enemy');
   assert.ok(foes.length>=3&&foes.length<=4);
   assert.ok(foes.some(x=>x.enemyProfile==='plagueDrummer'));
   for(const enemy of foes){
    const choices=enemy.enemySkills.filter(id=>availableTargets(battle,enemy.id,id).length>0);
    assert.ok(choices.length>0,enemy.name+' lacks an attack');
    const selected=chooseEnemyAction(battle,enemy.id,enemy.enemySkills,()=>.4,ABILITIES,availableTargets);
    assert.ok(selected&&availableTargets(battle,enemy.id,selected.key).includes(selected.targetId));
   }
  }
 }
 assert.throws(()=>createPlagueEncounterPlan('scout',()=>1),/Encounter random/);
 assert.throws(()=>makeGeneratedEncounter(1,'scout','unknown'),/Unknown encounter region/);
 assert.deepEqual(Object.keys(DUNGEON_REGIONS),['crypt','plague']);
});
test('source-backed Doombeat targets all living heroes for optional stress and 1 damage',()=>{
 const b=makeUndeadEncounter(67,'plagueRaidingParty');
 const drum=b.units.find(u=>u.enemyProfile==='plagueDrummer');
 assert.ok(drum);
 b.queue=[drum.id];
 assert.deepEqual(availableTargets(b,drum.id,'plague_drum_doom').length,1);
 const hp=b.units.filter(u=>u.side==='hero').map(u=>u.hp);
 // Hit, no crit, minimum damage, stress chance passes; repeat as needed
 takeTurn(b,drum.id,'plague_drum_doom','h1',()=>.5);
 const heroes=b.units.filter(u=>u.side==='hero');
 heroes.forEach((u,i)=>{assert.ok(u.hp<hp[i]);assert.equal(u.stress,5);});
});
test('Drummer weakens and marks a chosen hero; its mark attack deals one damage',()=>{
 const b=makeUndeadEncounter(68,'plagueRaidingParty');
 const drum=b.units.find(u=>u.enemyProfile==='plagueDrummer');
 const h=b.units.find(u=>u.id==='h2'),before=h.hp;
 b.queue=[drum.id];
 takeTurn(b,drum.id,'plague_drum_debilitation','h2',()=>.5);
 assert.equal(h.hp,before-1);
 assert.equal(h.marked,3);
 assert.ok(h.effects.some(e=>e.modifiers?.dodge===-10));
});
test('dungeon region persists and creates plague squads without changing default crypt',()=>{
 const plague=createDungeon(69,{region:'plague'});
 beginCorridor(plague,'gallery');advanceCorridor(plague);
 assert.equal(plague.region,'plague');
 assert.ok(dungeonBattle(plague).units.some(u=>u.enemyProfile==='plagueChopper'));
 const crypt=createDungeon(69);
 beginCorridor(crypt,'gallery');advanceCorridor(crypt);
 assert.equal(crypt.region,'crypt');
 assert.ok(dungeonBattle(crypt).units.some(u=>u.enemyProfile==='cryptDefender'));
 assert.throws(()=>createDungeon(69,{region:'not-real'}),/Unknown dungeon region/);
});

test('regional room labels cover every room without altering stable map identifiers',()=>{
 const rooms=['entrance','gallery','watch','vault','sanctum'];
 for(const region of ['crypt','plague']){
  assert.deepEqual(Object.keys(REGION_ROOM_NAMES[region]),rooms);
  for(const id of rooms)assert.equal(typeof regionRoomName(region,id),'string');
 }
 assert.equal(regionRoomName('crypt','gallery'),'Ashen Gallery');
 assert.equal(regionRoomName('plague','gallery'),'Fungal Passage');
 assert.notEqual(regionRoomName('crypt','sanctum'),regionRoomName('plague','sanctum'));
 assert.throws(()=>regionRoomName('unknown','gallery'),/Unknown dungeon region/);
 assert.throws(()=>regionRoomName('plague','missing'),/Unknown dungeon room/);
});

test('Warrens curios are region-specific but keep legacy choices and rewards',()=>{
 assert.equal(regionCurio('crypt','gallery').name,'Abandoned Reliquary');
 assert.equal(regionCurio('plague','gallery').name,'Spore-Covered Cache');
 assert.equal(regionCurio('plague','vault').name,'Diseased Offering');
 assert.equal(regionCurio('plague','watch'),null);
 const d=createDungeon(77,{region:'plague'});
 assert.equal(d.log[0],'Entered Warrens Entrance');
 d.room='gallery';
 const initial=d.curioSupplies.holyWater;
 // Purification is deterministic, costs exactly one supply and grants a reward.
 assert.equal(initial,1);
 interactCurio(d,'purify');
 assert.equal(d.curioSupplies.holyWater,0);
 assert.deepEqual(d.curiosUsed,['gallery']);
 assert.match(d.log.at(-1),/Spore-Covered Cache yields treasure/);
 assert.throws(()=>interactCurio(d,'touch'),/No untouched curio/);
});

test('Warrens spore snare is stronger in stress but does not change Crypt trap baseline',()=>{
 assert.deepEqual([regionHazard('crypt').damage,regionHazard('crypt').stress],[2,5]);
 assert.deepEqual([regionHazard('plague').damage,regionHazard('plague').stress],[2,7]);
 assert.throws(()=>regionHazard('missing'),/Unknown dungeon region/);
 // Force a discovered trap and a failed disarm through the existing public API.
 let verified=false;
 for(let seed=1;seed<300&&!verified;seed++){
  const d=createDungeon(seed,{region:'plague'});
  d.room='watch';d.visited.push('watch');d.torch=0;
  const record=scoutCorridor(d,'sanctum');
  if(!record.trapRevealed)continue;
  beginCorridor(d,'sanctum');
  for(const hero of d.party)hero.spd=0;
  const victim=d.party[0],hp=victim.hp,stress=victim.stress;
  const success=disarmTrap(d,victim.id);
  if(success)continue;
  assert.equal(victim.hp,hp-2);
  assert.equal(victim.stress,stress+7);
  assert.match(d.log.at(-2),/Spore Snare wounds/);
  verified=true;
 }
 assert.ok(verified,'a failed Warrens trap disarm should be reproducible');
});

test('Warrens formation validation counts occupied ranks and rejects foreign enemies',()=>{
 assert.equal(validatePlagueFormation(['plagueChopper','plagueWretch','plagueDrummer']),3);
 assert.equal(validatePlagueFormation(['plagueChopper','plagueChopper','plagueWretch','plagueDrummer']),4);
 assert.throws(()=>validatePlagueFormation([]),/Invalid plague formation/);
 assert.throws(()=>validatePlagueFormation(['cryptDefender']),/Unknown plague enemy/);
 assert.throws(()=>validatePlagueFormation(Array(5).fill('plagueWretch')),/Invalid plague formation/);
 assert.equal(validatePlagueFormation(['plagueDrummer','plagueWretch','plagueChopper']),3);
 for(const entries of Object.values(PLAGUE_TEMPLATES))assert.ok(validatePlagueFormation(entries)<=4);
});

test('all Warrens generated encounters have legal first-turn enemy actions across seeds and difficulties',()=>{
 for(const difficulty of ['scout','patrol','gauntlet']){
  for(let seed=1;seed<=100;seed++){
   const battle=makeGeneratedEncounter(seed,difficulty,'plague');
   const foes=battle.units.filter(unit=>unit.side==='enemy'&&!unit.dead);
   assert.equal(foes.length,battle.encounterPlan.profiles.length);
   for(const foe of foes){
    const legal=foe.enemySkills.filter(id=>availableTargets(battle,foe.id,id).length>0);
    assert.ok(legal.length>0,difficulty+' seed '+seed+' stranded '+foe.enemyProfile);
    const choice=chooseEnemyAction(battle,foe.id,foe.enemySkills,()=>0.37,ABILITIES,availableTargets);
    assert.ok(choice,difficulty+' seed '+seed+' AI failed for '+foe.enemyProfile);
   }
  }
 }
});

test('Apprentice Blight Hookstalker matches source-verified Swine Slasher stats and attack',()=>{
 const p=ENEMY_PROFILES.plagueSlasher,s=ABILITIES.plague_hook_slash;
 assert.deepEqual([p.stats.hp,p.stats.dodge,p.stats.prot,p.stats.spd],[8,7.5,25,5]);
 assert.deepEqual([p.stats.stunResist,p.stats.bleedResist,p.stats.blightResist,p.stats.moveResist,p.stats.debuffResist],[10,40,40,25,15]);
 assert.deepEqual(s.from,[0,1,2,3]);
 assert.deepEqual(s.to,[0,1,2]);
 assert.deepEqual([s.acc,s.crit,s.damageMin,s.damageMax,s.selfBack],[82.5,16,3,7,1]);
 assert.ok(Object.values(PLAGUE_TEMPLATES).some(ids=>ids.includes('plagueSlasher')));
});

test('Hookstalker Strike executes and retreats exactly one rank from the front',()=>{
 let verified=false;
 for(let seed=1;seed<=300&&!verified;seed++){
  const battle=makeGeneratedEncounter(seed*1000003,'patrol','plague');
  const foe=battle.units.find(u=>u.enemyProfile==='plagueSlasher');
  if(!foe)continue;
  // Force the Hookstalker to the front so the one-rank retreat is unambiguous.
  const enemyIndices=battle.units.flatMap((u,i)=>u.side==='enemy'?[i]:[]);
  const foeIndex=battle.units.indexOf(foe);
  const firstIndex=enemyIndices[0];
  [battle.units[firstIndex],battle.units[foeIndex]]=[battle.units[foeIndex],battle.units[firstIndex]];
  assert.equal(rank(battle,foe.id),0);
  const targets=availableTargets(battle,foe.id,'plague_hook_slash');
  assert.ok(targets.length>0);
  battle.queue=[foe.id];
  takeTurn(battle,foe.id,'plague_hook_slash',targets[0],()=>.5);
  assert.equal(foe.actionsTaken,1);
  assert.equal(rank(battle,foe.id),1,'Hookstalker must retreat exactly one rank');
  verified=true;
 }
 assert.ok(verified,'Hookstalker must appear in seeded Warrens encounters');
});

test('dual-Hookstalker pack is generated at every difficulty and each enemy can act',()=>{
 for(const difficulty of ['scout','patrol','gauntlet']){
  const table=PLAGUE_TABLES[difficulty];
  const total=table.reduce((sum,entry)=>sum+entry.weight,0);
  let prefix=0;
  for(const entry of table){
   if(entry.id==='plagueHookPack')break;
   prefix+=entry.weight;
  }
  const plan=createPlagueEncounterPlan(difficulty,()=> (prefix+.5)/total);
  assert.equal(plan.template,'plagueHookPack');
  assert.deepEqual(plan.profiles,['plagueSlasher','plagueSlasher','plagueWretch','plagueDrummer']);
  assert.equal(plan.slots,4);
  assert.equal(plan.profiles.filter(id=>id==='plagueSlasher').length,2);
  let found=false;
  for(let seed=1;seed<=500&&!found;seed++){
   const battle=makeGeneratedEncounter(seed*1000003,difficulty,'plague');
   if(battle.encounterPlan.template!=='plagueHookPack')continue;
   found=true;
   const foes=battle.units.filter(u=>u.side==='enemy');
   assert.equal(foes.filter(u=>u.enemyProfile==='plagueSlasher').length,2);
   for(const foe of foes){
    const legal=foe.enemySkills.filter(key=>availableTargets(battle,foe.id,key).length>0);
    assert.ok(legal.length>0,difficulty+' stranded '+foe.name);
    const action=chooseEnemyAction(battle,foe.id,foe.enemySkills,()=>.37,ABILITIES,availableTargets);
    assert.ok(action,difficulty+' AI failed for '+foe.name);
   }
  }
  assert.ok(found,difficulty+' seeded generator never selected Plague Hook Pack');
 }
});

test('Champion-only Blight Javelineer has source-audited Swine Skiver stats and three rank-dependent skills',()=>{
 const p=ENEMY_PROFILES.plagueSkiver;
 assert.deepEqual([p.stats.hp,p.stats.dodge,p.stats.prot,p.stats.spd],[49,31.25,15,9]);
 assert.deepEqual([p.stats.stunResist,p.stats.blightResist,p.stats.bleedResist,p.stats.debuffResist,p.stats.moveResist],[85,100,60,70,65]);
 const roast=ABILITIES.plague_skiver_roast,volley=ABILITIES.plague_skiver_cripple,flight=ABILITIES.plague_skiver_flight;
 assert.deepEqual([roast.acc,roast.crit,roast.damageMin,roast.damageMax,roast.advance],[107.5,21,12,18,1]);
 assert.deepEqual([roast.status.chance,roast.moveTarget.distance,roast.moveTarget.chance],[130,3,120]);
 assert.deepEqual([volley.acc,volley.crit,volley.damageMin,volley.damageMax],[97.5,9,6,13]);
 assert.equal(volley.targetMode,'all');
 assert.deepEqual(volley.debuff.modifiers,{dodge:-8,speed:-6});
 assert.deepEqual([flight.acc,flight.crit,flight.damageMin,flight.damageMax,flight.selfBack],[92.5,7,4,7,4]);
 assert.ok(!Object.values(PLAGUE_TABLES).flat().some(entry=>PLAGUE_TEMPLATES[entry.id].includes('plagueSkiver')),'Champion-only enemy must not spawn in Apprentice tables');
});

test('Champion Warrens generator includes Skiver while Apprentice never does',()=>{
 for(const difficulty of ['scout','patrol','gauntlet']){
  for(let seed=1;seed<=40;seed++){
   const champion=makeGeneratedEncounter(seed*1000003,difficulty,'plague','champion');
   assert.equal(champion.encounterPlan.tier,'champion');
   assert.ok(champion.units.some(u=>u.enemyProfile==='plagueSkiver'));
   assert.equal(champion.encounterPlan.slots,3);
   const apprentice=makeGeneratedEncounter(seed*1000003,difficulty,'plague');
   assert.ok(!apprentice.units.some(u=>u.enemyProfile==='plagueSkiver'));
  }
 }
 assert.throws(()=>makeGeneratedEncounter(1,'patrol','plague','legendary'),/Unknown Warrens tier/);
});

test('Champion Javelineer attacks, advances, and retreats using combat engine',()=>{
 const b=makeGeneratedEncounter(1000003,'patrol','plague','champion');
 const foe=b.units.find(u=>u.enemyProfile==='plagueSkiver');
 assert.ok(foe);
 const front=b.units.findIndex(u=>u.side==='enemy');
 const idx=b.units.indexOf(foe);
 [b.units[front],b.units[idx]]=[b.units[idx],b.units[front]];
 assert.equal(rank(b,foe.id),0);
 let targets=availableTargets(b,foe.id,'plague_skiver_flight');
 assert.ok(targets.length>0);
 b.queue=[foe.id];
 takeTurn(b,foe.id,'plague_skiver_flight',targets[0],()=>.5);
 assert.equal(rank(b,foe.id),2,'retreat should reach back of three-monster formation');
 assert.equal(foe.actionsTaken,1);
 // Reuse the battle with a fresh action slot to validate the ranged javelin.
 foe.acted=false;
 b.queue=[foe.id];
 targets=availableTargets(b,foe.id,'plague_skiver_roast');
 assert.ok(targets.length>0);
 takeTurn(b,foe.id,'plague_skiver_roast',targets[0],()=>.5);
 assert.equal(rank(b,foe.id),1,'javelin should advance one rank');
});
test('Champion Javelineer Crippling Volley applies damage and blight to rear heroes',()=>{
 const b=makeGeneratedEncounter(2000006,'patrol','plague','champion');
 const foe=b.units.find(u=>u.enemyProfile==='plagueSkiver');
 assert.ok(foe);
 const before=b.units.filter(u=>u.side==='hero').map(u=>u.hp);
 const targets=availableTargets(b,foe.id,'plague_skiver_cripple');
 assert.equal(targets.length,1,'multi-target skill has one selectable group target');
 b.queue=[foe.id];
 takeTurn(b,foe.id,'plague_skiver_cripple',targets[0],()=>.5);
 const heroes=b.units.filter(u=>u.side==='hero');
 assert.equal(heroes[0].hp,before[0],'front hero should be outside volley target ranks');
 for(let i=1;i<4;i++){
  assert.ok(heroes[i].hp<before[i],'rear hero '+i+' should take damage');
  assert.ok(heroes[i].dot.some(d=>d.type==='blight'),'rear hero '+i+' should receive blight');
  assert.ok(heroes[i].effects.some(e=>e.kind==='debuff'&&e.modifiers?.speed===-6&&e.modifiers?.dodge===-8),'rear hero '+i+' should receive volley speed/dodge debuff');
 }
});

test('all four Champion Warrens templates are reachable with legal enemy actions',()=>{
 const seen=new Set();
 for(const difficulty of ['scout','patrol','gauntlet']){
  for(let seed=1;seed<=300;seed++){
   const battle=makeGeneratedEncounter(seed*1000003,difficulty,'plague','champion');
   const plan=battle.encounterPlan;
   seen.add(plan.template);
   assert.equal(plan.tier,'champion');
   assert.equal(plan.slots,3);
   assert.ok(plan.profiles.includes('plagueSkiver'));
   for(const foe of battle.units.filter(u=>u.side==='enemy')){
    const action=chooseEnemyAction(battle,foe.id,foe.enemySkills,()=>.37,ABILITIES,availableTargets);
    assert.ok(action,plan.template+' has no legal action for '+foe.name);
    assert.ok(availableTargets(battle,foe.id,action.key).includes(action.targetId));
   }
  }
 }
 assert.deepEqual([...seen].sort(),[
  'plagueChampionAmbush','plagueChampionEscort','plagueChampionGuard','plagueChampionSkirmish'
 ]);
});

test('Champion Impaling Javelin attempts stun and knockback on a hit',()=>{
 const battle=makeGeneratedEncounter(3000009,'patrol','plague','champion');
 const foe=battle.units.find(u=>u.enemyProfile==='plagueSkiver');
 assert.ok(foe);
 const targets=availableTargets(battle,foe.id,'plague_skiver_roast');
 assert.ok(targets.length);
 const victim=battle.units.find(u=>u.id===targets[0]);
 const hp=victim.hp;
 battle.queue=[foe.id];
 takeTurn(battle,foe.id,'plague_skiver_roast',victim.id,()=>0);
 assert.ok(victim.hp<hp,'javelin should deal damage');
 assert.ok(victim.stun>0||battle.log.some(line=>line.includes(victim.name)&&line.includes('stun')),'javelin should apply or log stun');
 assert.ok(battle.log.some(line=>line.includes(victim.name)&&line.includes('rank')),'javelin should log target displacement');
});

test('Champion encounter weights map deterministic rolls to the expected formations',()=>{
 for(const [difficulty,entries] of Object.entries(PLAGUE_CHAMPION_TABLES)){
  const total=entries.reduce((sum,e)=>sum+e.weight,0);
  assert.ok(total>0);
  assert.ok(entries.every(e=>Number.isInteger(e.weight)&&e.weight>0));
  let cumulative=0;
  for(const entry of entries){
   const low=cumulative/total,high=(cumulative+entry.weight)/total;
   const midpoint=(low+high)/2;
   const plan=createPlagueEncounterPlan(difficulty,()=>midpoint,'champion');
   assert.equal(plan.template,entry.id);
   assert.equal(plan.tier,'champion');
   assert.ok(plan.profiles.includes('plagueSkiver'));
   cumulative+=entry.weight;
  }
  assert.equal(cumulative,total);
 }
 for(const invalid of [-.1,1,Number.NaN,Number.POSITIVE_INFINITY]){
  assert.throws(()=>createPlagueEncounterPlan('patrol',()=>invalid,'champion'),/Encounter random/);
 }
});

test('Champion encounter selection is reproducible for identical seeds',()=>{
 for(const difficulty of ['scout','patrol','gauntlet']){
  for(let seed=1;seed<=100;seed++){
   const first=makeGeneratedEncounter(seed*1000003,difficulty,'plague','champion');
   const second=makeGeneratedEncounter(seed*1000003,difficulty,'plague','champion');
   assert.deepEqual(first.encounterPlan,second.encounterPlan);
   assert.deepEqual(first.units.filter(u=>u.side==='enemy').map(u=>[u.enemyProfile,u.hp,u.spd]),
                    second.units.filter(u=>u.side==='enemy').map(u=>[u.enemyProfile,u.hp,u.spd]));
  }
 }
});

test('Champion tier is explicitly restricted to the implemented Warrens region',()=>{
 assert.throws(()=>makeGeneratedEncounter(1,'patrol','crypt','champion'),/supported only for Blighted Warrens/);
 assert.throws(()=>makeGeneratedEncounter(1,'patrol','unknown','champion'),/supported only for Blighted Warrens/);
 assert.ok(makeGeneratedEncounter(1,'patrol','crypt').encounterPlan);
 assert.equal(makeGeneratedEncounter(1,'patrol','plague','champion').encounterPlan.tier,'champion');
});

test('Champion Warrens dungeon carries tier into generated corridor encounters',()=>{
 const dungeon=createDungeon(42,{difficulty:'patrol',region:'plague',tier:'champion'});
 assert.equal(dungeon.tier,'champion');
 beginCorridor(dungeon,'gallery');
 let guard=0;
 while(dungeon.phase==='explore'&&dungeon.pendingTravel&&guard++<30)advanceCorridor(dungeon);
 if(dungeon.pendingBattle){
  assert.equal(dungeonBattle(dungeon).encounterPlan.tier,'champion');
  assert.ok(dungeonBattle(dungeon).units.some(u=>u.enemyProfile==='plagueSkiver'));
 }
 assert.throws(()=>createDungeon(1,{region:'crypt',tier:'champion'}),/supported only in Blighted Warrens/);
 assert.throws(()=>createDungeon(1,{region:'plague',tier:'veteran'}),/Unknown dungeon tier/);
});
