import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {createDungeon} from '../src/dungeon.js';
import {prepareRosterParty,returnPartyToRoster,recruitHero,selectHero} from '../src/hero-roster.js';
import {advanceTownWeek} from '../src/town-week.js';
import {bookSanitarium,completeSanitariumWeek,sanitariumTreatmentCost,sanitariumWardBookings,sanitariumUnavailable} from '../src/sanitarium.js';
import {SANITARIUM_UPGRADE_TREES,upgradeSanitarium,nextSanitariumUpgradeCost,sanitariumWardCapacity,quirkTreatmentDiscount,multiDiseaseCureChance} from '../src/sanitarium-upgrades.js';
import {offerLoot,collectLoot,claimExpeditionRewards} from '../src/inventory.js';

function town(){
 const s=createCampaignSettlement();s.gold=50000;s.busts=300;s.crests=200;s.town.week=4;
 return s;
}
test('DD1 upgrade tier costs, maximum levels and atomic funds consumption',()=>{
 const s=town();
 assert.deepEqual(Object.keys(SANITARIUM_UPGRADE_TREES),['treatmentLibrary','medicalDevices','patientCells']);
 for(const id of Object.keys(SANITARIUM_UPGRADE_TREES)){
  const rule=SANITARIUM_UPGRADE_TREES[id];
  for(let i=0;i<rule.maxLevel;i++){
   const [busts,crests]=rule.costs[i],beforeBusts=s.busts,beforeCrests=s.crests;
   assert.deepEqual(nextSanitariumUpgradeCost(s,id),{busts,crests});
   const receipt=upgradeSanitarium(s,id);
   assert.equal(receipt.level,i+1);
   assert.equal(s.busts,beforeBusts-busts);
   assert.equal(s.crests,beforeCrests-crests);
  }
  assert.equal(nextSanitariumUpgradeCost(s,id),null);
  assert.throws(()=>upgradeSanitarium(s,id),/maximum level/);
 }
 const poor=createCampaignSettlement();poor.town.week=4;poor.busts=2;poor.crests=10;
 assert.throws(()=>upgradeSanitarium(poor,'medicalDevices'),/Insufficient Busts/);
 assert.deepEqual({busts:poor.busts,crests:poor.crests},{busts:2,crests:10});
});
test('Apprentice and Veteran treatment cost tables change with upgrade levels',()=>{
 const s=town(),hero=s.roster[0];
 hero.quirks.negative=[{id:'nervous',locked:false}];
 hero.quirks.positive=[{id:'sturdy',locked:false}];
 hero.diseases=['creepingCough'];
 assert.equal(sanitariumTreatmentCost(s,hero,'negative','nervous'),1500);
 assert.equal(sanitariumTreatmentCost(s,hero,'disease','creepingCough'),750);
 upgradeSanitarium(s,'treatmentLibrary');
 assert.equal(sanitariumTreatmentCost(s,hero,'negative','nervous'),1350);
 assert.equal(sanitariumTreatmentCost(s,hero,'lockPositive','sturdy'),6750);
 upgradeSanitarium(s,'medicalDevices');
 assert.equal(sanitariumTreatmentCost(s,hero,'disease','creepingCough'),650);
 upgradeSanitarium(s,'medicalDevices');
 assert.equal(sanitariumTreatmentCost(s,hero,'disease','creepingCough'),650);
 assert.equal(multiDiseaseCureChance(s),15);
 hero.level=3;
 assert.equal(sanitariumTreatmentCost(s,hero,'negative','nervous'),1890);
 assert.equal(sanitariumTreatmentCost(s,hero,'disease','creepingCough'),910);
});
test('Patient Cells unlock two medical and then two quirk bookings without double booking heroes',()=>{
 const s=town();
 for(let i=0;i<4;i++){
  s.roster[i].diseases=['creepingCough'];
  s.roster[i].quirks.negative=[{id:'nervous',locked:false}];
 }
 bookSanitarium(s,'r1','disease','creepingCough');
 assert.throws(()=>bookSanitarium(s,'r2','disease','creepingCough'),/occupied/);
 upgradeSanitarium(s,'patientCells');
 assert.equal(sanitariumWardCapacity(s,'medicalWard'),2);
 assert.equal(sanitariumWardCapacity(s,'quirkWard'),1);
 bookSanitarium(s,'r2','disease','creepingCough');
 assert.equal(sanitariumWardBookings(s,'medicalWard').length,2);
 assert.throws(()=>bookSanitarium(s,'r2','negative','nervous'),/already undergoing/);
 bookSanitarium(s,'r3','negative','nervous');
 upgradeSanitarium(s,'patientCells');
 assert.equal(sanitariumWardCapacity(s,'quirkWard'),2);
 bookSanitarium(s,'r4','negative','nervous');
 assert.equal(sanitariumWardBookings(s,'quirkWard').length,2);
 assert.equal(sanitariumUnavailable(s,'r4'),true);
 const clone=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.equal(sanitariumWardBookings(clone,'quirkWard').length,2);
 completeSanitariumWeek(clone);
 assert.equal(sanitariumWardBookings(clone,'quirkWard').length,0);
 assert.equal(sanitariumWardBookings(clone,'medicalWard').length,0);
 assert.equal(clone.roster[1].diseases.length,0);
 assert.equal(clone.roster[3].quirks.negative.length,0);
});
test('BUSTS collect in backpack and transfer once to persistent settlement',()=>{
 const s=createCampaignSettlement(),d=createDungeon(812,{interactiveEvents:true});
 offerLoot(d,'bust',3);collectLoot(d);
 d.phase='victory';
 const report=claimExpeditionRewards(d,s);
 assert.equal(report.busts,3);
 assert.equal(s.busts,3);
 assert.equal(decodeCampaignSave(encodeCampaignSave(s,d)).settlement.busts,3);
 assert.throws(()=>claimExpeditionRewards(d,s),/already been claimed/);
});
test('legacy saved Sanitarium without upgrades loads with zero levels and can be upgraded',()=>{
 const s=town();
 delete s.sanitarium.upgrades;delete s.sanitarium.extraMedicalWards;delete s.sanitarium.extraQuirkWards;
 const restored=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.equal(restored.sanitarium.upgrades.patientCells,0);
 assert.equal(sanitariumWardCapacity(restored,'medicalWard'),1);
 const receipt=upgradeSanitarium(restored,'treatmentLibrary');
 assert.equal(receipt.level,1);
});
