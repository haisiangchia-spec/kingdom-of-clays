import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,interactCurio,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle} from '../src/dungeon.js';
import {ITEM_RULES,inventoryStacks,inventoryUsed,inventoryCanAdd,offerLoot,collectLoot,leaveLoot,discardInventoryStack,expeditionRewardSummary,claimExpeditionRewards,createSettlement} from '../src/inventory.js';

test('mixed reward kinds have independently bounded stacks and carried gold tracks only actual gold',()=>{
 const d=createDungeon(401,{interactiveEvents:true});
 for(const [kind,quantity] of [['gem',4],['crest',5],['deed',2]]){
  offerLoot(d,kind,quantity);collectLoot(d);
 }
 assert.deepEqual(d.inventory,[
  {kind:'gem',quantity:3},{kind:'gem',quantity:1},
  {kind:'crest',quantity:5},{kind:'deed',quantity:2}
 ]);
 assert.equal(inventoryUsed(d),9,'capacity would have rejected the final stack');
});
test('mixed rewards enforce total capacity atomically and merge same-kind stacks',()=>{
 const d=createDungeon(402,{interactiveEvents:true});
 offerLoot(d,'gem',3);collectLoot(d);
 offerLoot(d,'gem',1);collectLoot(d);
 assert.deepEqual(d.inventory,[{kind:'gem',quantity:3},{kind:'gem',quantity:1}]);
 assert.equal(inventoryUsed(d),7);
 offerLoot(d,'deed',8);
 assert.equal(inventoryCanAdd(d,'deed',8),false);
 assert.throws(()=>collectLoot(d),/Inventory full/);
 assert.equal(d.inventory.length,2);
 discardInventoryStack(d,'food:0');
 assert.equal(inventoryUsed(d),6);
 collectLoot(d);
 assert.equal(inventoryUsed(d),8);
});
test('mixed loot cannot be disguised as consumable provisions',()=>{
 const d=createDungeon(403);
 assert.equal(ITEM_RULES.gem.stack,3);
 assert.equal(ITEM_RULES.crest.stack,6);
 assert.equal(ITEM_RULES.deed.stack,4);
 assert.equal(ITEM_RULES.trinket.stack,1);
 assert.throws(()=>offerLoot(d,'food',1),/Invalid loot/);
 assert.throws(()=>inventoryCanAdd(d,'torch',1),/Only rewards/);
 offerLoot(d,'crest',2);leaveLoot(d);
 assert.equal(d.inventory.length,0);
});
test('purified Vault curio offers a trinket while noninteractive legacy curio still awards gold',()=>{
 const d=createDungeon(404,{interactiveEvents:true});
 d.room='vault';
 interactCurio(d,'purify');
 assert.deepEqual(d.pendingLoot,{kind:'trinket',quantity:1});
 assert.equal(d.loot,0);
 collectLoot(d);
 assert.deepEqual(d.inventory,[{kind:'trinket',quantity:1}]);
 const legacy=createDungeon(404);
 legacy.room='vault';interactCurio(legacy,'purify');
 assert.equal(legacy.loot,175);
});
test('room victory creates a crest reward while other rooms offer gems',()=>{
 for(const [room,expected] of [['watch',{kind:'crest',quantity:3}],['vault',{kind:'gem',quantity:2}]]){
  const d=createDungeon(405,{interactiveEvents:true});
  d.room=room;
  beginCorridor(d,room==='watch'?'sanctum':'gallery');
  // Simulate the correct room battle integration without bypassing state checks.
  d.pendingBattle={source:'room:'+room,battle:awaitVictoryBattle(d)};
  d.phase='combat';
  resolveDungeonBattle(d);
  assert.deepEqual(d.pendingLoot,expected);
  collectLoot(d);
  assert.equal(d.inventory[0].kind,expected.kind);
 }
});
function awaitVictoryBattle(d){
 const source=createDungeon(d.seed).party;
 const battle={seed:d.seed,units:source.map(u=>({...u})),torch:d.torch};
 // Engine status() recognises victory if at least one hero survives, and no enemies remain.
 return battle;
}
test('settlement receives gems, heirlooms and trinkets exactly once after victory',()=>{
 const d=createDungeon(406,{interactiveEvents:true});
 for(const [kind,q] of [['gold',50],['gem',2],['crest',2],['deed',1],['trinket',1]]){
  offerLoot(d,kind,q);
  if(!inventoryCanAdd(d,kind,q))discardInventoryStack(d,'food:0');
  collectLoot(d);
 }
 const summary=expeditionRewardSummary(d);
 assert.deepEqual(summary,{gold:50,gems:2,crests:2,deeds:1,trinkets:1,gemValue:250,trinketValue:250,totalGold:300});
 const settlement=createSettlement();
 assert.throws(()=>claimExpeditionRewards(d,settlement),/Complete expedition/);
 d.phase='victory';
 const report=claimExpeditionRewards(d,settlement);
 assert.deepEqual(report,summary);
 assert.deepEqual(settlement,{gold:300,crests:2,deeds:1,trinkets:['ward-charm']});
 assert.throws(()=>claimExpeditionRewards(d,settlement),/already been claimed/);
 assert.deepEqual(settlement,{gold:300,crests:2,deeds:1,trinkets:['ward-charm']});
});
test('unclaimed reward and discarded treasure never transfer to settlement',()=>{
 const d=createDungeon(407,{interactiveEvents:true});
 offerLoot(d,'gold',50);collectLoot(d);
 offerLoot(d,'gem',1);collectLoot(d);
 discardInventoryStack(d,'treasure:1');
 offerLoot(d,'crest',3);
 d.phase='victory';
 const settlement=createSettlement();
 assert.throws(()=>claimExpeditionRewards(d,settlement),/Resolve pending loot/);
 leaveLoot(d);
 claimExpeditionRewards(d,settlement);
 assert.equal(settlement.gold,50);
 assert.equal(settlement.crests,0);
});
