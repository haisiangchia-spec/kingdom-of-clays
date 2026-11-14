import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUndeadEncounter,takeTurn,availableTargets} from '../src/engine.js';
import {createCampaignSettlement} from '../src/settlement.js';
import {prepareRosterParty,returnPartyToRoster} from '../src/hero-roster.js';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle} from '../src/dungeon.js';
import {exposeHeroToDisease} from '../src/trait-effects.js';

test('Blight Wretch reproduces the source-audited Apprentice Swine Wretch profile',()=>{
 const battle=makeUndeadEncounter(901,'blightWretch');
 const enemy=battle.units.find(u=>u.enemyProfile==='plagueWretch');
 assert.ok(enemy);
 assert.equal(enemy.name,'Blight Wretch');
 assert.equal(enemy.hp,12);
 assert.equal(enemy.spd,8);
 assert.equal(enemy.dodge,12.5);
 assert.deepEqual(enemy.enemySkills,['plague_vomit']);
 for(const id of ['h1','h2','h3','h4'])assert.ok(availableTargets(battle,enemy.id,'plague_vomit').includes(id));
});
test('real Vomit attack deals one damage, 10 stress and can transmit one disease',()=>{
 const s=createCampaignSettlement(),b=makeUndeadEncounter(902,'blightWretch');
 b.expeditionEncounter=true;
 b.units=[...prepareRosterParty(s),...b.units.filter(u=>u.side==='enemy')];
 const wretch=b.units.find(u=>u.enemyProfile==='plagueWretch');
 const hero=b.units.find(u=>u.id==='h1');
 b.queue=[wretch.id];
 const before=hero.hp;
 takeTurn(b,wretch.id,'plague_vomit','h1',()=>0);
 assert.equal(hero.hp,before-1);
 assert.equal(hero.stress,10);
 assert.deepEqual(hero.diseases,['creepingCough']);
 assert.equal(hero.spd,s.roster[0].unit.spd-2);
 assert.ok(b.log.some(x=>x.includes('contracts Creeping Cough')));
});
test('Vomit infection respects 33% roll boundary and does not affect combat lab',()=>{
 const lab=makeUndeadEncounter(903,'blightWretch');
 const enemy=lab.units.find(u=>u.enemyProfile==='plagueWretch'),target=lab.units.find(u=>u.id==='h1');
 target.rosterId='r1';target.diseases=[];
 assert.equal(exposeHeroToDisease(lab,enemy,target,()=>0,'plague_vomit'),false);
 lab.expeditionEncounter=true;
 assert.equal(exposeHeroToDisease(lab,enemy,target,()=>.33,'plague_vomit'),false);
 assert.equal(exposeHeroToDisease(lab,enemy,target,()=>.329,'plague_vomit'),true);
 assert.equal(target.diseases.length,1);
 assert.equal(exposeHeroToDisease(lab,enemy,target,()=>0,'not_vomit'),false);
});
test('Vault room expedition deploys the Blight Wretch and carries diseases to roster',()=>{
 const s=createCampaignSettlement();
 const d=createDungeon(904,{party:prepareRosterParty(s)});
 d.room='gallery';d.visited.push('gallery');beginCorridor(d,'vault');
 // Simulate no corridor encounter so the room entrance is reached.
 d.corridors['gallery-vault']={traversals:0,encounterCleared:true};
 advanceCorridor(d);advanceCorridor(d);
 const battle=dungeonBattle(d);
 assert.equal(d.phase,'combat');
 assert.ok(battle.units.some(u=>u.enemyProfile==='plagueWretch'));
 const enemy=battle.units.find(u=>u.enemyProfile==='plagueWretch'),hero=battle.units.find(u=>u.id==='h1');
 assert.equal(exposeHeroToDisease(battle,enemy,hero,()=>0,'plague_vomit'),true);
 for(const foe of battle.units.filter(u=>u.side==='enemy'))foe.dead=true;
 resolveDungeonBattle(d);
 d.phase='victory';
 returnPartyToRoster(s,d);
 assert.deepEqual(s.roster[0].diseases,['creepingCough']);
});
