import {occupiedRanks} from './formation.js';
// Targeting and status utilities shared by the browser and the DD1 combat engine.
// The ability data decides which targets/conditions apply; these helpers only resolve them.
export function eligibleRanks(state,side,allowedRanks){
  return state.units.filter(u=>u.side===side&&!u.dead)
    .filter(u=>occupiedRanks(state,u.id).some(rank=>allowedRanks.includes(rank)));
}
export function resolveTargets(state,actor,skill,selectedId){
  const side=['heal','groupHeal','guard','cleanse','buff','restore'].includes(skill.kind)
    ? actor.side : actor.side==='hero'?'enemy':'hero';
  const eligible=eligibleRanks(state,side,skill.to);
  if(!eligible.some(u=>u.id===selectedId))throw Error('Illegal skill target');
  const targets=skill.targetMode==='all'?eligible:[eligible.find(u=>u.id===selectedId)];
  // Group/multi-target actions ignore ordinary guard, but not the target's own defensive stats.
  return targets.filter(Boolean);
}
export function cleanseUnit(unit,types=['bleed','blight']){
  let count=0;
  if(types.some(type=>type==='bleed'||type==='blight')){
    const before=unit.dot.length;
    unit.dot=unit.dot.filter(dot=>!types.includes(dot.type));
    count+=before-unit.dot.length;
  }
  if(types.includes('horror')){
    const before=(unit.horror??[]).length;
    unit.horror=(unit.horror??[]).filter(x=>!types.includes(x.type??'horror'));
    count+=before-unit.horror.length;
  }
  if(types.includes('debuff')){
    const before=(unit.effects??[]).length;
    unit.effects=(unit.effects??[]).filter(e=>!(e.kind==='debuff'&&!e.selfInflicted));
    count+=before-unit.effects.length;
  }
  if(types.includes('mark')&&unit.marked>0){unit.marked=0;count++;}
  return count;
}
export function restorationTick(unit){
  let sum=0;
  for(const effect of unit.restoration??[]){
    if(effect.turns>0){sum+=effect.value;effect.turns--;}
  }
  unit.restoration=(unit.restoration??[]).filter(x=>x.turns>0);
  const recovered=Math.max(0,Math.min(sum,unit.maxHp-unit.hp));
  if(recovered>0){unit.hp+=recovered;if(unit.hp>0&&unit.deathDoor){unit.deathDoor=false;unit.mortality??='deathDoorRecovery';}}
  return recovered;
}
export function addRestoration(unit,value,turns=3){
  unit.restoration??=[];unit.restoration.push({value,turns});
}
