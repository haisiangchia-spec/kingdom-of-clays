import {test,expect} from '@playwright/test';

test('Beastmaster Bard Cursed Champion level-five laboratory contains 21 upgraded skills',async ({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 await page.getByRole('button',{name:'Champion / Beastmaster / Bard Lv5',exact:true}).click();
 await expect(page.locator('#hero .unit')).toHaveCount(4);
 const result=await page.evaluate(async()=>{
  const {makeFourthProgressionBattle,getActorSkill}=await import('./src/engine.js');
  const {SKILL_CATALOG}=await import('./src/skill-catalog.js');
  const b=makeFourthProgressionBattle(),h=b.units.filter(u=>u.side==='hero');
  return {
   upgraded:h.reduce((total,u)=>total+Object.keys(u.skillLevels).length,0),
   verified:SKILL_CATALOG.filter(x=>x.verifiedLevels.length===5).length,
   noPriestUpgrades:Object.keys(h.find(u=>u.id==='h4').skillLevels).length===0,
   wolfBleed:getActorSkill(h.find(u=>u.id==='h2'),'pack_harassment').status.value,
   bardFinale:getActorSkill(h.find(u=>u.id==='h3'),'grand_finale').acc,
   championProtection:getActorSkill(h.find(u=>u.id==='h1'),'unyielding_body').buff.modifiers.prot
  };
 });
 expect(result).toEqual({upgraded:21,verified:105,noPriestUpgrades:true,wolfBleed:3,bardFinale:160,championProtection:30});
 expect(errors).toEqual([]);
});
test('level-five Leper self-heals and then benefits from Revenge',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeFourthProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeFourthProgressionBattle(),h=b.units.find(u=>u.id==='h1');
  h.hp=8;h.stress=20;b.queue=['h1'];
  takeTurn(b,'h1','warriors_meditation','h1',()=>.3);
  const healed={hp:h.hp,stress:h.stress};h.acted=false;b.queue=['h1'];
  takeTurn(b,'h1','cursed_strength','h1',()=>.3);
  return {healed,damage:effectModifier(h,'damage'),crit:effectModifier(h,'crit'),taken:effectModifier(h,'damageTaken')};
 });
 expect(result).toEqual({healed:{hp:18,stress:13},damage:35,crit:11,taken:25});
});
test('level-five Hound Rush and Jester Solo scale status and Finale stack',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {makeFourthProgressionBattle,takeTurn}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeFourthProgressionBattle(),bard=b.units.find(u=>u.id==='h3'),target=b.units.find(u=>u.id==='e1');
  b.queue=['h2'];takeTurn(b,'h2','wolfs_assault','e1',()=>.2);
  const bleed=target.dot.find(d=>d.type==='bleed')?.value;
  b.queue=['h3'];takeTurn(b,'h3','heroic_solo','e1',()=>.3);
  return {bleed,bardDodge:effectModifier(bard,'dodge'),finaleDamage:effectModifier(bard,'finaleDamage')};
 });
 expect(result).toEqual({bleed:2,bardDodge:30,finaleDamage:75});
});
