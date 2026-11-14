import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMashEntries} from '../src/dd1-mash-parser.js';

test('mash audit parser preserves encounter context, weight and source line',()=>{
 const entries=parseMashEntries('// comment\nhall: .chance 3 .types swine_reaver_B swine_marcher_B\nroom: .chance 1.5 .types swine_wretch_B');
 assert.deepEqual(entries.map(e=>[e.kind,e.weight,e.monsterIds,e.line]),[
  ['hall',3,['swine_reaver_B','swine_marcher_B'],2],
  ['room',1.5,['swine_wretch_B'],3]
 ]);
 assert.ok(Object.isFrozen(entries));
 assert.ok(Object.isFrozen(entries[0].monsterIds));
});
test('mash parser rejects incomplete or nonpositive weights and missing monsters',()=>{
 for(const input of ['hall: .types a','room: .chance 0 .types a','hall: .chance 2','room: .chance -2 .types a']){
  assert.throws(()=>parseMashEntries(input));
 }
 assert.throws(()=>parseMashEntries(null),TypeError);
});

test('official DD1 mash syntax parses optional flags without absorbing them into monster roster',()=>{
 const [entry]=parseMashEntries('hall: .chance 0.03 .types collector_B .inventory_valid_item_percent_range 0.79 1.0 .limit 1 .can_be_ambush false');
 assert.deepEqual(entry.monsterIds,['collector_B']);
 assert.equal(entry.weight,0.03);
});
