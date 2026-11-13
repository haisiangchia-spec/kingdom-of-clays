import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_SKILLS,ENCOUNTER_SKILLS} from '../src/enemy-skills.js';
import {chooseEnemyAction} from '../src/enemy-ai.js';
import {ABILITIES,availableTargets,makeBattle,makeLargeMonsterBattle,takeTurn} from '../src/engine.js';
import {effectModifier} from '../src/status.js';

const actor=(s,id)=>s.units.find(u=>u.id===id);
test('four sample enemy types have distinct, registered legal loadouts',()=>{
 const b=makeBattle(31);
 for(const id of ['e1','e2','e3','e4']){
   assert.equal(ENCOUNTER_SKILLS[id].length,2);
   for(const key of ENCOUNTER_SKILLS[id]){
     assert.equal(ABILITIES[key],ENEMY_SKILLS[key]);
     assert.ok(availableTargets(b,id,key).length>0,`${id} must have legal targets for ${key}`);
   }
 }
});
test('frontline Rustblade Cleave inflicts bleed on a successful status roll',()=>{
 const b=makeBattle(31),hero=actor(b,'h1');
 hero.resist.bleed=0;b.queue=['e1'];
 takeTurn(b,'e1','skeleton_cleaver','h1',()=>.1);
 assert.deepEqual(hero.dot,[{type:'bleed',value:1,turns:3}]);
 assert.ok(hero.hp<hero.maxHp);
});
test('Skeleton Shieldbreaker Bash reduces physical protection on hit',()=>{
 const b=makeBattle(31),hero=actor(b,'h1');
 hero.resist.debuff=0;b.queue=['e1'];
 takeTurn(b,'e1','skeleton_guard_break','h1',()=>.2);
 assert.equal(effectModifier(hero,'prot'),-10);
});
test('rear Skeleton Archer pinning attack debuffs speed',()=>{
 const b=makeBattle(31),hero=actor(b,'h4');
 hero.resist.debuff=0;b.queue=['e3'];
 takeTurn(b,'e3','skeleton_pin_arrow','h4',()=>.2);
 assert.equal(effectModifier(hero,'speed'),-2);
});
test('Skeleton Court Mage applies blight and has distinct stress attack',()=>{
 const b=makeBattle(31),hero=actor(b,'h3');
 hero.resist.blight=0;b.queue=['e4'];
 takeTurn(b,'e4','court_blight','h3',()=>.2);
 assert.deepEqual(hero.dot,[{type:'blight',value:2,turns:3}]);
 assert.ok(availableTargets(b,'e4','court_curse').length>0);
});
test('Court Mage stress spell is favoured over blight by provisional weights',()=>{
 const b=makeBattle(31);
 const rolls=[.70,.5];let i=0;
 const action=chooseEnemyAction(b,'e4',ENCOUNTER_SKILLS.e4,()=>rolls[i++],ABILITIES,availableTargets);
 assert.equal(action.key,'court_curse');
 assert.ok(availableTargets(b,'e4',action.key).includes(action.targetId));
});
test('three-rank Goblin Emperor has usable slam and stress roar',()=>{
 const b=makeLargeMonsterBattle(31);
 for(const key of ENCOUNTER_SKILLS.boss)assert.ok(availableTargets(b,'boss',key).length>0,key);
 b.queue=['boss'];
 const hero=actor(b,'h1'),hp=hero.hp;
 takeTurn(b,'boss','emperor_slam','h1',()=>.2);
 assert.ok(hero.hp<hp);
});
test('rear ranged attacks respect original target restrictions',()=>{
 const b=makeBattle(31);
 assert.deepEqual(availableTargets(b,'e3','skeleton_bone_arrow'),['h2','h3','h4']);
 assert.deepEqual(availableTargets(b,'e3','skeleton_pin_arrow'),['h2','h3','h4']);
});
