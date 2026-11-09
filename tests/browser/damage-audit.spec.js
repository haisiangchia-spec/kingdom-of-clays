import {test,expect} from '@playwright/test';

test('zero-damage physical attack may kill at Death Door in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,takeTurn}=await import('./src/engine.js');
  const b=makeBattle(),hero=b.units.find(x=>x.id==='h1'),enemy=b.units.find(x=>x.id==='e1');
  hero.hp=0;hero.deathDoor=true;enemy.dmgMin=enemy.dmgMax=0;b.queue=['e1'];
  const rolls=[.1,.9,.9,.99];let i=0;
  takeTurn(b,'e1','enemy_strike','h1',()=>rolls[i++]??.99);
  return {dead:hero.dead,hp:hero.hp,deathBlow:b.log.some(s=>s.includes('Deathblow'))};
 });
 expect(result).toEqual({dead:true,hp:0,deathBlow:true});
});
test('critical damage and protection use identical numeric outcomes in browser',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {directDamage,deathBlowResistance}=await import('./src/dd1-math.js');
  return {
    crit:directDamage({minDamage:5,maxDamage:10,crit:true,prot:50},()=>.5),
    protected:directDamage({minDamage:10,maxDamage:10,prot:100},()=>.5),
    zero:directDamage({minDamage:0,maxDamage:0},()=>.5),
    deathResist:deathBlowResistance({deathResist:120})
  };
 });
 expect(result).toEqual({crit:8,protected:2,zero:0,deathResist:87});
});
