import {test,expect} from '@playwright/test';

test('Crypt Volley opens with four enemies including two source-checked Crypt Arbalists',async ({page})=>{
 await page.goto('/');
 await page.locator('#crypt-volley-demo').click();
 await expect(page.locator('#enemy .unit')).toHaveCount(4);
 await expect(page.locator('#enemy .unit').filter({hasText:'Crypt Arbalist'})).toHaveCount(2);
});
test('Crypt Arbalist ranged and melee behaviours follow Bone Arbalist rules in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,availableTargets,takeTurn,rank}=await import('./src/engine.js');
  const {moveWithinFormation}=await import('./src/formation.js');
  const b=makeUndeadEncounter(113,'cryptVolley'),h2=b.units.find(u=>u.id==='h2');
  const ranged=availableTargets(b,'e3','crypt_quarrel');
  const hp=h2.hp;
  h2.marked=2;b.queue=['e3'];
  takeTurn(b,'e3','crypt_quarrel','h2',()=>.5);
  const markedDamage=hp-h2.hp;
  const a=b.units.find(u=>u.id==='e4');
  moveWithinFormation(b,a.id,-3);
  const firstRank=rank(b,a.id);
  const melee=availableTargets(b,a.id,'crypt_bayonet');
  const blocked=availableTargets(b,a.id,'crypt_quarrel');
  b.queue=[a.id];
  takeTurn(b,a.id,'crypt_bayonet','h1',()=>.99);
  return {ranged,markedDamage,firstRank,melee,blocked,afterRank:rank(b,a.id)};
 });
 expect(result).toEqual({ranged:['h2','h3','h4'],markedDamage:6,firstRank:0,melee:['h1','h2'],blocked:[],afterRank:1});
});
