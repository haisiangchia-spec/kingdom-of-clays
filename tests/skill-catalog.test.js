import test from 'node:test';
import assert from 'node:assert/strict';
import {CLASS_SKILL_CATALOG,SKILL_CATALOG,catalogSkill,implementedSkillNames} from '../src/skill-catalog.js';
import {ABILITIES} from '../src/engine.js';

test('15 base classes each have seven distinct locked Clays combat names',()=>{
 assert.equal(CLASS_SKILL_CATALOG.length,15);
 assert.equal(SKILL_CATALOG.length,105);
 assert.equal(new Set(CLASS_SKILL_CATALOG.map(c=>c.id)).size,15);
 for(const c of CLASS_SKILL_CATALOG){
  assert.equal(c.skills.length,7,c.name);
  assert.equal(new Set(c.skills.map(s=>s.id)).size,7,c.name);
  assert.equal(new Set(c.skills.map(s=>s.name)).size,7,c.name);
  for(const s of c.skills){
   assert.ok(s.dd1Source&&s.name);
   assert.equal(s.mechanics,'pending'); // not an unverified mechanics claim
  }
 }
});
test('catalog retains iconic original-to-reskin mappings',()=>{
 assert.equal(catalogSkill('swordsman','crush').name,'Heavy Slash');
 assert.equal(catalogSkill('warrior','zealous_accusation').name,'Sweeping Assault');
 assert.equal(catalogSkill('hunter','sniper_shot').name,'Eagle-Eye Shot');
 assert.equal(catalogSkill('spiritbound','transform').name,'Spirit Awakening');
 assert.equal(catalogSkill('blood_penitent','punish'),null);
});
test('prototype skill names are represented by catalog while enemy names are excluded',()=>{
 const represented=implementedSkillNames(ABILITIES);
 assert.ok(represented.some(s=>s.name==='Guardian\'s Parry'));
 assert.ok(represented.some(s=>s.name==='Grappling Hook'));
 assert.ok(represented.length<105,'prototype must not claim complete mechanics');
 assert.ok(represented.every(s=>SKILL_CATALOG.includes(SKILL_CATALOG.find(x=>x.classId===s.classId&&x.id===s.id))));
});
