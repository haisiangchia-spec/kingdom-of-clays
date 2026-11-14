import {test,expect} from '@playwright/test';
test('expedition screen displays provision stacks and discard actions',async ({page})=>{
 await page.goto('/dungeon.html');
 await expect(page.locator('#dungeon-inventory')).toContainText('Inventory: 5/8');
 await expect(page.locator('#dungeon-inventory')).toContainText('Food ×4');
 await expect(page.locator('#dungeon-inventory')).toContainText('Holy Water ×1');
 await page.locator('#dungeon-inventory').getByRole('button',{name:'Discard'}).first().click();
 await expect(page.locator('#dungeon-inventory')).toContainText('Inventory: 4/8');
 await expect(page.locator('#dungeon-supplies')).toContainText('Food: 4');
});
test('browser inventory enforces capacity and allows discarding to claim gold',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon}=await import('./src/dungeon.js');
  const {offerLoot,collectLoot,inventoryUsed,discardInventoryStack}=await import('./src/inventory.js');
  const d=createDungeon(500,{interactiveEvents:true});
  offerLoot(d,'gold',300);collectLoot(d);
  offerLoot(d,'gold',100);
  let refused=false;
  try{collectLoot(d)}catch(e){refused=/Inventory full/.test(e.message)}
  discardInventoryStack(d,'torch:1');
  collectLoot(d);
  return {refused,slots:inventoryUsed(d),gold:d.loot,torches:d.supplies.torch,pending:d.pendingLoot};
 });
 expect(result).toEqual({refused:true,slots:8,gold:400,torches:2,pending:null});
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
 expect(result).toEqual({offered:175,gold:175,slots:6,repeat:true});
});
