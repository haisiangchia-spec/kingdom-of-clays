import {test,expect} from '@playwright/test';

test('Dungeon Expedition link opens a seeded connected-room exploration screen',async ({page})=>{
 await page.goto('/');
 await page.getByRole('link',{name:/Enter Dungeon Expedition/}).click();
 await expect(page).toHaveURL(/dungeon\.html/);
 await expect(page.locator('#dungeon-status')).toContainText('Crypt Entrance');
 await expect(page.locator('#dungeon-party .dungeon-unit')).toHaveCount(4);
 await expect(page.getByRole('button',{name:'Travel to Ashen Gallery'})).toBeVisible();
 await page.getByRole('button',{name:'Travel to Ashen Gallery'}).click();
 await expect(page.getByRole('button',{name:'Advance corridor'})).toBeVisible();
 await page.getByRole('button',{name:'Advance corridor'}).click();
 await expect(page.locator('#dungeon-status')).toContainText('COMBAT');
 await expect(page.locator('#dungeon-panel-title')).toHaveText('Combat');
 await expect(page.locator('#dungeon-combat')).toContainText('Enemies');
 await expect(page.getByRole('button',{name:'Travel to Ashen Gallery'})).toHaveCount(0);
});

test('browser-generated dungeon persists hero wounds after corridor victory',async ({page})=>{
 await page.goto('/dungeon.html');
 const data=await page.evaluate(async ()=>{
  const {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle}=await import('./src/dungeon.js');
  const d=createDungeon(333);
  beginCorridor(d,'gallery');advanceCorridor(d);
  const b=dungeonBattle(d);
  b.units.find(u=>u.id==='h1').hp=11;
  b.units.find(u=>u.id==='h1').stress=35;
  for(const foe of b.units.filter(u=>u.side==='enemy'))foe.dead=true;
  resolveDungeonBattle(d);
  advanceCorridor(d);
  beginCorridor(d,'vault');advanceCorridor(d);
  if(dungeonBattle(d)){
   for(const foe of dungeonBattle(d).units.filter(u=>u.side==='enemy'))foe.dead=true;
   resolveDungeonBattle(d);
  }
  if(d.pendingTravel)advanceCorridor(d);
  return {room:d.room,hp:d.party.find(u=>u.id==='h1').hp,stress:d.party.find(u=>u.id==='h1').stress,
   cleared:d.cleared.includes('vault'),party:dungeonBattle(d)?.units.find(u=>u.id==='h1')?.hp??null};
 });
 expect(data).toEqual({room:'vault',hp:11,stress:35,cleared:false,party:11});
});

test('dungeon can finish after clearing route and sanctum in Chromium',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle}=await import('./src/dungeon.js');
  const d=createDungeon(335);
  const clear=()=>{if(!dungeonBattle(d))return;
   for(const enemy of dungeonBattle(d).units.filter(u=>u.side==='enemy'))enemy.dead=true;
   resolveDungeonBattle(d);
  };
  for(const room of ['gallery','watch','sanctum']){
   beginCorridor(d,room);
   while(d.pendingTravel){
    advanceCorridor(d);clear();
   }
   clear();
  }
  return {room:d.room,phase:d.phase,cleared:d.cleared};
 });
 expect(result.room).toBe('sanctum');
 expect(result.phase).toBe('victory');
 expect(result.cleared).toEqual(['watch','sanctum']);
});
