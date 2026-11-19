import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement,normalizeCampaignSettlement,encodeCampaignSave,decodeCampaignSave,expeditionBonuses,upgradeFacility,upgradeStageCoach} from '../src/settlement.js';
import {createDungeon} from '../src/dungeon.js';
import {stageCoachOffers,advanceTownWeek} from '../src/town-week.js';
import {claimExpeditionRewards} from '../src/inventory.js';
import {HERO_CLASSES,ROSTER_CAPACITY,rosterCapacity,RECRUITMENT_COST,RESURRECTION_COST,createHeroRoster,recruitHero,selectHero,availableParty,prepareRosterParty,returnPartyToRoster,resurrectHero,dismissHero,equipTrinket,unequipTrinket,upgradeHeroEquipment,upgradeHeroSkill,validateHeroRoster} from '../src/hero-roster.js';

test('initial four heroes have persistent IDs, classes, and independent combat units',()=>{
 const s=createCampaignSettlement();
 assert.deepEqual(s.squad,['r1','r2','r3','r4']);
 assert.deepEqual(s.roster.map(h=>h.heroClass),HERO_CLASSES);
 assert.equal(s.nextHeroId,5);
 const roster=createHeroRoster();
 roster[0].unit.hp=1;
 assert.equal(roster[1].unit.hp,33);
 assert.equal(s.roster[0].unit.hp,33);
 const party=prepareRosterParty(s);
 assert.deepEqual(party.map(u=>u.id),['h1','h2','h3','h4']);
 assert.deepEqual(party.map(u=>u.rosterId),s.squad);
});
test('recruitment costs gold, supports duplicates, and party selection preserves rank identity',()=>{
 const s=createCampaignSettlement();s.gold=300;
 const extra=recruitHero(s,'Hunter');
 assert.equal(extra.rosterId,'r5');
 assert.equal(s.gold,300-RECRUITMENT_COST);
 assert.equal(s.roster.length,5);
 selectHero(s,0,'r5');
 assert.deepEqual(s.squad,['r5','r2','r3','r4']);
 const party=prepareRosterParty(s);
 assert.equal(party[0].heroClass,'Hunter');
 assert.equal(party[0].id,'h1');
 assert.equal(party[0].rosterId,'r5');
 assert.throws(()=>selectHero(s,1,'r5'),/already selected/);
 assert.throws(()=>recruitHero(s,'Unreleased Class'),/Unknown hero class/);
 for(let i=5;i<ROSTER_CAPACITY;i++){s.gold=RECRUITMENT_COST;recruitHero(s,'Swordsman');}
 assert.equal(s.roster.length,ROSTER_CAPACITY);
 assert.throws(()=>recruitHero(s,'Swordsman'),/Roster is full/);
});
test('survivors recover HP while stress and permanent death survive expedition return',()=>{
 const s=createCampaignSettlement();
 const d=createDungeon(901,{interactiveEvents:true,party:prepareRosterParty(s)});
 d.party[0].hp=17;d.party[0].stress=61;
 d.party[1].dead=true;d.party[1].hp=0;d.party[1].stress=95;
 d.phase='defeat';
 assert.equal(returnPartyToRoster(s,d),true);
 assert.equal(returnPartyToRoster(s,d),false);
 assert.equal(s.roster[0].unit.hp,s.roster[0].unit.maxHp);
 assert.equal(s.roster[0].unit.stress,61);
 assert.equal(s.roster[1].unit.dead,true);
 assert.equal(s.roster[1].unit.hp,0);
 assert.throws(()=>prepareRosterParty(s),/Replace dead heroes/);
 const recruited=recruitHero({...s,gold:RECRUITMENT_COST},'Priest');
 assert.equal(recruited.rosterId,'r5');
});
test('surviving heroes earn one experience on victory; Guild HP does not become permanently inflated',()=>{
 const s=createCampaignSettlement();
 s.gold=1000;s.deeds=5;upgradeFacility(s,'guild');
 const bonuses=expeditionBonuses(s);
 const first=createDungeon(902,{party:prepareRosterParty(s,bonuses),bonuses});
 assert.equal(first.party[0].maxHp,35);
 first.party[0].hp=30;
 first.phase='victory';
 returnPartyToRoster(s,first);
 assert.equal(s.roster[0].unit.maxHp,33);
 assert.equal(s.roster[0].unit.hp,33);
 assert.equal(s.roster[0].xp,2);
 assert.equal(s.roster[0].level,1);
 const second=createDungeon(903,{party:prepareRosterParty(s,bonuses),bonuses});
 second.phase='victory';returnPartyToRoster(s,second);
 assert.equal(s.roster[0].level,1);
 assert.equal(s.roster[0].xp,4);
 assert.equal(s.roster[0].unit.maxHp,33);
});
test('Temple resurrection is a priced user-approved exception to permanent death',()=>{
 const s=createCampaignSettlement();
 s.roster[0].unit.dead=true;s.roster[0].unit.hp=0;s.roster[0].unit.stress=155;
 s.gold=RESURRECTION_COST+150;
 assert.throws(()=>resurrectHero(s,'r1'),/Temple must reach level one/);
 s.crests=1;s.deeds=1;upgradeFacility(s,'temple');
 assert.equal(s.gold,RESURRECTION_COST);
 const hero=resurrectHero(s,'r1');
 assert.equal(s.gold,0);
 assert.equal(hero.unit.dead,false);
 assert.equal(hero.unit.hp,Math.ceil(hero.unit.maxHp/2));
 assert.equal(hero.unit.stress,100);
 s.facilities.temple=1;s.gold=RESURRECTION_COST;
 assert.throws(()=>resurrectHero(s,'r1'),/not deceased/);
});
test('equipment is stored per hero and not multiplied by duplicated recruits',()=>{
 const s=createCampaignSettlement();s.trinkets=['ward-charm'];s.gold=RECRUITMENT_COST;
 const h=recruitHero(s,'Hunter');
 equipTrinket(s,h.rosterId);
 assert.equal(h.equippedTrinket,'ward-charm');
 assert.deepEqual(s.trinkets,[]);
 assert.throws(()=>equipTrinket(s,h.rosterId),/already has/);
 const party=prepareRosterParty(s);
 assert.equal(party[2].equippedTrinket,null);
 unequipTrinket(s,h.rosterId);
 assert.deepEqual(s.trinkets,['ward-charm']);
});
test('save roundtrip and legacy migration retain roster details and reject invalid party data',()=>{
 const s=createCampaignSettlement();s.gold=RECRUITMENT_COST;
 recruitHero(s,'Priest');
 selectHero(s,0,'r5');
 s.roster[0].unit.stress=80;s.roster[4].level=1;s.roster[4].xp=2;
 const d=createDungeon(904,{party:prepareRosterParty(s),interactiveEvents:true});
 const output=decodeCampaignSave(encodeCampaignSave(s,d));
 assert.deepEqual(output.settlement,s);
 assert.deepEqual(output.expedition,d);
 const old=normalizeCampaignSettlement({gold:50,crests:1,deeds:2,trinkets:[]});
 assert.equal(old.roster.length,4);
 const invalid=structuredClone(s);invalid.squad[1]=invalid.squad[0];
 assert.throws(()=>validateHeroRoster(invalid),/Invalid selected party/);
 const corrupt=structuredClone(s);corrupt.roster[0].unit.hp=Infinity;
 assert.throws(()=>normalizeCampaignSettlement(corrupt),/Invalid hero roster/);
});
test('reward claims and roster return are separately idempotent',()=>{
 const s=createCampaignSettlement(),d=createDungeon(905,{party:prepareRosterParty(s)});
 d.phase='victory';
 returnPartyToRoster(s,d);
 assert.equal(returnPartyToRoster(s,d),false);
 claimExpeditionRewards(d,s);
 assert.throws(()=>claimExpeditionRewards(d,s),/already been claimed/);
 assert.equal(s.roster[0].xp,2);
});

