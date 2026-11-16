import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,useProvision,purchaseProvision,campMeal,useCampSkill,finishCamp} from '../src/dungeon.js';

test('curative supplies remove only their corresponding conditions',()=>{
 const d=createDungeon(1);
 d.supplies.antivenom=1;d.supplies.bandage=1;d.supplies.medicinalHerbs=1;
 const hero=d.party[0];
 hero.dot=[{type:'blight',value:3,turns:3},{type:'bleed',value:2,turns:2}];
 hero.effects=[{kind:'debuff',turns:2},{kind:'buff',turns:2}];
 useProvision(d,'antivenom',hero.id);
 assert.deepEqual(hero.dot.map(x=>x.type),['bleed']);
 useProvision(d,'bandage',hero.id);
 assert.equal(hero.dot.length,0);
 useProvision(d,'medicinalHerbs',hero.id);
 assert.deepEqual(hero.effects.map(x=>x.kind),['buff']);
 d.supplies.antivenom=1;
 assert.throws(()=>useProvision(d,'antivenom',hero.id),/no matching condition/);
});

test('camping requires cleared room, firewood and food and grants meal benefits',()=>{
 const d=createDungeon(1,{difficulty:'patrol'});
 assert.equal(d.firewood,1);
 assert.throws(()=>campMeal(d,8),/cleared room/);
 d.room='gallery';d.cleared.push('gallery');
 d.supplies.food=12;
 d.party.forEach(h=>{h.hp=Math.max(1,h.maxHp-12);h.stress=25;});
 campMeal(d,8);
 assert.equal(d.firewood,0);
 assert.equal(d.supplies.food,4);
 assert.equal(d.torch,100);
 assert.ok(d.party.every(h=>h.stress===15));
 assert.throws(()=>campMeal(d,2),/camp before camping/);
 finishCamp(d);
 assert.throws(()=>campMeal(d,2),/firewood/);
});

test('camp respite is bounded and sanctuary suppresses nighttime ambush',()=>{
 const d=createDungeon(123,{difficulty:'patrol'});
 d.room='gallery';d.cleared.push('gallery');d.supplies.food=8;
 d.party[0].stress=30;d.party[0].hp-=8;
 campMeal(d,8);
 assert.equal(d.camp.respite,12);
 useCampSkill(d,'sanctuary');
 assert.equal(d.camp.respite,8);
 useCampSkill(d,'encouragement',d.party[0].id);
 assert.equal(d.party[0].stress,5);
 assert.equal(d.camp.respite,6);
 assert.deepEqual(finishCamp(d),{ambushed:false});
 assert.equal(d.camp,null);
 assert.throws(()=>useCampSkill(d,'sanctuary'),/No active camp/);
});

test('unprotected camping ambush enters combat without claiming room progress',()=>{
 let ambush=null;
 for(let seed=1;seed<=100;seed++){
  const d=createDungeon(seed,{difficulty:'patrol'});
  d.room='gallery';d.cleared.push('gallery');
  campMeal(d,2);
  const outcome=finishCamp(d);
  if(outcome.ambushed){ambush=d;break;}
 }
 assert.ok(ambush,'At least one seeded campsite must trigger an ambush');
 assert.equal(ambush.phase,'combat');
 assert.match(ambush.pendingBattle.source,/^camp:/);
 assert.ok(ambush.pendingBattle.battle.units.some(u=>u.side==='enemy'));
 assert.deepEqual(ambush.cleared,['gallery']);
});

test('entrance shop charges gold, respects capacity, and closes after departure',()=>{
 const d=createDungeon(7),town={gold:1000};
 purchaseProvision(d,town,'antivenom',2);
 assert.equal(town.gold,700);
 assert.equal(d.supplies.antivenom,2);
 assert.throws(()=>purchaseProvision(d,town,'bandage',100),/Insufficient gold/);
 d.room='gallery';
 assert.throws(()=>purchaseProvision(d,town,'bandage'),/before departure/);
});

test('provision shop rejects full backpack without charging gold',()=>{
 const d=createDungeon(7),town={gold:10000};
 // Starting supplies (including holy water) already occupy five slots.
 purchaseProvision(d,town,'antivenom',6);
 purchaseProvision(d,town,'bandage',6);
 purchaseProvision(d,town,'medicinalHerbs',6);
 const before=town.gold;
 assert.throws(()=>purchaseProvision(d,town,'laudanum',1),/Inventory full/);
 assert.equal(town.gold,before);
 assert.equal(d.supplies.laudanum,0);
});
