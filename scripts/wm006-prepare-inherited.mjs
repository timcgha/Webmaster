/**
 * Generate WM-006 inherited refresh specs from historical e2e sources.
 *
 * Transforms use anchored markers / regex and fail closed when a marker is
 * missing, so copy drift surfaces as a prepare failure instead of a silent
 * wrong overlay.
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const COMBAT_INVITE =
  "Rings complete! Open Combat Playground from Pause.";
export const COMBAT_HUD_BUTTON = "Open Combat Playground";
export const SAVE_UNAVAILABLE =
  "Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight";

const LEGACY_SAVE_UNAVAILABLE =
  /Unavailable while climbing, on a ceiling, pulling, swinging, airborne, landing or recovering|Unavailable during attacks, webs, wraps, dodge recovery, training-machine danger, climbing, pulling, swinging or flight(?:\. Resume to reach a safe state\.)?/;

/** Replace all matches; require at least one unless allowZero. */
export function replaceAllMarked(source, pattern, replacement, label, allowZero = false) {
  const re =
    typeof pattern === "string"
      ? null
      : new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  if (typeof pattern === "string") {
    const count = source.split(pattern).length - 1;
    assert.ok(allowZero || count > 0, `missing marker: ${label}`);
    return count ? source.replaceAll(pattern, replacement) : source;
  }
  const matches = source.match(re);
  assert.ok(allowZero || (matches && matches.length > 0), `missing marker: ${label}`);
  return matches?.length ? source.replace(re, replacement) : source;
}

/** Slice from startRegex to endRegex (end exclusive); replace the slice. */
export function replaceRange(source, startRegex, endRegex, replacement, label) {
  const start = source.search(startRegex);
  assert.ok(start >= 0, `missing start marker: ${label}`);
  const after = source.slice(start);
  const endRel = after.search(endRegex);
  assert.ok(endRel > 0, `missing end marker: ${label}`);
  return source.slice(0, start) + replacement + after.slice(endRel);
}

export function refreshCommonSelectors(source) {
  let s = source;
  s = replaceAllMarked(
    s,
    /name:\s*\/\^?Resume\//g,
    "name: /^Resume/",
    "Resume button role name",
    true,
  );
  // Idempotent: only rewrite when the legacy (or prior) unavailable copy appears.
  if (LEGACY_SAVE_UNAVAILABLE.test(s)) {
    s = replaceAllMarked(
      s,
      LEGACY_SAVE_UNAVAILABLE,
      SAVE_UNAVAILABLE,
      "safe-save unavailable copy",
    );
  }
  return s;
}

