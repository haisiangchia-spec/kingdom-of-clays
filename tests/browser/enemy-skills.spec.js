import {test,expect} from '@playwright/test';

test('monster-specific undead abilities resolve status and legal ranks in Chromium',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
   const {makeBattle,makeLargeMonsterBattle,availableTargets,takeTurn}=await import('./src/engine.js');
   const {ENCOUNTER_SKILLS}=await import('./src/enemy-skills.js');
   const b=makeBattle(31),target=b.units.find(u=>u.id==='h3');
   target.resist.blight=0;
   b.queue=['e4'];
   takeTurn(b,'e4','court_blight','h3',()=>.2);
   const boss=makeLargeMonsterBattle(31);
   return {blight:target.dot,archerTargets:availableTargets(b,'e3','skeleton_bone_arrow'),bossSkills:ENCOUNTER_SKILLS.boss,bossLegal:ENCOUNTER_SKILLS.boss.every(k=>availableTargets(boss,'boss',k).length>0)};
 });
 expect(result.blight).toEqual([{type:'blight',value:2,turns:3}]);
 expect(result.archerTargets).toEqual(['h2','h3','h4']);
 expect(result.bossSkills).toEqual(['emperor_slam','emperor_roar']);
 expect(result.bossLegal).toBe(true);
});
