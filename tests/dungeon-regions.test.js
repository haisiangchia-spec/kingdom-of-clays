import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_PROFILES} from '../src/enemy-roster.js';
import {DUNGEON_REGIONS,PLAGUE_TABLES,PLAGUE_TEMPLATES,createPlagueEncounterPlan,regionRoomName,REGION_ROOM_NAMES,regionCurio,regionHazard,validatePlagueFormation} from '../src/dungeon-regions.js';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,interactCurio,scoutCorridor,disarmTrap} from '../src/dungeon.js';
import {makeGeneratedEncounter,makeUndeadEncounter,availableTargets,takeTurn,rng} from '../src/engine.js';
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
