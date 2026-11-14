import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {createDungeon} from '../src/dungeon.js';
import {prepareRosterParty,returnPartyToRoster,recruitHero,selectHero} from '../src/hero-roster.js';
import {advanceTownWeek,bookStressTreatment} from '../src/town-week.js';
import {initSanitarium,validateSanitarium,bookSanitarium,sanitariumUnavailable,completeSanitariumWeek,applyQuestTraitRolls,SANITARIUM_COSTS} from '../src/sanitarium.js';

function town(){const s=createCampaignSettlement();s.town.week=4;s.town.offers=[];return s;}
test('Sanitarium unlocks at week four; original DD1 apprentice pricing and one ward of each type',()=>{
 const s=createCampaignSettlement();s.gold=20000;
 s.roster[0].quirks.negative.push({id:'nervous',locked:false});
 assert.equal(s.sanitarium.quirkWard,null);
 assert.equal(s.sanitarium.medicalWard,null);
 assert.deepEqual(s.sanitarium.upgrades,{treatmentLibrary:0,medicalDevices:0,patientCells:0});
 assert.equal(SANITARIUM_COSTS.negative,1500);
 assert.equal(SANITARIUM_COSTS.lockedNegative,5000);
 assert.equal(SANITARIUM_COSTS.lockPositive,7500);
 assert.equal(SANITARIUM_COSTS.disease,750);
 assert.throws(()=>bookSanitarium(s,'r1','negative','nervous'),/week 4/);
 s.town.week=4;
 assert.deepEqual(bookSanitarium(s,'r1','negative','nervous'),{ward:'quirkWard',cost:1500});
 assert.equal(s.gold,18500);
 assert.equal(sanitariumUnavailable(s,'r1'),true);
 assert.throws(()=>prepareRosterParty(s),/receiving treatment/);
 assert.throws(()=>bookSanitarium(s,'r2','negative','nervous'),/occupied/);
});
test('one week cures illness or removes negative quirk; locked traits cost more',()=>{
 const s=town();s.gold=30000;
 s.roster[0].quirks.negative.push({id:'nervous',locked:true});
 s.roster[0].unit.stress=40;
 s.roster[1].diseases=['creepingCough'];
 bookSanitarium(s,'r1','negative','nervous');
 bookSanitarium(s,'r2','disease','creepingCough');
 assert.equal(s.gold,24250);
 assert.throws(()=>bookStressTreatment(s,'r1','abbey'),/already receiving/);
 completeSanitariumWeek(s);
 assert.equal(s.roster[0].quirks.negative.length,0);
 assert.deepEqual(s.roster[1].diseases,[]);
 assert.equal(s.sanitarium.quirkWard,null);
 assert.equal(s.sanitarium.medicalWard,null);
 completeSanitariumWeek(s);
 assert.equal(s.gold,24250);
});
test('positive quirk can be locked once and cannot exceed three permanent locks',()=>{
 const s=town();s.gold=30000;
 s.roster[0].quirks.positive=[{id:'sturdy',locked:false},{id:'eagleEye',locked:false}];
 bookSanitarium(s,'r1','lockPositive','sturdy');
 assert.equal(s.gold,22500);
 completeSanitariumWeek(s);
 assert.equal(s.roster[0].quirks.positive[0].locked,true);
 assert.throws(()=>bookSanitarium(s,'r1','lockPositive','sturdy'),/Cannot lock/);
});
test('disease/quirk booking persists through saves and invalid trait data is rejected',()=>{
 const s=town();s.gold=1000;s.roster[2].diseases=['ashenFever'];
 bookSanitarium(s,'r3','disease','ashenFever');
 const copy=decodeCampaignSave(encodeCampaignSave(s,null));
 assert.deepEqual(copy.settlement.sanitarium,s.sanitarium);
 assert.deepEqual(copy.settlement.roster[2].diseases,['ashenFever']);
 const bad=structuredClone(s);bad.roster[0].quirks.negative=[{id:'bogus',locked:false}];
 assert.throws(()=>encodeCampaignSave(bad,null),/Invalid hero quirks/);
});
test('trait rolls resolve once per victory, treatment completion advances with town week',()=>{
 const s=town();s.gold=10000;
 s.roster[0].quirks.negative=[{id:'nervous',locked:false}];
 bookSanitarium(s,'r1','negative','nervous');
 // Booked r1 is unavailable; select replacement first.
 const hero=recruitHero(s,'Hunter');
 selectHero(s,0,hero.rosterId);
 const d=createDungeon(222,{party:prepareRosterParty(s)});
 d.phase='victory';returnPartyToRoster(s,d);
 assert.equal(advanceTownWeek(s,d),true);
 assert.equal(d.traitsProcessed,true);
 assert.equal(s.town.week,5);
 assert.equal(s.roster[0].quirks.negative.length,0);
 const snapshot=JSON.stringify(s.roster);
 assert.equal(advanceTownWeek(s,d),false);
 assert.equal(JSON.stringify(s.roster),snapshot);
});
