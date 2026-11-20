import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,upgradeFacility,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {recruitHero} from '../src/hero-roster.js';
import {bookStressTreatment,advanceTownWeek,treatmentConfig,stageCoachOffers} from '../src/town-week.js';

// Regression guard for DD1-style town stress recovery. The treatment magnitudes
// and upgrade structure are current Clays fixtures, not claims of exact DD1 values.
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
