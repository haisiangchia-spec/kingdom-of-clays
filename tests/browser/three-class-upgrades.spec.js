import {test,expect} from '@playwright/test';

test('21 verified level-five skill tracks appear in progression combat laboratory',async ({page})=>{
 await page.goto('/');
 await page.getByRole('button',{name:'Verified Lv5 Skills'}).click();
 const result=await page.evaluate(async ()=>{
   const {makeProgressionBattle,getActorSkill}=await import('./src/engine.js');
   const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
   const b=makeProgressionBattle(),heroes=b.units.filter(u=>u.side==='hero');
   return {
     upgraded:heroes.reduce((total,h)=>total+Object.keys(h.skillLevels).length,0),
     catalog:SKILL_CATALOG.filter(x=>x.verifiedLevels.length===5).length,
     warriorHeal:getActorSkill(heroes.find(x=>x.classId==='warrior'),'warrior_recovery').min,
     priestReveal:getActorSkill(heroes.find(x=>x.classId==='priest'),'revealing_light').debuff.modifiers.dodge,
     swordsmanRiposte:getActorSkill(heroes.find(x=>x.classId==='swordsman'),'riposte_stance').riposteCrit
   };
 });
 expect(result).toEqual({upgraded:21,catalog:105,warriorHeal:5,priestReveal:-30,swordsmanRiposte:4});
});
test('level-five Retribution activates bonus riposte critical chance',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,setActorSkillLevel,takeTurn}=await import('./src/engine.js');
  const b=makeBattle(),h=b.units.find(x=>x.id==='h1');
  setActorSkillLevel(b,'h1','riposte_stance',5);
  b.queue=['h1'];takeTurn(b,'h1','riposte_stance','e1',()=>.3);
  return {crit:h.riposteCrit,damageModifier:h.riposteMod,baseAttackCrit:h.crit};
 });
 expect(result.crit).toBe(4);
 expect(result.damageModifier).toBeCloseTo(-.2);
 expect(result.baseAttackCrit).toBe(0);
});
test('level-five Illumination gains light and debuffs dodge without dealing critical hits',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeBattle,setActorSkillLevel,takeTurn,getActorSkill}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeBattle(),priest=b.units.find(x=>x.id==='h4');
  priest.crit=100;
  b.units=[b.units[0],b.units[1],priest,b.units[2],...b.units.filter(x=>x.side==='enemy')];
  setActorSkillLevel(b,'h4','revealing_light',5);
  b.queue=['h4'];takeTurn(b,'h4','revealing_light','e1',()=>.3);
  const foe=b.units.find(x=>x.id==='e1');
  return {torch:b.torch,dodge:effectModifier(foe,'dodge'),
    neverCrit:getActorSkill(priest,'revealing_light').neverCrit};
 });
 expect(result).toEqual({torch:85,dodge:-30,neverCrit:true});
});
