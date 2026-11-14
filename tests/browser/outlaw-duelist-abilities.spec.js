import {test,expect} from '@playwright/test';

test('Veteran Outlaw Duelist resolves exact skill damage and crossblade bleed debuff',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,takeTurn,ABILITIES}=await import('./src/engine.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeUndeadEncounter(101,'outlawPatrol');
  const h1=b.units.find(u=>u.id==='h1'),h2=b.units.find(u=>u.id==='h2');
  const before=[h1.hp,h2.hp];
  b.queue=['e1'];
  takeTurn(b,'e1','duelist_sweep','h1',()=>.5);
  const after=[h1.hp,h2.hp];
  return {
   damage:before.map((hp,i)=>hp-after[i]),
   penalties:[effectModifier(h1,'bleedResist'),effectModifier(h2,'bleedResist')],
   shank:[ABILITIES.duelist_shank.damageMin,ABILITIES.duelist_shank.damageMax,ABILITIES.duelist_shank.status.value]
  };
 });
 expect(result).toEqual({damage:[5,6],penalties:[-25,-25],shank:[5,11,2]});
});

test('Veteran Outlaw Duelist rear poke advances and grants Speed on miss',async ({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async ()=>{
  const {makeUndeadEncounter,takeTurn,rank}=await import('./src/engine.js');
  const {moveWithinFormation}=await import('./src/formation.js');
  const {effectModifier}=await import('./src/status.js');
  const b=makeUndeadEncounter(102,'outlawPatrol'),d=b.units.find(u=>u.id==='e1');
  moveWithinFormation(b,'e1',3);
  const before=rank(b,'e1');
  b.queue=['e1'];
  takeTurn(b,'e1','duelist_poke','h1',()=>.99);
  return {before,after:rank(b,'e1'),speed:effectModifier(d,'speed')};
 });
 expect(result).toEqual({before:3,after:2,speed:2});
});
