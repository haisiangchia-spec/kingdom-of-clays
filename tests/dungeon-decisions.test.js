import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,scoutCorridor,beginCorridor,advanceCorridor,disarmTrap,resolveHunger,interactCurio,dungeonBattle,resolveDungeonBattle} from '../src/dungeon.js';

function clearCombat(d){
 const b=dungeonBattle(d);
 if(!b)return;
 for(const e of b.units.filter(u=>u.side==='enemy'))e.dead=true;
 resolveDungeonBattle(d);
}
function travel(d,to){
 beginCorridor(d,to);
 for(let i=0;d.pendingTravel&&i<6;i++){
  advanceCorridor(d);
  if(d.pendingHunger)resolveHunger(d,'eat');
  clearCombat(d);
 }
 clearCombat(d);
 assert.equal(d.room,to);
}
test('scouting reveals a deterministic corridor encounter before entering and cannot be spammed',()=>{
 const a=createDungeon(150),b=createDungeon(150);
 const first=scoutCorridor(a,'gallery'),second=scoutCorridor(b,'gallery');
 assert.equal(first.encounterRevealed,true);
 assert.deepEqual(first,second);
 assert.equal(a.torch,73);
 assert.throws(()=>scoutCorridor(a,'gallery'),/already scouted/);
 assert.throws(()=>scoutCorridor(a,'sanctum'),/not adjacent/);
 beginCorridor(a,'gallery');advanceCorridor(a);
 assert.equal(a.phase,'combat');
 assert.throws(()=>scoutCorridor(a,'gallery'),/free room/);
});
test('revealed hazards can be disarmed before advancing and never reroll',()=>{
 let found=null;
 for(let seed=1;seed<=1000;seed++){
  const d=createDungeon(seed);d.room='watch';d.visited.push('watch');d.torch=0;
  const scout=scoutCorridor(d,'sanctum');
  if(scout.trapRevealed){found=d;break;}
 }
 assert.ok(found,'some seeds should reveal a trap');
 beginCorridor(found,'sanctum');
 assert.throws(()=>disarmTrap(found,'missing'),/living hero/);
 const result=disarmTrap(found,'h1');
 assert.equal(typeof result,'boolean');
 assert.equal(found.corridors['watch-sanctum'].hazardChecked,true);
 assert.equal(found.corridors['watch-sanctum'].trapRevealed,false);
 assert.throws(()=>disarmTrap(found,'h1'),/No revealed trap/);
 const hero=found.party[0],hp=hero.hp;
 advanceCorridor(found);
 assert.equal(hero.hp,hp,'trap may not trigger a second time');
});
test('interactive hunger pauses traversal, consuming four food or causing HP and stress losses',()=>{
 const d=createDungeon(151,{interactiveEvents:true});
 travel(d,'gallery');
 travel(d,'watch');
 beginCorridor(d,'gallery');
 // 4 corridor steps complete; hunger triggers before fifth.
 advanceCorridor(d);
 assert.equal(d.pendingHunger,true);
 assert.equal(d.pendingTravel.progress,0);
 assert.throws(()=>advanceCorridor(d),/Resolve hunger/);
 assert.throws(()=>resolveHunger(d,'wrong'),/eat or skip/);
 resolveHunger(d,'eat');
 assert.equal(d.supplies.food,4);
 advanceCorridor(d);
 assert.equal(d.pendingTravel.progress,1);
 clearCombat(d);
 // Hunger does not reappear on step six.
 advanceCorridor(d);
 assert.equal(d.pendingHunger,false);
 const skip=createDungeon(152,{interactiveEvents:true});
 skip.room='watch';skip.stepsTaken=4;
 beginCorridor(skip,'gallery');advanceCorridor(skip);
 assert.equal(skip.pendingHunger,true);
 const hero=skip.party[0],hp=hero.hp;
 resolveHunger(skip,'skip');
 assert.equal(hero.hp,hp-3);
 assert.equal(hero.stress,15);
 assert.equal(skip.supplies.food,8);
});
test('insufficient food blocks a hunger meal without consuming supplies',()=>{
 const d=createDungeon(153,{interactiveEvents:true});
 d.room='watch';d.stepsTaken=4;d.supplies.food=3;
 beginCorridor(d,'gallery');advanceCorridor(d);
 assert.throws(()=>resolveHunger(d,'eat'),/Four food required/);
 assert.equal(d.pendingHunger,true);
 assert.equal(d.supplies.food,3);
 resolveHunger(d,'skip');
 assert.equal(d.pendingHunger,false);
});
test('curios offer permanent leave, risk, and provision-protected interactions',()=>{
 const d=createDungeon(154);
 d.room='gallery';
 interactCurio(d,'purify');
 assert.equal(d.loot,175);
 assert.equal(d.curioSupplies.holyWater,0);
 assert.deepEqual(d.curiosUsed,['gallery']);
 assert.throws(()=>interactCurio(d,'touch'),/No untouched curio/);
 d.room='vault';
 assert.throws(()=>interactCurio(d,'purify'),/No holy water/);
 assert.ok(!d.curiosUsed.includes('vault'));
 interactCurio(d,'touch');
 assert.ok(d.loot===175||d.loot===275);
 assert.equal(d.curiosUsed.includes('vault'),true);
 const abandon=createDungeon(155);abandon.room='gallery';
 interactCurio(abandon,'leave');
 assert.equal(abandon.loot,0);
 assert.equal(abandon.curioSupplies.holyWater,1);
});
test('curio and hunger interaction cannot bypass combat or travel restrictions',()=>{
 const d=createDungeon(156,{interactiveEvents:true});
 assert.throws(()=>interactCurio(d,'purify'),/No untouched curio/);
 beginCorridor(d,'gallery');
 assert.throws(()=>interactCurio(d,'touch'),/Cannot inspect/);
 advanceCorridor(d);
 assert.throws(()=>resolveHunger(d,'eat'),/No hunger/);
 assert.throws(()=>interactCurio(d,'touch'),/Cannot inspect/);
});
