import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
const cli=fileURLToPath(new URL('../scripts/audit-dd1-mash.js',import.meta.url));
function withFixtures(fn){
 const dir=mkdtempSync(join(tmpdir(),'clays-mash-'));
 try{
  const mash=join(dir,'warrens.3.mash.darkest'),map=join(dir,'map.json');
  writeFileSync(mash,'hall: .chance 3 .types swine_reaver_B swine_marcher_B\\nroom: .chance 2 .types swine_wretch_B\\n');
  writeFileSync(map,JSON.stringify({swine_reaver_B:'plagueChopper',swine_marcher_B:'plagueDrummer',swine_wretch_B:'plagueWretch'}));
  return fn({mash,map});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('DD1 mash CLI emits complete JSON candidate and exits successfully',()=>withFixtures(({mash,map})=>{
 const result=spawnSync(process.execPath,[cli,mash,map,'test-version'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 const report=JSON.parse(result.stdout);
 assert.equal(report.ready,true);
 assert.equal(report.entryCount,2);
 assert.equal(report.candidate.groups.hall[0].weight,3);
 assert.deepEqual(report.candidate.groups.room[0].profiles,['plagueWretch']);
}));
test('DD1 mash CLI reports unresolved monsters with nonzero exit',()=>withFixtures(({mash,map})=>{
 writeFileSync(map,JSON.stringify({swine_reaver_B:'plagueChopper'}));
 const result=spawnSync(process.execPath,[cli,mash,map,'test-version'],{encoding:'utf8'});
 assert.equal(result.status,1);
 const report=JSON.parse(result.stdout);
 assert.equal(report.ready,false);
 assert.deepEqual(report.unresolved,['swine_marcher_B','swine_wretch_B']);
}));
test('DD1 mash CLI requires arguments',()=>{
 const result=spawnSync(process.execPath,[cli],{encoding:'utf8'});
 assert.equal(result.status,2);
 assert.match(result.stderr,/Usage:/);
});
