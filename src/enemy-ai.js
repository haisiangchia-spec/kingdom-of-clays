// Provisional enemy decision policy. DD1 monster-specific weights and target
// preferences are deliberately not claimed until verified against source data.
// Choose an eligible skill first, then its target: a skill with four legal
// targets must not be four times as likely as a skill with one legal target.
export function chooseEnemyAction(state,actorId,skillIds,random,abilities,availableTargets){
  const choices=[];
  for(const key of skillIds){
    const skill=abilities[key];
    if(!skill)continue;
    const targets=availableTargets(state,actorId,key);
    const weight=skill.aiWeight??1;
    if(!targets.length||!Number.isFinite(weight)||weight<=0)continue;
    choices.push({key,targets,weight});
  }
  if(!choices.length)return null;
  const total=choices.reduce((sum,x)=>sum+x.weight,0);
  let roll=random()*total;
  let selected=choices[choices.length-1];
  for(const choice of choices){
    roll-=choice.weight;
    if(roll<0){selected=choice;break;}
  }
  const index=Math.min(selected.targets.length-1,Math.floor(random()*selected.targets.length));
  return {key:selected.key,targetId:selected.targets[index]};
}
