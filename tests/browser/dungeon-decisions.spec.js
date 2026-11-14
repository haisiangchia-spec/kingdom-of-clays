import {test,expect} from '@playwright/test';

test('expedition UI exposes scouting and a one-time curio decision after reaching gallery',async ({page})=>{
 await page.goto('/dungeon.html');
 await expect(page.getByRole('button',{name:'Scout Ashen Gallery'})).toBeVisible();
 await page.getByRole('button',{name:'Scout Ashen Gallery'}).click();
 await expect(page.getByText(/Scouted entrance-gallery:/)).toBeVisible();
 await expect(page.getByRole('button',{name:'Scout Ashen Gallery'})).toHaveCount(0);
 await expect(page.locator('#dungeon-status')).toContainText('Torch 73');
});

test('expedition hunger controls offer eating or risking HP and stress',async ({page})=>{
 await page.goto('/dungeon.html');
 const state=await page.evaluate(async ()=>{
  const {createDungeon,beginCorridor,advanceCorridor,resolveHunger}=await import('./src/dungeon.js');
  const d=createDungeon(177,{interactiveEvents:true});
  d.room='watch';d.stepsTaken=4;
  beginCorridor(d,'gallery');
  advanceCorridor(d);
  const pending=d.pendingHunger;
  const before=d.party[0].hp;
  resolveHunger(d,'skip');
  advanceCorridor(d);
  return {pending,remaining:d.pendingHunger,hpLoss:before-d.party[0].hp,stress:d.party[0].stress,progress:d.pendingTravel?.progress};
 });
 expect(state).toEqual({pending:true,remaining:false,hpLoss:3,stress:15,progress:1});
});

test('scouted sanctuary trap can be disarmed and not reactivated',async ({page})=>{
 await page.goto('/dungeon.html');
 const result=await page.evaluate(async ()=>{
  const {createDungeon,scoutCorridor,beginCorridor,disarmTrap,advanceCorridor}=await import('./src/dungeon.js');
  let d;
  for(let seed=1;seed<1000;seed++){
   const candidate=createDungeon(seed);
   candidate.room='watch';candidate.torch=0;
   if(scoutCorridor(candidate,'sanctum').trapRevealed){d=candidate;break;}
  }
  if(!d)return null;
  beginCorridor(d,'sanctum');
  const success=disarmTrap(d,'h1');
  const hero=d.party[0],before=hero.hp;
  advanceCorridor(d);
  return {success,checked:d.corridors['watch-sanctum'].hazardChecked,damageAgain:before-hero.hp};
 });
 expect(result).not.toBeNull();
 expect(result.checked).toBe(true);
 expect(result.damageAgain).toBe(0);
});

test('curio offering has provision-dependent safe reward and is not farmable',async ({page})=>{
 await page.goto('/dungeon.html');
 const outcome=await page.evaluate(async ()=>{
  const {createDungeon,interactCurio}=await import('./src/dungeon.js');
  const d=createDungeon(180);
  d.room='gallery';
  interactCurio(d,'purify');
  let rejected=false;
  try{interactCurio(d,'purify');}catch{rejected=true;}
  return {loot:d.loot,water:d.curioSupplies.holyWater,used:d.curiosUsed,rejected};
 });
 expect(outcome).toEqual({loot:175,water:0,used:['gallery'],rejected:true});
});
