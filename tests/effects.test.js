import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,takeTurn,beginTurn,availableTargets} from '../src/engine.js';
import {cleanseUnit,restorationTick,addRestoration,resolveTargets} from '../src/combat-effects.js';
import {addTimedEffect,effectModifier} from '../src/status.js';

test('Sweeping Assault attacks all legal frontline enemy ranks',()=>{
 const b=makeBattle(),warrior=b.units.find(u=>u.id==='h2');
 warrior.dmgMin=warrior.dmgMax=6;warrior.crit=0;b.queue=[warrior.id];
 const initial=b.units.filter(u=>u.side==='enemy').map(u=>u.hp);
 takeTurn(b,warrior.id,'sweeping_assault','e1',()=>0);
 assert.ok(b.units.find(u=>u.id==='e1').hp<initial[0]);
 assert.ok(b.units.find(u=>u.id==='e2').hp<initial[1]);
 assert.equal(b.units.find(u=>u.id==='e3').hp,initial[2]);
 assert.equal(b.units.find(u=>u.id==='e4').hp,initial[3]);
});
test('area attacks bypass guard and affect both target and protector',()=>{
 const b=makeBattle(),warrior=b.units.find(u=>u.id==='h2');
 const first=b.units.find(u=>u.id==='e1'),second=b.units.find(u=>u.id==='e2');
 second.guard={targetId:first.id,turns:2};
 const h1=first.hp,h2=second.hp;
 b.queue=[warrior.id];
 takeTurn(b,warrior.id,'sweeping_assault',first.id,()=>0);
 assert.ok(first.hp<h1);assert.ok(second.hp<h2);
 assert.equal(b.log.some(s=>s.includes('intercepts')),false);
});
test('multi target option uses single representative selection',()=>{
 const b=makeBattle();
 assert.deepEqual(availableTargets(b,'h2','sweeping_assault'),['e1']);
});
test('cleanse removes all bleed and blight stacks but does not heal HP',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.hp=9;u.dot=[{type:'bleed',value:2,turns:3},{type:'bleed',value:1,turns:2},{type:'blight',value:4,turns:3}];
 assert.equal(cleanseUnit(u,['bleed','blight']),3);
 assert.equal(u.dot.length,0);assert.equal(u.hp,9);
});
test('debuff clearing preserves buffs and self-inflicted debuffs',()=>{
 const u={dot:[],effects:[]};
 addTimedEffect(u,{kind:'buff',turns:3,modifiers:{accuracy:7}});
 addTimedEffect(u,{kind:'debuff',turns:3,modifiers:{accuracy:-10}});
 addTimedEffect(u,{kind:'debuff',selfInflicted:true,turns:3,modifiers:{accuracy:-5}});
 assert.equal(cleanseUnit(u,['debuff']),1);
 assert.equal(effectModifier(u,'accuracy'),2);
});
test('restoration ticks before bleed and prevents a would-be Death Door hit',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.hp=1;u.dot=[{type:'bleed',value:2,turns:1}];
 addRestoration(u,3,1);
 beginTurn(b,u.id,()=>.99);
 assert.equal(u.hp,2);
 assert.equal(u.dead,false);
 assert.equal(u.restoration.length,0);
});
test('restoration can rescue a hero off Death Door before a bleed tick',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.hp=0;u.deathDoor=true;u.dot=[{type:'bleed',value:1,turns:1}];
 addRestoration(u,3,1);
 beginTurn(b,u.id,()=>.99);
 assert.equal(u.hp,2);
 assert.equal(u.deathDoor,false);
 assert.equal(u.mortality,'deathDoorRecovery');
 assert.equal(u.dead,false);
});
test('bleed can kill a hero already on Death Door if not healed',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.hp=0;u.deathDoor=true;u.dot=[{type:'bleed',value:2,turns:1}];
 beginTurn(b,u.id,()=>.99);
 assert.equal(u.dead,true);
});
test('cleansing does not remove negative quirks or mortality',()=>{
 const b=makeBattle(),u=b.units.find(x=>x.id==='h1');
 u.mortality='deathDoorRecovery';u.affliction='Panic';u.dot=[{type:'blight',value:2,turns:3}];
 cleanseUnit(u,['bleed','blight','debuff']);
 assert.equal(u.mortality,'deathDoorRecovery');assert.equal(u.affliction,'Panic');
});
