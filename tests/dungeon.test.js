import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,adjacentRooms,beginCorridor,advanceCorridor,resolveDungeonBattle,dungeonBattle,DUNGEON_ROOMS,DUNGEON_CORRIDORS} from '../src/dungeon.js';
import {status} from '../src/engine.js';

function win(dungeon){
 const b=dungeonBattle(dungeon);
 assert.ok(b,'expected live encounter');
 for(const foe of b.units.filter(u=>u.side==='enemy'))foe.dead=true;
 assert.equal(status(b),'victory');
 resolveDungeonBattle(dungeon);
}
function walk(dungeon,room){
 beginCorridor(dungeon,room);
 let guard=0;
 while(dungeon.pendingTravel&&guard++<5){
  advanceCorridor(dungeon);
  if(dungeon.phase==='combat')win(dungeon);
 }
 assert.equal(dungeon.room,room);
}
test('connected dungeon graph has valid bidirectional corridors and no orphaned rooms',()=>{
 assert.equal(Object.keys(DUNGEON_ROOMS).length,5);
 assert.equal(DUNGEON_CORRIDORS.length,5);
 for(const edge of DUNGEON_CORRIDORS){
  assert.ok(DUNGEON_ROOMS[edge.from]);assert.ok(DUNGEON_ROOMS[edge.to]);
  assert.notEqual(edge.from,edge.to);
  assert.equal(edge.steps,2);
 }
 const dungeon=createDungeon(44);
 assert.deepEqual(adjacentRooms(dungeon).map(x=>x.room),['gallery']);
 assert.throws(()=>beginCorridor(dungeon,'vault'),/not adjacent/);
});
test('corridor combat blocks travel and resumes same progress after victory',()=>{
 const d=createDungeon(45);
 beginCorridor(d,'gallery');
 assert.equal(d.pendingTravel.progress,0);
 advanceCorridor(d);
 assert.equal(d.phase,'combat');
 assert.equal(d.pendingTravel.progress,1);
 assert.equal(dungeonBattle(d).units.filter(u=>u.side==='hero').length,4);
 assert.throws(()=>advanceCorridor(d),/No traversable/);
 assert.throws(()=>beginCorridor(d,'gallery'),/blocked/);
 assert.throws(()=>resolveDungeonBattle(d),/not ended/);
 win(d);
 assert.equal(d.phase,'explore');
 assert.equal(d.pendingTravel.progress,1);
 advanceCorridor(d);
 assert.equal(d.room,'gallery');
 assert.equal(d.pendingTravel,null);
 assert.ok(d.visited.includes('gallery'));
 assert.equal(d.corridors['entrance-gallery'].encounterCleared,true);
});
test('persistent HP, stress, torch and dead heroes carry between battles',()=>{
 const d=createDungeon(46);
 beginCorridor(d,'gallery');advanceCorridor(d);
 const b=dungeonBattle(d),warrior=b.units.find(u=>u.id==='h2');
 warrior.hp=8;warrior.stress=91;b.torch=41;
 win(d);advanceCorridor(d);
 assert.equal(d.party.find(u=>u.id==='h2').hp,8);
 assert.equal(d.party.find(u=>u.id==='h2').stress,91);
 assert.equal(d.torch,40); // one additional corridor travel step
 beginCorridor(d,'watch');advanceCorridor(d);
 if(d.phase==='combat')win(d);
 if(d.pendingTravel)advanceCorridor(d);
 assert.equal(d.phase,'combat'); // Guard Post room battle
 assert.equal(dungeonBattle(d).units.find(u=>u.id==='h2').hp,8);
 assert.equal(dungeonBattle(d).units.find(u=>u.id==='h2').stress,91);
});
test('revisiting cleared rooms or corridors never respawns their cleared battles',()=>{
 const d=createDungeon(47);
 walk(d,'gallery');
 walk(d,'vault');
 assert.ok(d.cleared.includes('vault'));
 walk(d,'gallery');
 walk(d,'vault');
 assert.equal(d.phase,'explore');
 assert.equal(d.cleared.filter(x=>x==='vault').length,1);
 assert.equal(d.corridors['gallery-vault'].traversals,3);
});
test('clearing sanctum completes expedition and prevents further travel',()=>{
 const d=createDungeon(48);
 walk(d,'gallery');
 walk(d,'vault');
 walk(d,'sanctum');
 assert.equal(d.phase,'victory');
 assert.ok(d.cleared.includes('sanctum'));
 assert.throws(()=>beginCorridor(d,'vault'),/blocked/);
});
test('defeat ends expedition and retains surviving party state',()=>{
 const d=createDungeon(49);
 beginCorridor(d,'gallery');advanceCorridor(d);
 const b=dungeonBattle(d);
 for(const hero of b.units.filter(u=>u.side==='hero')){hero.hp=0;hero.dead=true;}
 assert.equal(status(b),'defeat');
 resolveDungeonBattle(d);
 assert.equal(d.phase,'defeat');
 assert.equal(d.party.filter(u=>u.dead).length,4);
 assert.throws(()=>beginCorridor(d,'gallery'),/blocked/);
});
test('same dungeon seed and decisions produce identical encounters',()=>{
 const a=createDungeon(50),b=createDungeon(50);
 assert.deepEqual(a,b);
 beginCorridor(a,'gallery');beginCorridor(b,'gallery');
 advanceCorridor(a);advanceCorridor(b);
 assert.deepEqual(a.pendingBattle,b.pendingBattle);
 assert.notEqual(a.pendingBattle.battle,b.pendingBattle.battle);
});
test('initial party objects and successive encounters do not alias one another',()=>{
 const d=createDungeon(51);
 beginCorridor(d,'gallery');advanceCorridor(d);
 const b=dungeonBattle(d),h=b.units.find(u=>u.id==='h1');
 h.hp=4;
 assert.notEqual(d.party.find(u=>u.id==='h1').hp,4);
 win(d);
 assert.equal(d.party.find(u=>u.id==='h1').hp,4);
});
