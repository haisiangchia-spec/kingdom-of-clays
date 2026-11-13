import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {makeBattle,ABILITIES,availableTargets,rng} from '../src/engine.js';

test('enemy decision selects skill uniformly before target, not over all skill-target pairs',()=>{
 const state={};
 const abilities={single:{},many:{}};
 const targets=(_s,_id,key)=>key==='single'?['h1']:['h1','h2','h3','h4'];
 const values=[.49,.9];let i=0;
 assert.deepEqual(chooseEnemyAction(state,'e1',['single','many'],()=>values[i++],abilities,targets),{key:'single',targetId:'h1'});
});
test('weighted skill selection uses skill weights but not target counts',()=>{
 const abilities={rare:{aiWeight:1},common:{aiWeight:3}};
 const targets=(_s,_id,key)=>key==='rare'?['h1','h2','h3','h4']:['h4'];
 assert.deepEqual(chooseEnemyAction({},'e1',['rare','common'],()=>.2,abilities,targets),{key:'rare',targetId:'h1'});
 assert.deepEqual(chooseEnemyAction({},'e1',['rare','common'],()=>.6,abilities,targets),{key:'common',targetId:'h4'});
});
test('enemy skips illegal and zero-weight moves, and returns null for no legal action',()=>{
 const abilities={bad:{aiWeight:0},legal:{},unknown:null};
 const targets=(_s,_id,key)=>key==='legal'?['h2']:[];
 assert.deepEqual(chooseEnemyAction({},'e1',['bad','missing','legal'],()=>0,abilities,targets),{key:'legal',targetId:'h2'});
 assert.equal(chooseEnemyAction({},'e1',['bad','missing'],()=>0,abilities,targets),null);
});
test('real enemy skill choice is deterministic for a seed and targets are legal',()=>{
 const b=makeBattle(42),a=b.units.find(u=>u.id==='e4');
 const keys=['enemy_stress','enemy_strike'];
 const choose=()=>chooseEnemyAction(b,a.id,keys,rng(781),ABILITIES,availableTargets);
 const first=choose();
 assert.deepEqual(first,choose());
 assert.ok(keys.includes(first.key));
 assert.ok(availableTargets(b,a.id,first.key).includes(first.targetId));
});

test('Skeleton Archer prioritizes rear ranks but never targets an illegal rank',()=>{
 const state=makeBattle(55),archer=state.units.find(u=>u.id==='e3');
 const sequence=[.2,.7];let i=0;
 const result=chooseEnemyAction(state,archer.id,['enemy_strike'],()=>sequence[i++],ABILITIES,availableTargets);
 assert.equal(result.key,'enemy_strike');
 assert.equal(result.targetId,'h4','70% weighted draw favors the rearmost hero');
 assert.ok(availableTargets(state,archer.id,result.key).includes(result.targetId));
});
test('Court Mage skill preference and high-stress targeting use independent rolls',()=>{
 const state=makeBattle(55),mage=state.units.find(u=>u.id==='e4');
 state.units.find(u=>u.id==='h4').stress=100;
 const sequence=[.6,.9];let i=0;
 const result=chooseEnemyAction(state,mage.id,['enemy_stress','enemy_strike'],()=>sequence[i++],ABILITIES,availableTargets);
 assert.deepEqual(result,{key:'enemy_stress',targetId:'h4'});
});
test('profiles gracefully fall back to uniform choice on unknown monsters',()=>{
 const state=makeBattle(55),enemy=state.units.find(u=>u.id==='e1');
 enemy.name='Unknown Monster';
 const result=chooseEnemyAction(state,'e1',['enemy_strike'],()=>.75,ABILITIES,availableTargets);
 assert.deepEqual(result,{key:'enemy_strike',targetId:'h4'});
});
test('target preferences update after party order changes',()=>{
 const state=makeBattle(55);
 const archer=state.units.find(u=>u.id==='e3');
 const rear=state.units.find(u=>u.id==='h4');
 state.units.splice(state.units.indexOf(rear),1);
 state.units.unshift(rear);
 const result=chooseEnemyAction(state,archer.id,['enemy_strike'],()=>.99,ABILITIES,availableTargets);
 assert.equal(result.targetId,'h3','after reordering, the new rear hero is preferred');
});
