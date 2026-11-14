import {test,expect} from '@playwright/test';

test('marked hero attracts swordsman and resistance-aware arrow targets vulnerable hero',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {chooseEnemyAction}=await import('./src/enemy-ai.js');
  const {makeBattle,ABILITIES,availableTargets}=await import('./src/engine.js');
  const b=makeBattle(65);
  const sword=()=>chooseEnemyAction(b,'e1',['skeleton_cleaver'],()=>.4,ABILITIES,availableTargets);
  const unmarked=sword();
  b.units.find(u=>u.id==='h2').marked=2;
  const marked=sword();
  for(const id of ['h2','h3','h4'])b.units.find(u=>u.id===id).resist.debuff=100;
  const arrow=()=>chooseEnemyAction(b,'e3',['skeleton_pin_arrow'],()=>.55,ABILITIES,availableTargets);
  const resistant=arrow();
  b.units.find(u=>u.id==='h4').resist.debuff=0;
  const vulnerable=arrow();
  return {unmarked,marked,resistant,vulnerable};
 });
 expect(result).toEqual({
  unmarked:{key:'skeleton_cleaver',targetId:'h1'},
  marked:{key:'skeleton_cleaver',targetId:'h2'},
  resistant:{key:'skeleton_pin_arrow',targetId:'h3'},
  vulnerable:{key:'skeleton_pin_arrow',targetId:'h4'}
 });
});
