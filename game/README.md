# Friend Dojo — timed Awake prototype

Train the selected Rare Friend with a capped Awake (T) budget, earn intelligence-scaled fight XP, and compare simulated RF supporter options. Uses FriendSDK v0.1.2 (upstream commit 762d6f58a73ace723f7f82dc1a61bfa036c21edc).

## Run and test

From a FriendSDK checkout, put this game folder in games/friend-dojo. Run npm ci, npm run build, then node scripts/dev-game.mjs dev games/friend-dojo. Open http://localhost:4173. For LAN phones add --host 0.0.0.0 and open the computer's LAN IP. The hosted HTTPS preview is easier.

The wallet-connected mode requires a wallet holding a hardwired Generations NFT (generation >=1) on Robinhood mainnet (4663). Phone players need a compatible wallet browser. Wallet identity is read-only; this prototype never signs or moves funds. The wallet flow was verified with the owner.

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

The Preview Clock tab offers +15 minutes or +24 hours to test regeneration and expiry. RF Supporter contains the simulated membership options; Roadmap previews future player duels. All time is device time plus the demo offset, including membership expiry.

## Training and intelligence

All stats start at 10. Strength, speed and power cost 10 T per rep and gain:
1 + 0.015 * (floor(min(INT,1500)/100) + floor(max(INT-1500,0)/200)).

Every level above level 1 adds 2% to all training gains (linear, not compounded). Multiply the combat-stat formula above by 1 + 0.02 * (level - 1). Intelligence gains 1 times this level multiplier per rep; it does not boost itself. Level 5: +8%; level 10: +18%. T costs are unchanged. Proposed study paths automatically change at thresholds:
- School: 10 T per rep until 1,000 INT (soft cap).
- Advanced study: 20 T per point until 2,500 INT (hard cap).
- Research: 30 T per point until 3,750 INT (final cap).
- No further intelligence training at 3,750.

The tier sources and costs are our prototype choices, not exact HoboWars mechanics. One- and five-rep batches sum costs across any tier boundary. A batch reaching the final cap clips gains to the remaining points, charging the current tier per rep. Stat precision is three decimals.

Fight XP multiplier:
1 + 0.10 * (floor(min(INT,1500)/50) + floor(max(INT-1500,0)/100)).

Milestones:
INT 1,000: +0.150 combat stat per 10 T, +200% XP.
INT 1,500: +0.225 combat stat per 10 T, +300% XP.
INT 2,500: +0.300 combat stat per 10 T, +400% XP.
INT 3,750: +0.390 combat stat per 10 T, +520% XP.

These formulas follow the progression text supplied by the owner. No begging, can depot, equipment or additional HoboWars activities are implemented.

## Combat

Each fight costs 10 T and awards XP once. The arena has eight fixed computer rivals from level 1 to level 25; these are not other owners. Rival stats and HP rise by tier. Health resets every fight; no stat loss or RF payouts.

- Health = 90 + 2 * (level - 1). STR has no effect on health. Practice rivals are level 1 (90 HP). Battle health is fixed at entry; a level earned during a fight increases health for the next fight.
- Attacks are scheduled at intervals of 1 / speed; ties are random. Twice the speed schedules twice the attacks over equal elapsed combat time.
- Dodge chance: flat 5%. Critical chance on a non-dodged attack: flat 10%.
- Damage = max(1, round((6 + power * 1.2 + strength * 0.25 - defender strength * 0.3) * uniform(0.9,1.1) * critical multiplier)).
- Critical multiplier = 1.6; otherwise 1.
- Knockout wins. Limit 100 attacks; at the limit, larger remaining-health percentage wins, ties draw.
- Win XP = 20 base + 10 per opponent level above level 1 (20 XP for Rookie, 60 for Alley Champ, 260 for Dojo Legend). Loss = 10 base; draw = 15 base. Multiply by INT bonus and round to whole XP.
- Level = 1 + floor(total XP / 100).

Math.random is appropriate here only because fights are simulated and have no monetary payout.

## Simulated RF membership — proposed prices

