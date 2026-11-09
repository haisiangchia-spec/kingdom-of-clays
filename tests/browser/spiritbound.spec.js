import {test,expect} from '@playwright/test';

test('Spiritbound laboratory displays four heroes and human form',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Spiritbound Transformation'}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 await expect(page.locator('#hero .unit').filter({hasText:'Spiritbound'})).toContainText('HUMAN FORM');
 expect(errors).toEqual([]);
});
test('transform is free and exposes three beast skills but hides human skills',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeSpiritboundBattle,takeTurn,availableTargets}=await import('./src/engine.js');
  const b=makeSpiritboundBattle(),a=b.units.find(x=>x.id==='h2');
  b.queue=['h2'];takeTurn(b,'h2','spirit_awakening','h2',()=>.3);
  const afterTransform={
    form:a.form,queue:b.queue[0],stressed:b.units.filter(u=>u.side==='hero'&&u.id!=='h2').every(u=>u.stress===8),
    human:availableTargets(b,'h2','spirit_chains').length,
    beast:availableTargets(b,'h2','spirit_claw').length
  };
  takeTurn(b,'h2','primal_fury','e2',()=>.3);
  return {...afterTransform,acted:a.acted,queueAfter:b.queue.length};
 });
 expect(result).toEqual({form:'beast',queue:'h2',stressed:true,human:0,beast:1,acted:true,queueAfter:0});
});
test('second transform only on subsequent turn and reverts to human',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeSpiritboundBattle,takeTurn,availableTargets,beginTurn}=await import('./src/engine.js');
  const b=makeSpiritboundBattle(),a=b.units.find(x=>x.id==='h2');
  b.queue=['h2'];takeTurn(b,'h2','spirit_awakening','h2',()=>.3);
  const cannotImmediatelyRevert=availableTargets(b,'h2','spirit_awakening').length===0;
  takeTurn(b,'h2','primal_fury','e2',()=>.3);
  a.acted=false;b.queue=['h2'];beginTurn(b,'h2',()=>.3);
  takeTurn(b,'h2','spirit_awakening','h2',()=>.3);
  return {cannotImmediatelyRevert,form:a.form,turnFree:b.queue[0],uses:a.transformsUsed,
    humanCanHeal:availableTargets(b,'h2','spiritual_purification').length>0,
    noMoreTransforms:availableTargets(b,'h2','spirit_awakening').length===0};
 });
 expect(result).toEqual({cannotImmediatelyRevert:true,form:'human',turnFree:'h2',uses:2,humanCanHeal:true,noMoreTransforms:true});
});
test('complete level-one skill catalog contains 105 mapped abilities',async ({page})=>{
 await page.goto('/');
 const r=await page.evaluate(async ()=>{
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  return {total:SKILL_CATALOG.length,integrated:SKILL_CATALOG.filter(s=>s.mechanics==='level1-integrated').length,
    spirit:SKILL_CATALOG.filter(s=>s.classId==='spiritbound').length};
 });
 expect(r).toEqual({total:105,integrated:105,spirit:7});
});
