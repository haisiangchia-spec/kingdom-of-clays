import {test,expect} from '@playwright/test';

test('Goblin Emperor acts twice but processes bleed once in a browser turn',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeLargeMonsterBattle,prepareActorTurn,takeTurn,currentActor}=await import('./src/engine.js');
  const b=makeLargeMonsterBattle(17),boss=b.units.find(u=>u.id==='boss');
  b.queue=['boss','boss','h1'];
  boss.hp=50;boss.dot=[{type:'bleed',value:2,turns:2}];boss.marked=2;
  const first=prepareActorTurn(b,'boss',()=>.5);
  takeTurn(b,'boss','emperor_roar','h1',()=>.5);
  const middle={next:currentActor(b)?.id,hp:boss.hp,dotTurns:boss.dot[0].turns,marked:boss.marked,acted:boss.acted};
  const second=prepareActorTurn(b,'boss',()=>.5);
  takeTurn(b,'boss','emperor_roar','h1',()=>.5);
  return {first,second,middle,after:{next:currentActor(b)?.id,hp:boss.hp,dotTurns:boss.dot[0].turns,marked:boss.marked,acted:boss.acted}};
 });
 expect(result).toEqual({
  first:'ready',second:'ready',
  middle:{next:'boss',hp:48,dotTurns:1,marked:2,acted:false},
  after:{next:'h1',hp:48,dotTurns:1,marked:1,acted:true}
 });
});
