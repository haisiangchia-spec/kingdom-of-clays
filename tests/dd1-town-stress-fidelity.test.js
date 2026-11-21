import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,upgradeFacility,encodeCampaignSave,decodeCampaignSave} from '../src/settlement.js';
import {recruitHero} from '../src/hero-roster.js';
import {bookStressTreatment,advanceTownWeek,treatmentConfig,treatmentCostForHero,treatmentPriceAtCostLevel,treatmentCostUpgradeLevel,stageCoachOffers,stressTreatmentRestriction,canUseStressTreatment,TREATMENT_RELIEF_BY_LEVEL,TREATMENTS,dd1TreatmentUpgradeState,treatmentUpgradeLevel,treatmentUpgradePrice,upgradeTreatmentActivity} from '../src/town-week.js';

// Regression guard for DD1-style town stress recovery. Prices and relief tiers
// are explicitly configured; capacity and heirloom upgrade costs remain Clays fixtures.
const finished=()=>({phase:'victory',rosterReturned:true,party:[],townWeekProcessed:false,traitsProcessed:true});
test('stress recovery upgrades are monotonic and cap treatment stress at zero',()=>{
 const s=createCampaignSettlement();s.crests=100;s.deeds=100;s.gold=10000;
 for(const service of ['abbey','tavern']){
  const relief=[treatmentConfig(s,service).stressRelief];
  upgradeTreatmentActivity(s,service);relief.push(treatmentConfig(s,service).stressRelief);
  for(let n=0;n<3;n++)upgradeTreatmentActivity(s,service);
  relief.push(treatmentConfig(s,service).stressRelief);
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
   if(level<2){const count=level===0?1:3;for(let n=0;n<count;n++)upgradeTreatmentActivity(s,service);}
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

test('stress treatment rooms enforce per-activity capacity without charging failed bookings',()=>{
 const s=createCampaignSettlement();s.gold=10000;
 const heroes=[s.roster[0],recruitHero(s,'Priest'),recruitHero(s,'Priest')];
 for(const h of heroes)h.unit.stress=100;
 bookStressTreatment(s,heroes[0].rosterId,'abbey');
 assert.throws(()=>bookStressTreatment(s,heroes[1].rosterId,'abbey'),/room is occupied/);
 assert.equal(s.gold,9000);
 assert.equal(s.town.treatments.length,1);
 bookStressTreatment(s,heroes[1].rosterId,'abbeyTransept');
 assert.equal(s.gold,7750);
 assert.throws(()=>bookStressTreatment(s,heroes[1].rosterId,'tavern'),/already receiving treatment/);
 assert.equal(s.gold,7750);
 s.crests=100;s.deeds=100;
 for(let n=0;n<3;n++)upgradeTreatmentActivity(s,'abbey');
 assert.equal(treatmentConfig(s,'abbey').capacity,2);
 assert.equal(treatmentConfig(s,'abbeyTransept').capacity,1);
 bookStressTreatment(s,heroes[2].rosterId,'abbey');
 assert.equal(s.town.treatments.length,3);
 assert.equal(s.gold,6900);
 assert.throws(()=>bookStressTreatment(s,heroes[2].rosterId,'abbeyTransept'),/already receiving treatment/);
 assert.equal(s.gold,6900);
 const loaded=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.equal(loaded.town.treatments.length,3);
 advanceTownWeek(loaded,finished());
 assert.deepEqual(loaded.town.treatments,[]);
 assert.equal(loaded.roster.find(h=>h.rosterId===heroes[0].rosterId).unit.stress,44);
 assert.equal(loaded.roster.find(h=>h.rosterId===heroes[1].rosterId).unit.stress,45);
 assert.equal(loaded.roster.find(h=>h.rosterId===heroes[2].rosterId).unit.stress,44);
});

test('DD1 Apprentice, Veteran and Champion resolve tiers scale treatment prices',()=>{
 const s=createCampaignSettlement();
 const cases={
  abbey:[1000,1400,1800],
  abbeyTransept:[1250,1750,2250],
  abbeyPenance:[1500,2100,2700],
  tavern:[1000,1400,1800],
  tavernGambling:[1250,1750,2250],
  tavernBrothel:[1500,2100,2700]
 };
 for(const [service,prices] of Object.entries(cases)){
  for(const [level,index] of [[0,0],[2,0],[3,1],[4,1],[5,2],[6,2]]){
   assert.equal(treatmentCostForHero(s,service,{level}),prices[index],service+' level '+level);
  }
 }
 const hero=s.roster[0];hero.level=5;hero.unit.stress=80;s.gold=1799;
 assert.throws(()=>bookStressTreatment(s,hero.rosterId,'abbey'),/Insufficient gold/);
 assert.equal(s.gold,1799);assert.deepEqual(s.town.treatments,[]);
 s.gold=1800;bookStressTreatment(s,hero.rosterId,'abbey');
 assert.equal(s.gold,0);
});

test('source-backed DD1 treatment discount tables cover all six services and three hero tiers',()=>{
 const prices={
  abbey:[[1000,850,700],[1400,1190,980],[1800,1530,1260]],
  abbeyTransept:[[1250,1050,900],[1750,1470,1260],[2250,1890,1620]],
  abbeyPenance:[[1500,1300,1100],[2100,1820,1540],[2700,2340,1980]],
  tavern:[[1000,850,700],[1400,1190,980],[1800,1530,1260]],
  tavernGambling:[[1250,1050,900],[1750,1470,1260],[2250,1890,1620]],
  tavernBrothel:[[1500,1300,1110],[2100,1820,1554],[2700,2340,1998]]
 };
 for(const [service,tiers] of Object.entries(prices)){
  for(const [tier,resolve] of [0,3,5].entries()){
   for(let discount=0;discount<=2;discount++)
    assert.equal(treatmentPriceAtCostLevel(service,resolve,discount),tiers[tier][discount]);
  }
 }
 assert.throws(()=>treatmentPriceAtCostLevel('abbey',0,3),/Invalid treatment cost upgrade/);
 assert.throws(()=>treatmentPriceAtCostLevel('abbey',7,0),/Invalid hero resolve level/);
 assert.throws(()=>treatmentPriceAtCostLevel('unknown',0,0),/Unknown stress treatment/);
});

test('DD1 treatment discounts require sequential activity purchases and survive saves',()=>{
 const s=createCampaignSettlement();s.crests=100;s.deeds=100;s.gold=10000;
 const hero=s.roster[0];hero.level=5;hero.unit.stress=90;
 assert.equal(treatmentCostForHero(s,'abbey',hero),1800);
 upgradeTreatmentActivity(s,'abbey'); // recovery first
 assert.equal(treatmentCostUpgradeLevel(s,'abbey'),0);
 upgradeTreatmentActivity(s,'abbey'); // discount
 assert.equal(treatmentCostUpgradeLevel(s,'abbey'),1);
 assert.equal(treatmentCostForHero(s,'abbey',hero),1530);
 assert.equal(treatmentCostForHero(s,'tavern',hero),1800);
 for(let n=0;n<3;n++)upgradeTreatmentActivity(s,'abbey');
 assert.equal(treatmentCostForHero(s,'abbey',hero),1260);
 const loaded=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.equal(treatmentCostForHero(loaded,'abbey',hero),1260);
 assert.equal(treatmentCostForHero(loaded,'tavern',hero),1800);
 bookStressTreatment(loaded,hero.rosterId,'abbey');
 assert.equal(loaded.gold,8740);
});
test('failed sequential treatment upgrade is atomic',()=>{
 const s=createCampaignSettlement();s.crests=2;s.deeds=20;
 assert.throws(()=>upgradeTreatmentActivity(s,'abbeyTransept'),/Insufficient settlement resources/);
 assert.equal(s.crests,2);assert.equal(s.deeds,20);
 assert.equal(treatmentUpgradeLevel(s,'abbeyTransept'),0);
});

test('vanilla DD1 stress activity upgrades follow recovery, cost, slot, recovery, cost, slot',()=>{
 const states=[
  [0,0,0,1,'recovery'],[1,1,0,1,'discount'],[2,1,1,1,'capacity'],
  [3,1,1,2,'recovery'],[4,2,1,2,'discount'],[5,2,2,2,'capacity'],
  [6,2,2,3,null]
 ];
 for(const [level,recoveryLevel,costLevel,capacity,next] of states)
  assert.deepEqual(dd1TreatmentUpgradeState(level),{level,recoveryLevel,costLevel,capacity,next});
 for(const level of [-1,7,1.5,'2'])
  assert.throws(()=>dd1TreatmentUpgradeState(level),/Invalid DD1 treatment upgrade level/);
});



test('new campaigns purchase sequential DD1 treatment stages and retain levels on save',()=>{
 const s=createCampaignSettlement();s.crests=200;s.deeds=200;
 const service='abbey';
 assert.equal(treatmentUpgradeLevel(s,service),0);
 for(let level=1;level<=6;level++){
  const before=treatmentUpgradePrice(s,service);
  const oldCrests=s.crests,oldDeeds=s.deeds;
  upgradeTreatmentActivity(s,service);
  assert.equal(s.crests,oldCrests-before.crests);
  assert.equal(s.deeds,oldDeeds-before.deeds);
  assert.equal(treatmentUpgradeLevel(s,service),level);
  const expected=dd1TreatmentUpgradeState(level);
  assert.equal(treatmentConfig(s,service).capacity,expected.capacity);
  assert.equal(treatmentConfig(s,service).level,expected.recoveryLevel);
  assert.equal(treatmentCostUpgradeLevel(s,service),expected.costLevel);
  assert.equal(treatmentUpgradeLevel(s,'tavern'),0);
 }
 assert.equal(treatmentUpgradePrice(s,service),null);
 assert.throws(()=>upgradeTreatmentActivity(s,service),/fully upgraded/);
 const loaded=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.equal(treatmentUpgradeLevel(loaded,service),6);
 assert.equal(treatmentConfig(loaded,service).capacity,3);
});



test('six fully upgraded vanilla DD1 stress rooms admit eighteen heroes and reject a nineteenth',()=>{
 const town=createCampaignSettlement();
 town.crests=1000;town.deeds=1000;town.gold=40000;
 town.stageCoach.barracks=3;
 for(const service of Object.keys(TREATMENTS)){
  for(let stage=0;stage<6;stage++)upgradeTreatmentActivity(town,service);
  assert.equal(treatmentConfig(town,service).capacity,3);
 }
 while(town.roster.length<19)recruitHero(town,'Priest');
 for(const hero of town.roster)hero.unit.stress=100;
 const services=Object.keys(TREATMENTS);
 for(let i=0;i<18;i++)bookStressTreatment(town,town.roster[i].rosterId,services[Math.floor(i/3)]);
 assert.equal(town.town.treatments.length,18);
 const beforeGold=town.gold;
 assert.throws(()=>bookStressTreatment(town,town.roster[18].rosterId,services[0]),/room is occupied/);
 assert.equal(town.gold,beforeGold);
 const saved=decodeCampaignSave(encodeCampaignSave(town,null)).settlement;
 assert.equal(saved.town.treatments.length,18);
 assert.equal(saved.treatmentUpgradeTracks.abbey,6);
 assert.equal(saved.treatmentUpgradeTracks.tavernBrothel,6);
});
