// Source-data audit only. Never silently discard unmapped monsters or
// reinterpret DD1 hall/room weights as Clays scout/patrol/gauntlet weights.
import {parseMashEntries} from './dd1-mash-parser.js';

export function auditMashSource(source,{monsterMap={},sourceId='',gameVersion=''}={}){
 if(!sourceId.trim()||!gameVersion.trim())throw Error('Mash audit requires sourceId and gameVersion');
 const entries=parseMashEntries(source);
 if(!entries.length)throw Error('Mash source has no encounter entries');
 const unresolved=new Set();
 const groups={};
 for(const entry of entries){
  for(const id of entry.monsterIds){
   if(!Object.hasOwn(monsterMap,id)||!monsterMap[id])unresolved.add(id);
  }
  const group=groups[entry.kind]??(groups[entry.kind]={count:0,totalWeight:0});
  group.count++;
  group.totalWeight+=entry.weight;
 }
 const ready=unresolved.size===0;
 return Object.freeze({sourceId,gameVersion,ready,entries,groups:Object.freeze(groups),unresolved:Object.freeze([...unresolved].sort())});
}

export function requireCompleteMashAudit(audit){
 if(!audit?.ready||!audit.entries?.length)throw Error('Mash audit incomplete: unresolved monsters or missing entries');
 return audit;
}
