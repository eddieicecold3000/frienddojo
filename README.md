# Friend Dojo — timed Awake prototype

Train the selected Rare Friend with a capped Awake (T) budget, earn intelligence-scaled fight XP, and compare simulated RF supporter options. Uses FriendSDK v0.1.2 (upstream commit 762d6f58a73ace723f7f82dc1a61bfa036c21edc).

## Run and test

From a FriendSDK checkout, put this game folder in games/friend-dojo. Run npm ci, npm run build, then node scripts/dev-game.mjs dev games/friend-dojo. Open http://localhost:4173. For LAN phones add --host 0.0.0.0 and open the computer's LAN IP. The hosted HTTPS preview is easier.

The SDK requires a wallet holding a hardwired Generations NFT (generation >=1) on Robinhood mainnet (4663). Phone players need a compatible wallet browser. Wallet identity is read-only; this prototype never signs or moves funds. The actual wallet flow still needs the owner's playtest.

Checks from the SDK root:
- node node_modules/typescript/bin/tsc -p games/friend-dojo/tsconfig.json
- node --test games/friend-dojo/engine.test.mjs
- node games/friend-dojo/browser.test.mjs
- node scripts/dev-game.mjs build games/friend-dojo
- node games/friend-dojo/bundle-frame.mjs games/friend-dojo/.friendsdk
- node scripts/dev-game.mjs check games/friend-dojo

The extra frame-bundling step is required for private hosting. It embeds the generated game script and styles inside game.html and authorizes only that script's exact SHA-256 hash in CSP. The original allow-scripts-only iframe sandbox and ownership verification remain unchanged. This avoids cookie-less subresource requests from the opaque sandbox being rejected by the host's sign-in layer. Do not rebuild after bundling without running the step again.

Browser tests require the SDK's Playwright dependency and its Chromium install. All mock identities stay in the test harness. The deliverable preserves the original SDK ownership gate, canonical character artwork, sandbox and pause state.

## T recovery

Start with 100 T; cap is always 100. Standard recovery is +5 T per 15 minutes (0 to 100 in 5 hours). RF Supporter recovery is +5 T per 10 minutes (3h20m). No daily reset, no excess banking and no instant refill from membership. At full T, the recharge clock rests. Switching tiers retains the fraction of the current recharge tick, after settling time at the previous rate. Backward device-clock movement does not grant energy.

The RF Supporter tab includes a labelled preview clock (+15 minutes or +24 hours) to test regeneration and expiry. All time is device time plus the demo offset, including membership expiry.

## Training and intelligence

All stats start at 10. Strength, speed and power cost 10 T per rep and gain:
1 + 0.015 * (floor(min(INT,1500)/100) + floor(max(INT-1500,0)/200)).

Intelligence gains a flat 1 per rep and does not boost itself. Proposed study paths automatically change at thresholds:
- School: 10 T per point until 1,000 INT (soft cap).
- Advanced study: 20 T per point until 2,500 INT (hard cap).
- Research: 30 T per point until 3,750 INT (final cap).
- No further intelligence training at 3,750.

The tier sources and costs are our prototype choices, not exact HoboWars mechanics. One- and five-rep batches sum costs across any tier boundary. A batch reaching the final cap only buys remaining points. Combat-stat precision is three decimals.

Fight XP multiplier:
1 + 0.10 * (floor(min(INT,1500)/50) + floor(max(INT-1500,0)/100)).

Milestones:
INT 1,000: +0.150 combat stat per 10 T, +200% XP.
INT 1,500: +0.225 combat stat per 10 T, +300% XP.
INT 2,500: +0.300 combat stat per 10 T, +400% XP.
INT 3,750: +0.390 combat stat per 10 T, +520% XP.

These formulas follow the progression text supplied by the owner. No begging, can depot, equipment or additional HoboWars activities are implemented.

## Combat

Each fight costs 10 T and awards XP once. Opponents are three fixed computer builds, not other owners. Health resets every fight; no stat loss or RF payouts.

- Health = round(50 + 4 * strength).
- Attacks are scheduled at intervals of 1 / speed; ties are random. Twice the speed schedules twice the attacks over equal elapsed combat time.
- Dodge chance: flat 5%. Critical chance on a non-dodged attack: flat 10%.
- Damage = max(1, round((6 + power * 1.2 + strength * 0.25 - defender strength * 0.3) * uniform(0.9,1.1) * critical multiplier)).
- Critical multiplier = 1.6; otherwise 1.
- Knockout wins. Limit 100 attacks; at the limit, larger remaining-health percentage wins, ties draw.
- Base XP = 20 win / 10 loss / 15 draw; multiply by INT bonus and round to whole XP.
- Cosmetic level = 1 + floor(total XP / 100).

Math.random is appropriate here only because fights are simulated and have no monetary payout.

## Simulated RF membership — proposed prices

Start with 1,000 mock RF, entirely separate from the SDK ledger and actual wallet.
- Stake: lock 100 mock RF; supporter rate lasts while locked. Unstake returns the full 100 and restores standard rate. No yield, slashing, lock duration or transaction fee.
- Burn: consume 25 mock RF for 24 hours; no return or auto-renewal. Expiry automatically restores standard recovery.
- Active options cannot stack. Unstake before switching from stake to burn. Burn users must wait for expiry.
- Both options use an explicit in-game simulation confirmation; no wallet requests or real token changes occur.
- Costs/duration are placeholders for playtesting, not approved token economics.

Real staking/burning would require a supported SDK capability plus reviewed contracts and verified receipts. None is included or claimed. T, stats and XP have no redemption value.

## SDK compatibility and limitations

The current SDK requires a chance-game definition even when a game does not use chance-game purchases. game.json contains an unused compatibility definition: 1 simulated RF ticket, deterministic 1 simulated RF reference reward. No game UI buys, plays or redeems it. client.read is used only to initialize the trusted runtime session. The local mock supporter ledger never changes the real wallet or SDK RF balance.

Progress, RF mock balance, memberships and records are memory-only and reset on reload, identity change or remount. Recovery is a session demonstration, not enforced daily progression. Shared saves, anti-cheat, real player-versus-player combat, actual RF contracts and supported persistence/authentication bridge integration remain future work. No parent access, unrestricted network or storage bypass is added.

Controls: touch/click, Tab and Enter/Space. Reduced-motion preference gives instant battle results, also selectable in Rules. No audio. Runtime menus pause gameplay. Desktop maximum 960x640 with scrolling; phones use a taller responsive frame.

## Assets and publishing

Original Rare Friends character pixels are loaded through the SDK canonical sprite reader. SDK source is Apache-2.0; retain SDK NOTICE.md artwork permissions. UI code is original; no HoboWars artwork is copied.

Preview: https://frienddojo.vercel.app (public demo).
Submission remains pending owner approval, builder contact, public source/preview and real-wallet testing. No vibeathon PR has been opened.