Start with 10,000 mock RF, entirely separate from the SDK ledger and actual wallet.
- One-day supporter pass: consume 620 mock RF for 24 hours (no return or auto-renewal).
- Monthly supporter pass: consume 3,100 mock RF for 30 days (no return or auto-renewal). This is about five daily passes' value and includes a duration discount versus five separate daily purchases.
- The RF amounts are rounded estimates based on an observed RF/USD quote. A future live checkout must quote a fresh amount at purchase time and show quote expiry/slippage before confirmation.
- Refundable character deposit proposal: 10,000 mock RF returned when the character is deleted/closed. It is a separate anti-spam concept; character creation/deletion is not implemented.
- Only one supporter pass is active at once. Pass time expires automatically, restoring standard recovery.
- Both options use an explicit in-game simulation confirmation; no wallet requests or real token changes occur.
- USD targets and rounded amounts are placeholders for playtesting, not approved token economics. Any real payment routing to a developer wallet and any RF burn split remain undecided.

Real staking/burning would require a supported SDK capability plus reviewed contracts and verified receipts. None is included or claimed. T, stats and XP have no redemption value.

## SDK compatibility and limitations

The current SDK requires a chance-game definition even when a game does not use chance-game purchases. game.json contains an unused compatibility definition: 1 simulated RF ticket, deterministic 1 simulated RF reference reward. No game UI buys, plays or redeems it. client.read is used only to initialize the trusted runtime session. The local mock supporter ledger never changes the real wallet or SDK RF balance.

Progress, RF mock balance, memberships and records are memory-only and reset on reload, identity change or remount. Recovery is a session demonstration, not enforced daily progression. Shared saves, anti-cheat, real player-versus-player combat, actual RF contracts and supported persistence/authentication bridge integration remain future work. Optional RF wagers for future duels are a design possibility, not a current feature or promise; matchmaking, wager caps, escrow, cancellations, dispute handling and payouts need review before implementation. No parent access, unrestricted network or storage bypass is added.

Controls: touch/click, Tab and Enter/Space. Reduced-motion preference gives instant battle results, also selectable in Rules. No audio. Runtime menus pause gameplay. Desktop maximum 960x640 with scrolling; phones use a taller responsive frame.

## Assets and publishing

Original Rare Friends character pixels are loaded through the SDK canonical sprite reader. SDK source is Apache-2.0; retain SDK NOTICE.md artwork permissions. UI code is original; no HoboWars artwork is copied.

Preview: https://frienddojo.vercel.app (public demo).
Submission remains pending owner approval, builder contact, public source/preview and real-wallet testing. No vibeathon PR has been opened.

## Vibeathon direction

The prototype is being shaped for Character Spotlight and Token Activity. Character Spotlight centers the SDK-selected, ownership-verified Generations Friend: canonical Friend artwork, the fighter in each arena matchup, and the character whose training is on display. The wallet-free guest demo is only a labeled sample for exploration; the scored FriendSDK path requires the owned Friend selection and wallet gate.

Token Activity is presented as two interactive mock RF spending flows: consume about 620 RF (roughly $1 at the reviewed quote) for a one-day Friend-attributed supporter pass, or about 3,100 RF (roughly $5) for a 30-day pass. Both update only the local mock balance. The submission must say actual RF activity is disabled and report mock-flow results honestly. The vibeathon rules currently say judging details for simulated Token Activity are pending, so prize eligibility for simulations is not guaranteed.

Economy Potential is a reasonable supporting story rather than the main target: two consumed RF supporter passes create recurring activity with a clear service duration. A separate refundable character deposit could deter spam character creation, but it should not be conflated with spending volume or sold as a token sink. Any live version needs community-approved prices, a stated developer-wallet allocation, a deliberate burn share (if any), an abuse policy, and supported wallet/contracts with verifiable receipts before promising utility. No character creation system is included in this build.


## Pre-launch guest demo

At the owner's explicit request, the entry screen now offers a wallet-free demo for non-owners. It uses the SDK preview client with sample Friend #7730, clearly labeled as a sample rather than verified ownership. All progress and RF are simulated and reset on reload. No wallet provider is loaded or requested in this mode. The wallet-connected path retains the SDK ownership gate. This intentional pre-launch exception to the SDK prototype-identity guidance must be reviewed before official release or submission.

After the ordinary build and bundle-frame step, run `node games/friend-dojo/build-demo.mjs games/friend-dojo/.friendsdk`. This creates the entry choices, demo page, isolated guest frame and wallet.html. Run it only once after each fresh SDK build.
