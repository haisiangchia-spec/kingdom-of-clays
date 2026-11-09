import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,takeTurn} from '../src/engine.js';
test('single-target critical healing doubles healing and relieves four stress',()=>{
 const b=makeBattle(), healer=b.units.find(x=>x.id==='h4'),target=b.units.find(x=>x.id==='h1');
 target.hp=5;target.stress=10;b.queue=[healer.id];
 takeTurn(b,healer.id,'greater_heal',target.id,()=>0);
 assert.equal(target.hp,13);assert.equal(target.stress,6);
});
test('group critical healing independently rolls for each recipient',()=>{
 const b=makeBattle(), healer=b.units.find(x=>x.id==='h4');
 b.units.filter(x=>x.side==='hero').forEach(x=>{x.hp=5;x.stress=10});
 b.queue=[healer.id];takeTurn(b,healer.id,'group_healing','h1',()=>0);
 for(const u of b.units.filter(x=>x.side==='hero')){
  assert.equal(u.hp,7);assert.equal(u.stress,6);
 }
});
test('hero critical hit relieves stress for self and companions',()=>{
 const b=makeBattle(), a=b.units.find(x=>x.id==='h2');
 b.units.filter(x=>x.side==='hero').forEach(x=>x.stress=20);
 a.crit=100;b.queue=[a.id];takeTurn(b,a.id,'crushing_strike','e1',()=>0);
 assert.equal(a.stress,17);
 for(const u of b.units.filter(x=>x.side==='hero'&&x.id!==a.id))assert.equal(u.stress,17);
});
test('enemy critical hit produces individual and party stress',()=>{
 const b=makeBattle(),e=b.units.find(x=>x.id==='e1');
 e.crit=100;b.queue=[e.id];takeTurn(b,e.id,'enemy_strike','h1',()=>0);
 assert.equal(b.units.find(x=>x.id==='h1').stress,15);
 for(const u of b.units.filter(x=>x.side==='hero'&&x.id!=='h1'))assert.equal(u.stress,5);
});
