import {test,expect} from '@playwright/test';

test('browser disables locked Veteran and Champion tiers without overwriting completed expedition',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave,encodeCampaignSave}=await import('/src/settlement.js');
  const state=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  state.expedition.phase='victory';
  state.expedition.rewardClaimed=true;
  state.expedition.rosterReturned=true;
  state.expedition.townWeekProcessed=true;
  state.expedition.cleared=['sanctum'];
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(state.settlement,state.expedition));
 });
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('VICTORY');
 await expect(page.locator('#dungeon-region option[value="plague"]')).toBeDisabled();
 await expect(page.locator('#dungeon-tier option[value="veteran"]')).toBeDisabled();
 await expect(page.locator('#dungeon-tier option[value="champion"]')).toBeDisabled();
 const before=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,region:expedition.region,tier:expedition.tier,room:expedition.room,phase:expedition.phase};
 });
 await page.reload();
 const after=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  const {expedition}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {seed:expedition.seed,region:expedition.region,tier:expedition.tier,room:expedition.room,phase:expedition.phase};
 });
 expect(after).toEqual(before);
});
test('browser reload preserves staged quest unlocks and campaign completion',async ({page})=>{
 await page.goto('/dungeon.html');
 const stages=[
  {count:0,victories:[],recon:false,veteran:false,champion:false,finished:false},
  {count:1,victories:[],recon:true,veteran:false,champion:false,finished:false},
  {count:3,victories:[],recon:true,veteran:true,champion:false,finished:false},
  {count:3,victories:['veteran-victory'],recon:true,veteran:true,champion:true,finished:false},
  {count:4,victories:['veteran-victory','champion-victory'],recon:true,veteran:true,champion:true,finished:true}
 ];
 for(const stage of stages){
  await page.evaluate(({count,victories})=>{
   const raw=localStorage.getItem('kingdom-of-clays-campaign-v1');
   const payload=JSON.parse(raw);
   payload.settlement.completedExpeditions=count;
   payload.settlement.campaignVictories=victories;
   localStorage.setItem('kingdom-of-clays-campaign-v1',JSON.stringify(payload));
  },stage);
  await page.reload();
  const actual=await page.evaluate(async ()=>{
   const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
   const {availableQuests}=await import('/src/quest-board.js');
   const {campaignProgress}=await import('/src/campaign-progression.js');
   const {settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
   const quests=availableQuests(settlement);
   const unlocked=id=>quests.find(q=>q.id===id)?.unlocked;
   return {recon:unlocked('warrens-recon'),veteran:unlocked('warrens-veteran'),
    champion:unlocked('warrens-champion'),finished:campaignProgress(settlement).finished};
  });
  expect(actual).toEqual({recon:stage.recon,veteran:stage.veteran,
   champion:stage.champion,finished:stage.finished});
 }
});

test('browser selects a newly unlocked Warrens quest after returning from a completed expedition',async ({page})=>{
 await page.goto('/dungeon.html');
 await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave,encodeCampaignSave}=await import('/src/settlement.js');
  const state=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  state.settlement.completedExpeditions=1;
  state.expedition.phase='victory';
  state.expedition.rewardClaimed=true;
  state.expedition.rosterReturned=true;
  state.expedition.townWeekProcessed=true;
  state.expedition.cleared=['sanctum'];
  localStorage.setItem(CAMPAIGN_SAVE_KEY,encodeCampaignSave(state.settlement,state.expedition));
 });
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('VICTORY');
 await page.locator('#dungeon-region').selectOption('plague');
 await page.locator('#dungeon-tier').selectOption('apprentice');
 await page.getByRole('button',{name:'New expedition'}).click();
 const state=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  const {expedition,settlement}=decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY));
  return {region:expedition.region,tier:expedition.tier,phase:expedition.phase,
   questId:expedition.questId,completedExpeditions:settlement.completedExpeditions};
 });
 expect(state).toEqual({region:'plague',tier:'apprentice',phase:'explore',
  questId:'warrens-recon',completedExpeditions:1});
 await page.reload();
 await expect(page.locator('#dungeon-status')).toContainText('EXPLORE');
 const persisted=await page.evaluate(async ()=>{
  const {CAMPAIGN_SAVE_KEY,decodeCampaignSave}=await import('/src/settlement.js');
  return decodeCampaignSave(localStorage.getItem(CAMPAIGN_SAVE_KEY)).expedition.questId;
 });
 expect(persisted).toBe('warrens-recon');
});
