// Expedition-only effects for the first Clays quirk/disease subset.
// Numbers are Clays balancing fixtures, not asserted DD1 quirk statistics.
// Apply to the combat unit and reverse on return to avoid permanent stat drift.
export const TRAIT_EFFECTS=Object.freeze({
 sturdy:Object.freeze({maxHp:2}),
 eagleEye:Object.freeze({accMod:5}),
 nervous:Object.freeze({spd:-2}),
 slowReflexes:Object.freeze({dodge:-5}),
 creepingCough:Object.freeze({spd:-2}),
 ashenFever:Object.freeze({accMod:-5,bleedResist:-10})
});
export const DISEASE_EXPOSURE_CHANCE=0; // DD1 crypt defenders/arbalists do not have a disease-on-hit skill
const diseaseChoices=['creepingCough','ashenFever'];
const statKeys=['maxHp','accMod','spd','dodge'];
const resistKeys=['bleedResist'];
export function traitBonus(hero){
 const sum={maxHp:0,accMod:0,spd:0,dodge:0,bleedResist:0};
 const ids=[...(hero.quirks?.positive??[]).map(x=>x.id),
  ...(hero.quirks?.negative??[]).map(x=>x.id),...(hero.diseases??[])];
 for(const id of ids){
  const effect=TRAIT_EFFECTS[id];
  if(effect)for(const key of Object.keys(sum))sum[key]+=effect[key]??0;
 }
 return sum;
}
export function applyTraitBonus(unit,bonus){
 if(unit.traitApplied)throw Error('Trait modifiers already applied');
 const copy={...bonus};
 for(const key of statKeys)unit[key]=(unit[key]??0)+(bonus[key]??0);
 unit.hp=Math.max(0,Math.min(unit.maxHp,unit.hp+(bonus.maxHp??0)));
 unit.resist??={};
 unit.resist.bleed=(unit.resist.bleed??0)+(bonus.bleedResist??0);
 unit.traitApplied=copy;
 return unit;
}
export function reverseTraitBonus(unit){
 const bonus=unit.traitApplied;
 if(!bonus)return unit;
 for(const key of statKeys)unit[key]=(unit[key]??0)-(bonus[key]??0);
 unit.hp=Math.max(0,Math.min(unit.maxHp,unit.hp-(bonus.maxHp??0)));
 unit.resist.bleed=(unit.resist.bleed??0)-(bonus.bleedResist??0);
 delete unit.traitApplied;
 return unit;
}
export function exposeHeroToDisease(state,attacker,hero,random,skillKey=null){
 if(!state.expeditionEncounter||attacker.side!=='enemy'||hero.side!=='hero'||!hero.rosterId||hero.dead)return false;
 const sourceWretch=attacker.enemyProfile==='plagueWretch'&&['plague_vomit','plague_champion_vomit'].includes(skillKey);
 if(!sourceWretch)return false;
 // The real DD1 Swine Wretch Vomit has a 33% chance to cause disease.
 // No generic disease proc is added to unlisted enemy attacks.
 const chance=33;
 if(random()*100>=chance)return false;
 hero.diseases??=[];
 const disease=diseaseChoices[Math.floor(random()*diseaseChoices.length)];
 if(hero.diseases.includes(disease)||hero.diseases.length>=3)return false;
 hero.diseases.push(disease);
 if(hero.traitApplied){
  const newEffect=TRAIT_EFFECTS[disease];
  for(const key of statKeys){
   hero[key]=(hero[key]??0)+(newEffect[key]??0);
   hero.traitApplied[key]=(hero.traitApplied[key]??0)+(newEffect[key]??0);
  }
  hero.resist.bleed=(hero.resist.bleed??0)+(newEffect.bleedResist??0);
  hero.traitApplied.bleedResist=(hero.traitApplied.bleedResist??0)+(newEffect.bleedResist??0);
 }
 state.log.push(hero.name+' contracts '+(disease==='creepingCough'?'Creeping Cough':'Ashen Fever')+'!');
 return true;
}

// DD1: Early Riser gains 2 SPD with light strictly above 75;
// Nocturnal loses 2 SPD at that same threshold.
export function conditionalQuirkSpeed(unit,torch){
 if(!Number.isFinite(torch)||torch<=75)return 0;
 const positive=unit.quirks?.positive??[],negative=unit.quirks?.negative??[];
 return (positive.some(q=>q.id==='earlyRiser')?2:0)+(negative.some(q=>q.id==='nocturnal')?-2:0);
}