test('dismissal frees roster capacity and a vacant rank can be filled by a free recruit',()=>{
 const s=createCampaignSettlement();
 for(let i=4;i<ROSTER_CAPACITY;i++)recruitHero(s,'Hunter');
 assert.equal(s.roster.length,ROSTER_CAPACITY);
 assert.throws(()=>recruitHero(s,'Priest'),/Roster is full/);
 s.roster[0].unit.dead=true;s.roster[0].unit.hp=0;
 const fallen=dismissHero(s,'r1');
 assert.equal(fallen.unit.dead,true);
 assert.equal(s.roster.length,ROSTER_CAPACITY-1);
 assert.equal(s.squad[0],null);
 assert.equal(s.graveyard.length,1);
 assert.throws(()=>prepareRosterParty(s),/Replace dead heroes/);
 const replacement=recruitHero(s,'Priest');
 assert.equal(s.roster.length,ROSTER_CAPACITY);
 assert.equal(replacement.rosterId,'r9');
 selectHero(s,0,replacement.rosterId);
 assert.equal(prepareRosterParty(s)[0].heroClass,'Priest');
 const restored=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.deepEqual(restored.squad,s.squad);
 assert.deepEqual(restored.graveyard,s.graveyard);
 s.facilities.temple=1;s.gold=RESURRECTION_COST;
 assert.throws(()=>resurrectHero(s,'r1'),/not deceased/);
});

