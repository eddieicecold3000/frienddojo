import { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '@rarefriends/friendsdk/runtime';
import { createFriendReader, spriteFrame } from '@rarefriends/friendsdk/sprites';
import { STATS, initialState, regenerate, train, enterBattle, hp, OPPONENTS, interval, support, trainingQuote, trainingBonus, level, levelTrainingMultiplier, xpMultiplier, studyName, MINUTE, STAKE_RF, BURN_RF, MONTHLY_SUPPORTER_RF_ESTIMATE, CHARACTER_DEPOSIT_RF_PROPOSAL, FIGHT_T, type Battle } from './engine';
import './style.css';
import './tabs.css';

const labels = { intelligence: 'Intelligence', strength: 'Strength', speed: 'Speed', power: 'Power' };
const descriptions = { intelligence: 'Learn faster. Gain more stats and fight XP.', strength: 'More defence and a little damage.', speed: 'More speed. More attacks in every fight.', power: 'Hit harder. Make each attack count.' };
const glyphs = { intelligence: 'INT', strength: 'STR', speed: 'SPD', power: 'PWR' };
const number = (value: number) => Number(value.toFixed(3)).toLocaleString('en-US', { maximumFractionDigits: 3 });

function FriendArt({ friendId, paused }: { friendId: bigint; paused: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [revision, setRevision] = useState(0), [status, setStatus] = useState('Loading your Friend…');
  useEffect(() => {
    let cancelled = false;
    setStatus('Loading your Friend…');
    void createFriendReader().read(friendId).then(sprites => {
      if (cancelled) return;
      const context = canvas.current?.getContext('2d');
      if (!context) { setStatus('Artwork unavailable'); return; }
      context.clearRect(0, 0, 16, 16); context.fillStyle = '#111313';
      spriteFrame(sprites, 'down', false, 0).frame.rows.forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel === '#') context.fillRect(x, y, 1, 1); }));
      setStatus('');
    }).catch(() => { if (!cancelled) setStatus('Artwork unavailable'); });
    return () => { cancelled = true; };
  }, [friendId, revision]);
  return <div className="portrait"><canvas width="16" height="16" ref={canvas} role="img" aria-label={`Original artwork for Friend ${friendId}`} hidden={!!status}/>{status && <div className="art-status" role="status">{status}{status === 'Artwork unavailable' && <button disabled={paused} onClick={() => setRevision(v => v + 1)}>Retry artwork</button>}</div>}</div>;
}

