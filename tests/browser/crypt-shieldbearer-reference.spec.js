import {test,expect} from '@playwright/test';

test('Shieldwall Volley demo contains two shieldbearers and two arbalists',async ({page})=>{
 await page.goto('/');
 await page.locator('#shieldwall-volley-demo').click();
 await expect(page.locator('#enemy .unit')).toHaveCount(4);
 await expect(page.locator('#enemy .unit').filter({hasText:'Crypt Shieldbearer'})).toHaveCount(2);
 await expect(page.locator('#enemy .unit').filter({hasText:'Crypt Arbalist'})).toHaveCount(2);
});

test('Apprentice Defender rear fallback and first-turn choice run in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,ABILITIES,availableTargets,rank,takeTurn}=await import('./src/engine.js');
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const {moveWithinFormation}=await import('./src/formation.js');
  const b=makeUndeadEncounter(122,'shieldwallVolley'),d=b.units.find(u=>u.id==='e1');
  const choose=roll=>chooseEnemyAction(b,'e1',d.enemySkills,()=>roll,ABILITIES,availableTargets).key;
  const front=[choose(.79),choose(.81)];
  moveWithinFormation(b,'e1',3);
  const rear=choose(.99);
  b.queue=['e1'];
  takeTurn(b,'e1','boneguard_clumsy','h1',()=>.99);
  return {front,rear,afterRank:rank(b,'e1')};
 });
 expect(result).toEqual({front:['boneguard_axe','boneguard_weight'],rear:'boneguard_clumsy',afterRank:2});
});
