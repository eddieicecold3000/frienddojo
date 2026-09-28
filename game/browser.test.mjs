import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { testGame } from '@rarefriends/friendsdk/testing';
for (const width of [960,390]) {
  console.log(await testGame(fileURLToPath(new URL('.',import.meta.url)), {
    width,height:width===960?800:844,
    screenshot: `../../outputs/dojo-${width}.png`,
    check:async({game,page})=>{
      await game.getByRole('img',{name:'Original artwork for Friend 7730'}).waitFor({state:'visible'});
      await game.locator('.spotlight-note').waitFor({state:'visible'});
      assert.match(await game.locator('.spotlight-note').innerText(),/CHARACTER SPOTLIGHT/);
      await game.getByRole('button',{name:'Preview Clock',exact:true}).click();
      await game.getByRole('heading',{name:'Preview Clock',exact:true}).waitFor();
      await game.getByRole('button',{name:'Roadmap',exact:true}).click();
      await game.getByRole('heading',{name:'Friend vs. Friend',exact:true}).waitFor();
      assert.match(await game.locator('.pvp-roadmap').innerText(),/optional RF wagers/);
      assert.doesNotMatch(await game.locator('.pvp-roadmap').innerText(),/NO RF WAGERS PLANNED/);
      await game.getByRole('button',{name:'Arena',exact:true}).click();
      const opponents=await game.locator('.opponent-label option').allTextContents();
      assert.equal(opponents.length,8);
      assert.match(opponents.at(-1) ?? '',/Dojo Legend/);
      assert.equal(await game.locator('.arena .pvp-roadmap').count(),0);
      await game.locator('.intelligence').getByRole('button').click();
      assert.equal(await game.getByTestId('energy').innerText(),'90');
      assert.equal(await game.getByTestId('intelligence').innerText(),'11');
      await game.getByRole('button',{name:'5 reps',exact:true}).click();
      await game.locator('.power').getByRole('button').click();
      assert.equal(await game.getByTestId('energy').innerText(),'40');
      assert(await game.locator('.speed').getByRole('button').isDisabled());
      await game.getByRole('button',{name:'RF Supporter',exact:true}).click();
      assert.equal(await game.getByRole('button',{name:'Advance 15 minutes',exact:true}).count(),0);
      await game.getByRole('button',{name:/Preview Friend boost/}).click();
      assert.match(await game.getByLabel('Confirm simulated membership').innerText(),/Friend #7730/);
      assert.match(await game.getByLabel('Confirm simulated membership').innerText(),/no wallet transaction/);
      await game.getByRole('button',{name:'Cancel',exact:true}).click();
      assert.match(await game.locator('.support-plans').innerText(),/620 RF/);
      assert.match(await game.locator('.support-plans').innerText(),/3,100 RF/);
      await game.getByRole('button',{name:/Preview 30-day pass/}).click();
      assert.match(await game.getByLabel('Confirm simulated membership').innerText(),/3,100 mock RF/);
      assert.match(await game.getByLabel('Confirm simulated membership').innerText(),/30 days/);
      await game.getByRole('button',{name:'Cancel',exact:true}).click();
      assert.equal(await game.getByTestId('demo-rf').innerText(),'10000');
      await game.getByRole('button',{name:/Preview 30-day pass/}).click();
      await game.getByRole('button',{name:'Confirm simulation'}).click();
      assert.equal(await game.getByTestId('demo-rf').innerText(),'6900');
      await game.getByRole('button',{name:'Preview Clock',exact:true}).click();
      await game.getByRole('button',{name:'Advance 15 minutes',exact:true}).click();
      assert.equal(await game.getByTestId('energy').innerText(),'45');
      await game.getByRole('button',{name:'RF Supporter',exact:true}).click();
      assert.match(await game.getByText('Monthly supporter active').innerText(),/minutes remaining/);
      await game.getByRole('button',{name:'Preview Clock',exact:true}).click();
      await game.getByRole('button',{name:'Advance 15 minutes',exact:true}).click();
      assert.equal(await game.getByTestId('energy').innerText(),'50');
      await game.getByRole('button',{name:'RF Supporter',exact:true}).click();
      await game.getByRole('button',{name:/Preview 1-day pass/}).click();
      await game.getByRole('button',{name:'Confirm simulation'}).click();
      assert.equal(await game.getByTestId('demo-rf').innerText(),'6280');
      await game.getByRole('button',{name:'Preview Clock',exact:true}).click();
      await game.getByRole('button',{name:'Advance 24 hours'}).click();
      assert.equal(await game.getByTestId('energy').innerText(),'100');
      assert(await game.getByRole('button',{name:/Preview 1-day pass/}).isEnabled());
      await game.getByRole('button',{name:'Arena',exact:true}).click();
      await game.getByRole('button',{name:'Enter the arena'}).click();
      await game.getByRole('button',{name:'Fight again'}).waitFor();
      assert.equal(await game.getByTestId('energy').innerText(),'90');
      assert.match(await game.locator('.battle-result').innerText(),/XP earned/);
      assert((await game.locator('.battle-log li').count())>0);
      await game.getByRole('button',{name:'Training',exact:true}).click();
      await game.locator('.strength').getByRole('button').click();
      assert.equal(await game.getByTestId('energy').innerText(),'40');
      await game.getByRole('button',{name:'1 rep',exact:true}).click();
      for(let i=0;i<4;i++) await game.locator('.speed').getByRole('button').click();
      assert.equal(await game.getByTestId('energy').innerText(),'0');
      await game.getByRole('button',{name:'Arena',exact:true}).click();
      assert(await game.getByRole('button',{name:'Need 10 T to fight'}).isDisabled());
      await game.getByRole('button',{name:'Rules',exact:true}).click();
      await game.getByText('Intelligence milestones',{exact:true}).waitFor();
      assert.equal(await game.locator('body').evaluate(el=>el.scrollWidth>innerWidth),false);
      assert.equal(await game.locator('.dojo').evaluate(el=>getComputedStyle(el).overflowY),'auto');
      await game.getByRole('button',{name:'Training',exact:true}).click();
      await game.locator('.dojo').evaluate(el=>el.scrollTo(0,0));
      console.log(`Training, membership, recovery, battle and mobile checks passed at ${width}px`);
    }
  }));
}

