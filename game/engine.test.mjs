import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hp, initialState, train, regenerate, support, interval, MINUTE, DAY, BURN_RF, MONTHLY_SUPPORTER_RF_ESTIMATE, STAKE_RF, trainingBonus, xpMultiplier, trainingQuote, battle, enterBattle, OPPONENTS } from './engine.ts';

test('health grows only with levels and battle health stays fixed across a level-up',()=>{
  assert.equal(hp(0),90); assert.equal(hp(99),90);
  assert.equal(hp(100),92); assert.equal(hp(900),108);
  const base=initialState(0);
  const trained=train(base,'strength',5,0);
  const first=enterBattle(base,OPPONENTS[0].stats,0,()=>.5);
  const strong=enterBattle(trained,OPPONENTS[0].stats,0,()=>.5);
  assert.equal(first.result.yourMaxHp,strong.result.yourMaxHp);
  assert.equal(strong.result.rivalMaxHp,90);
  const crossing=enterBattle({...base,xp:99},OPPONENTS[0].stats,0,()=>.5);
  assert.equal(crossing.result.yourMaxHp,90);
  assert.equal(hp(crossing.state.xp),92);
  assert.equal(enterBattle(crossing.state,OPPONENTS[0].stats,0,()=>.5).result.yourMaxHp,92);
});

