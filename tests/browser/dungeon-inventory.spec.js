import {test,expect} from '@playwright/test';
test('expedition screen displays provision stacks and discard actions',async ({page})=>{
 await page.goto('/dungeon.html');
 await expect(page.locator('#dungeon-inventory')).toContainText('Inventory: 3/16');
 await expect(page.locator('#dungeon-inventory')).toContainText('Food ×8');
 await expect(page.locator('#dungeon-inventory')).toContainText('Holy Water ×1');
 await page.locator('#dungeon-inventory').getByRole('button',{name:'Discard'}).first().click();
 await expect(page.locator('#dungeon-inventory')).toContainText('Inventory: 2/16');
 await expect(page.locator('#dungeon-supplies')).toContainText('Food: 0');
});
test('browser inventory merges gold up to DD1 stack limit',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon}=await import('./src/dungeon.js');
  const {offerLoot,collectLoot,inventoryUsed,discardInventoryStack}=await import('./src/inventory.js');
  const d=createDungeon(500,{interactiveEvents:true});
  offerLoot(d,'gold',1300);collectLoot(d);
  offerLoot(d,'gold',100);collectLoot(d);
  const merged=inventoryUsed(d);
  offerLoot(d,'gold',400);collectLoot(d);
  return {merged,slots:inventoryUsed(d),gold:d.loot,pending:d.pendingLoot};
 });
 expect(result).toEqual({merged:4,slots:5,gold:1800,pending:null});
});
test('curio loot is pending in interactive mode and cannot be farmed',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon,interactCurio}=await import('./src/dungeon.js');
  const {collectLoot,inventoryUsed}=await import('./src/inventory.js');
  const d=createDungeon(501,{interactiveEvents:true});
  d.room='gallery';interactCurio(d,'purify');
  const offered=d.pendingLoot?.quantity;
  collectLoot(d);
  let repeat=false;
  try{interactCurio(d,'purify')}catch{repeat=true}
  return {offered,gold:d.loot,slots:inventoryUsed(d),repeat};
 });
 expect(result).toEqual({offered:175,gold:175,slots:4,repeat:true});
});
