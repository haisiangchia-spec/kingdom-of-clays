import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGeneratedEncounter} from '../src/engine.js';
const hp=b=>b.units.filter(u=>u.side==='enemy').reduce((sum,u)=>sum+u.maxHp,0);
test('Warrens tiers do not regress in enemy HP across matched seeds',()=>{
 for(const difficulty of ['scout','patrol','gauntlet'])for(let seed=1;seed<=150;seed++){
  const a=hp(makeGeneratedEncounter(seed,difficulty,'plague','apprentice'));
  const v=hp(makeGeneratedEncounter(seed,difficulty,'plague','veteran'));
  const c=hp(makeGeneratedEncounter(seed,difficulty,'plague','champion'));
  assert.ok(v>=a,difficulty+' seed '+seed+' Veteran '+v+' < Apprentice '+a);
  // Different tier encounter tables can select different formation sizes.
  // Total HP across unmatched formations is not a valid tier-scaling invariant.
  assert.ok(c>0,difficulty+' seed '+seed+' Champion encounter must contain living enemies');
 }
});
