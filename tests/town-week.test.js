import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {createDungeon} from '../src/dungeon.js';
import {prepareRosterParty,returnPartyToRoster,selectHero,recruitHero} from '../src/hero-roster.js';
import {TREATMENTS,stageCoachOffers,recruitFromCoach,bookStressTreatment,advanceTownWeek,townUnavailable,validateTown} from '../src/town-week.js';

const completed=(s,seed=1)=>{
 const d=createDungeon(seed,{party:prepareRosterParty(s)});
 d.phase='victory';returnPartyToRoster(s,d);
 return d;
};

test('Stage Coach offers are reproducibly seeded per week and are not endlessly recruitable',()=>{
 const s=createCampaignSettlement();
 assert.equal(s.town.week,1);
 assert.deepEqual(s.town.offers,stageCoachOffers(1,s.roster));
 assert.equal(s.town.offers.length,2);
 const offer=s.town.offers[0],start=s.roster.length;
 const hero=recruitFromCoach(s,offer.offerId);
 assert.equal(hero.heroClass,offer.heroClass);
 assert.equal(s.roster.length,start+1);
 assert.equal(s.gold,0);
 assert.equal(s.town.offers.length,1);
 assert.throws(()=>recruitFromCoach(s,offer.offerId),/No such Stage Coach candidate/);
 assert.deepEqual(stageCoachOffers(1,s.roster),stageCoachOffers(1,s.roster));
});

test('a completed expedition advances the town once and replaces its offered heroes',()=>{
 const s=createCampaignSettlement(),before=structuredClone(s.town.offers);
 const d=completed(s,51);
 assert.equal(advanceTownWeek(s,d),true);
 assert.equal(s.town.week,2);
 assert.deepEqual(s.town.offers,stageCoachOffers(2,s.roster));
 assert.notDeepEqual(s.town.offers,before);
 assert.equal(advanceTownWeek(s,d),false);
 assert.equal(s.town.week,2);
 const restored=decodeCampaignSave(encodeCampaignSave(s,d));
 assert.equal(restored.settlement.town.week,2);
 assert.equal(advanceTownWeek(restored.settlement,restored.expedition),false);
});
test('Abbey and Tavern booking deduct DD1 apprentice base costs and forbid double-use of slots or heroes',()=>{
 const s=createCampaignSettlement();
 s.gold=2000;
 s.roster[0].unit.stress=96;
 s.roster[1].unit.stress=80;
 s.roster[2].unit.stress=71;
 const first=bookStressTreatment(s,'r1','abbey');
 assert.equal(first.rosterId,'r1');
 assert.equal(s.gold,1000);
 assert.equal(townUnavailable(s,'r1'),true);
 assert.equal(TREATMENTS.abbey.gold,1000);
 assert.equal(TREATMENTS.abbey.stressRelief,45);
 assert.throws(()=>bookStressTreatment(s,'r2','abbey'),/room is occupied/);
 assert.throws(()=>bookStressTreatment(s,'r1','tavern'),/already receiving/);
 bookStressTreatment(s,'r2','tavern');
 assert.equal(s.gold,0);
 assert.throws(()=>bookStressTreatment(s,'r3','abbey'),/room is occupied/);
 assert.throws(()=>prepareRosterParty(s),/Hero receiving treatment/);
 assert.throws(()=>selectHero(s,2,'r1'),/Hero is unavailable/);
});
test('treatment recovers exactly one town week later, idle heroes shed five stress, expedition heroes do not',()=>{
 const s=createCampaignSettlement();s.gold=2000;
 s.roster[0].unit.stress=100;
 s.roster[1].unit.stress=70;
 s.roster[2].unit.stress=54;
 s.roster[3].unit.stress=33;
 const recruited=recruitHero(s,'Hunter');
 recruited.unit.stress=38;
 bookStressTreatment(s,'r1','abbey');
 bookStressTreatment(s,'r2','tavern');
 // Replace treating heroes with available unbooked recruits.
 const replacement2=recruitHero(s,'Warrior');
 selectHero(s,0,recruited.rosterId);
 selectHero(s,1,replacement2.rosterId);
 const d=completed(s,52);
 assert.equal(advanceTownWeek(s,d),true);
 assert.equal(s.roster[0].unit.stress,55);
 assert.equal(s.roster[1].unit.stress,25);
 assert.equal(s.roster[2].unit.stress,54);
 assert.equal(s.roster[3].unit.stress,33);
 assert.equal(recruited.unit.stress,38,'deployed hero does not receive idle recovery');
 assert.equal(s.town.treatments.length,0);
 assert.equal(townUnavailable(s,'r1'),false);
 assert.equal(prepareRosterParty(s).length,4);
});
test('idle roster stress falls by five, but never below zero',()=>{
 const s=createCampaignSettlement();
 const reserve=recruitHero(s,'Priest');
 reserve.unit.stress=3;
 const d=completed(s,53);
 advanceTownWeek(s,d);
 assert.equal(reserve.unit.stress,0);
});
test('no town tick before roster return or after unfinished quest, and invalid towns are rejected',()=>{
 const s=createCampaignSettlement(),d=createDungeon(54,{party:prepareRosterParty(s)});
 assert.throws(()=>advanceTownWeek(s,d),/has not ended/);
 d.phase='defeat';
 assert.throws(()=>advanceTownWeek(s,d),/Return the expedition party/);
 const broken=structuredClone(s);
 broken.town.offers.push({...broken.town.offers[0]});
 assert.throws(()=>validateTown(broken),/Invalid Stage Coach offer/);
 const invalid=structuredClone(s);invalid.town.week=-1;
 assert.throws(()=>decodeCampaignSave(encodeCampaignSave(invalid,null)),/Invalid town/);
});
test('pending treatment and available recruits remain identical after save reload',()=>{
 const s=createCampaignSettlement();s.gold=1000;s.roster[0].unit.stress=40;
 bookStressTreatment(s,'r1','abbey');
 const before=structuredClone(s.town);
 const saved=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.deepEqual(saved.town,before);
 assert.throws(()=>prepareRosterParty(saved),/Hero receiving treatment/);
 const offer=saved.town.offers[0];
 const fresh=recruitFromCoach(saved,offer.offerId);
 selectHero(saved,0,fresh.rosterId);
 assert.equal(prepareRosterParty(saved)[0].rosterId,fresh.rosterId);
});
