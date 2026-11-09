import test from 'node:test';
import assert from 'node:assert/strict';
import {SPIRITBOUND_SKILLS,SPIRITBOUND_KEYS} from '../src/class-skills-spiritbound.js';
import {makeSpiritboundBattle,takeTurn,availableTargets,beginTurn,startRound,status,ABILITIES} from '../src/engine.js';
import {effectModifier} from '../src/status.js';
import {SKILL_CATALOG} from '../src/skill-catalog.js';
const fresh=()=>{const b=makeSpiritboundBattle(6);b.queue=['h2'];return b;};
const transform=(b,r=()=>.3)=>takeTurn(b,'h2','spirit_awakening','h2',r);

test('all seven class skills map to the locked Clays names, full catalog registers 105',()=>{
 assert.equal(SPIRITBOUND_KEYS.length,7);
 assert.equal(new Set(SPIRITBOUND_KEYS).size,7);
 for(const [id,sk] of Object.entries(SPIRITBOUND_SKILLS)){
  assert.equal(ABILITIES[id].name,sk.name);
  assert.equal(sk.classId,'spiritbound');
 }
 assert.equal(SKILL_CATALOG.length,105);
 assert.equal(SKILL_CATALOG.filter(s=>s.mechanics==='level1-integrated').length,105);
});
test('human Spiritbound only has human skills and Transform enabled',()=>{
 const b=fresh();
 for(const id of ['spirit_awakening','spirit_chains','corrupting_essence','spiritual_purification'])
  assert.ok(availableTargets(b,'h2',id).length>0,id);
 for(const id of ['spirit_claw','primal_fury','spirit_crush'])
  assert.deepEqual(availableTargets(b,'h2',id),[],id);
});
test('Transform is free: changes form, grants +5 HP, buffs and +8 stress to allies',()=>{
 const b=fresh(),hero=b.units.find(u=>u.id==='h2');
 hero.hp=10;transform(b);
 assert.equal(hero.form,'beast');assert.equal(hero.hp,15);
 assert.equal(hero.transformsUsed,1);assert.equal(hero.transformUsedThisTurn,true);
 assert.equal(effectModifier(hero,'speed'),1);
 assert.equal(effectModifier(hero,'damage'),10);
 assert.equal(effectModifier(hero,'blightResist'),20);
 for(const ally of b.units.filter(x=>x.side==='hero'&&x.id!=='h2'))assert.equal(ally.stress,8);
 assert.equal(b.queue[0],'h2');assert.equal(hero.acted,false);
});
test('Transform can only be used once per turn and form-specific beast skills unlock',()=>{
 const b=fresh();transform(b);
 assert.deepEqual(availableTargets(b,'h2','spirit_awakening'),[]);
 assert.ok(availableTargets(b,'h2','spirit_claw').length>0);
 assert.ok(availableTargets(b,'h2','primal_fury').length>0);
 assert.ok(availableTargets(b,'h2','spirit_crush').length>0);
 assert.deepEqual(availableTargets(b,'h2','spirit_chains'),[]);
});
test('using a beast action ends the same turn after a free transformation',()=>{
 const b=fresh();transform(b);
 takeTurn(b,'h2','spirit_claw','e1',()=>.3);
 assert.ok(b.units.find(x=>x.id==='e1').hp<16);
 assert.ok(b.units.find(x=>x.id==='e2').hp<16);
 assert.equal(b.units.find(x=>x.id==='h2').acted,true);
 assert.equal(b.queue[0],undefined);
});
test('beast form accrues six stress at the beginning of each later turn',()=>{
 const b=fresh(),h=b.units.find(x=>x.id==='h2');
 transform(b);takeTurn(b,'h2','primal_fury','e2',()=>.3);
 assert.equal(h.stress,0);
 beginTurn(b,'h2',()=>.3);
 assert.equal(h.stress,6);
});
test('reversion is free, relieves party stress by two and applies minus-four speed',()=>{
 const b=fresh(),h=b.units.find(x=>x.id==='h2');transform(b);
 takeTurn(b,'h2','primal_fury','e2',()=>.3);
 b.queue=['h2'];h.acted=false;beginTurn(b,'h2',()=>.3);
 transform(b);
 assert.equal(h.form,'human');assert.equal(h.transformsUsed,2);
 assert.equal(effectModifier(h,'speed'),-4);
 assert.equal(effectModifier(h,'damage'),0);
 for(const ally of b.units.filter(x=>x.side==='hero'&&x.id!=='h2'))assert.equal(ally.stress,6);
 assert.equal(b.queue[0],'h2');
 assert.deepEqual(availableTargets(b,'h2','spirit_awakening'),[]);
 assert.ok(availableTargets(b,'h2','spiritual_purification').length);
});
test('human manacles can stun and strikes only ranks one through three',()=>{
 const b=fresh();
 assert.deepEqual(availableTargets(b,'h2','spirit_chains'),['e1','e2','e3']);
 const foe=b.units.find(x=>x.id==='e1');
 takeTurn(b,'h2','spirit_chains','e1',()=>.3);
 assert.ok(foe.hp<16);assert.equal(foe.stun,1);
});
test('human Beast Bile blights both middle targets and debuffs blight resistance',()=>{
 const b=fresh();takeTurn(b,'h2','corrupting_essence','e2',()=>.3);
 for(const id of ['e2','e3']){
  const foe=b.units.find(x=>x.id===id);
  assert.ok(foe.dot.some(d=>d.type==='blight'&&d.value===2&&d.turns===3));
  assert.equal(effectModifier(foe,'blightResist'),-20);
 }
 assert.equal(b.units.find(x=>x.id==='e1').dot.length,0);
});
test('Absolution heals three HP and removes seven stress without changing form',()=>{
 const b=fresh(),h=b.units.find(x=>x.id==='h2');
 h.hp=8;h.stress=20;
 takeTurn(b,'h2','spiritual_purification','h2',()=>.3);
 assert.equal(h.hp,11);assert.equal(h.stress,13);assert.equal(h.form,'human');
});
test('Rake increases future Rake damage but does not amplify Rage',()=>{
 const b=fresh(),h=b.units.find(x=>x.id==='h2');
 h.dmgMin=h.dmgMax=10;h.crit=0;transform(b);
 takeTurn(b,'h2','spirit_claw','e1',()=>.3);
 assert.equal(effectModifier(h,'rakeDamage'),15);
 assert.equal(effectModifier(h,'damage'),10);
 b.queue=['h2'];h.acted=false;beginTurn(b,'h2',()=>.3);
 const e=b.units.find(x=>x.id==='e2'),before=e.hp;
 takeTurn(b,'h2','spirit_claw','e2',()=>.3);
 assert.ok(before-e.hp>=6);
 assert.equal(effectModifier(h,'rakeDamage'),30);
});
test('Slam pushes target two places and advances Spiritbound one rank',()=>{
 const b=fresh();transform(b);const h=b.units.find(x=>x.id==='h2');
 takeTurn(b,'h2','spirit_crush','e1',()=>.3);
 assert.equal(b.units.filter(x=>x.side==='hero').indexOf(h),0);
 assert.equal(b.units.filter(x=>x.side==='enemy').findIndex(x=>x.id==='e1'),2);
 const foe=b.units.find(x=>x.id==='e1');
 assert.equal(effectModifier(foe,'dodge'),-10);assert.equal(effectModifier(foe,'speed'),-2);
});
test('stress affliction in beast form forces automatic reversion',()=>{
 const b=fresh(),h=b.units.find(x=>x.id==='h2');transform(b);
 h.stress=99;takeTurn(b,'h2','primal_fury','e2',()=>.3);
 beginTurn(b,'h2',()=>.8);
 assert.equal(h.form,'human');
 assert.ok(h.affliction);
});
test('end-of-battle reverts beast form to human',()=>{
 const b=fresh(),h=b.units.find(x=>x.id==='h2');transform(b);
 for(const foe of b.units.filter(x=>x.side==='enemy'))foe.dead=true;
 assert.equal(status(b),'victory');assert.equal(h.form,'human');
});
