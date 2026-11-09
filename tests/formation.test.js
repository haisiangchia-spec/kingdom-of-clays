import test from 'node:test';
import assert from 'node:assert/strict';
import {makeBattle,takeTurn,availableTargets,startRound,status,rank,beginTurn} from '../src/engine.js';
import {attemptDisplacement,moveWithinFormation,clearExpiredCorpses} from '../src/formation.js';

test('enemy pull shifts enemy ranks and adjacent units',()=>{
 const b=makeBattle(), e3=b.units.find(u=>u.id==='e3');
 assert.equal(rank(b,e3.id),2);
 const delta=attemptDisplacement(b,e3,{type:'pull',distance:2,chance:100},()=>0);
 assert.equal(delta,-2);assert.equal(rank(b,e3.id),0);
 assert.equal(rank(b,'e1'),1);
});
test('move resistance blocks displacement',()=>{
 const b=makeBattle(),e3=b.units.find(u=>u.id==='e3');
 e3.resist.move=100;
 assert.equal(attemptDisplacement(b,e3,{type:'pull',distance:2,chance:100},()=>0),0);
 assert.equal(rank(b,e3.id),2);
});
test('self move forward preserves heroes and replaces old position',()=>{
 const b=makeBattle();
 assert.equal(moveWithinFormation(b,'h4',-2),-2);
 assert.equal(rank(b,'h4'),1);
 assert.equal(rank(b,'h2'),2);
});
test('a selected stealth target is illegal but AoE may include it when another is visible',()=>{
 const b=makeBattle(), e2=b.units.find(u=>u.id==='e2');
 e2.stealthed=2;
 assert.deepEqual(availableTargets(b,'h2','crushing_strike'),['e1']);
 b.queue=['h2'];const before=e2.hp;
 takeTurn(b,'h2','sweeping_assault','e1',()=>0);
 assert.ok(e2.hp<before);
});
test('AoE cannot be selected with only stealthed enemies among allowed ranks',()=>{
 const b=makeBattle();b.units.find(u=>u.id==='e1').stealthed=2;b.units.find(u=>u.id==='e2').stealthed=2;
 assert.deepEqual(availableTargets(b,'h2','sweeping_assault'),[]);
});
test('marked target takes bonus damage only from marked-synergy skill',()=>{
 const attack=(mark)=>{
   const b=makeBattle(),hero=b.units.find(u=>u.id==='h3'),target=b.units.find(u=>u.id==='e2');
   hero.dmgMin=hero.dmgMax=10;hero.crit=0;target.marked=mark?3:0;
   b.queue=['h3'];takeTurn(b,'h3','eagle_eye_shot','e2',()=>0);
   return 16-target.hp;
 };
 assert.equal(attack(false),10);assert.equal(attack(true),15);
});
test('normal direct kill creates enemy corpse which blocks front ranks',()=>{
 const b=makeBattle(),hero=b.units.find(u=>u.id==='h2'),enemy=b.units.find(u=>u.id==='e1');
 hero.dmgMin=hero.dmgMax=30;hero.crit=0;b.queue=[hero.id];
 takeTurn(b,hero.id,'crushing_strike',enemy.id,()=>0);
 assert.equal(enemy.corpse,true);assert.equal(rank(b,enemy.id),0);
 assert.equal(enemy.hp,8);
 assert.equal(rank(b,'e2'),1);
 assert.equal(rank(b,'e3'),2);
 assert.ok(availableTargets(b,'h2','crushing_strike').includes(enemy.id));
});
test('critical kill leaves no corpse',()=>{
 const b=makeBattle(),hero=b.units.find(u=>u.id==='h2'),enemy=b.units.find(u=>u.id==='e1');
 hero.dmgMin=hero.dmgMax=30;hero.crit=100;b.queue=[hero.id];
 takeTurn(b,hero.id,'crushing_strike',enemy.id,()=>0);
 assert.equal(enemy.dead,true);assert.equal(enemy.corpse,undefined);
 assert.equal(rank(b,'e2'),0);
});
test('DOT kill leaves no corpse',()=>{
 const b=makeBattle(),enemy=b.units.find(u=>u.id==='e1');
 enemy.hp=1;enemy.dot.push({type:'bleed',value:2,turns:1});
 beginTurn(b,enemy.id,()=>0);
 assert.equal(enemy.dead,true);assert.equal(enemy.corpse,undefined);
});
test('corpses do not prevent victory when all enemies killed',()=>{
 const b=makeBattle(),enemies=b.units.filter(u=>u.side==='enemy');
 enemies.forEach(u=>u.dead=true);
 enemies[0].dead=false;enemies[0].corpse=true;
 assert.equal(status(b),'victory');
});
test('corpses expire after four rounds and never receive turns',()=>{
 const b=makeBattle(),e=b.units.find(u=>u.id==='e1');
 e.corpse=true;e.expiresRound=4;e.hp=1;
 for(let i=0;i<3;i++)startRound(b,()=>0);
 assert.equal(e.dead,false);assert.ok(!b.queue.includes(e.id));
 startRound(b,()=>0);assert.equal(e.dead,true);
});
