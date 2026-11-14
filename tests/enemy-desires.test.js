import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEnemyAction,targetDesireWeight} from '../src/enemy-ai.js';
import {makeBattle,ABILITIES,availableTargets} from '../src/engine.js';

test('marked-target desire changes swordsman target choice but not skill legality',()=>{
 const b=makeBattle(61),front=b.units.find(u=>u.id==='h1'),second=b.units.find(u=>u.id==='h2');
 const choose=()=>chooseEnemyAction(b,'e1',['skeleton_cleaver'],()=>.4,ABILITIES,availableTargets);
 assert.deepEqual(choose(),{key:'skeleton_cleaver',targetId:'h1'});
 second.marked=2;
 assert.deepEqual(choose(),{key:'skeleton_cleaver',targetId:'h2'});
 front.marked=0;
 assert.ok(availableTargets(b,'e1','skeleton_cleaver').includes(choose().targetId));
});

test('resistance-aware archer targeting only applies to the relevant ability',()=>{
 const b=makeBattle(62);
 for(const id of ['h2','h3','h4'])b.units.find(u=>u.id===id).resist.debuff=100;
 const choose=()=>chooseEnemyAction(b,'e3',['skeleton_pin_arrow'],()=>.55,ABILITIES,availableTargets);
 assert.deepEqual(choose(),{key:'skeleton_pin_arrow',targetId:'h3'});
 b.units.find(u=>u.id==='h4').resist.debuff=0;
 assert.deepEqual(choose(),{key:'skeleton_pin_arrow',targetId:'h4'});
 const plain=()=>chooseEnemyAction(b,'e3',['skeleton_bone_arrow'],()=>.55,ABILITIES,availableTargets);
 assert.equal(plain().targetId,'h3','the resistance desire is restricted to Pinning Arrow');
});

test('marked target outside legal target ranks does not alter legal selection',()=>{
 const b=makeBattle(63);
 b.units.find(u=>u.id==='h4').marked=3;
 for(const draw of [.01,.4,.99]){
  const result=chooseEnemyAction(b,'e1',['skeleton_cleaver'],()=>draw,ABILITIES,availableTargets);
  assert.ok(['h1','h2'].includes(result.targetId));
  assert.notEqual(result.targetId,'h4');
 }
});

test('target desire weights are finite, stable and ignore unknown resistance data',()=>{
 const u={marked:2,resist:{debuff:50}};
 assert.equal(targetDesireWeight(u,'hit',[{type:'marked',weight:4}]),4);
 assert.equal(targetDesireWeight(u,'hit',[{type:'resistance',stat:'debuff',direction:'low',weight:2}]),1.5);
 assert.equal(targetDesireWeight(u,'hit',[{type:'resistance',stat:'missing',direction:'low',weight:2}]),1);
 assert.equal(targetDesireWeight(u,'hit',undefined),1);
 assert.equal(targetDesireWeight(u,'hit',[{type:'marked',weight:4,skills:['other']}]),1);
});

test('unmarked and unprofiled enemies retain seeded deterministic selection',()=>{
 const b=makeBattle(64);
 const first=chooseEnemyAction(b,'e2',['skeleton_cleaver','skeleton_guard_break'],()=>.65,ABILITIES,availableTargets);
 const second=chooseEnemyAction(b,'e2',['skeleton_cleaver','skeleton_guard_break'],()=>.65,ABILITIES,availableTargets);
 assert.deepEqual(first,second);
 assert.ok(availableTargets(b,'e2',first.key).includes(first.targetId));
});
