import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,makeSecondClassBattle,takeTurn,beginTurn,finishActorTurn,prepareActorTurn,availableTargets} from '../src/engine.js';
import {effectModifier,applyGuard,guardTarget} from '../src/status.js';

test('buffs do not expire on turn start and do expire at end of owner turn',()=>{
 const b=makeBattle(),h=b.units.find(u=>u.id==='h1');
 h.effects=[{kind:'buff',turns:2,modifiers:{accuracy:7}}];
 beginTurn(b,h.id,()=>.5);
 assert.equal(effectModifier(h,'accuracy'),7);
 assert.equal(h.effects[0].turns,2);
 finishActorTurn(h);
 assert.equal(h.effects[0].turns,1);
 beginTurn(b,h.id,()=>.5);
 assert.equal(effectModifier(h,'accuracy'),7);
 finishActorTurn(h);
 assert.equal(effectModifier(h,'accuracy'),0);
});
test('turn-duration debuffs stack independently and expire on distinct end turns',()=>{
 const b=makeBattle(),h=b.units.find(u=>u.id==='h1');
 h.effects=[{kind:'debuff',turns:1,modifiers:{dodge:-5}},{kind:'debuff',turns:2,modifiers:{dodge:-10}}];
 beginTurn(b,h.id,()=>.5);
 assert.equal(effectModifier(h,'dodge'),-15);
 finishActorTurn(h);
 assert.equal(effectModifier(h,'dodge'),-10);
 finishActorTurn(h);
 assert.equal(effectModifier(h,'dodge'),0);
});
test('two-turn stealth remains active before end of user turn; persists until following end',()=>{
 const b=makeSecondClassBattle(),thief=b.units.find(u=>u.id==='h2');
 b.queue=['h2'];
 takeTurn(b,'h2','vanishing_step','h2',()=>.5);
 assert.equal(thief.stealthed,1);
 assert.deepEqual(availableTargets(b,'e1','enemy_strike').filter(id=>id===thief.id),[]);
 beginTurn(b,thief.id,()=>.5);
 assert.equal(thief.stealthed,1);
 finishActorTurn(thief);
 assert.equal(thief.stealthed,0);
});
test('guard lasts until end of protector turns, not erased before their action',()=>{
 const b=makeBattle(),p=b.units.find(u=>u.id==='h1'),ally=b.units.find(u=>u.id==='h2');
 applyGuard(b,p,ally.id,2);
 beginTurn(b,p.id,()=>.5);
 assert.equal(guardTarget(b,ally).id,p.id);
 finishActorTurn(p);
 assert.equal(guardTarget(b,ally).id,p.id);
 finishActorTurn(p);
 assert.equal(guardTarget(b,ally).id,ally.id);
});
test('riposte lasts through next scheduled turn and expires at second turn end',()=>{
 const b=makeBattle(),p=b.units.find(u=>u.id==='h1');
 p.riposte=2;
 beginTurn(b,p.id,()=>.5);
 assert.equal(p.riposte,2);
 finishActorTurn(p);
 assert.equal(p.riposte,1);
 beginTurn(b,p.id,()=>.5);
 assert.equal(p.riposte,1);
 finishActorTurn(p);
 assert.equal(p.riposte,0);
});
test('stunned actor still advances end-of-turn buff and guard countdown',()=>{
 const b=makeBattle(),hero=b.units.find(u=>u.id==='h1');
 hero.stun=1;hero.effects=[{kind:'buff',turns:1,modifiers:{prot:15}}];
 hero.guard={targetId:'h2',turns:1};b.queue=[hero.id,'e1'];
 assert.equal(prepareActorTurn(b,hero.id,()=>.5),'stunned');
 assert.equal(effectModifier(hero,'prot'),0);assert.equal(hero.guard,null);
 assert.equal(b.queue[0],'e1');
});
test('bleed and blight still tick at turn start rather than turn end',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.dot=[{type:'bleed',value:2,turns:2}];
 finishActorTurn(u);assert.equal(u.hp,33);assert.equal(u.dot[0].turns,2);
 beginTurn(b,u.id,()=>.5);assert.equal(u.hp,31);assert.equal(u.dot[0].turns,1);
});
test('AoE anchor can be a visible second rank when first target is stealthed',()=>{
 const b=makeBattle(),e1=b.units.find(u=>u.id==='e1');
 e1.stealthed=2;
 assert.deepEqual(availableTargets(b,'h2','sweeping_assault'),['e2']);
 b.queue=['h2'];const before=e1.hp;
 takeTurn(b,'h2','sweeping_assault','e2',()=>.3);
 assert.ok(e1.hp<before,'stealthed unit is still hit by valid AoE');
});
test('AoE remains unusable if all targetable units are hidden',()=>{
 const b=makeBattle();
 for(const id of ['e1','e2'])b.units.find(u=>u.id===id).stealthed=2;
 assert.deepEqual(availableTargets(b,'h2','sweeping_assault'),[]);
});
test('a 1-turn buff applied to the acting hero expires at their action end',()=>{
 const b=makeBattle(),h=b.units.find(u=>u.id==='h1');
 h.effects=[{kind:'buff',turns:2,modifiers:{dodge:10}}];
 b.queue=['h1'];
 takeTurn(b,'h1','steadfast_resolve','h1',()=>.3);
 assert.equal(h.effects.find(x=>x.modifiers?.dodge===10)?.turns,1);
});
