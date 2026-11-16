import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,useProvision,campMeal,useCampSkill,finishCamp} from '../src/dungeon.js';

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
