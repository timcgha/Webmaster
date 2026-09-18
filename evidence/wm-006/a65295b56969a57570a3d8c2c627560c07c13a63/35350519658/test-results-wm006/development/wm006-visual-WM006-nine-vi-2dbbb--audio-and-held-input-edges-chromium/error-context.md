# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm006-visual.spec.ts >> WM006 nine visible attacks, dodge directions, audio and held-input edges
- Location: e2e\wm006-visual.spec.ts:7:1

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForFunction: Test timeout of 180000ms exceeded.
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Current objective":
        - text: COMBAT 1 / 5
        - strong: Punch the orange box. Tap J / X / □ quickly for 1 → 2 → HAYMAKER.
      - region "Combat training":
        - strong: Web ball
        - generic: "Tap again within 1 second: 1 → 2 → 3 → 1. Hold does not repeat."
        - generic: J / X / □ punch · K / Y / △ kickL / D-pad ↑ shoot · F / B / ○ dodge
        - generic: "Pause: retry station / replay / return to traversal"
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: "-38, -18, -54 • 60 FPS"
      - generic: Follow the colored mats north · no timer
    - status:
      - generic: CONTROLLER
      - strong: "Controller: press any button or move a stick to connect"
    - generic:
      - strong: Move
      - text: WASD / Left Stick
      - strong: Look
      - text: Drag / Right Stick
      - strong: Jump
      - text: Space / A / ✕
      - strong: Run
      - text: Shift / RT / R2
      - strong: Swing
      - text: Hold E / LT / L2, release to let go
      - strong: Climb
      - text: Hold C / RB / R1
      - strong: Pull
      - text: Hold Q / LB / L1
      - strong: Recenter
      - text: R / RS
      - strong: Pause
      - text: Esc / Menu / Options
  - status: Slot 1 started on Normal
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {mkdir,writeFile} from 'node:fs/promises';
  3  | import {enterCombat} from './routes/wm006-route';
  4  | import {state} from './routes/wm003-route';
  5  | import {startHeroRecording,saveHeroRecording} from './routes/wm004-recording';
  6  | 
  7  | test('WM006 nine visible attacks, dodge directions, audio and held-input edges',async({page})=>{
  8  |  test.setTimeout(180000);const out='evidence/wm-006/visual';await mkdir(out,{recursive:true});
  9  |  await page.addInitScript(()=>{
  10 |    const w=window as any;w.__soundObserved=[];
  11 |    const original=AudioContext.prototype.createOscillator;
  12 |    AudioContext.prototype.createOscillator=function(){w.__soundObserved.push({at:performance.now(),context:this.state});return original.call(this);};
  13 |  });
  14 |  const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));await enterCombat(page,false);const poses:any[]=[];
  15 |  for(const [kind,key]of [['punch','j'],['kick','k'],['web','l']] as const){
  16 |    await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.rest(1100);await c.look(Math.PI/2,1.25);});
  17 |    for(const step of [1,2,3]){
  18 |      await page.keyboard.press(key);
> 19 |      await page.waitForFunction(({kind,step})=>{const a=window.__WM_DEBUG__!.getState().combat.attack;return a?.kind===kind&&a.step===step&&a.age>=.12;},{kind,step});
     |                 ^ Error: page.waitForFunction: Test timeout of 180000ms exceeded.
  20 |      poses.push({kind,step,state:await state(page)});await page.screenshot({path:`${out}/${kind}-${step}.png`});
  21 |      await page.waitForFunction(()=>!window.__WM_DEBUG__!.getState().combat.attack);
  22 |    }
  23 |  }
  24 |  await page.evaluate(async()=>{const c=(window as any).__wm006Controls;await c.rest(1200);});
  25 |  for(const direction of ['a','d','neutral']){
  26 |    if(direction!=='neutral')await page.keyboard.down(direction);
  27 |    await page.keyboard.press('f');await page.waitForFunction(()=>!!window.__WM_DEBUG__!.getState().combat.dodge);
  28 |    poses.push({direction,state:await state(page)});await page.screenshot({path:`${out}/dodge-${direction}.png`});
  29 |    if(direction!=='neutral')await page.keyboard.up(direction);await page.waitForTimeout(1100);
  30 |  }
  31 |  const clips=[];
  32 |  for(const [angle,name]of [[Math.PI/2,'front'],[0,'side'],[-Math.PI/2,'rear']] as const){
  33 |   await page.evaluate(async angle=>{const c=(window as any).__wm006Controls;await c.rest(1100);await c.look(angle,1.25);},angle);
  34 |   await startHeroRecording(page);
  35 |   await page.evaluate(async()=>{const c=(window as any).__wm006Controls;for(const key of ['j','k','l']){await c.three(key);await c.rest(400);}});
  36 |   clips.push(await saveHeroRecording(page,`${out}/${name}-all-variations.webm`));
  37 |  }
  38 |  await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Settings/}).click();await page.getByRole('button',{name:/^Combat sounds: On/}).click();await page.getByRole('button',{name:/^Done/}).click();await page.getByRole('button',{name:/^Resume/}).click();
  39 |  const mutedBefore=await page.evaluate(()=>(window as any).__soundObserved.length);await page.keyboard.press('j');await page.waitForTimeout(650);expect(await page.evaluate(()=>(window as any).__soundObserved.length)).toBe(mutedBefore);
  40 |  const audio=await page.evaluate(()=>(window as any).__soundObserved);expect(audio.length).toBeGreaterThan(9);expect(audio.every((a:any)=>a.context==='running')).toBe(true);expect(errors).toEqual([]);
  41 |  await writeFile(`${out}/poses-and-audio.json`,JSON.stringify({poses,clips,audio,mutedBefore,errors,limitations:'Actual animated front/side/rear captures and poses; WebAudio scheduling and mute observed, perceived sound quality remains sponsor judgment.'},null,2));
  42 | });
  43 | 
```