test('dead and living retirement differ in equipment handling',()=>{
 const s=createCampaignSettlement();s.trinkets=['ward-charm','ward-charm'];
 equipTrinket(s,'r1');equipTrinket(s,'r2');
 assert.equal(s.trinkets.length,0);
 dismissHero(s,'r1');
 assert.equal(s.trinkets.length,1,'living retiree returns the equipped charm');
 s.roster.find(h=>h.rosterId==='r2').unit.dead=true;
 dismissHero(s,'r2');
 assert.equal(s.trinkets.length,1,'dead hero loses the worn charm');
});

test('Veteran and Champion victories award tier-scaled Resolve XP once',()=>{
 for(const [tier,expected] of [['veteran',4],['champion',8]]){
  const settlement=createCampaignSettlement();
  const expedition=createDungeon(1201,{party:prepareRosterParty(settlement),region:'plague',tier});
  expedition.phase='victory';
  assert.equal(returnPartyToRoster(settlement,expedition),true);
  assert.equal(settlement.roster[0].xp,expected);
  assert.equal(returnPartyToRoster(settlement,expedition),false);
  assert.equal(settlement.roster[0].xp,expected);
 }
});

test('equipment upgrades require Resolve and persist through roster party preparation and saves',()=>{
 const settlement=createCampaignSettlement();
 settlement.gold=1000;
 const hero=settlement.roster[0];
 const original={min:hero.unit.dmgMin,max:hero.unit.dmgMax,hp:hero.unit.maxHp};
 assert.throws(()=>upgradeHeroEquipment(settlement,hero.rosterId,'weapon'),/Resolve level too low/);
 hero.level=2;
 assert.deepEqual(upgradeHeroEquipment(settlement,hero.rosterId,'weapon'),{rosterId:hero.rosterId,kind:'weapon',level:1,cost:100});
 assert.deepEqual(upgradeHeroEquipment(settlement,hero.rosterId,'armor'),{rosterId:hero.rosterId,kind:'armor',level:1,cost:100});
 assert.equal(hero.unit.dmgMin,original.min+1);
 assert.equal(hero.unit.dmgMax,original.max+2);
 assert.equal(hero.unit.maxHp,original.hp+3);
 const prepared=prepareRosterParty(settlement)[0];
 assert.equal(prepared.dmgMin,original.min+1);
 assert.equal(prepared.maxHp,original.hp+3);
 const restored=decodeCampaignSave(encodeCampaignSave(settlement,null)).settlement;
 assert.deepEqual(restored.roster[0].equipment,{weapon:1,armor:1});
 assert.equal(restored.roster[0].unit.dmgMax,original.max+2);
 hero.level=1;
 assert.throws(()=>upgradeHeroEquipment(settlement,hero.rosterId,'weapon'),/Resolve level too low/);
});

test('verified hero skill upgrades are Resolve-gated, paid, persistent, and used by prepared parties',()=>{
 const settlement=createCampaignSettlement();
 const hero=settlement.roster.find(h=>h.heroClass==='Swordsman');
 const id=hero.rosterId;
 settlement.gold=1000;
 assert.throws(()=>upgradeHeroSkill(settlement,id,'heavy_slash'),/Resolve level/);
 hero.level=3;
 const before=settlement.gold;
 assert.deepEqual(upgradeHeroSkill(settlement,id,'heavy_slash'),{rosterId:id,skillId:'heavy_slash',level:2,cost:75});
 assert.equal(settlement.gold,before-75);
 assert.deepEqual(upgradeHeroSkill(settlement,id,'heavy_slash'),{rosterId:id,skillId:'heavy_slash',level:3,cost:150});
 assert.throws(()=>upgradeHeroSkill(settlement,id,'heavy_slash'),/Resolve level/);
 assert.throws(()=>upgradeHeroSkill(settlement,id,'plague_skiver_roast'),/Unknown hero skill|Skill does not belong|Unverified skill upgrade/);
 const party=prepareRosterParty(settlement);
 assert.equal(party.find(u=>u.rosterId===id).skillLevels.heavy_slash,3);
 const restored=decodeCampaignSave(encodeCampaignSave(settlement,null)).settlement;
 assert.equal(restored.roster.find(h=>h.rosterId===id).unit.skillLevels.heavy_slash,3);
});