test('standard and supporter refill in discrete ticks and stop at 100', () => {
  const spent = train(initialState(0), 'power', 5, 0);
  assert.equal(spent.t, 50);
  assert.equal(regenerate(spent, 15*MINUTE-1).t,50);
  assert.equal(regenerate(spent,15*MINUTE).t,55);
  assert.equal(regenerate(spent,150*MINUTE).t,100);
  const staked=support(spent,'stake',0);
  assert.equal(regenerate(staked,10*MINUTE).t,55);
  assert.equal(regenerate(staked,100*MINUTE).t,100);
  assert.equal(regenerate(spent,-1).t,50);
  const full=regenerate(initialState(0),DAY);
  const after=train(full,'power',1,DAY);
  assert.equal(regenerate(after,DAY+14*MINUTE).t,90);
  assert.equal(regenerate(after,DAY+15*MINUTE).t,95);
});
test('stake debits once, preserves fractional progress, and unstake returns once',()=>{
  assert.equal(STAKE_RF,10_000);
  let s=train(initialState(0),'power',5,0);
  s=regenerate(s,7.5*MINUTE);
  assert.equal(s.charge,.5);
  s=support(s,'stake',7.5*MINUTE);
  assert.equal(s.demoRF,initialState(0).demoRF-STAKE_RF);assert.equal(interval(s),10*MINUTE);
  assert.equal(support(s,'stake',7.5*MINUTE).demoRF,initialState(0).demoRF-STAKE_RF);
  s=regenerate(s,12.5*MINUTE);assert.equal(s.t,55);
  s=support(s,'unstake',12.5*MINUTE);assert.equal(s.demoRF,initialState(0).demoRF);
  assert.equal(support(s,'unstake',12.5*MINUTE).demoRF,initialState(0).demoRF);
  assert.equal(interval(s),15*MINUTE);
});
test('burn pass expires using old and new rates, with no refund',()=>{
  let s=support(initialState(0),'burn',0);
  assert.equal(s.demoRF,initialState(0).demoRF-BURN_RF);
  s=regenerate(s,DAY-5*MINUTE);
  s=train(s,'power',5,DAY-5*MINUTE);
  s=regenerate(s,DAY+7.5*MINUTE);
  assert.equal(s.supporter,'standard');assert.equal(s.demoRF,initialState(0).demoRF-BURN_RF);assert.equal(s.t,55);
  assert.equal(s.charge,0);
  assert.equal(support({...s,demoRF:BURN_RF-1},'burn',DAY+7.5*MINUTE).supporter,'standard');
});
test('daily and monthly passes consume the reference RF estimate for their stated duration',()=>{
  const start=initialState(0);
  const daily=support(start,'burn',0);
  assert.equal(daily.demoRF,start.demoRF-BURN_RF);
  assert.equal(daily.supporterUntil,DAY);
  const monthly=support(start,'monthly',0);
  assert.equal(monthly.demoRF,start.demoRF-MONTHLY_SUPPORTER_RF_ESTIMATE);
  assert.equal(monthly.supporterUntil,30*DAY);
  assert.equal(regenerate(monthly,30*DAY).supporter,'standard');
  assert.equal(regenerate(monthly,30*DAY).demoRF,monthly.demoRF);
});
test('intelligence gives plateau bonuses with slowdown above 1500',()=>{
  assert.equal(trainingBonus(99),0);assert.equal(trainingBonus(100),.015);
  assert.equal(trainingBonus(1000),.15);assert.equal(trainingBonus(1500),.225);
  assert.equal(trainingBonus(1699),.225);assert.equal(trainingBonus(1700),.24);
  assert.equal(trainingBonus(2500),.3);
  assert.equal(xpMultiplier(49),1);assert.equal(xpMultiplier(50),1.1);
  assert.equal(xpMultiplier(1000),3);assert.equal(xpMultiplier(1500),4);assert.equal(xpMultiplier(2500),5);
  const s={...initialState(0),stats:{...initialState(0).stats,intelligence:1000}};
  assert.equal(train(s,'power',1,0).stats.power,11.15);
});
test('study tiers, final cap and exact batch costs are enforced',()=>{
  const base=initialState(0);
  const s={...base,stats:{...base.stats,intelligence:999}};
  assert.deepEqual(trainingQuote(s,'intelligence',5),{cost:90,gain:5});
  assert.equal(train(s,'intelligence',5,0).t,10);
  const high={...base,stats:{...base.stats,intelligence:3749}};
  assert.deepEqual(trainingQuote(high,'intelligence',5),{cost:30,gain:1});
  const cap=train(high,'intelligence',5,0);assert.equal(cap.stats.intelligence,3750);
  assert.deepEqual(train(cap,'intelligence',1,0),cap);
  assert.equal(train({...base,t:9},'power',1,0).stats.power,10);
  assert.equal(train(base,'power',-1,0).t,100);
});
test('levels boost all training after XP thresholds, stack with INT, and respect caps',()=>{
  const base=initialState(0);
  for (const [xp, gain] of [[99,1],[100,1.02],[400,1.08],[900,1.18]]) {
    for (const stat of ['intelligence','strength','speed','power']) {
      const s={...base,xp};
      assert.deepEqual(trainingQuote(s,stat,1),{cost:10,gain});
      assert.equal(train(s,stat,1,0).stats[stat],10+gain);
    }
  }
  const smart={...base,xp:900,stats:{...base.stats,intelligence:1000}};
  assert.deepEqual(trainingQuote(smart,'power',5),{cost:50,gain:6.785});
  const edge={...base,xp:900,stats:{...base.stats,intelligence:999}};
  assert.deepEqual(trainingQuote(edge,'intelligence',5),{cost:90,gain:5.9});
  const capped={...base,xp:900,stats:{...base.stats,intelligence:3749.9}};
  assert.deepEqual(trainingQuote(capped,'intelligence',5),{cost:30,gain:.1});
  assert.equal(train(capped,'intelligence',5,0).stats.intelligence,3750);
  const result=enterBattle({...base,xp:99},OPPONENTS[0].stats,0,()=>.5);
  assert.equal(trainingQuote(result.state,'power',1).gain,1.02);
});
test('speed yields more attacks rather than merely taking the first turn',()=>{
  const slow={intelligence:10,strength:1000,speed:10,power:1};
  const fast={...slow,speed:20};
  const result=battle(fast,slow,()=>.5);
  assert.equal(result.turns.length,100);
  const yours=result.turns.filter(t=>t.actor==='you').length;
  assert(yours>=66 && yours<=67);
  assert(result.turns.every(t=>t.yourHp>=0 && t.rivalHp>=0));
});
test('fights charge 10 T and award intelligence-scaled XP exactly once',()=>{
  const s=initialState(0), rival=OPPONENTS[0].stats;
  const normal=enterBattle(s,rival,0,()=>.5);
  assert.equal(normal.state.t,90);assert(normal.result);
  assert.equal(normal.state.xp,normal.result.xp);
  const smart=enterBattle({...s,stats:{...s.stats,intelligence:1000}},rival,0,()=>.5);
  assert.equal(smart.result.xp,normal.result.xp*3);
  assert.equal(enterBattle({...s,t:9},rival,0).result,null);
});

