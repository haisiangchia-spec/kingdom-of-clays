import {test,expect} from '@playwright/test';
test('dungeon screen displays provisions and allows lighting a torch',async ({page})=>{
 await page.goto('/dungeon.html');
 await expect(page.locator('#dungeon-supplies')).toContainText('Torches: 3');
 await expect(page.locator('#dungeon-status')).toContainText('radiant');
 const button=page.getByRole('button',{name:'Light torch (+25)'});
 await expect(button).toBeEnabled();
 await button.click();
 await expect(page.locator('#dungeon-supplies')).toContainText('Torches: 2');
 await expect(button).toBeDisabled();
});
test('food controls heal only wounded heroes; travel encounter locks supplies',async ({page})=>{
 await page.goto('/dungeon.html');
 await expect(page.locator('#dungeon-supplies')).toContainText('Food: 8');
 await expect(page.getByRole('button',{name:'Feed Swordsman (+2 HP)'})).toBeDisabled();
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 await expect(page.getByRole('button',{name:'Light torch (+25)'})).toHaveCount(0);
});
test('seeded trap and provision rules operate in the browser engine',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon,useProvision,beginCorridor,advanceCorridor,torchBand}=await import('./src/dungeon.js');
  const d=createDungeon(95),u=d.party[0];
  u.hp-=4;useProvision(d,'food',u.id);
  const healed=u.hp,food=d.supplies.food;
  d.torch=30;useProvision(d,'torch');
  const light=d.torch,band=torchBand(light);
  d.room='watch';d.visited.push('watch');
  beginCorridor(d,'sanctum');advanceCorridor(d);
  const first=structuredClone(d.party);
  d.pendingTravel=null;d.phase='explore';d.room='watch';
  beginCorridor(d,'sanctum');advanceCorridor(d);
  return {healed,food,light,band,checked:d.corridors['watch-sanctum'].hazardChecked,
    repeatSafe:JSON.stringify(first)===JSON.stringify(d.party)};
 });
 expect(result).toMatchObject({healed:31,food:7,light:55,band:'dim',checked:true,repeatSafe:true});
});
