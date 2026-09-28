# Verification

- FriendSDK v0.1.2, upstream commit `762d6f58a73ace723f7f82dc1a61bfa036c21edc`.
- Game build and SDK boundary validation passed.
- Strict TypeScript check passed.
- Seven updated engine tests passed: discrete standard/supporter recovery and cap; stake/unstake accounting and fractional tick preservation; burn expiry across two rates; intelligence bonuses; study tier costs and final cap; speed-driven attack frequency; fight costs and intelligence-scaled XP.
- Browser interaction tests passed at 960px desktop and 390px mobile widths: canonical artwork, one/five rep training, insufficient T, cancelling/confirming simulated membership, stake/unstake balance, preview-clock recovery, burn expiry, fight costs/XP, empty-T fight blocking, rules, scroll access and no horizontal overflow.
- Automated identities exist only in test harnesses; no mock wallet is published.
- Desktop and mobile screenshots were visually inspected. The game area scrolls, with bottom space for the SDK wallet controls.
- Actual wallet ownership reads and wallet-browser compatibility still require the owner's playtest. No signature, funding or transaction was requested.

## Before submission

Owner approval, builder name/contact, public source repository URL, publicly accessible preview, and a real-wallet playtest are still required. The current hosted preview is private. No vibeathon PR has been opened.

Persistent progression, cross-device saves, real RF staking/burning and real PvP are not implemented. This is a session-based concept prototype; see README.md for all limits. The mock RF ledger is separate from the actual wallet and SDK ledger.

Private-host regression: reproduced the original connection timeout when SameSite cookies were omitted on sandboxed asset requests. The bundled frame now loads, verifies the test identity and spends T successfully under the same restriction. Sandbox remains allow-scripts only, with parent DOM inaccessible; no blocked asset requests or browser errors.

Level training update: +2% per level above 1 for all stats, stacking with INT. Eight engine tests, TypeScript, SDK validation, desktop/mobile browser checks and private-host regression passed.

Health update: 90 base HP, +2 HP per level. STR only contributes defense and damage. Nine engine tests, TypeScript, SDK validation and desktop/mobile browser checks passed. Battle health remains fixed when reward XP crosses a level threshold.

Guest demo: tested without a browser wallet at 960px and 390px. Sample artwork, training, combat XP, reset-on-reload, sandbox and separate wallet gate passed.