export default function FriendDojo({ friendId, client, paused, demoMode = false }: GameComponentProps & { demoMode?: boolean }) {
  const [connected, setConnected] = useState(false), [connectionError, setConnectionError] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setConnected(false); setConnectionError('');
    void client.read().then(snapshot => {
      if (cancelled) return;
      if (snapshot.friendId !== friendId) throw new Error('The selected Friend changed. Reconnect to continue.');
      setConnected(true);
    }).catch(error => { if (!cancelled) setConnectionError(error instanceof Error ? error.message : 'Could not load this session.'); });
    return () => { cancelled = true; };
  }, [client, friendId, retry]);
  const [state, setState] = useState(initialState), [tab, setTab] = useState<'train' | 'arena' | 'supporter' | 'clock' | 'roadmap' | 'rules'>('train');
  const [supportChoice, setSupportChoice] = useState<'stake' | 'burn' | 'monthly' | null>(null);
  const [supportPlan, setSupportPlan] = useState<'character' | 'economy' | null>(null);
  const offset = useRef(0);
  const now = () => Date.now() + offset.current;
  const [sessions, setSessions] = useState(1), [message, setMessage] = useState('Choose a stat. Make your Friend stronger.');
  const [opponent, setOpponent] = useState(0), [result, setResult] = useState<Battle | null>(null), [turn, setTurn] = useState(0);
  const [record, setRecord] = useState({ wins: 0, losses: 0, draws: 0 });
  const [clock, setClock] = useState(Date.now());
  const [reduceMotion, setReduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const live = useRef({ paused }); live.current = { paused };
  useEffect(() => { offset.current = 0; setState(initialState()); setResult(null); setRecord({ wins: 0, losses: 0, draws: 0 }); setSupportChoice(null); }, [friendId]);
  useEffect(() => { const timer = setInterval(() => { const time = Date.now() + offset.current; setClock(time); if (!live.current.paused) setState(s => regenerate(s, time)); }, 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!result || paused || turn >= result.turns.length) return;
    if (reduceMotion) { setTurn(result.turns.length); return; }
    const timer = setTimeout(() => setTurn(t => t + 1), 650); return () => clearTimeout(timer);
  }, [result, turn, paused, reduceMotion]);
  const total = STATS.reduce((sum, stat) => sum + state.stats[stat], 0), rival = OPPONENTS[opponent];
  const running = !!result && turn < result.turns.length, finished = !!result && !running;
  const latest = result && turn ? result.turns[turn - 1] : null;
  const seconds = Math.max(0, Math.ceil((1 - state.charge) * interval(state) / 1000));
  const nextTick = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  const supporterName = state.supporter === 'standard' ? 'Standard' : 'RF Supporter';
  const supportName = supportPlan === 'character' ? `Friend #${friendId.toString()}` : supportPlan === 'economy' ? 'the shared Dojo economy' : 'this session';
  const energy = <div className="energy"><div><span className="eyebrow">AWAKE / T</span><p><strong data-testid="energy">{state.t}</strong><span> / 100 T</span></p></div><div className="energy-reset"><b>{supporterName} · +5 T / {interval(state) / MINUTE} min</b><span>{state.t === 100 ? 'Fully awake · no T banked above 100' : `Next +5 T in ${nextTick}`}</span></div><progress max="100" value={state.t} aria-label="Training energy remaining"/></div>;
  function fight() {
    if (paused || running) return;
    const attempt = enterBattle(state, rival.stats, now(), Math.random, rival.level);
    setState(attempt.state);
    if (!attempt.result) return;
    const next = attempt.result; setResult(next); setTurn(0);
    setRecord(r => ({ wins: r.wins + Number(next.winner === 'you'), losses: r.losses + Number(next.winner === 'rival'), draws: r.draws + Number(next.winner === 'draw') }));
  }
  if (!connected) return <section className="dojo" role={connectionError ? 'alert' : 'status'}>{connectionError || 'Loading your dojo…'}{connectionError && <button disabled={paused} onClick={() => setRetry(v => v + 1)}>Retry session</button>}</section>;
  return <section className="dojo" aria-label="Friend Dojo" data-reduced-motion={reduceMotion}>
    <div className="game-top"><div><span className="eyebrow">RARE FRIENDS / TRAINING CLUB</span><h1>Friend Dojo<span className="title-mark">↗</span></h1></div><span className="preview-label">{demoMode ? "GUEST DEMO" : "SIMULATED PREVIEW"}</span></div>
    <div className="game-layout" inert={paused || undefined}>
      <aside className="character-panel"><div className="character-heading"><span className="eyebrow">{demoMode ? "SAMPLE FRIEND" : "YOUR GENERATIONS FRIEND"}</span><span className="rank">LV {level(state.xp)}</span></div>
        <FriendArt friendId={friendId} paused={paused}/>{demoMode && <p className="xp-readout">Sample character · no ownership claimed<br/>Demo progress resets on reload.</p>}<h2>Friend #{friendId.toString()}</h2><p className="character-subtitle">{total < 60 ? 'A little potential. A lot of fight.' : 'Putting in the work.'}</p>
        {!demoMode && <div className="spotlight-note"><span className="eyebrow">CHARACTER SPOTLIGHT</span><p>Your selected Generations Friend is the fighter, the face of every matchup, and the one you train toward the Dojo Legend challenge.</p></div>}
        <div className="rating"><span>Total stats</span><strong data-testid="total">{number(total)}</strong></div>
        <div className="mini-stats">{STATS.map(stat => <div key={stat}><span>{glyphs[stat]}</span><meter min="0" max={Math.max(40, state.stats[stat])} value={state.stats[stat]} aria-label={labels[stat]}/><b>{number(state.stats[stat])}</b></div>)}</div>
        <p className="xp-readout" data-testid="xp">{state.xp} XP · {100 - state.xp % 100} to next level</p>
        <p className="xp-readout" data-testid="level-bonus">+{Math.round((levelTrainingMultiplier(state.xp) - 1) * 100)}% training from level · +2% next level</p>
        <p className="xp-readout" data-testid="max-hp">{hp(state.xp)} max HP · +2 next level</p>
        <div className="record"><span><b>{record.wins}</b> wins</span><span><b>{record.losses}</b> losses</span><span><b>{record.draws}</b> draws</span></div>
      </aside>
      <main className="workspace"><nav className="tabs" aria-label="Dojo activities">{(['train','arena','supporter','clock','roadmap','rules'] as const).map(item => <button key={item} aria-current={tab === item ? 'page' : undefined} disabled={running && item !== 'arena'} onClick={() => { if (!paused) { setTab(item); setSupportChoice(null); } }}>{item === 'train' ? 'Training' : item === 'arena' ? 'Arena' : item === 'supporter' ? 'RF Supporter' : item === 'clock' ? 'Preview Clock' : item === 'roadmap' ? 'Roadmap' : 'Rules'}</button>)}</nav>
        {tab === 'train' && <>{energy}
          <div className="section-heading"><h2>Put in the reps.</h2><div className="dose" role="group" aria-label="Training amount"><button aria-pressed={sessions === 1} onClick={() => setSessions(1)}>1 rep</button><button aria-pressed={sessions === 5} onClick={() => setSessions(5)}>5 reps</button></div></div>
          <div className="training-grid">{STATS.map((stat, index) => { const quote = trainingQuote(state, stat, sessions); return <article className={`training-card ${stat}`} key={stat}><div className="card-top"><span className="stat-badge">{glyphs[stat]}</span><span className="station">0{index + 1}</span></div><div className="stat-title"><h3>{labels[stat]}</h3><strong data-testid={stat}>{number(state.stats[stat])}</strong></div><p>{descriptions[stat]}</p><button disabled={paused || !quote.gain || state.t < quote.cost} onClick={() => { if (paused) return; setState(s => train(s, stat, sessions, now())); setMessage(`+${number(quote.gain)} ${labels[stat]} · ${quote.cost} T spent`); }}>Train +{number(quote.gain)}<span>{quote.cost} T ↗</span></button></article>; })}</div>
          <p className="feedback" role="status">{state.t < 10 ? 'Rest to recover T, or use the Preview Clock tab.' : message}</p>
          <p className="intel-summary">{studyName(state.stats.intelligence)} · +{number(trainingBonus(state.stats.intelligence))} base combat stat / rep · +{Math.round((xpMultiplier(state.stats.intelligence) - 1) * 100)}% fight XP</p>
        </>}
        {tab === 'arena' && <div className="arena">{energy}<div className="section-heading"><div><span className="eyebrow">PRACTICE ARENA</span><h2>Test your training.</h2></div><span className="free-tag">{FIGHT_T} T / FIGHT</span></div><p className="muted">Earn fight XP. No wagers, RF payouts or stat loss.</p>
          <label className="opponent-label">Choose your opponent<select value={opponent} disabled={running || paused} onChange={e => { setOpponent(Number(e.target.value)); setResult(null); setTurn(0); }}>{OPPONENTS.map((item, i) => <option key={item.name} value={i}>{item.name} · LV {item.level} · {item.tag} · {Math.round((20 + (item.level - 1) * 10) * xpMultiplier(state.stats.intelligence))} XP win</option>)}</select></label>
          <div className="matchup"><div><span className="eyebrow">YOU · LV {level(state.xp)}</span><h3>{demoMode ? 'Sample Friend' : `Friend #${friendId.toString()}`}</h3><b>{latest?.yourHp ?? (result?.yourMaxHp ?? hp(state.xp))} / {(result?.yourMaxHp ?? hp(state.xp))} HP</b><progress value={latest?.yourHp ?? (result?.yourMaxHp ?? hp(state.xp))} max={(result?.yourMaxHp ?? hp(state.xp))} aria-label="Your health"/></div><span className="versus">VS</span><div><span className="eyebrow">{rival.tag} · LV {rival.level}</span><h3>{rival.name}</h3><b>{latest?.rivalHp ?? (result?.rivalMaxHp ?? hp((rival.level - 1) * 100))} / {(result?.rivalMaxHp ?? hp((rival.level - 1) * 100))} HP</b><progress value={latest?.rivalHp ?? (result?.rivalMaxHp ?? hp((rival.level - 1) * 100))} max={(result?.rivalMaxHp ?? hp((rival.level - 1) * 100))} aria-label="Rival health"/></div></div>
          <div className="rival-stats">{STATS.map(stat => <span key={stat}>{glyphs[stat]} <b>{rival.stats[stat]}</b></span>)}</div>
          <p className="rival-note">{rival.note}</p><div className="battle-actions"><button className="primary" disabled={paused || running || state.t < FIGHT_T} onClick={fight}>{running ? 'Battle in progress…' : state.t < FIGHT_T ? 'Need 10 T to fight' : finished ? 'Fight again ↗' : 'Enter the arena ↗'}</button>{running && <button onClick={() => { if (!paused && result) setTurn(result.turns.length); }}>Skip animation</button>}</div>
          <div className={`battle-result ${finished ? 'complete' : ''}`} role="status">{finished ? `${result!.winner === 'you' ? 'VICTORY.' : result!.winner === 'draw' ? 'DRAW.' : 'DEFEAT.'} +${result!.xp} XP earned.` : running ? `Attack ${turn} · Trading blows…` : 'Ready when you are.'}</div>
          {!!result && <ol className="battle-log" aria-label="Battle recap">{result.turns.slice(0, turn).map((hit, i) => <li key={i}><span>{String(i + 1).padStart(2,'0')}</span>{hit.dodged ? `${hit.actor === 'you' ? rival.name : 'You'} dodged.` : `${hit.actor === 'you' ? 'You' : rival.name} hit for ${hit.damage}${hit.critical ? ' — critical!' : '.'}`}</li>)}</ol>}
        </div>}
        {tab === 'clock' && <div className="preview-clock"><span className="eyebrow">TEST TOOL</span><h2>Preview Clock</h2><p className="muted">Skip waiting to test T recovery and supporter expiry. This advances this session’s simulated time only.</p>{energy}<div className="preview-lab"><b>Advance simulated time</b><p>Time added here applies to regeneration and any active burn pass. It resets when the session ends.</p><div><button disabled={paused} onClick={() => { if (paused) return; offset.current += 15 * MINUTE; setClock(now()); setState(s => regenerate(s, now())); }}>Advance 15 minutes</button><button disabled={paused} onClick={() => { if (paused) return; offset.current += 24 * 60 * MINUTE; setClock(now()); setState(s => regenerate(s, now())); }}>Advance 24 hours</button></div><span>{Math.floor(offset.current / MINUTE)} simulated minutes added</span></div></div>}
        {tab === 'roadmap' && <div className="roadmap"><span className="eyebrow">COMING LATER</span><h2>Friend vs. Friend</h2><p className="muted">Challenge another player’s trained Friend, even when they’re offline. We’ll need hosted game services and persistent character builds before these async duels can work.</p><section className="pvp-roadmap" aria-labelledby="pvp-roadmap-title"><h3 id="pvp-roadmap-title">The Dojo is growing.</h3><p>Save a fighter, find a rival on the callout board, and watch a replay after the match.</p><div className="pvp-roadmap-meta"><span>ASYNC DUELS</span><span>FIGHT REPLAYS</span><span>RF WAGER RULES TO DESIGN</span></div><small>Future duels may include optional RF wagers. Matchmaking, wager limits, escrow, cancellation and payout rules will need careful design. For now, the Arena offers computer opponents across eight levels.</small></section></div>}
        {tab === 'supporter' && <div className="supporter">{energy}<div className="section-heading"><div><span className="eyebrow">SIMULATED RF MEMBERSHIP</span><h2>More awake. More often.</h2></div></div><p className="muted">A possible $RAREFRIENDS loop: support a named Friend or a shared Dojo season, then preview how RF-funded supporter time changes training sessions. Purchases are simulated for this vibeathon build; no tokens move.</p>
          <div className="support-plans" role="group" aria-label="Simulated RF allocation preview"><article><span className="eyebrow">CHARACTER SPOTLIGHT · 1 DAY</span><h3>Back your Friend</h3><p>Target about $1 in RF for one day of faster T recovery, attributed to the currently selected Friend. At today’s reference quote that is about {BURN_RF} RF.</p><button disabled={paused || state.supporter !== 'standard' || state.demoRF < BURN_RF} onClick={() => { if (!paused) { setSupportPlan('character'); setSupportChoice('burn'); } }}>Preview 1-day pass · {BURN_RF} RF</button></article><article><span className="eyebrow">TOKEN ACTIVITY · 30 DAYS</span><h3>Monthly supporter</h3><p>Target about $5 in RF for 30 days of supporter recovery: roughly {MONTHLY_SUPPORTER_RF_ESTIMATE} RF at today’s reference quote. Consumed for service, with no auto-renewal.</p><button disabled={paused || state.supporter !== 'standard' || state.demoRF < MONTHLY_SUPPORTER_RF_ESTIMATE} onClick={() => { if (!paused) { setSupportPlan('character'); setSupportChoice('monthly'); } }}>Preview 30-day pass · {MONTHLY_SUPPORTER_RF_ESTIMATE} RF</button></article></div>
          <div className="support-balance"><span>Mock RF available <b data-testid="demo-rf">{state.demoRF}</b></span><span>Character deposit proposal <b>{CHARACTER_DEPOSIT_RF_PROPOSAL} RF</b></span></div>
          <p className="muted">A refundable character-creation deposit could deter spam accounts while remaining separate from supporter purchases. Its amount, custody and abuse policy are still undecided; no character minting or deposit is implemented in this preview.</p>
          {supportChoice && <div className="support-confirm" role="group" aria-label="Confirm simulated membership"><b>{supportChoice === 'stake' ? `Lock ${STAKE_RF} mock RF for ${supportName} until you unstake?` : `Consume ${supportChoice === 'monthly' ? MONTHLY_SUPPORTER_RF_ESTIMATE : BURN_RF} mock RF for ${supportName} for ${supportChoice === 'monthly' ? '30 days' : '24 hours'}?`}</b><p>Mock RF only. This records a local preview and requests no wallet transaction. Actual $RAREFRIENDS spending is not enabled.</p><button className="primary" disabled={paused} onClick={() => { if (paused) return; setState(s => support(s, supportChoice, now())); setSupportChoice(null); setSupportPlan(null); }}>Confirm simulation</button><button onClick={() => { setSupportChoice(null); setSupportPlan(null); }}>Cancel</button></div>}
          {(state.supporter === 'stake') && <div className="active-support" role="status"><b>Character deposit · {STAKE_RF} mock RF locked</b><button disabled={paused} onClick={() => { if (!paused) setState(s => support(s, 'unstake', now())); }}>Return mock deposit</button></div>}
          {(state.supporter === 'burn' || state.supporter === 'monthly') && <p className="active-support" role="status">{state.supporter === 'monthly' ? 'Monthly supporter' : '1-day supporter'} active · {Math.ceil(Math.max(0, state.supporterUntil - clock) / MINUTE)} minutes remaining</p>}
          <p className="intel-summary">Reference quote: DexScreener RF/USD at page review. Final RF amount should use a fresh quote, show an expiry/slippage limit and confirm the exact amount before any future wallet transfer.</p>
        </div>}
        {tab === 'rules' && <div className="rules"><span className="eyebrow">THE DAILY ROUTINE</span><h2>Train. Fight. Recover.</h2><p>Awake (T) caps at <b>100</b>. Recover <b>5 T every 15 minutes</b>, or every <b>10 minutes</b> as an RF supporter. There is no midnight reset. Full T stops the recovery clock; time at the cap cannot be banked.</p><dl>{STATS.map(stat => <div key={stat}><dt>{labels[stat]}</dt><dd>{descriptions[stat]}</dd></div>)}</dl>
          <h3>Intelligence is an investment.</h3><p>Combat-stat reps cost 10 T for 1 base point, plus 0.015 per 100 intelligence up to 1,500, then per 200 intelligence above it. Fight XP gains +10% per 50 intelligence up to 1,500, then per 100 above it. Intelligence starts at 1 per rep and does not apply its own intelligence bonus. All four stats then receive your level bonus: +2% per level above level 1, added linearly. Level 5 gives +8%; level 10 gives +18%. T costs stay the same, and intelligence stops at 3,750.</p>
          <table><caption>Intelligence milestones</caption><thead><tr><th>Intel</th><th>Extra stat / 10 T</th><th>Extra fight XP</th></tr></thead><tbody>{[1000,1500,2500,3750].map(intel => <tr key={intel}><td>{number(intel)}</td><td>+{number(trainingBonus(intel))}</td><td>+{Math.round((xpMultiplier(intel)-1)*100)}%</td></tr>)}</tbody></table>
          <p>Our proposed study paths: School costs 10 T per intelligence rep until 1,000; Advanced study costs 20 T until 2,500; Research costs 30 T until the final cap of 3,750. These paths and prices are prototype design choices. Batch costs account for crossing a tier.</p>
          <h3>The arena</h3><p>Each fight costs 10 T. The ladder runs from the level 1 Rookie through the level 25 Dojo Legend. Higher-level opponents have stronger stats and more health. Speed controls attack frequency: twice the speed schedules twice as many attacks over the same time. Strength adds defence plus a little damage; power is the main damage stat. Your health starts at 90 HP and increases by 2 per level above level 1. Strength does not affect HP. Health resets each fight; health earned by leveling applies from the next fight. Dodges have a flat 5% chance, critical hits 10% with 1.6× damage. After 100 attacks, higher remaining-health percentage wins; equal percentages draw.</p><p>Defeating an opponent earns 20 base XP plus 10 for each of their levels above level 1: 20 XP for Rookie, 60 for Alley Champ, 260 for Dojo Legend. Your intelligence multiplier applies afterward. Losses award 10 base XP and draws 15. Every 100 XP grants a level and another +2% to all training gains. No RF payouts or stat loss.</p>
          <label className="motion-toggle"><input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)}/> Show battle results instantly</label><div className="session-notice"><b>Prototype limits</b><p>Progress, mock RF and memberships last for this session only. Reloading or changing Friends resets everything. Regeneration uses the device clock plus any preview-clock advance. Rivals are computer simulations, not other players. Durable saves, real RF spending and PvP need future integration.</p><p>The 10,000 mock RF balance is separate from your wallet and the SDK ledger. No real tokens move. Membership prices and study paths are tunable proposals. T and stats cannot be redeemed.</p></div></div>}
      </main>
    </div><p className="session-bar">SESSION PREVIEW <span>Progress resets on reload · No real RF spent</span></p>
    {paused && <div className="pause-note" role="status">Dojo paused while the wallet menu is open.</div>}
  </section>;
}
