import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,resolveHunger} from '../src/dungeon.js';
import {createCampaignSettlement,normalizeCampaignSettlement,SETTLEMENT_FACILITIES,nextFacilityCost,upgradeFacility,expeditionBonuses,encodeCampaignSave,decodeCampaignSave,CAMPAIGN_SAVE_VERSION} from '../src/settlement.js';
import {offerLoot,collectLoot,claimExpeditionRewards} from '../src/inventory.js';

test('campaign settlement starts empty with three independent upgradeable facilities',()=>{
 const s=createCampaignSettlement();
 assert.deepEqual({gold:s.gold,crests:s.crests,deeds:s.deeds,trinkets:s.trinkets,facilities:s.facilities,completedExpeditions:s.completedExpeditions},{gold:0,crests:0,deeds:0,trinkets:[],facilities:{market:0,guild:0,temple:0},completedExpeditions:0});
 assert.equal(s.roster.length,4);
 assert.deepEqual(s.squad,['r1','r2','r3','r4']);
 assert.deepEqual(Object.keys(SETTLEMENT_FACILITIES),['market','guild','temple']);
 assert.deepEqual(nextFacilityCost(s,'market'),{gold:100,crests:1,deeds:0});
 assert.deepEqual(nextFacilityCost(s,'guild'),{gold:125,crests:0,deeds:1});
 assert.deepEqual(nextFacilityCost(s,'temple'),{gold:150,crests:1,deeds:1});
 assert.throws(()=>upgradeFacility(s,'market'),/Insufficient/);
 assert.deepEqual(s,createCampaignSettlement());
});

test('facility costs scale by tier, deduct atomically, and refuse max level',()=>{
 const s=createCampaignSettlement();
 s.gold=3000;s.crests=100;s.deeds=100;
 for(let level=1;level<=3;level++){
  const before={...s};
  const expected=nextFacilityCost(s,'market');
  const result=upgradeFacility(s,'market');
  assert.equal(result.level,level);
  assert.deepEqual(result.cost,expected);
  assert.equal(s.gold,before.gold-expected.gold);
  assert.equal(s.crests,before.crests-expected.crests);
 }
 assert.equal(nextFacilityCost(s,'market'),null);
 assert.throws(()=>upgradeFacility(s,'market'),/maximum level/);
 assert.throws(()=>nextFacilityCost(s,'unknown'),/Unknown facility/);
 const poor=createCampaignSettlement();poor.gold=1000;
 assert.throws(()=>upgradeFacility(poor,'temple'),/Insufficient/);
 assert.equal(poor.gold,1000);
});

test('facility upgrades change future expedition supplies, HP, and hunger stress',()=>{
 const s=createCampaignSettlement();
 s.gold=3000;s.crests=100;s.deeds=100;
 upgradeFacility(s,'market');
 upgradeFacility(s,'guild');
 upgradeFacility(s,'temple');
 const bonuses=expeditionBonuses(s);
 assert.deepEqual(bonuses,{food:2,heroHp:2,hungerStressReduction:2});
 const newDungeon=createDungeon(701,{interactiveEvents:true,bonuses});
 const baseline=createDungeon(701,{interactiveEvents:true});
 assert.equal(newDungeon.supplies.food,10);
 assert.equal(newDungeon.party[0].maxHp,baseline.party[0].maxHp+2);
 assert.equal(newDungeon.party[0].hp,baseline.party[0].hp+2);
 newDungeon.stepsTaken=4;newDungeon.room='watch';newDungeon.pendingTravel={from:'watch',to:'gallery',corridor:'gallery-watch',progress:0,steps:2};
 newDungeon.pendingHunger=true;
 resolveHunger(newDungeon,'skip');
 assert.equal(newDungeon.party[0].stress,13);
 assert.equal(newDungeon.party[0].hp,newDungeon.party[0].maxHp-3);
 assert.equal(baseline.supplies.food,8);
});

test('versioned save roundtrips active combat, pending loot and upgraded settlement',()=>{
 const s=createCampaignSettlement();
 s.gold=850;s.crests=4;s.deeds=3;s.trinkets.push('ward-charm');
 upgradeFacility(s,'market');
 const d=createDungeon(702,{interactiveEvents:true,bonuses:expeditionBonuses(s)});
 d.room='gallery';d.visited.push('gallery');d.stepsTaken=7;d.torch=34;
 offerLoot(d,'gold',50);
 d.randomCalls=117;
 const raw=encodeCampaignSave(s,d);
 const loaded=decodeCampaignSave(raw);
 assert.deepEqual(loaded.settlement,s);
 assert.deepEqual(loaded.expedition,d);
 assert.equal(JSON.parse(raw).version,CAMPAIGN_SAVE_VERSION);
 assert.notEqual(loaded.expedition,d);
 assert.notEqual(loaded.settlement,s);
});

test('legacy minimal settlement is normalized without losing wallet or trinkets',()=>{
 const legacy={gold:25,crests:5,deeds:2,trinkets:['ward-charm']};
 const migrated=normalizeCampaignSettlement(legacy);
 assert.equal(migrated.gold,25);
 assert.deepEqual(migrated.facilities,{market:0,guild:0,temple:0});
 assert.equal(migrated.completedExpeditions,0);
 assert.deepEqual(migrated.trinkets,['ward-charm']);
});

test('corrupt and unknown save versions fail closed',()=>{
 const s=createCampaignSettlement();
 const save=JSON.parse(encodeCampaignSave(s,null));
 assert.deepEqual(decodeCampaignSave(JSON.stringify(save)),{settlement:s,expedition:null});
 assert.throws(()=>decodeCampaignSave('{invalid'),/JSON/);
 assert.throws(()=>decodeCampaignSave(JSON.stringify({...save,version:99})),/version/);
 assert.throws(()=>decodeCampaignSave(JSON.stringify({...save,settlement:{...s,gold:-1}})),/Invalid settlement/);
 assert.throws(()=>decodeCampaignSave(JSON.stringify({...save,settlement:{...s,facilities:{market:100}}})),/Invalid facility level/);
 assert.throws(()=>decodeCampaignSave(JSON.stringify({...save,expedition:{phase:'combat'}})),/Invalid expedition save/);
});

test('reward handoff remains once-only after a serialized victory and upgrades spend its resources',()=>{
 const s=createCampaignSettlement(),d=createDungeon(703,{interactiveEvents:true});
 for(const [kind,count] of [['gold',100],['crest',2],['deed',1]]){
  offerLoot(d,kind,count);collectLoot(d);
 }
 d.phase='victory';
 claimExpeditionRewards(d,s);
 s.completedExpeditions++;
 assert.deepEqual({gold:s.gold,crests:s.crests,deeds:s.deeds}, {gold:100,crests:2,deeds:1});
 const loaded=decodeCampaignSave(encodeCampaignSave({...s,facilities:{market:0,guild:0,temple:0}},d));
 assert.throws(()=>claimExpeditionRewards(loaded.expedition,loaded.settlement),/already been claimed/);
 upgradeFacility(loaded.settlement,'market');
 assert.equal(loaded.settlement.gold,0);
 assert.equal(loaded.settlement.crests,1);
 assert.equal(loaded.settlement.completedExpeditions,1);
});
