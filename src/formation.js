// DD1 position, stealth, mark and corpse primitives. Engine-side; display names stay reskinned.
export function alive(sideUnits){return sideUnits.filter(x=>!x.dead&&!x.corpse);}
export function isSelectable(unit,skill,side){
  if(unit.dead)return false;
  if(unit.corpse)return side==='enemy' && skill.kind!=='mark' && skill.kind!=='stress' && !['heal','groupHeal','guard','buff','cleanse','restore'].includes(skill.kind);
  return !unit.stealthed || !!skill.ignoreStealth;
}
export function moveWithinFormation(state,unitId,delta){
  const entity=state.units.find(x=>x.id===unitId);
  if(!entity||entity.dead||entity.corpse)return 0;
  const own=state.units.filter(x=>x.side===entity.side&&!x.dead);
  const old=own.findIndex(x=>x.id===unitId);
  const next=Math.min(own.length-1,Math.max(0,old+delta));
  if(next===old)return 0;
  own.splice(old,1);own.splice(next,0,entity);
  let pos=0;
  state.units=state.units.map(x=>x.side===entity.side&&!x.dead?own[pos++]:x);
  return next-old;
}
export function attemptDisplacement(state,entity,move,rng){
  const resist=entity.resist?.move??0;
  const chance=Math.max(0,Math.min(100,(move.chance??100)-resist));
  if(rng()*100>=chance)return 0;
  const direction=move.type==='pull'?-1:move.type==='push'?1:0;
  if(move.type==='shuffle'){
    const own=state.units.filter(x=>x.side===entity.side&&!x.dead);
    const previous=own.findIndex(x=>x.id===entity.id);
    if(own.length<2)return 0;
    const choices=own.map((_,i)=>i).filter(i=>i!==previous);
    const choice=choices[Math.floor(rng()*choices.length)];
    return moveWithinFormation(state,entity.id,choice-previous);
  }
  return moveWithinFormation(state,entity.id,direction*(move.distance??1));
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
  return true;
}
export function clearExpiredCorpses(state){
  for(const u of state.units)if(u.corpse && u.expiresRound<=state.round)u.dead=true;
}
export function hasLiveOpponents(state,side){
  return state.units.some(u=>u.side===side&&!u.dead&&!u.corpse);
}
