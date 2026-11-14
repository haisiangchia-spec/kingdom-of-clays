import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,interactCurio,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle} from '../src/dungeon.js';
import {INVENTORY_CAPACITY,inventoryStacks,inventoryUsed,inventoryCanAdd,offerLoot,collectLoot,leaveLoot,discardInventoryStack} from '../src/inventory.js';

test('inventory presents existing provision stacks without duplicating supply counters',()=>{
 const d=createDungeon(301);
 assert.equal(INVENTORY_CAPACITY,8);
 assert.deepEqual(inventoryStacks(d).map(x=>[x.kind,x.quantity]),[
  ['food',4],['food',4],['torch',2],['torch',1],['holyWater',1]
 ]);
 assert.equal(inventoryUsed(d),5);
 assert.equal(d.supplies.food,8);
 assert.equal(d.curioSupplies.holyWater,1);
});
test('curio rewards queue as collectible gold in interactive expeditions',()=>{
 const d=createDungeon(302,{interactiveEvents:true});
 d.room='gallery';
 interactCurio(d,'purify');
 assert.equal(d.pendingLoot.quantity,175);
 assert.equal(d.loot,0);
 assert.equal(d.curioSupplies.holyWater,0);
 assert.throws(()=>beginCorridor(d,'vault'),/blocked/);
 collectLoot(d);
 assert.equal(d.pendingLoot,null);
 assert.equal(d.loot,175);
 assert.deepEqual(d.inventory,[{kind:'gold',quantity:100},{kind:'gold',quantity:75}]);
 assert.equal(inventoryUsed(d),6); // 2 food, 2 torches, 0 water, 2 gold
});
test('full capacity rejects atomic collection until a stack is discarded',()=>{
 const d=createDungeon(303,{interactiveEvents:true});
 offerLoot(d,'gold',300);
 assert.equal(inventoryCanAdd(d,'gold',300),true);
 collectLoot(d); // 5 supplies + 3 gold slots = 8
 assert.equal(inventoryUsed(d),8);
 offerLoot(d,'gold',100);
 assert.equal(inventoryCanAdd(d,'gold',100),false);
 assert.throws(()=>collectLoot(d),/Inventory full/);
 assert.equal(d.loot,300);
 assert.equal(d.pendingLoot.quantity,100);
 discardInventoryStack(d,'food:0');
 assert.equal(d.supplies.food,4);
 assert.equal(inventoryUsed(d),7);
 collectLoot(d);
 assert.equal(d.loot,400);
 assert.equal(inventoryUsed(d),8);
});
test('gold partial stacks merge before consuming new slots and discard reduces recorded gold',()=>{
 const d=createDungeon(304);
 offerLoot(d,'gold',175);collectLoot(d);
 offerLoot(d,'gold',25);collectLoot(d);
 assert.deepEqual(d.inventory,[{kind:'gold',quantity:100},{kind:'gold',quantity:100}]);
 assert.equal(inventoryUsed(d),7);
 discardInventoryStack(d,'treasure:0');
 assert.equal(d.loot,100);
 assert.deepEqual(d.inventory,[{kind:'gold',quantity:100}]);
 assert.throws(()=>discardInventoryStack(d,'treasure:8'),/not found/);
});
test('leaving loot does not change existing inventory or resource counts',()=>{
 const d=createDungeon(305,{interactiveEvents:true});
 const before=structuredClone(d);
 offerLoot(d,'gold',175);
 leaveLoot(d);
 assert.equal(d.pendingLoot,null);
 assert.deepEqual(d.inventory,before.inventory);
 assert.deepEqual(d.supplies,before.supplies);
 assert.equal(d.loot,0);
 assert.throws(()=>leaveLoot(d),/No pending loot/);
});
test('inventory discards named provision stacks and never underflows',()=>{
 const d=createDungeon(306);
 discardInventoryStack(d,'torch:1');
 assert.equal(d.supplies.torch,2);
 discardInventoryStack(d,'holyWater:0');
 assert.equal(d.curioSupplies.holyWater,0);
 assert.equal(inventoryUsed(d),3);
 assert.throws(()=>discardInventoryStack(d,'holyWater:0'),/not found/);
 assert.throws(()=>offerLoot(d,'torch',1),/Invalid loot/);
 assert.throws(()=>offerLoot(d,'gold',0),/Invalid loot/);
});
test('combat grants a queued gold reward that must be resolved before travel',()=>{
 const d=createDungeon(307,{interactiveEvents:true});
 beginCorridor(d,'gallery');advanceCorridor(d);
 const b=dungeonBattle(d);
 for(const unit of b.units.filter(x=>x.side==='enemy'))unit.dead=true;
 resolveDungeonBattle(d);
 assert.equal(d.phase,'explore');
 assert.deepEqual(d.pendingLoot,{kind:'gold',quantity:50});
 assert.throws(()=>advanceCorridor(d),/Resolve loot/);
 collectLoot(d);
 advanceCorridor(d);
 assert.equal(d.room,'gallery');
});
test('combat prevents discarding inventory stacks',()=>{
 const d=createDungeon(308);
 beginCorridor(d,'gallery');advanceCorridor(d);
 assert.throws(()=>discardInventoryStack(d,'food:0'),/during combat/);
});
