import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaignSettlement} from '../src/settlement.js';
import {prepareRosterParty} from '../src/hero-roster.js';
import {conditionalQuirkSpeed} from '../src/trait-effects.js';
import {startRound,rng} from '../src/engine.js';
import {createDungeon,dungeonBattle,beginCorridor,advanceCorridor} from '../src/dungeon.js';

test('DD1 early riser and nocturnal apply only above 75 torch without permanently changing speed',()=>{
 const s=createCampaignSettlement();
 s.roster[0].quirks.positive.push({id:'earlyRiser',locked:false});
 s.roster[1].quirks.negative.push({id:'nocturnal',locked:true});
 const party=prepareRosterParty(s);
 const bright=party.map(u=>conditionalQuirkSpeed(u,76));
 const edge=party.map(u=>conditionalQuirkSpeed(u,75));
 const dark=party.map(u=>conditionalQuirkSpeed(u,0));
 assert.deepEqual(bright,[2,-2,0,0]);
 assert.deepEqual(edge,[0,0,0,0]);
 assert.deepEqual(dark,[0,0,0,0]);
 assert.equal(party[0].spd,s.roster[0].unit.spd);
 assert.equal(party[1].spd,s.roster[1].unit.spd);
});

test('light changes initiative with the same RNG and roster party',()=>{
 const s=createCampaignSettlement();
 s.roster[0].quirks.positive.push({id:'earlyRiser',locked:false});
 s.roster[1].quirks.negative.push({id:'nocturnal',locked:false});
 const party=prepareRosterParty(s);
 const a={units:party.map(u=>structuredClone(u)),round:0,queue:[],log:[],torch:76};
 const b={units:party.map(u=>structuredClone(u)),round:0,queue:[],log:[],torch:75};
 startRound(a,rng(111));startRound(b,rng(111));
 assert.equal(a.units.find(u=>u.id==='h1').spd,b.units.find(u=>u.id==='h1').spd);
 assert.notDeepEqual(a.queue,b.queue);
});

test('conditional speed survives a save-independent dungeon monster encounter',()=>{
 const s=createCampaignSettlement();
 s.roster[0].quirks.positive.push({id:'earlyRiser',locked:false});
 const d=createDungeon(1222,{party:prepareRosterParty(s)});
 beginCorridor(d,'gallery');advanceCorridor(d);
 const b=dungeonBattle(d);
 assert.equal(b.expeditionEncounter,true);
 assert.equal(conditionalQuirkSpeed(b.units.find(u=>u.id==='h1'),b.torch),0);
 b.torch=90;
 assert.equal(conditionalQuirkSpeed(b.units.find(u=>u.id==='h1'),b.torch),2);
});
