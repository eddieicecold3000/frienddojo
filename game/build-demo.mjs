import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Run inside the SDK checkout after its normal build and bundle-frame step.
// Explicitly requested pre-launch guest mode; never represents NFT ownership.
const directory = fileURLToPath(new URL('.', import.meta.url));
const out = resolve(process.argv[2] ?? resolve(directory, '.friendsdk'));
const result = await build({
  stdin: { contents: `import React from 'react';
import {createRoot} from 'react-dom/client';
import {createGamePreview,parseChanceGame} from '@rarefriends/friendsdk/game';
import definitionJson from './game.json';
import Game from './index';
const client=createGamePreview(parseChanceGame(definitionJson),{friendId:7730n,stake:0n,rfBalance:0n}).client;
createRoot(document.getElementById('root')).render(<Game friendId={7730n} client={client} paused={false} demoMode/>);`,
    resolveDir: directory, loader: 'tsx', sourcefile: 'guest.tsx' },
  bundle: true, write: false, outfile: resolve(out,'demo.js'), minify: true,
  platform: 'browser', format: 'iife', target: 'es2022', jsx: 'automatic',
  define: {'process.env.NODE_ENV':'"production"'},
});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text.replace(/<\/style/gi,'<\\/style');
const hash=createHash('sha256').update(js).digest('base64');
await writeFile(resolve(out,'demo-frame.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; connect-src https://rpc.mainnet.chain.robinhood.com; img-src data:; base-uri 'none'; form-action 'none'"><title>Friend Dojo · Guest demo</title><style>*{box-sizing:border-box}html,body,#root{width:100%;height:100%;margin:0;overflow:hidden}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
const style=`*{box-sizing:border-box}body{margin:0;background:#101713;color:#eef3e9;font:16px/1.5 system-ui,sans-serif}main{max-width:960px;margin:auto;padding:24px}h1{font-size:clamp(32px,6vw,52px);line-height:1.1}p{color:#b9c7b8}a{color:#d4ff70}a.button{display:block;padding:18px 22px;border:1px solid #53654a;border-radius:12px;text-decoration:none;font-weight:700;margin:14px 0}.primary{background:#d4ff70;color:#14200d}a:focus-visible{outline:3px solid #fff;outline-offset:4px}.choices{max-width:480px}small{color:#b9c7b8}iframe{display:block;width:100%;height:780px;max-height:calc(100dvh - 112px);min-height:500px;border:1px solid #53654a;border-radius:12px}nav{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}@media(max-width:600px){main{padding:12px}iframe{height:calc(100dvh - 100px);min-height:420px}}`;
const page=(title,body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${style}</style></head><body><main>${body}</main></body></html>`;
// Preserve the complete SDK wallet host, including fresh ownership verification.
await writeFile(resolve(out,'wallet.html'),await readFile(resolve(out,'index.html'),'utf8'));
await writeFile(resolve(out,'index.html'),page('Friend Dojo',`<div class="choices"><p>RARE FRIENDS / TRAINING CLUB</p><h1>Friend Dojo</h1><p>Train your stats. Level up. Take on the arena.</p><a class="button primary" href="./demo.html">Try demo — no wallet needed ↗</a><a class="button" href="./wallet.html">Play with your Friend ↗</a><small>Pre-launch demo: sample Friend, simulated RF and session-only progress. No tokens or NFT required. Progress resets when you leave or refresh.</small></div>`));
await writeFile(resolve(out,'demo.html'),page('Friend Dojo · Demo',`<nav><strong>Guest demo · No wallet needed</strong><a href="./index.html">Exit demo</a></nav><iframe src="./demo-frame.html" sandbox="allow-scripts" title="Friend Dojo guest demo"></iframe>`));
console.log('Built wallet-free demo and preserved the SDK wallet mode.');
