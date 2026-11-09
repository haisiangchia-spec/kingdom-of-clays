// Formation is front-to-back. A combatant may occupy 1–4 *contiguous* ranks.
// Entities remain single objects: one turn, one HP pool and one status set, regardless of width.
// Corpses retain the defeated enemy's footprint until cleared.
export const widthOf=u=>Math.max(1,Math.min(4,Number.isInteger(u.size)?u.size:1));
export const visibleUnits=(state,side)=>state.units.filter(u=>u.side===side&&!u.dead);
export function formationSlots(state,side){
  const slots=[null,null,null,null];
  let start=0;
  for(const unit of visibleUnits(state,side)){
    const width=widthOf(unit);
    if(start+width>4)throw Error('Formation exceeds four ranks');
    for(let i=start;i<start+width;i++)slots[i]=unit;
    start+=width;
  }
  return slots;
}
export function occupiedRanks(state,unitId){
  const unit=state.units.find(x=>x.id===unitId);
  if(!unit||unit.dead)return [];
  const slots=formationSlots(state,unit.side);
  return slots.flatMap((entry,i)=>entry?.id===unitId?[i]:[]);
}
export function rankOf(state,id){
  const ranks=occupiedRanks(state,id);
  return ranks.length?ranks[0]:-1;
}
export function alive(sideUnits){return sideUnits.filter(x=>!x.dead&&!x.corpse);}
export function isSelectable(unit,skill,side){
  if(unit.dead)return false;
  if(unit.corpse)return side==='enemy' && skill.kind!=='mark' && skill.kind!=='stress'
    && !['heal','groupHeal','guard','buff','cleanse','restore','stealth'].includes(skill.kind);
  return !unit.stealthed || !!skill.ignoreStealth;
}
export function moveWithinFormation(state,unitId,delta){
  const entity=state.units.find(x=>x.id===unitId);
  if(!entity||entity.dead||entity.corpse)return 0;
  const own=visibleUnits(state,entity.side);
  const oldIndex=own.findIndex(x=>x.id===unitId);
  const oldRank=rankOf(state,unitId);
  // Movement swaps whole combatants, never splitting a size-two or larger monster.
  const newIndex=Math.min(own.length-1,Math.max(0,oldIndex+delta));
  if(newIndex===oldIndex)return 0;
  own.splice(oldIndex,1);own.splice(newIndex,0,entity);
  let pos=0;
  state.units=state.units.map(x=>x.side===entity.side&&!x.dead?own[pos++]:x);
  return rankOf(state,unitId)-oldRank;
}
export function attemptDisplacement(state,entity,move,rng){
  if(!entity||entity.dead||entity.corpse)return 0;
  const resist=entity.resist?.move??0;
  const chance=Math.max(0,Math.min(100,(move.chance??100)-resist));
  if(rng()*100>=chance)return 0;
  const own=visibleUnits(state,entity.side);
  const index=own.findIndex(x=>x.id===entity.id);
  if(index<0)return 0;
  if(move.type==='shuffle'){
    if(own.length<2)return 0;
    const choices=own.map((_,i)=>i).filter(i=>i!==index);
    return moveWithinFormation(state,entity.id,choices[Math.floor(rng()*choices.length)]-index);
  }
  const direction=move.type==='pull'?-1:move.type==='push'?1:0;
  if(!direction)return 0;
  // DD1 move distance is rank distance. Shift by whole-unit swaps until the target
  // reaches the requested rank distance or encounters the edge of formation.
  let moved=0;
  const requested=Math.max(0,Math.floor(move.distance??1));
  for(let guard=0;guard<3&&Math.abs(moved)<requested;guard++){
    const old=rankOf(state,entity.id);
    const shift=moveWithinFormation(state,entity.id,direction);
    if(!shift)break;
    moved+=rankOf(state,entity.id)-old;
  }
  return moved;
}
export function corpseFromEnemy(enemy,round){
  if(enemy.corpse||enemy.noCorpse)return false;
  enemy.name='Remains of '+enemy.name;
  enemy.id='corpse_'+enemy.id;
  enemy.corpse=true;enemy.dead=false;
  enemy.hp=Math.max(1,Math.ceil(enemy.maxHp*.5));
  enemy.maxHp=enemy.hp;enemy.prot=0;enemy.dodge=0;
  enemy.dot=[];enemy.guard=null;enemy.riposte=0;
  enemy.expiresRound=round+4;
  // Size is intentionally unchanged: a large creature leaves a large obstacle.
  return true;
}
export function clearExpiredCorpses(state){
  for(const u of state.units)if(u.corpse&&u.expiresRound<=state.round)u.dead=true;
}
export function hasLiveOpponents(state,side){
  return state.units.some(u=>u.side===side&&!u.dead&&!u.corpse);
}
