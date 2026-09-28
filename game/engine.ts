export const STATS = ['intelligence', 'strength', 'speed', 'power'] as const;
export type Stat = typeof STATS[number];
export type Stats = Record<Stat, number>;
export const MINUTE = 60_000, DAY = 24 * 60 * MINUTE;
// Mock RF estimates only. The live equivalent should be quoted dynamically from USD targets.
export const MONTHLY_SUPPORTER_USD = 5, DAILY_SUPPORTER_USD = 1;
export const MONTHLY_SUPPORTER_RF_ESTIMATE = 3100, DAILY_SUPPORTER_RF_ESTIMATE = 620;
export const CHARACTER_DEPOSIT_RF_PROPOSAL = 10_000;
export const STAKE_RF = CHARACTER_DEPOSIT_RF_PROPOSAL, BURN_RF = DAILY_SUPPORTER_RF_ESTIMATE, FIGHT_T = 10;
export type TrainingState = {
  t: number; stats: Stats; lastUpdate: number; charge: number;
  supporter: 'standard' | 'stake' | 'burn' | 'monthly'; supporterUntil: number;
  demoRF: number; xp: number;
};
export const initialState = (now = Date.now()): TrainingState => ({ t: 100,
  stats: { intelligence: 10, strength: 10, speed: 10, power: 10 },
  lastUpdate: now, charge: 0, supporter: 'standard', supporterUntil: 0, demoRF: 10_000, xp: 0 });
