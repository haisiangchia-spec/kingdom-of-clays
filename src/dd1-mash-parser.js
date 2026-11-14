// Parser for source-provided DD1 mash entries. This is an audit utility,
// not an assertion that Kingdom of Clays currently has the original data.
// Preserve hall/room context and relative weights; never silently merge them.
export function parseMashEntries(source){
 if(typeof source!=='string')throw TypeError('Mash source must be text');
 const entries=[];
 for(const [index,line] of source.split(/\r?\n/).entries()){
  const trimmed=line.trim();
  if(!trimmed||trimmed.startsWith('//')||trimmed.startsWith('#'))continue;
  const kind=/^(hall|room):/.exec(trimmed)?.[1];
  if(!kind)continue;
  const chance=/(?:^|\s)\.chance\s+([0-9]+(?:\.[0-9]+)?)(?=\s|$)/.exec(trimmed);
  if(!chance)throw Error('Mash line '+(index+1)+' missing numeric .chance');
  const weight=Number(chance[1]);
  if(!Number.isFinite(weight)||weight<=0)throw Error('Mash line '+(index+1)+' has invalid .chance');
  const monsterIds=[...trimmed.matchAll(/\.monster\s+\"([^\"]+)\"/g)].map(match=>match[1]);
  if(monsterIds.length===0)throw Error('Mash line '+(index+1)+' has no .monster tokens');
  entries.push(Object.freeze({kind,weight,monsterIds:Object.freeze(monsterIds),line:index+1,raw:trimmed}));
 }
 return Object.freeze(entries);
}
