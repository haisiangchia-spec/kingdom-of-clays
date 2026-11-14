import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {createDungeon,dungeonBattle,beginCorridor,advanceCorridor,resolveDungeonBattle} from '../src/dungeon.js';
import {prepareRosterParty,returnPartyToRoster} from '../src/hero-roster.js';
import {traitBonus,applyTraitBonus,reverseTraitBonus,exposeHeroToDisease,DISEASE_EXPOSURE_CHANCE} from '../src/trait-effects.js';
import {applyQuestTraitRolls} from '../src/sanitarium.js';
import {makeGeneratedEncounter} from '../src/engine.js';

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
test('seeded disease exposure works only in roster-led dungeons and survives roster return',()=>{
 const s=createCampaignSettlement();
 const d=createDungeon(411,{party:prepareRosterParty(s),interactiveEvents:true});
 beginCorridor(d,'gallery');advanceCorridor(d);
 const b=dungeonBattle(d),hero=b.units.find(u=>u.id==='h1'),crypt=b.units.find(u=>u.enemyProfile==='cryptDefender');
 assert.ok(crypt);
 assert.equal(b.expeditionEncounter,true);
 assert.equal(exposeHeroToDisease(b,crypt,hero,()=>0),true);
 assert.deepEqual(hero.diseases,['creepingCough']);
 assert.equal(hero.spd,s.roster[0].unit.spd-2);
 assert.equal(exposeHeroToDisease(b,crypt,hero,()=>0),false);
 for(const foe of b.units.filter(u=>u.side==='enemy'))foe.dead=true;
 resolveDungeonBattle(d);d.phase='victory';
 returnPartyToRoster(s,d);
 assert.deepEqual(s.roster[0].diseases,['creepingCough']);
 assert.equal(s.roster[0].unit.spd,3);
 assert.equal(prepareRosterParty(s)[0].spd,1);
 const normal=makeGeneratedEncounter(411,'scout');
 const other=normal.units.find(u=>u.id==='h1');
 other.rosterId='r1';
 assert.equal(exposeHeroToDisease(normal,normal.units.find(u=>u.enemyProfile==='cryptDefender'),other,()=>0),false);
 assert.equal(DISEASE_EXPOSURE_CHANCE,8);
});
test('disease exposure rejects non-crypt units, zero-damage surrogate and caps infections',()=>{
 const s=createCampaignSettlement(),u=prepareRosterParty(s)[0],b={expeditionEncounter:true,log:[]};
 assert.equal(exposeHeroToDisease(b,{side:'enemy',enemyProfile:'duelist'},u,()=>0),false);
 assert.equal(exposeHeroToDisease(b,{side:'hero',enemyProfile:'cryptDefender'},u,()=>0),false);
 const foe={side:'enemy',enemyProfile:'cryptArbalist'};
 assert.equal(exposeHeroToDisease(b,foe,u,()=>.99),false);
 assert.deepEqual(u.diseases,[]);
 u.diseases=['ashenFever'];
 assert.equal(exposeHeroToDisease(b,foe,u,()=>0),true);
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
