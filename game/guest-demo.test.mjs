import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';
import { createArtworkFixture } from '../../scripts/browser-fixture.mjs';
const root=resolve('games/friend-dojo/.friendsdk');
const server=createServer(async(req,res)=>{
  const name=req.url==='/'?'index.html':req.url.slice(1);
  if(!/^[a-z-]+\.(html|js|css)$/.test(name)){res.writeHead(404).end();return;}
  try {res.setHeader('Content-Type',extname(name)==='.html'?'text/html':extname(name)==='.css'?'text/css':'text/javascript');res.end(await readFile(resolve(root,name)));}
  catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
try {
  const art=await createArtworkFixture();
  for(const width of [960,390]) {
    const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://rpc.mainnet.chain.robinhood.com/**',async route=>{
      const request=route.request().postDataJSON();
      const respond=async r=>{if(r.method==='eth_chainId')return {jsonrpc:'2.0',id:r.id,result:'0x1237'};assert.equal(r.method,'eth_call');return {jsonrpc:'2.0',id:r.id,result:await art(r.params[0])};};
      await route.fulfill({json:Array.isArray(request)?await Promise.all(request.map(respond)):await respond(request)});
    });
    await page.goto(origin);
    assert.equal(await page.evaluate(()=>typeof window.ethereum),'undefined');
    await page.getByRole('link',{name:/Try demo/}).click();
    const game=page.frameLocator('iframe');
    await game.getByRole('img',{name:'Original artwork for Friend 7730'}).waitFor();
    await game.getByText('SAMPLE FRIEND',{exact:true}).waitFor();
    assert.equal(await game.getByTestId('energy').innerText(),'100');
    await game.locator('.strength').getByRole('button').click();
    assert.equal(await game.getByTestId('strength').innerText(),'11');
    assert.equal(await game.getByTestId('energy').innerText(),'90');
    await game.getByRole('button',{name:'Arena',exact:true}).click();
    await game.getByRole('button',{name:'Enter the arena'}).click();
    await game.getByRole('button',{name:'Fight again'}).waitFor();
    assert.match(await game.locator('.battle-result').innerText(),/XP earned/);
    assert.equal(await page.locator('iframe').getAttribute('sandbox'),'allow-scripts');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    await page.reload();
    assert.equal(await game.getByTestId('energy').innerText(),'100');
    await page.getByRole('link',{name:'Exit demo'}).click();
    await page.getByRole('link',{name:'Play with your Friend'}).click();
    await page.getByText('No browser wallet found.',{exact:false}).waitFor();
    console.log(`PASS: wallet-free guest trains and fights, resets, and wallet mode stays gated at ${width}px`);
    await page.close();
  }
} finally {await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
