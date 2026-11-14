import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMashSource,requireCompleteMashAudit,buildMashEncounterCandidate} from '../src/dd1-mash-validation.js';
const source='hall: .chance 3 .types swine_reaver_B swine_marcher_B\nroom: .chance 2 .types swine_wretch_B';
const provenance={sourceId:'fixture:synthetic',gameVersion:'test-only'};
test('DD1 mash audit retains encounter kinds, relative weights and provenance',()=>{
 const result=auditMashSource(source,{...provenance,monsterMap:{swine_reaver_B:'plagueChopper',swine_marcher_B:'plagueDrummer',swine_wretch_B:'plagueWretch'}});
 assert.equal(result.ready,true);
 assert.deepEqual(result.groups,{hall:{count:1,totalWeight:3},room:{count:1,totalWeight:2}});
 assert.deepEqual(result.unresolved,[]);
 assert.equal(requireCompleteMashAudit(result),result);
});
test('DD1 mash audit blocks missing provenance and unmapped monster IDs',()=>{
 assert.throws(()=>auditMashSource(source),/sourceId and gameVersion/);
 const result=auditMashSource(source,{...provenance,monsterMap:{swine_reaver_B:'plagueChopper'}});
 assert.equal(result.ready,false);
 assert.deepEqual(result.unresolved,['swine_marcher_B','swine_wretch_B']);
 assert.throws(()=>requireCompleteMashAudit(result),/incomplete/);
 assert.throws(()=>auditMashSource('',provenance),/no encounter entries/);
});

test('DD1 mash audit blocks fully mapped but illegal Clays formations',()=>{
 const result=auditMashSource('hall: .chance 1 .types a b c d e',{
  ...provenance,monsterMap:{a:'plagueChopper',b:'plagueChopper',c:'plagueWretch',d:'plagueDrummer',e:'plagueWretch'}
 });
 assert.equal(result.ready,false);
 assert.deepEqual(result.unresolved,[]);
 assert.equal(result.invalidFormations.length,1);
 assert.equal(result.invalidFormations[0].line,1);
 assert.throws(()=>requireCompleteMashAudit(result),/invalid formations/);
});

test('DD1 encounter candidate preserves hall/room contexts, weights and line provenance',()=>{
 const map={swine_reaver_B:'plagueChopper',swine_marcher_B:'plagueDrummer',swine_wretch_B:'plagueWretch'};
 const audit=auditMashSource(source,{...provenance,monsterMap:map});
 const candidate=buildMashEncounterCandidate(audit,map);
 assert.equal(candidate.sourceId,'fixture:synthetic');
 assert.equal(candidate.gameVersion,'test-only');
 assert.deepEqual(candidate.groups.hall,[{weight:3,profiles:['plagueChopper','plagueDrummer'],line:1}]);
 assert.deepEqual(candidate.groups.room,[{weight:2,profiles:['plagueWretch'],line:2}]);
 assert.ok(Object.isFrozen(candidate.groups.hall));
 assert.ok(Object.isFrozen(candidate.groups.hall[0].profiles));
 assert.throws(()=>buildMashEncounterCandidate(audit,{}),/Missing monster mapping/);
});