export const interval = (state: TrainingState) => (state.supporter === 'standard' ? 15 : 10) * MINUTE;
function accrue(state: TrainingState, now: number): TrainingState {
  if (now <= state.lastUpdate) return state;
  if (state.t >= 100) return { ...state, lastUpdate: now, charge: 0 };
  const charge = state.charge + (now - state.lastUpdate) / interval(state);
  const ticks = Math.floor(charge + 1e-10);
  const t = Math.min(100, state.t + ticks * 5);
  return { ...state, t, lastUpdate: now, charge: t === 100 ? 0 : Math.max(0, charge - ticks) };
}
/** Split elapsed time at burn-pass expiry so each segment uses the correct rate. */
export function regenerate(state: TrainingState, now = Date.now()): TrainingState {
  if (now < state.lastUpdate) return state;
  if ((state.supporter === 'burn' || state.supporter === 'monthly') && now >= state.supporterUntil) {
    state = accrue(state, Math.max(state.lastUpdate, state.supporterUntil));
    state = { ...state, supporter: 'standard', supporterUntil: 0 };
  }
  return accrue(state, now);
}
export function support(state: TrainingState, mode: 'stake' | 'burn' | 'monthly' | 'unstake', now = Date.now()): TrainingState {
  state = regenerate(state, now);
  if (mode === 'unstake') return state.supporter === 'stake' ? { ...state, supporter: 'standard', demoRF: state.demoRF + STAKE_RF } : state;
  if (state.supporter !== 'standard') return state;
  const cost = mode === 'stake' ? STAKE_RF : mode === 'burn' ? BURN_RF : MONTHLY_SUPPORTER_RF_ESTIMATE;
  if (state.demoRF < cost) return state;
  const duration = mode === 'monthly' ? 30 * DAY : mode === 'burn' ? DAY : 0;
  return { ...state, supporter: mode, demoRF: state.demoRF - cost, supporterUntil: duration ? now + duration : 0 };
}
export const trainingBonus = (intel: number) => 15 * (Math.floor(Math.min(intel, 1500) / 100) + Math.floor(Math.max(0, intel - 1500) / 200)) / 1000;
export const xpMultiplier = (intel: number) => (10 + Math.floor(Math.min(intel, 1500) / 50) + Math.floor(Math.max(0, intel - 1500) / 100)) / 10;
export const studyCost = (intel: number) => intel < 1000 ? 10 : intel < 2500 ? 20 : 30;
export const studyName = (intel: number) => intel < 1000 ? 'School' : intel < 2500 ? 'Advanced study' : intel < 3750 ? 'Research' : 'Final cap';
export const level = (xp: number) => 1 + Math.floor(xp / 100);
export const levelTrainingMultiplier = (xp: number) => 1 + (level(xp) - 1) * .02;
export const gainPerRep = (state: TrainingState, stat: Stat) => (stat === 'intelligence' ? 1 : 1 + trainingBonus(state.stats.intelligence)) * levelTrainingMultiplier(state.xp);
export function trainingQuote(state: TrainingState, stat: Stat, reps: number) {
  let cost = 0, gain = 0;
  for (let i = 0; i < reps; i++) {
    if (stat === 'intelligence') {
      if (state.stats.intelligence + gain >= 3750) break;
      cost += studyCost(state.stats.intelligence + gain);
      gain += Math.min(gainPerRep(state, stat), 3750 - state.stats.intelligence - gain);
    } else { cost += 10; gain += gainPerRep(state, stat); }
  }
  return { cost, gain: Math.round(gain * 1000) / 1000 };
}
export function train(state: TrainingState, stat: Stat, reps: number, now = Date.now()): TrainingState {
  state = regenerate(state, now);
  if (!STATS.includes(stat) || ![1, 5].includes(reps)) return state;
  const { cost, gain } = trainingQuote(state, stat, reps);
  if (!gain || state.t < cost) return state;
  return { ...state, t: state.t - cost, stats: { ...state.stats, [stat]: Math.round((state.stats[stat] + gain) * 1000) / 1000 } };
}
export const OPPONENTS = [
  { name: 'The Rookie', level: 1, tag: 'Balanced', note: 'A fair first test. No tricks, just fundamentals.', stats: { intelligence: 8, strength: 8, speed: 8, power: 8 } },
  { name: 'Quickstep', level: 2, tag: 'Speed specialist', note: 'More attacks. Make every one of yours count.', stats: { intelligence: 10, strength: 10, speed: 22, power: 12 } },
  { name: 'Heavy Hitter', level: 3, tag: 'Power specialist', note: 'Big swings. Train strength to stay standing.', stats: { intelligence: 12, strength: 20, speed: 8, power: 24 } },
  { name: 'Alley Champ', level: 5, tag: 'Well rounded', note: 'A seasoned fighter with no easy opening.', stats: { intelligence: 20, strength: 24, speed: 22, power: 28 } },
  { name: 'Iron Jaw', level: 8, tag: 'Defensive wall', note: 'High endurance and a punishing counter.', stats: { intelligence: 28, strength: 40, speed: 24, power: 36 } },
  { name: 'The Enforcer', level: 12, tag: 'Heavyweight', note: 'Fast and dangerous. Bring a complete build.', stats: { intelligence: 40, strength: 48, speed: 42, power: 52 } },
  { name: 'Night King', level: 18, tag: 'Arena veteran', note: 'Elite speed and power. Only a serious fighter should enter.', stats: { intelligence: 60, strength: 68, speed: 62, power: 72 } },
  { name: 'Dojo Legend', level: 25, tag: 'Final challenge', note: 'The arena’s toughest test. Train hard before challenging.', stats: { intelligence: 90, strength: 96, speed: 86, power: 102 } },
];
export const hp = (xp = 0) => 90 + 2 * (level(xp) - 1);
export type Turn = { actor: 'you' | 'rival'; damage: number; critical: boolean; dodged: boolean; yourHp: number; rivalHp: number };
export type Battle = { turns: Turn[]; winner: 'you' | 'rival' | 'draw'; xp: number; yourMaxHp: number; rivalMaxHp: number };
export function battle(you: Stats, rival: Stats, random: () => number = Math.random, yourXp = 0, rivalLevel = 1): Battle {
  const yourMaxHp = hp(yourXp), rivalMaxHp = hp((rivalLevel - 1) * 100);
  let yourHp = yourMaxHp, rivalHp = rivalMaxHp;
  const turns: Turn[] = [];
  const yourDelay = 1 / Math.max(1, you.speed), rivalDelay = 1 / Math.max(1, rival.speed);
  let yourNext = yourDelay, rivalNext = rivalDelay;
  for (let i = 0; i < 100 && yourHp > 0 && rivalHp > 0; i++) {
    const player = Math.abs(yourNext - rivalNext) < 1e-10 ? random() < .5 : yourNext < rivalNext;
    if (player) yourNext += yourDelay; else rivalNext += rivalDelay;
    const attacker = player ? you : rival, defender = player ? rival : you;
    const dodged = random() < .05;
    const critical = !dodged && random() < .10;
    const damage = dodged ? 0 : Math.max(1, Math.round((6 + attacker.power * 1.2 + attacker.strength * .25 - defender.strength * .3) * (.9 + random() * .2) * (critical ? 1.6 : 1)));
    if (player) rivalHp = Math.max(0, rivalHp - damage); else yourHp = Math.max(0, yourHp - damage);
    turns.push({ actor: player ? 'you' : 'rival', damage, critical, dodged, yourHp, rivalHp });
  }
  const yours = yourHp / yourMaxHp, theirs = rivalHp / rivalMaxHp;
  const winner = yours === theirs ? 'draw' : yours > theirs ? 'you' : 'rival';
  const baseXp = winner === 'you' ? 20 + 10 * Math.max(0, rivalLevel - 1) : winner === 'draw' ? 15 : 10;
  return { turns, winner, yourMaxHp, rivalMaxHp, xp: Math.round(baseXp * xpMultiplier(you.intelligence)) };
}
export function enterBattle(state: TrainingState, rival: Stats, now = Date.now(), random: () => number = Math.random, rivalLevel = 1) {
  state = regenerate(state, now);
  if (state.t < FIGHT_T) return { state, result: null };
  const result = battle(state.stats, rival, random, state.xp, rivalLevel);
  return { state: { ...state, t: state.t - FIGHT_T, xp: state.xp + result.xp }, result };
}

