// Audit-only parser for DD1 .mash.darkest source text.
// DD1 uses .types with space-separated IDs (not .monster tokens).
// This does not change the live Clays encounter generator.
export function parseMashEntries(source){
 if(typeof source!=='string')throw TypeError('Mash source must be text');
 const entries=[];
 for(const [index,line] of source.split(/\r?\n/).entries()){
  const trimmed=line.trim();
  if(!trimmed||trimmed.startsWith('//')||trimmed.startsWith('#'))continue;
  const kind=/^(hall|room|stall|boss|named):/.exec(trimmed)?.[1];
  if(!kind)continue;
  const chance=/(?:^|\s)\.chance\s+([0-9]+(?:\.[0-9]+)?)(?=\s|$)/.exec(trimmed);
  if(!chance)throw Error('Mash line '+(index+1)+' missing numeric .chance');
  const weight=Number(chance[1]);
  if(!Number.isFinite(weight)||weight<=0)throw Error('Mash line '+(index+1)+' has invalid .chance');
  const types=/(?:^|\s)\.types\s+(.+?)(?=\s+\.[a-z_]+(?:\s|$)|$)/.exec(trimmed);
  if(!types)throw Error('Mash line '+(index+1)+' missing .types');
  const monsterIds=types[1].trim().split(/\s+/);
  if(!monsterIds.length||monsterIds.some(id=>!/^[-\w]+$/.test(id)))throw Error('Mash line '+(index+1)+' has invalid monster IDs');
  entries.push(Object.freeze({kind,weight,monsterIds:Object.freeze(monsterIds),line:index+1,raw:trimmed}));
 }
 return Object.freeze(entries);
}
