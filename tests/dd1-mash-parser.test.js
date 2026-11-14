import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMashEntries} from '../src/dd1-mash-parser.js';

test('mash audit parser preserves encounter context, weight and source line',()=>{
 const entries=parseMashEntries('// comment\nhall: .chance 3 .monster "swine_reaver" .monster "swine_marcher"\nroom: .chance 1.5 .monster "swine_wretch"');
 assert.deepEqual(entries.map(e=>[e.kind,e.weight,e.monsterIds,e.line]),[
  ['hall',3,['swine_reaver','swine_marcher'],2],
  ['room',1.5,['swine_wretch'],3]
 ]);
 assert.ok(Object.isFrozen(entries));
 assert.ok(Object.isFrozen(entries[0].monsterIds));
});
test('mash parser rejects incomplete or nonpositive weights and missing monsters',()=>{
 for(const input of ['hall: .monster "a"','room: .chance 0 .monster "a"','hall: .chance 2','room: .chance -2 .monster "a"']){
  assert.throws(()=>parseMashEntries(input));
 }
 assert.throws(()=>parseMashEntries(null),TypeError);
});