test('equipment combat bonuses persist through campaign save and expedition return',()=>{
 const settlement=createCampaignSettlement();
 settlement.gold=100000;
 const expected=new Map();
 for(const hero of settlement.roster){
  hero.level=3;
  for(let i=0;i<3;i++){
   upgradeHeroEquipment(settlement,hero.rosterId,'weapon');
   upgradeHeroEquipment(settlement,hero.rosterId,'armor');
  }
  expected.set(hero.rosterId,{accMod:hero.unit.accMod,crit:hero.unit.crit,dodge:hero.unit.dodge,
   dmgMin:hero.unit.dmgMin,dmgMax:hero.unit.dmgMax,maxHp:hero.unit.maxHp});
 }
 const saved=decodeCampaignSave(encodeCampaignSave(settlement,null)).settlement;
 for(const hero of saved.roster){
  for(const [key,value] of Object.entries(expected.get(hero.rosterId)))assert.equal(hero.unit[key],value,'save lost '+hero.heroClass+' '+key);
 }
 const expedition=createDungeon(181,{region:'plague',tier:'veteran',difficulty:'patrol',party:prepareRosterParty(saved)});
 expedition.phase='defeat';
 returnPartyToRoster(saved,expedition);
 for(const hero of saved.roster){
  for(const [key,value] of Object.entries(expected.get(hero.rosterId)))assert.equal(hero.unit[key],value,'expedition return lost '+hero.heroClass+' '+key);
 }
});

test('Stage Coach barracks expand roster capacity and network increases weekly arrivals',()=>{
 const s=createCampaignSettlement();
 assert.equal(rosterCapacity(s),8);
 s.gold=100000;s.crests=1000;s.deeds=1000;
 for(let i=0;i<5;i++)upgradeStageCoach(s,'barracks');
 assert.equal(rosterCapacity(s),28);
 for(let i=4;i<28;i++)recruitHero(s,'Hunter');
 assert.equal(s.roster.length,28);
 assert.throws(()=>recruitHero(s,'Priest'),/Roster is full/);
 for(let i=0;i<5;i++)upgradeStageCoach(s,'network');
 const restored=decodeCampaignSave(encodeCampaignSave(s,null)).settlement;
 assert.deepEqual(restored.stageCoach,{barracks:5,network:5});
 assert.equal(rosterCapacity(restored),28);
});

test('Stage Coach network generates seven valid weekly offers after full upgrades',()=>{
 const s=createCampaignSettlement();s.gold=100000;s.crests=1000;s.deeds=1000;
 for(let i=0;i<5;i++)upgradeStageCoach(s,'network');
 const expedition={phase:'victory',rosterReturned:true,party:[],traitsProcessed:true};
 advanceTownWeek(s,expedition);
 assert.equal(s.town.offers.length,7);
 assert.equal(s.town.offers[6].offerId,'w2-o7');
 assert.deepEqual(s.town.offers,stageCoachOffers(2,s.roster,5));
 assert.deepEqual(decodeCampaignSave(encodeCampaignSave(s,null)).settlement.town.offers,s.town.offers);
});

test('DD1 Resolve XP scales with quest length and tier, never on defeat',()=>{
 const cases=[
  ['apprentice','scout',2],['apprentice','patrol',3],['apprentice','gauntlet',4],
  ['veteran','scout',4],['veteran','patrol',6],['veteran','gauntlet',8],
  ['champion','scout',8],['champion','patrol',12],['champion','gauntlet',16]
 ];
 for(const [tier,difficulty,xp] of cases){
  const s=createCampaignSettlement();
  const d=createDungeon(918,{tier,difficulty,party:prepareRosterParty(s)});
  d.phase='victory';
  assert.equal(returnPartyToRoster(s,d),true);
  assert.equal(s.roster[0].xp,xp,tier+' '+difficulty);
  assert.equal(returnPartyToRoster(s,d),false,'return is idempotent');
  assert.equal(s.roster[0].xp,xp);
 }
 const s=createCampaignSettlement();
 const d=createDungeon(919,{tier:'champion',difficulty:'gauntlet',party:prepareRosterParty(s)});
 d.phase='defeat';
 returnPartyToRoster(s,d);
 assert.equal(s.roster[0].xp,0);
});
