import { useEffect, useRef, useState } from 'react';
import type { GameComponentProps } from '@rarefriends/friendsdk/runtime';
import { createFriendReader, spriteFrame } from '@rarefriends/friendsdk/sprites';
import { STATS, initialState, regenerate, train, enterBattle, hp, OPPONENTS, interval, support, trainingQuote, trainingBonus, level, levelTrainingMultiplier, xpMultiplier, studyName, MINUTE, STAKE_RF, BURN_RF, FIGHT_T, type Battle } from './engine';
import './style.css';

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
  const [state, setState] = useState(initialState), [tab, setTab] = useState<'train' | 'arena' | 'supporter' | 'rules'>('train');
  const [supportChoice, setSupportChoice] = useState<'stake' | 'burn' | null>(null);
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
  const energy = <div className="energy"><div><span className="eyebrow">AWAKE / T</span><p><strong data-testid="energy">{state.t}</strong><span> / 100 T</span></p></div><div className="energy-reset"><b>{supporterName} · +5 T / {interval(state) / MINUTE} min</b><span>{state.t === 100 ? 'Fully awake · no T banked above 100' : `Next +5 T in ${nextTick}`}</span></div><progress max="100" value={state.t} aria-label="Training energy remaining"/></div>;
  function fight() {
    if (paused || running) return;
    const attempt = enterBattle(state, rival.stats, now());
    setState(attempt.state);
    if (!attempt.result) return;
    const next = attempt.result; setResult(next); setTurn(0);
    setRecord(r => ({ wins: r.wins + Number(next.winner === 'you'), losses: r.losses + Number(next.winner === 'rival'), draws: r.draws + Number(next.winner === 'draw') }));
  }
  if (!connected) return <section className="dojo" role={connectionError ? 'alert' : 'status'}>{connectionError || 'Loading your dojo…'}{connectionError && <button disabled={paused} onClick={() => setRetry(v => v + 1)}>Retry session</button>}</section>;
  return <section className="dojo" aria-label="Friend Dojo" data-reduced-motion={reduceMotion}>
    <div className="game-top"><div><span className="eyebrow">RARE FRIENDS / TRAINING CLUB</span><h1>Friend Dojo<span className="title-mark">↗</span></h1></div><span className="preview-label">{demoMode ? "GUEST DEMO" : "SIMULATED PREVIEW"}</span></div>
    <div className="game-layout" inert={paused || undefined}>
      <aside className="character-panel"><div className="character-heading"><span className="eyebrow">{demoMode ? "SAMPLE FRIEND" : "YOUR FIGHTER"}</span><span className="rank">LV {level(state.xp)}</span></div>
        <FriendArt friendId={friendId} paused={paused}/>{demoMode && <p className="xp-readout">Sample character · no ownership claimed<br/>Demo progress resets on reload.</p>}<h2>Friend #{friendId.toString()}</h2><p className="character-subtitle">{total < 60 ? 'A little potential. A lot of fight.' : 'Putting in the work.'}</p>
        <div className="rating"><span>Total stats</span><strong data-testid="total">{number(total)}</strong></div>
        <div className="mini-stats">{STATS.map(stat => <div key={stat}><span>{glyphs[stat]}</span><meter min="0" max={Math.max(40, state.stats[stat])} value={state.stats[stat]} aria-label={labels[stat]}/><b>{number(state.stats[stat])}</b></div>)}</div>
        <p className="xp-readout" data-testid="xp">{state.xp} XP · {100 - state.xp % 100} to next level</p>
        <p className="xp-readout" data-testid="level-bonus">+{Math.round((levelTrainingMultiplier(state.xp) - 1) * 100)}% training from level · +2% next level</p>
        <p className="xp-readout" data-testid="max-hp">{hp(state.xp)} max HP · +2 next level</p>
        <div className="record"><span><b>{record.wins}</b> wins</span><span><b>{record.losses}</b> losses</span><span><b>{record.draws}</b> draws</span></div>
      </aside>
      <main className="workspace"><nav className="tabs" aria-label="Dojo activities">{(['train','arena','supporter','rules'] as const).map(item => <button key={item} aria-current={tab === item ? 'page' : undefined} disabled={running && item !== 'arena'} onClick={() => { if (!paused) { setTab(item); setSupportChoice(null); } }}>{item === 'train' ? 'Training' : item === 'arena' ? 'Arena' : item === 'supporter' ? 'RF Supporter' : 'Rules'}</button>)}</nav>
        {tab === 'train' && <>{energy}
          <div className="section-heading"><h2>Put in the reps.</h2><div className="dose" role="group" aria-label="Training amount"><button aria-pressed={sessions === 1} onClick={() => setSessions(1)}>1 rep</button><button aria-pressed={sessions === 5} onClick={() => setSessions(5)}>5 reps</button></div></div>
          <div className="training-grid">{STATS.map((stat, index) => { const quote = trainingQuote(state, stat, sessions); return <article className={`training-card ${stat}`} key={stat}><div className="card-top"><span className="stat-badge">{glyphs[stat]}</span><span className="station">0{index + 1}</span></div><div className="stat-title"><h3>{labels[stat]}</h3><strong data-testid={stat}>{number(state.stats[stat])}</strong></div><p>{descriptions[stat]}</p><button disabled={paused || !quote.gain || state.t < quote.cost} onClick={() => { if (paused) return; setState(s => train(s, stat, sessions, now())); setMessage(`+${number(quote.gain)} ${labels[stat]} · ${quote.cost} T spent`); }}>Train +{number(quote.gain)}<span>{quote.cost} T ↗</span></button></article>; })}</div>
          <p className="feedback" role="status">{state.t < 10 ? 'Rest to recover T, or try the clock in RF Supporter.' : message}</p>
          <p className="intel-summary">{studyName(state.stats.intelligence)} · +{number(trainingBonus(state.stats.intelligence))} base combat stat / rep · +{Math.round((xpMultiplier(state.stats.intelligence) - 1) * 100)}% fight XP</p>
        </>}
        {tab === 'arena' && <div className="arena">{energy}<div className="section-heading"><div><span className="eyebrow">PRACTICE ARENA</span><h2>Test your training.</h2></div><span className="free-tag">{FIGHT_T} T / FIGHT</span></div><p className="muted">Earn fight XP. No wagers, RF payouts or stat loss.</p>
          <label className="opponent-label">Choose your opponent<select value={opponent} disabled={running || paused} onChange={e => { setOpponent(Number(e.target.value)); setResult(null); setTurn(0); }}>{OPPONENTS.map((item, i) => <option key={item.name} value={i}>{item.name} · {item.tag}</option>)}</select></label>
          <div className="matchup"><div><span className="eyebrow">YOU</span><h3>Friend #{friendId.toString()}</h3><b>{latest?.yourHp ?? (result?.yourMaxHp ?? hp(state.xp))} / {(result?.yourMaxHp ?? hp(state.xp))} HP</b><progress value={latest?.yourHp ?? (result?.yourMaxHp ?? hp(state.xp))} max={(result?.yourMaxHp ?? hp(state.xp))} aria-label="Your health"/></div><span className="versus">VS</span><div><span className="eyebrow">{rival.tag}</span><h3>{rival.name}</h3><b>{latest?.rivalHp ?? (result?.rivalMaxHp ?? hp())} / {(result?.rivalMaxHp ?? hp())} HP</b><progress value={latest?.rivalHp ?? (result?.rivalMaxHp ?? hp())} max={(result?.rivalMaxHp ?? hp())} aria-label="Rival health"/></div></div>
          <div className="rival-stats">{STATS.map(stat => <span key={stat}>{glyphs[stat]} <b>{rival.stats[stat]}</b></span>)}</div>
          <p className="rival-note">{rival.note}</p><div className="battle-actions"><button className="primary" disabled={paused || running || state.t < FIGHT_T} onClick={fight}>{running ? 'Battle in progress…' : state.t < FIGHT_T ? 'Need 10 T to fight' : finished ? 'Fight again ↗' : 'Enter the arena ↗'}</button>{running && <button onClick={() => { if (!paused && result) setTurn(result.turns.length); }}>Skip animation</button>}</div>
          <div className={`battle-result ${finished ? 'complete' : ''}`} role="status">{finished ? `${result!.winner === 'you' ? 'VICTORY.' : result!.winner === 'draw' ? 'DRAW.' : 'DEFEAT.'} +${result!.xp} XP earned.` : running ? `Attack ${turn} · Trading blows…` : 'Ready when you are.'}</div>
          {!!result && <ol className="battle-log" aria-label="Battle recap">{result.turns.slice(0, turn).map((hit, i) => <li key={i}><span>{String(i + 1).padStart(2,'0')}</span>{hit.dodged ? `${hit.actor === 'you' ? rival.name : 'You'} dodged.` : `${hit.actor === 'you' ? 'You' : rival.name} hit for ${hit.damage}${hit.critical ? ' — critical!' : '.'}`}</li>)}</ol>}
        </div>}
        {tab === 'supporter' && <div className="supporter">{energy}<div className="section-heading"><div><span className="eyebrow">SIMULATED RF MEMBERSHIP</span><h2>More awake. More often.</h2></div></div><p className="muted">Supporters recover 5 T every 10 minutes instead of 15. The 100 T cap stays the same. No instant refill or staking yield.</p>
          <div className="support-balance"><span>Mock RF available <b data-testid="demo-rf">{state.demoRF}</b></span><span>Locked <b>{state.supporter === 'stake' ? STAKE_RF : 0} RF</b></span></div>
          <div className="support-options"><article><span className="eyebrow">OPTION A / RETURNABLE</span><h3>Stake to support</h3><p>Lock {STAKE_RF} mock RF. Stay a supporter while locked. Unstake any time to return it and restore standard recovery.</p><button disabled={paused || state.supporter !== 'standard' || state.demoRF < STAKE_RF} onClick={() => setSupportChoice('stake')}>Preview stake · {STAKE_RF} RF</button></article><article><span className="eyebrow">OPTION B / CONSUMED</span><h3>Burn for a day</h3><p>Spend {BURN_RF} mock RF for 24 hours of supporter recovery. The mock RF is not returned. No automatic renewal.</p><button disabled={paused || state.supporter !== 'standard' || state.demoRF < BURN_RF} onClick={() => setSupportChoice('burn')}>Preview burn · {BURN_RF} RF</button></article></div>
          {supportChoice && <div className="support-confirm" role="group" aria-label="Confirm simulated membership"><b>{supportChoice === 'stake' ? `Lock ${STAKE_RF} mock RF until you unstake?` : `Consume ${BURN_RF} mock RF for 24 hours?`}</b><p>Demo balance only. No wallet transaction. Prices are proposed for testing.</p><button className="primary" disabled={paused} onClick={() => { if (paused) return; setState(s => support(s, supportChoice, now())); setSupportChoice(null); }}>Confirm simulation</button><button onClick={() => setSupportChoice(null)}>Cancel</button></div>}
          {state.supporter === 'stake' && <div className="active-support" role="status"><b>Supporter active · {STAKE_RF} mock RF locked</b><button disabled={paused} onClick={() => { if (!paused) setState(s => support(s, 'unstake', now())); }}>Unstake mock RF</button></div>}
          {state.supporter === 'burn' && <p className="active-support" role="status">Burn pass active · {Math.ceil(Math.max(0, state.supporterUntil - clock) / MINUTE)} minutes remaining</p>}
          <p className="intel-summary">Empty → full: standard 5h · supporter 3h 20m. +50% recovery rate, not a higher cap.</p>
          <div className="preview-lab"><b>Preview clock</b><p>Skip waiting to test recovery and pass expiry. This advances the session’s simulated time only.</p><div><button disabled={paused} onClick={() => { if (paused) return; offset.current += 15 * MINUTE; setClock(now()); setState(s => regenerate(s, now())); }}>Advance 15 minutes</button><button disabled={paused} onClick={() => { if (paused) return; offset.current += 24 * 60 * MINUTE; setClock(now()); setState(s => regenerate(s, now())); }}>Advance 24 hours</button></div><span>{Math.floor(offset.current / MINUTE)} simulated minutes added</span></div>
        </div>}
        {tab === 'rules' && <div className="rules"><span className="eyebrow">THE DAILY ROUTINE</span><h2>Train. Fight. Recover.</h2><p>Awake (T) caps at <b>100</b>. Recover <b>5 T every 15 minutes</b>, or every <b>10 minutes</b> as an RF supporter. There is no midnight reset. Full T stops the recovery clock; time at the cap cannot be banked.</p><dl>{STATS.map(stat => <div key={stat}><dt>{labels[stat]}</dt><dd>{descriptions[stat]}</dd></div>)}</dl>
          <h3>Intelligence is an investment.</h3><p>Combat-stat reps cost 10 T for 1 base point, plus 0.015 per 100 intelligence up to 1,500, then per 200 intelligence above it. Fight XP gains +10% per 50 intelligence up to 1,500, then per 100 above it. Intelligence starts at 1 per rep and does not apply its own intelligence bonus. All four stats then receive your level bonus: +2% per level above level 1, added linearly. Level 5 gives +8%; level 10 gives +18%. T costs stay the same, and intelligence stops at 3,750.</p>
          <table><caption>Intelligence milestones</caption><thead><tr><th>Intel</th><th>Extra stat / 10 T</th><th>Extra fight XP</th></tr></thead><tbody>{[1000,1500,2500,3750].map(intel => <tr key={intel}><td>{number(intel)}</td><td>+{number(trainingBonus(intel))}</td><td>+{Math.round((xpMultiplier(intel)-1)*100)}%</td></tr>)}</tbody></table>
          <p>Our proposed study paths: School costs 10 T per intelligence rep until 1,000; Advanced study costs 20 T until 2,500; Research costs 30 T until the final cap of 3,750. These paths and prices are prototype design choices. Batch costs account for crossing a tier.</p>
          <h3>The arena</h3><p>Each fight costs 10 T. Speed controls attack frequency: twice the speed schedules twice as many attacks over the same time. Strength adds defence plus a little damage; power is the main damage stat. Health starts at 90 HP and increases by 2 per level above level 1. Strength does not affect HP. Practice rivals are level 1 with 90 HP. Health resets each fight; health earned by leveling applies from the next fight. Dodges have a flat 5% chance, critical hits 10% with 1.6× damage. After 100 attacks, higher remaining-health percentage wins; equal percentages draw.</p><p>Base fight XP: 20 for a win, 10 for a loss, 15 for a draw, multiplied by your intelligence bonus and rounded to the nearest whole XP. Every 100 XP grants a level and another +2% to all training gains. No RF payouts or stat loss.</p>
          <label className="motion-toggle"><input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)}/> Show battle results instantly</label><div className="session-notice"><b>Prototype limits</b><p>Progress, mock RF and memberships last for this session only. Reloading or changing Friends resets everything. Regeneration uses the device clock plus any preview-clock advance. Rivals are computer simulations, not other players. Durable saves, real RF staking/burning and PvP need future integration.</p><p>The 1,000 mock RF balance is separate from your wallet and the SDK ledger. No real tokens move. Membership prices and study paths are tunable proposals. T and stats cannot be redeemed.</p></div></div>}
      </main>
    </div><p className="session-bar">SESSION PREVIEW <span>Progress resets on reload · No real RF spent</span></p>
    {paused && <div className="pause-note" role="status">Dojo paused while the wallet menu is open.</div>}
  </section>;
}
