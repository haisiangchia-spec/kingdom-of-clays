import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {createDungeon,dungeonBattle,beginCorridor,advanceCorridor,resolveDungeonBattle} from '../src/dungeon.js';
import {prepareRosterParty,returnPartyToRoster} from '../src/hero-roster.js';
import {traitBonus,applyTraitBonus,reverseTraitBonus,exposeHeroToDisease,DISEASE_EXPOSURE_CHANCE} from '../src/trait-effects.js';
import {applyQuestTraitRolls} from '../src/sanitarium.js';
import {makeGeneratedEncounter,takeTurn,availableTargets} from '../src/engine.js';

test('four individual quirks and two illnesses produce additive, combat-effective stats',()=>{
 const s=createCampaignSettlement(),h=s.roster[0],base=h.unit;
 h.quirks.positive=[{id:'sturdy',locked:true},{id:'eagleEye',locked:false}];
 h.quirks.negative=[{id:'nervous',locked:false},{id:'slowReflexes',locked:true}];
 h.diseases=['creepingCough','ashenFever'];
 assert.deepEqual(traitBonus(h),{maxHp:2,accMod:0,spd:-4,dodge:-5,bleedResist:-10});
 const party=prepareRosterParty(s);
 const u=party[0];
 assert.equal(u.maxHp,base.maxHp+2);
 assert.equal(u.hp,base.hp+2);
 assert.equal(u.spd,base.spd-4);
 assert.equal(u.dodge,base.dodge-5);
 assert.equal(u.accMod,base.accMod);
 assert.equal(u.resist.bleed,base.resist.bleed-10);
 assert.deepEqual(u.diseases,h.diseases);
});
test('returning heroes reverses quirk, illness and Guild combat bonuses once without stat drift',()=>{
 const s=createCampaignSettlement(),h=s.roster[0];
 s.facilities.guild=1;
 h.quirks.positive=[{id:'sturdy',locked:false}];h.quirks.negative=[{id:'nervous',locked:false}];
 h.diseases=['ashenFever'];
 const base=structuredClone(h.unit);
 for(let i=0;i<3;i++){
  const d=createDungeon(300+i,{party:prepareRosterParty(s,{heroHp:2}),bonuses:{heroHp:2}});
  const u=d.party[0];
  assert.equal(u.maxHp,base.maxHp+4);
  assert.equal(u.spd,base.spd-2);
  assert.equal(u.accMod,base.accMod-5);
  u.hp-=3;
  d.phase='victory';
  returnPartyToRoster(s,d);
  assert.equal(h.unit.maxHp,base.maxHp);
  assert.equal(h.unit.spd,base.spd);
  assert.equal(h.unit.accMod,base.accMod);
  assert.equal(h.unit.dodge,base.dodge);
  assert.ok(!h.unit.traitApplied);
 }
 assert.equal(h.unit.hp,base.hp-9);
});
test('source-backed Wretch disease exposure persists on roster, but combat lab is unchanged',()=>{
 const s=createCampaignSettlement();
 const d=createDungeon(411,{party:prepareRosterParty(s),interactiveEvents:true});
 d.room='gallery';d.visited.push('gallery');beginCorridor(d,'vault');
 d.corridors['gallery-vault']={traversals:0,encounterCleared:true};
 advanceCorridor(d);advanceCorridor(d);
 const b=dungeonBattle(d),hero=b.units.find(u=>u.id==='h1'),wretch=b.units.find(u=>u.enemyProfile==='plagueWretch');
 assert.ok(wretch);assert.equal(b.expeditionEncounter,true);
 assert.equal(exposeHeroToDisease(b,wretch,hero,()=>0,'plague_vomit'),true);
 assert.deepEqual(hero.diseases,['creepingCough']);
 assert.equal(hero.spd,s.roster[0].unit.spd-2);
 assert.equal(exposeHeroToDisease(b,wretch,hero,()=>0,'plague_vomit'),false);
 for(const foe of b.units.filter(u=>u.side==='enemy'))foe.dead=true;
 resolveDungeonBattle(d);d.phase='victory';returnPartyToRoster(s,d);
 assert.deepEqual(s.roster[0].diseases,['creepingCough']);
 assert.equal(s.roster[0].unit.spd,3);
 assert.equal(prepareRosterParty(s)[0].spd,1);
 const lab=makeGeneratedEncounter(411,'scout'),other=lab.units.find(u=>u.id==='h1');
 other.rosterId='r1';
 assert.equal(exposeHeroToDisease(lab,{side:'enemy',enemyProfile:'plagueWretch'},other,()=>0,'plague_vomit'),false);
 assert.equal(DISEASE_EXPOSURE_CHANCE,0);
});
test('disease exposure refuses ordinary crypt skills and caps infections',()=>{
 const s=createCampaignSettlement(),u=prepareRosterParty(s)[0],b={expeditionEncounter:true,log:[]};
 assert.equal(exposeHeroToDisease(b,{side:'enemy',enemyProfile:'duelist'},u,()=>0),false);
 assert.equal(exposeHeroToDisease(b,{side:'hero',enemyProfile:'plagueWretch'},u,()=>0,'plague_vomit'),false);
 const foe={side:'enemy',enemyProfile:'plagueWretch'};
 assert.equal(exposeHeroToDisease(b,{side:'enemy',enemyProfile:'cryptArbalist'},u,()=>0,'crypt_quarrel'),false);
 assert.equal(exposeHeroToDisease(b,foe,u,()=>.99,'plague_vomit'),false);
 assert.deepEqual(u.diseases,[]);
 u.diseases=['ashenFever'];
 assert.equal(exposeHeroToDisease(b,foe,u,()=>0,'plague_vomit'),true);
 assert.deepEqual(u.diseases,['ashenFever','creepingCough']);
});
test('negative quirk recurrence locks a previously acquired quirk exactly once',()=>{
 let found=false;
 for(let seed=1;seed<300&&!found;seed++){
  const s=createCampaignSettlement();
  const d=createDungeon(seed,{party:prepareRosterParty(s)});
  d.phase='victory';d.rosterReturned=true;
  const hero=s.roster[0];
  hero.quirks.negative=[{id:'nervous',locked:false},{id:'slowReflexes',locked:false}];
  applyQuestTraitRolls(s,d);
  if(hero.quirks.negative.some(q=>q.locked)){
   found=true;
   const before=structuredClone(hero.quirks.negative);
   assert.equal(applyQuestTraitRolls(s,d),false);
   assert.deepEqual(hero.quirks.negative,before);
   const saved=decodeCampaignSave(encodeCampaignSave(s,d));
   assert.deepEqual(saved.settlement.roster[0].quirks.negative,before);
  }
 }
 assert.equal(found,true);
});

test('ordinary Crypt Defender hits cause damage but never an unsourced disease proc',()=>{
 const s=createCampaignSettlement(),d=createDungeon(912,{party:prepareRosterParty(s)});
 beginCorridor(d,'gallery');advanceCorridor(d);
 const battle=dungeonBattle(d),defender=battle.units.find(u=>u.enemyProfile==='cryptDefender');
 battle.queue=[defender.id];
 assert.ok(availableTargets(battle,defender.id,'boneguard_axe').includes('h1'));
 const hero=battle.units.find(u=>u.id==='h1');
 takeTurn(battle,defender.id,'boneguard_axe','h1',()=>0);
 assert.ok(hero.hp<hero.maxHp);
 assert.deepEqual(hero.diseases??[],[]);
 assert.ok(!battle.log.some(line=>line.includes('contracts')));
});
