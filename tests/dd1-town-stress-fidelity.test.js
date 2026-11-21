import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,upgradeFacility,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {recruitHero} from '../src/hero-roster.js';
import {bookStressTreatment,advanceTownWeek,treatmentConfig,stageCoachOffers,stressTreatmentRestriction,canUseStressTreatment,TREATMENT_RELIEF_BY_LEVEL,TREATMENTS,upgradeRecoveryActivity} from '../src/town-week.js';

// Regression guard for DD1-style town stress recovery. Prices and relief tiers
// are explicitly configured; capacity and heirloom upgrade costs remain Clays fixtures.
const finished=()=>({phase:'victory',rosterReturned:true,party:[],townWeekProcessed:false,traitsProcessed:true});
test('stress recovery upgrades are monotonic and cap treatment stress at zero',()=>{
 const s=createCampaignSettlement();s.crests=100;s.deeds=100;s.gold=10000;
 for(const service of ['abbey','tavern']){
  const relief=[treatmentConfig(s,service).stressRelief];
  upgradeFacility(s,service);relief.push(treatmentConfig(s,service).stressRelief);
  upgradeFacility(s,service);relief.push(treatmentConfig(s,service).stressRelief);
  assert.ok(relief[0]<relief[1]&&relief[1]<relief[2]);
  assert.equal(treatmentConfig(s,service).capacity,2);
 }
 const h=s.roster[0];h.unit.stress=1;
 bookStressTreatment(s,h.rosterId,'abbey');
 advanceTownWeek(s,finished());
 assert.equal(h.unit.stress,0);
 assert.equal(s.town.treatments.length,0);
});
test('treated heroes are excluded from idle recovery and afflictions clear below threshold',()=>{
 const s=createCampaignSettlement();s.gold=2000;
 const treated=recruitHero(s,'Priest');treated.unit.stress=100;treated.unit.affliction='fearful';
 const idle=recruitHero(s,'Priest');idle.unit.stress=100;idle.unit.affliction='fearful';
 bookStressTreatment(s,treated.rosterId,'tavern');
 const e=finished();advanceTownWeek(s,e);
 assert.equal(treated.unit.stress,55);
 assert.equal(treated.unit.affliction,null);
 assert.equal(idle.unit.stress,95);
 assert.equal(idle.unit.affliction,'fearful');
 assert.equal(advanceTownWeek(s,e),false);
 assert.equal(idle.unit.stress,95);
});
test('weekly recruits refresh deterministically and treatment state survives save roundtrip',()=>{
 const s=createCampaignSettlement();s.gold=1000;s.roster[0].unit.stress=60;
 bookStressTreatment(s,s.roster[0].rosterId,'abbey');
 const loaded=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.deepEqual(loaded.town.treatments,s.town.treatments);
 advanceTownWeek(loaded,finished());
 assert.deepEqual(loaded.town.offers,stageCoachOffers(2,loaded.roster,loaded.stageCoach.network));
 assert.equal(loaded.roster[0].unit.stress,15);
});

test('DD1 forced treatment quirks prohibit alternative services and conflicting quirks cannot bypass restrictions',()=>{
 const s=createCampaignSettlement();s.gold=5000;
 const h=s.roster[0];h.unit.stress=90;
 h.quirks.negative=[{id:'enlightened',locked:false}];
 assert.equal(canUseStressTreatment(h,'abbey'),true);
 assert.equal(canUseStressTreatment(h,'abbeyTransept'),false);
 assert.match(stressTreatmentRestriction(h,'tavern'),/requires Abbey Cloister/);
 h.quirks.negative.push({id:'unquietMind',locked:false});
 for(const service of ['abbey','abbeyTransept','abbeyPenance','tavern','tavernGambling','tavernBrothel'])
  assert.equal(canUseStressTreatment(h,service),false,service);
 const before=s.gold;
 assert.throws(()=>bookStressTreatment(s,h.rosterId,'abbey'),/quirk forbids this stress treatment: unquietMind prohibits Abbey Cloister/);
 assert.equal(s.gold,before);
 assert.deepEqual(s.town.treatments,[]);
});
test('unknown treatment requests do not mutate settlement resources or bookings',()=>{
 const s=createCampaignSettlement();s.gold=3000;s.roster[0].unit.stress=90;
 assert.throws(()=>bookStressTreatment(s,s.roster[0].rosterId,'unknown'),/Unknown stress treatment/);
 assert.equal(s.gold,3000);
 assert.deepEqual(s.town.treatments,[]);
});

test('all six DD1 treatment services use explicit prices and three independent relief tiers',()=>{
 const expected={
  abbey:{gold:1000,relief:[45,56,70]},
  abbeyTransept:{gold:1250,relief:[55,69,86]},
  abbeyPenance:{gold:1500,relief:[65,81,100]},
  tavern:{gold:1000,relief:[45,56,70]},
  tavernGambling:{gold:1250,relief:[55,69,86]},
  tavernBrothel:{gold:1500,relief:[65,81,100]}
 };
 assert.deepEqual(Object.keys(TREATMENTS).sort(),Object.keys(expected).sort());
 const s=createCampaignSettlement();s.crests=200;s.deeds=200;
 for(const [service,rule] of Object.entries(expected)){
  assert.deepEqual([...TREATMENT_RELIEF_BY_LEVEL[service]],rule.relief);
  for(let level=0;level<=2;level++){
   const config=treatmentConfig(s,service);
   assert.equal(config.level,level,service);
   assert.equal(config.gold,rule.gold,service);
   assert.equal(config.stressRelief,rule.relief[level],service);
   assert.equal(config.capacity,level===2?2:1,service);
   if(level<2)upgradeRecoveryActivity(s,service);
  }
 }
 const loaded=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 for(const [service,rule] of Object.entries(expected)){
  assert.equal(treatmentConfig(loaded,service).stressRelief,rule.relief[2]);
  assert.equal(treatmentConfig(loaded,service).gold,rule.gold);
 }
});

test('all twelve named DD1 treatment quirks restrict only their specified activities',()=>{
 const services=Object.keys(TREATMENTS);
 const forced={
  enlightened:'abbey',godFearing:'abbeyTransept',flagellant:'abbeyPenance',
  tippler:'tavern',gambler:'tavernGambling',loveInterest:'tavernBrothel'
 };
 const blocked={
  unquietMind:['abbey'],witness:['abbeyTransept'],
  faithless:['abbeyTransept','abbeyPenance'],resolution:['tavern'],
  knownCheat:['tavernGambling'],deviantTastes:['tavernBrothel']
 };
 for(const [id,required] of Object.entries(forced)){
  const hero={quirks:{negative:[{id,locked:false}]}};
  for(const service of services)
   assert.equal(canUseStressTreatment(hero,service),service===required,id+' '+service);
 }
 for(const [id,excluded] of Object.entries(blocked)){
  const hero={quirks:{negative:[{id,locked:false}]}};
  for(const service of services)
   assert.equal(canUseStressTreatment(hero,service),!excluded.includes(service),id+' '+service);
 }
});

test('a forced-activity quirk explains a rejected booking without charging gold',()=>{
 const s=createCampaignSettlement();s.gold=2000;
 const h=s.roster[0];h.unit.stress=75;
 h.quirks.negative=[{id:'godFearing',locked:false}];
 assert.throws(()=>bookStressTreatment(s,h.rosterId,'tavern'),/godFearing requires Abbey Transept/);
 assert.equal(s.gold,2000);
 assert.deepEqual(s.town.treatments,[]);
});
