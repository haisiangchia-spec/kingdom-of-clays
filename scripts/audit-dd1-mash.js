#!/usr/bin/env node
// Offline-only inspection of user-supplied vanilla DD1 mash data.
// Usage: node scripts/audit-dd1-mash.js <mash-file> <mapping-json> <game-version>
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {auditMashSource,buildMashEncounterCandidate} from '../src/dd1-mash-validation.js';

const [mashPath,mappingPath,gameVersion]=process.argv.slice(2);
if(!mashPath||!mappingPath||!gameVersion){
 console.error('Usage: node scripts/audit-dd1-mash.js <mash-file> <mapping-json> <game-version>');
 process.exitCode=2;
}else{
 try{
  const source=readFileSync(resolve(mashPath),'utf8');
  const monsterMap=JSON.parse(readFileSync(resolve(mappingPath),'utf8'));
  const audit=auditMashSource(source,{sourceId:mashPath,gameVersion,monsterMap});
  const report={sourceId:audit.sourceId,gameVersion:audit.gameVersion,ready:audit.ready,
   entryCount:audit.entries.length,groups:audit.groups,unresolved:audit.unresolved,
   invalidFormations:audit.invalidFormations};
  if(audit.ready)report.candidate=buildMashEncounterCandidate(audit,monsterMap);
  process.stdout.write(JSON.stringify(report,null,2)+'\\n');
  if(!audit.ready)process.exitCode=1;
 }catch(error){
  console.error('Mash audit failed: '+error.message);
  process.exitCode=1;
 }
}