export function refreshWm002Routes(source, evidenceRoot) {
  let s = source;
  if (!s.includes('import {installCourseControls} from "./routes/wm005-route"')) {
    s = 'import {installCourseControls} from "./routes/wm005-route";\n' + s;
  }
  s = replaceRange(
    s,
    /async function keyboardRoute\s*\(/,
    /test\(\s*"WM-002 keyboard/,
    `async function keyboardRoute(page:Page, _captures=true){await currentLegacyRoute(page,false);await stage(page,4);}\n`,
    "WM-002 keyboardRoute",
  );
  s = replaceRange(
    s,
    /async function controllerRoute\s*\(/,
    /test\(\s*"WM-002 simulated/,
    `async function controllerRoute(page:Page){await currentLegacyRoute(page,true);}\n`,
    "WM-002 controllerRoute",
  );
  // Persistent profile must use the prescribed full Chromium channel.
  if (/headless:\s*true(?!, channel)/.test(s)) {
    s = replaceAllMarked(
      s,
      /headless:\s*true(?!, channel)/,
      'headless: true, channel: "chromium"',
      "WM-002 persistent Chromium channel",
    );
  } else {
    assert.ok(
      /headless:\s*true,\s*channel:\s*"chromium"/.test(s),
      "missing marker: WM-002 persistent Chromium channel",
    );
  }
  if (!s.includes("async function currentLegacyRoute(")) {
    s += `\nasync function currentLegacyRoute(page:Page,padRoute:boolean){
   if(padRoute){await tap(page,9);for(let n=0;n<12;n++){if(await page.locator('[data-menu-item][aria-current="true"] > span').innerText()==='Replay 20-ring course')break;await tap(page,13);}await expect(page.locator('[data-menu-item][aria-current="true"] > span')).toHaveText('Replay 20-ring course');await tap(page,0);await padReady(page);await page.evaluate(()=>{(window as any).__wm003pad=(window as any).__wm002pad;});}
   else{await page.keyboard.press('Escape');await page.getByRole('button',{name:/^Replay 20-ring/}).click();}
   await installCourseControls(page,padRoute);
   const route=await page.evaluate(async()=>{const c=(window as any).__wm005Controls;try{await c.legacy();return {finish:c.state(),anchors:c.anchors,inputs:c.events};}finally{c.keys();}});
   expect(route.finish.skyline).toMatchObject({stage:4,completed:true,completions:1,valid:true});expect(route.finish.safe).toBe(true);expect(route.finish.swing.web).toBeNull();
   expect(route.anchors.map((x:any)=>x.expected)).toEqual(['training-ring','ring-1','ring-2','ring-3','ring-4','ring-5']);
   await shot(page,padRoute?'controller-refreshed-legacy-finish':'keyboard-refreshed-legacy-finish');
   await writeFile('${evidenceRoot}/'+(padRoute?'controller':'keyboard')+'-legacy.json',JSON.stringify({method:'Exact frozen candidate; existing accepted WM005 browser-frame input sequencer. Ordinary replay menu, all original rooftops plus starting training ring. Actual DOM keyboard/mouse or semantic pad only; no state/position/time/progression changes. No blocking screenshot at airborne handoff.',...route},null,2));
  }\n`;
  }
  return s;
}

export function refreshCurrentCourse(source) {
  let s = source;
  s = replaceAllMarked(
    s,
    /const out\s*=\s*["']evidence\/wm-005\/captures["']/,
    'const out="evidence/wm-006/regression-refresh/current-course"',
    "WM-005 capture out path",
  );
  if (!s.includes('import {menuChoice} from "./routes/wm006-route"')) {
    s = 'import {menuChoice} from "./routes/wm006-route";\n' + s;
  }
  const finish =
    /await\s+replayStart\(\s*page\s*,\s*c\s*,\s*pad\s*\)\s*;\s*await\s+fullCourse\(\s*page\s*,\s*label\s*\)\s*;\s*expect\(\s*errors\s*\)\s*\.toEqual\(\s*\[\s*\]\s*\)\s*;/;
  assert.ok(finish.test(s), "missing marker: WM-005 complete course handoff");
  s = s.replace(
    finish,
    `await replayStart(page,c,pad);await fullCourse(page,label);
  await expect(page.locator('[data-hud="combat-invite"]')).toHaveText('${COMBAT_INVITE}');
  await hudLayout(page,'followup-'+label+'-rings-complete');
  if(pad)await padTap(page,9);else await page.getByRole('button',{name:'${COMBAT_HUD_BUTTON}',exact:true}).click();
  await menuChoice(page,pad,/^Combat Playground/);await expect(page.locator('.combat-card')).toBeVisible();
  expect((await state(page)).combat.active).toBe(true);await shot(page,label+'-rings-to-combat');expect(errors).toEqual([]);`,
  );
  return s;
}

export function prepareInherited({
  evidenceRoot = "evidence/wm-006/regression-refresh",
  write = true,
} = {}) {
  process.env.WM_SOURCE = execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
  process.env.WM_TREE = execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
    encoding: "utf8",
  }).trim();
  if (write) fs.mkdirSync(evidenceRoot, { recursive: true });

  const transformed = [];
  for (const n of ["wm001", "wm002", "wm003"]) {
    let s = fs.readFileSync(`e2e/${n}.spec.ts`, "utf8");
    s = refreshCommonSelectors(s);
    if (n === "wm002") s = refreshWm002Routes(s, evidenceRoot);
    const target = `e2e/wm006-refresh-${n}.spec.ts`;
    if (write) fs.writeFileSync(target, s);
    transformed.push({ original: `e2e/${n}.spec.ts`, overlay: target, bytes: s.length });
  }

  let course = fs.readFileSync("e2e/wm005.spec.ts", "utf8");
  course = refreshCurrentCourse(course);
  const courseTarget = "e2e/wm006-refresh-current-course.spec.ts";
  if (write) {
    fs.writeFileSync(courseTarget, course);
    fs.writeFileSync(
      `${evidenceRoot}/method.json`,
      JSON.stringify(
        {
          source: process.env.WM_SOURCE,
          tree: process.env.WM_TREE,
          transformed,
          reason:
            "Refresh outdated text and ambiguous selectors with marker-based overlays; replace transport-timed roof-edge input with the existing released browser-frame semantic sequencer; persistent browser uses prescribed full Chromium. Combat invite/button copy tracks current product. All original progression, save, pause/focus and lifecycle assertions remain. Original failed evidence preserved. Additional current two-lap course tests exercise full twenty-anchor route on both input routes.",
          productMutation: false,
        },
        null,
        2,
      ),
    );
  }
  transformed.push({
    original: "e2e/wm005.spec.ts",
    overlay: courseTarget,
    bytes: course.length,
  });
  return { transformed, source: process.env.WM_SOURCE, tree: process.env.WM_TREE };
}

const entry = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href;
if (entry && import.meta.url === entry) {
  const result = prepareInherited();
  console.log(
    JSON.stringify({
      prepared: result.transformed.map((t) => t.overlay),
      source: result.source,
    }),
  );
}
