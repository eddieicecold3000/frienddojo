import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

// Run after the ordinary FriendSDK build. Private hosts may reject cookie-less
// subresource requests from an opaque-origin iframe. Its navigation can load,
// while separate scripts/styles cannot. Keep the SDK sandbox and inline only
// the exact generated game bundle, authorized by its SHA-256 CSP hash.
const outdir = resolve(process.argv[2] ?? new URL('.friendsdk', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'));
let html = await readFile(resolve(outdir, 'game.html'), 'utf8');
const script = (await readFile(resolve(outdir, 'game.js'), 'utf8')).replace(/<\/script/gi, '<\\/script');
const hash = createHash('sha256').update(script).digest('base64');
if (!html.includes('<script src="./game.js"></script>') || !html.includes("script-src 'self'")) {
  throw new Error('Expected a fresh SDK game.html. Rebuild before bundling the frame.');
}
for (const file of ['game.css', 'game-layout.css']) {
  const css = (await readFile(resolve(outdir, file), 'utf8')).replace(/<\/style/gi, '<\\/style');
  html = html.replace(`<link rel="stylesheet" href="./${file}">`, () => `<style>${css}</style>`);
}
html = html.replace("script-src 'self'", `script-src 'sha256-${hash}'`)
  .replace('<script src="./game.js"></script>', () => `<script>${script}</script>`);
await writeFile(resolve(outdir, 'game.html'), html);
console.log('Bundled private-host frame with a hash-authorized script; sandbox unchanged.');
