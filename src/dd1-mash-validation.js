// Source-data audit only. Never silently discard unmapped monsters or
// reinterpret DD1 hall/room weights as Clays scout/patrol/gauntlet weights.
import {parseMashEntries} from './dd1-mash-parser.js';
import {validatePlagueFormation} from './dungeon-regions.js';

export function auditMashSource(source,{monsterMap={},sourceId='',gameVersion=''}={}){
 if(!sourceId.trim()||!gameVersion.trim())throw Error('Mash audit requires sourceId and gameVersion');
 const entries=parseMashEntries(source);
 if(!entries.length)throw Error('Mash source has no encounter entries');
 const unresolved=new Set();
 const invalidFormations=[];
 const groups={};
 for(const entry of entries){
  for(const id of entry.monsterIds){
   if(!Object.hasOwn(monsterMap,id)||!monsterMap[id])unresolved.add(id);
  }
  if(entry.monsterIds.every(id=>Object.hasOwn(monsterMap,id)&&monsterMap[id])){
   const mapped=entry.monsterIds.map(id=>monsterMap[id]);
   try{validatePlagueFormation(mapped);}catch(error){
    invalidFormations.push(Object.freeze({line:entry.line,kind:entry.kind,reason:error.message}));
   }
  }
  const group=groups[entry.kind]??(groups[entry.kind]={count:0,totalWeight:0});
  group.count++;
  group.totalWeight+=entry.weight;
 }
 const ready=unresolved.size===0&&invalidFormations.length===0;
 return Object.freeze({sourceId,gameVersion,ready,entries,groups:Object.freeze(groups),unresolved:Object.freeze([...unresolved].sort()),invalidFormations:Object.freeze(invalidFormations)});
}

export function requireCompleteMashAudit(audit){
 if(!audit?.ready||!audit.entries?.length)throw Error('Mash audit incomplete: unresolved monsters, invalid formations or missing entries');
 return audit;
}


// Produce a separately grouped, provenance-carrying import candidate.
// Caller must explicitly choose a DD1 context; never remap to Clays
// scout/patrol/gauntlet categories or silently normalize across contexts.
export function buildMashEncounterCandidate(audit,monsterMap){
 requireCompleteMashAudit(audit);
 if(!monsterMap||typeof monsterMap!=='object')throw TypeError('Monster map required');
 const groups={};
 for(const entry of audit.entries){
  const profiles=entry.monsterIds.map(id=>{
   if(!Object.hasOwn(monsterMap,id)||!monsterMap[id])throw Error('Missing monster mapping: '+id);
   return monsterMap[id];
  });
  validatePlagueFormation(profiles);
  const group=groups[entry.kind]??(groups[entry.kind]=[]);
  group.push(Object.freeze({weight:entry.weight,profiles:Object.freeze(profiles),line:entry.line}));
 }
 return Object.freeze({sourceId:audit.sourceId,gameVersion:audit.gameVersion,
  groups:Object.freeze(Object.fromEntries(Object.entries(groups).map(([kind,entries])=>[kind,Object.freeze(entries)])))});
}
