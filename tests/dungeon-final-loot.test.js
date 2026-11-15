import test from 'node:test';
import assert from 'node:assert/strict';
import {createDungeon,beginCorridor,advanceCorridor,dungeonBattle,resolveDungeonBattle} from '../src/dungeon.js';
import {collectLoot,leaveLoot,claimExpeditionRewards} from '../src/inventory.js';
import {createCampaignSettlement} from '../src/settlement.js';
import {status} from '../src/engine.js';

function clearEncounter(d){
 const battle=dungeonBattle(d);
 assert.ok(battle);
 for(const foe of battle.units.filter(u=>u.side==='enemy'))foe.dead=true;
 assert.equal(status(battle),'victory');
 resolveDungeonBattle(d);
}
function travel(d,room){
 beginCorridor(d,room);
 let guard=0;
 while(d.pendingTravel&&guard++<40){
  if(d.pendingLoot)leaveLoot(d);
  if(d.pendingHunger)throw Error('Unexpected hunger in noninteractive test route');
  if(d.phase==='combat'){clearEncounter(d);continue;}
  advanceCorridor(d);
 }
 assert.ok(guard<40,'corridor must terminate');
 assert.equal(d.room,room);
 if(d.phase==='combat')clearEncounter(d);
 if(d.pendingLoot)leaveLoot(d);
}
test('final Sanctum battle awards loot that must be collected before settlement transfer',()=>{
 const d=createDungeon(48,{interactiveEvents:true,variableCorridors:false});
 // Disable hunger events to isolate final encounter reward handling.
 d.interactiveEvents=false;
 travel(d,'gallery');
 travel(d,'vault');
 // Restore interactive rewards only for the final encounter.
 d.interactiveEvents=true;
 beginCorridor(d,'sanctum');
 let guard=0;
 while(d.phase!=='victory'&&guard++<20){
  if(d.pendingLoot)leaveLoot(d);
  if(d.pendingHunger){d.pendingHunger=false;d.lastHungerStep=d.stepsTaken;}
  if(d.phase==='combat')clearEncounter(d);
  else advanceCorridor(d);
 }
 assert.equal(d.phase,'victory');
 assert.ok(d.pendingLoot,'final encounter should offer loot');
 assert.throws(()=>claimExpeditionRewards(d,createCampaignSettlement()),/pending loot/);
 collectLoot(d);
 const settlement=createCampaignSettlement();
 const reward=claimExpeditionRewards(d,settlement);
 assert.ok(reward.totalGold>0);
 assert.equal(d.rewardClaimed,true);
});
