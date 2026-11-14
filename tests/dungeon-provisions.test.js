import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,useProvision,torchBand,beginCorridor,advanceCorridor} from '../src/dungeon.js';

test('expedition receives finite food and torches, and light bands respond to changes',()=>{
 const dungeon=createDungeon(91);
 assert.deepEqual(dungeon.supplies,{torch:3,food:8});
 assert.equal(torchBand(100),'radiant');
 assert.equal(torchBand(75),'radiant');
 assert.equal(torchBand(74),'dim');
 assert.equal(torchBand(50),'dim');
 assert.equal(torchBand(49),'dark');
 assert.equal(torchBand(25),'dark');
 assert.equal(torchBand(24),'pitch-black');
 assert.equal(torchBand(0),'pitch-black');
});
test('lighting torches consumes one item, caps light, and refuses invalid uses',()=>{
 const dungeon=createDungeon(92);
 useProvision(dungeon,'torch');
 assert.equal(dungeon.torch,100);
 assert.equal(dungeon.supplies.torch,2);
 assert.throws(()=>useProvision(dungeon,'torch'),/already full/);
 assert.equal(dungeon.supplies.torch,2);
 dungeon.torch=0;
 for(let i=0;i<2;i++)useProvision(dungeon,'torch');
 assert.equal(dungeon.torch,50);
 assert.equal(dungeon.supplies.torch,0);
 assert.throws(()=>useProvision(dungeon,'torch'),/No torch provisions/);
 assert.throws(()=>useProvision(dungeon,'garlic'),/Unknown provision/);
});
test('food heals living wounded hero without changing other heroes',()=>{
 const dungeon=createDungeon(93),wounded=dungeon.party[0],ally=dungeon.party[1];
 wounded.hp-=4;
 useProvision(dungeon,'food',wounded.id);
 assert.equal(wounded.hp,wounded.maxHp-2);
 assert.equal(ally.hp,ally.maxHp);
 assert.equal(dungeon.supplies.food,7);
 useProvision(dungeon,'food',wounded.id);
 assert.equal(wounded.hp,wounded.maxHp);
 assert.throws(()=>useProvision(dungeon,'food',wounded.id),/full health/);
 assert.equal(dungeon.supplies.food,6);
 wounded.dead=true;
 assert.throws(()=>useProvision(dungeon,'food',wounded.id),/living hero/);
});
test('supplies are unavailable in combat and failed actions do not consume items',()=>{
 const dungeon=createDungeon(94);
 beginCorridor(dungeon,'gallery');
 advanceCorridor(dungeon);
 assert.equal(dungeon.phase,'combat');
 assert.throws(()=>useProvision(dungeon,'torch'),/during combat/);
 assert.throws(()=>useProvision(dungeon,'food','h1'),/during combat/);
 assert.deepEqual(dungeon.supplies,{torch:3,food:8});
});
test('late corridor traps are checked once with deterministic damage and stress',()=>{
 const a=createDungeon(95),b=createDungeon(95);
 function enter(d){
  d.room='watch';d.visited.push('watch');
  d.torch=0;
  beginCorridor(d,'sanctum');
  advanceCorridor(d);
 }
 enter(a);enter(b);
 assert.deepEqual(a.party,b.party);
 assert.deepEqual(a.corridors,b.corridors);
 assert.equal(a.corridors['watch-sanctum'].hazardChecked,true);
 const hp=a.party.reduce((sum,u)=>sum+u.hp,0);
 const expectedHp=createDungeon(95).party.reduce((sum,u)=>sum+u.hp,0);
 assert.ok(hp===expectedHp||hp===expectedHp-2);
 if(hp===expectedHp-2)assert.equal(a.party[0].stress,5);
});
test('a trap never re-rolls on later passages of the same corridor',()=>{
 const dungeon=createDungeon(96);
 dungeon.room='vault';dungeon.visited.push('vault');dungeon.torch=0;
 beginCorridor(dungeon,'sanctum');
 advanceCorridor(dungeon);
 const previous=structuredClone(dungeon.party);
 dungeon.phase='explore';
 dungeon.pendingTravel=null;
 dungeon.room='vault';
 beginCorridor(dungeon,'sanctum');
 advanceCorridor(dungeon);
 assert.deepEqual(dungeon.party,previous);
});
