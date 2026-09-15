import { legacyKeyboardRoute } from "./routes/wm002-route";
import {
  hudLayout,
  state,
  wait,
  shot,
  start,
  look,
  keyboard,
  setPad,
  padTap,
  controllerStart,
  controller,
  stop,
  route,
} from "./routes/wm003-route";
import { test, expect, type Page } from "@playwright/test";
import { writeFile, readFile } from "node:fs/promises";
const out = "evidence/wm-003/captures";
test("WM003 ordinary keyboard combined swing climb ceiling pull route", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await start(page);
    await route(page);
    expect((await state(page)).training).toMatchObject({
      completed: true,
      stage: 6,
      completions: 1,
      valid: true,
    });
    expect(errors).toEqual([]);
    await writeFile(
      `${out}/keyboard-route.json`,
      JSON.stringify(
        {
          method:
            "Ordinary New Game and keyboard/mouse; no fixture positioning",
          state: await state(page),
          errors,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await writeFile(
      info.outputPath("last-state.json"),
      JSON.stringify(await state(page), null, 2),
    );
    await shot(page, "failed-keyboard-route");
    throw e;
  }
});

test("WM003 simulated PlayStation complete route, controller pause save load and keyboard fallback", async ({
  page,
}, info) => {
  test.setTimeout(210000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await controllerStart(page);
    const controls = controller(page);
    await route(page, controls, "controller");
    expect((await state(page)).training).toMatchObject({
      stage: 6,
      completed: true,
      completions: 1,
      valid: true,
    });
    await padTap(page, 9);
    await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
    await padTap(page, 13);
    await padTap(page, 0);
    await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
    await padTap(page, 13);
    await padTap(page, 13);
    await padTap(page, 0);
    await expect(
      page.getByRole("heading", { name: "WEBMASTER" }),
    ).toBeVisible();
    await padTap(page, 13);
    await padTap(page, 0);
    const loaded = await state(page);
    expect(loaded.training.stage).toBe(6);
    expect(loaded.traversal.surfaceId).toBeNull();
    expect(loaded.traversal.pullId).toBeNull();
    expect(loaded.swing.web).toBeNull();
    expect(Object.values(loaded.velocity).every((v) => v === 0)).toBe(true);
    await page.keyboard.down("w");
    await page.waitForTimeout(180);
    await page.keyboard.up("w");
    expect((await state(page)).position).not.toEqual(loaded.position);
    expect(errors).toEqual([]);
    await writeFile(
      `${out}/controller-route.json`,
      JSON.stringify(
        {
          method:
            "Simulated standard PlayStation semantic actions only through route and save/load menus; keyboard fallback separately; not physical evidence",
          loaded,
          errors,
        },
        null,
        2,
      ),
    );
  } catch (e) {
    await writeFile(
      info.outputPath("last-state.json"),
      JSON.stringify(await state(page), null, 2),
    );
    await shot(page, "failed-controller-route");
    throw e;
  }
});

for (const name of ["WM-001", "WM-002"])
  test(`WM003 loads exact historical ${name} writer records without changing old generations`, async ({
    page,
  }) => {
    const fixture = JSON.parse(
      await readFile(`evidence/wm-003/legacy-saves/${name}.json`, "utf8"),
    );
    await page.addInitScript((stored) => {
      for (const [k, v] of Object.entries(stored))
        localStorage.setItem(k, String(v));
    }, fixture.stored);
    await page.goto("/?test=1");
    await expect(page.locator("#loading")).toHaveClass(/hidden/);
    await page.getByRole("button", { name: /Continue/ }).click();
    const loaded = await state(page);
    expect(loaded.position).toEqual(fixture.payload.position);
    expect(loaded.health).toBe(75);
    expect(loaded.traversal.surfaceId).toBeNull();
    expect(loaded.traversal.pullId).toBeNull();
    expect(loaded.training.active).toBe(false);
    expect(loaded.swing.web).toBeNull();
    const after = await page.evaluate(() =>
      Object.fromEntries(
        Object.entries(localStorage).filter(([k]) =>
          k.startsWith("webmaster.save"),
        ),
      ),
    );
    expect(after).toEqual(fixture.stored);
    await writeFile(
      `${out}/${name}-compatibility.json`,
      JSON.stringify(
        {
          fixtureSource: fixture.source_head,
          classification:
            "Exact historical-writer synthetic save fixture; not sponsor data or earned route evidence",
          loaded,
          bytesPreserved: true,
        },
        null,
        2,
      ),
    );
  });

test("WM003 historical WM002 save to full swing plus climb route, safe save and real browser close/reopen", async ({
  playwright,
}, info) => {
  test.setTimeout(240000);
  const profile = info.outputPath("wm003-persistent-profile"),
    options = {
      headless: true,
      baseURL: "http://127.0.0.1:4173",
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: info.outputPath("persistent-video") },
      ...(process.env.WM_CHROMIUM_PATH
        ? { executablePath: process.env.WM_CHROMIUM_PATH }
        : {}),
    };
  let context = await playwright.chromium.launchPersistentContext(
      profile,
      options,
    ),
    page = await context.newPage();
  const old = JSON.parse(
    await readFile("evidence/wm-003/legacy-saves/WM-002.json", "utf8"),
  );
  await page.goto("/?test=1");
  await expect(page.locator("#loading")).toHaveClass(/hidden/);
  await page.evaluate((stored) => {
    for (const [k, v] of Object.entries(stored))
      localStorage.setItem(k, String(v));
  }, old.stored);
  await page.reload();
  await expect(page.locator("#loading")).toHaveClass(/hidden/);
  await page.getByRole("button", { name: /Continue/ }).click();
  expect((await state(page)).skyline.stage).toBe(1);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Replay skyline/ }).click();
  try {
    await legacyKeyboardRoute(page, false);
  } catch (e) {
    await writeFile(
      info.outputPath("legacy-last-state.json"),
      JSON.stringify(await state(page), null, 2),
    );
    throw e;
  }
  expect((await state(page)).skyline.completed).toBe(true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Replay skyline/ }).click();
  await route(page, keyboard(page), "cross-sprint");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Save Game/ })).toBeEnabled();
  await page.getByRole("button", { name: /^Save Game/ }).click();
  await expect(page.locator("#toast-layer")).toContainText("Save confirmed");
  const before = await page.evaluate(() =>
    Object.fromEntries(
      Object.entries(localStorage).filter(([k]) =>
        k.startsWith("webmaster.save"),
      ),
    ),
  );
  const saved = await state(page);
  await context.close();
  context = await playwright.chromium.launchPersistentContext(profile, options);
  page = await context.newPage();
  await page.goto("/?test=1");
  await expect(page.locator("#loading")).toHaveClass(/hidden/);
  await page.getByRole("button", { name: /Continue/ }).click();
  const loaded = await state(page);
  expect(loaded.training).toMatchObject({ stage: 6, completed: true });
  expect(loaded.traversal.surfaceId).toBeNull();
  expect(loaded.traversal.pullId).toBeNull();
  expect(loaded.swing.web).toBeNull();
  expect(Object.values(loaded.velocity).every((v) => v === 0)).toBe(true);
  expect(loaded.grounded).toBe(true);
  expect(
    await page.evaluate(() =>
      Object.fromEntries(
        Object.entries(localStorage).filter(([k]) =>
          k.startsWith("webmaster.save"),
        ),
      ),
    ),
  ).toEqual(before);
  await shot(page, "cross-sprint-persistent-return");
  await writeFile(
    `${out}/cross-sprint-persistence.json`,
    JSON.stringify(
      {
        oldWriterSource: old.source_head,
        method:
          "Historical WM002 writer save loaded; ordinary replay and all four swing gaps; ordinary south route with all S3 mechanics; manual save; actual persistent browser closed and reopened on identical origin/profile",
        saved,
        loaded,
        stored: before,
      },
      null,
      2,
    ),
  );
  await context.close();
});

async function fixture(
  p: Page,
  x: number,
  y: number,
  z: number,
  label: string,
) {
  await p.evaluate(
    ({ x, y, z, label }) =>
      window.__WM_DEBUG__!.setFixturePosition({ x, y, z }, label),
    { x, y, z, label },
  );
  await p.waitForTimeout(250);
}
test("WM003 negative lifecycle probes: wall pause focus pull interruption heavy feedback and blocked web", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  await start(page);
  await fixture(
    page,
    0,
    0,
    -60.4,
    "negative wall lifecycle; cannot award route",
  );
  await look(page, Math.PI / 2, 1.08);
  await page.keyboard.down("w");
  await page.waitForTimeout(100);
  await page.keyboard.up("w");
  await page.keyboard.down("c");
  await wait(page, (s) => s.traversal.surfaceId === "climb-wall");
  await page.keyboard.down("w");
  await wait(page, (s) => s.position.y > 2);
  await page.keyboard.up("w");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Save Game/ })).toBeDisabled();
  await shot(page, "save-unavailable-climbing");
  const paused = await state(page);
  await page.waitForTimeout(250);
  expect((await state(page)).position).toEqual(paused.position);
  await page.getByRole("button", { name: /Resume/ }).click();
  await page.waitForTimeout(200);
  expect((await state(page)).traversal.surfaceId).toBeNull();
  await page.keyboard.up("c");
  await fixture(page, 0, 0, -60.4, "negative blur cleanup");
  await look(page, Math.PI / 2, 1.08);
  await page.keyboard.down("w");
  await page.waitForTimeout(100);
  await page.keyboard.up("w");
  await page.keyboard.down("c");
  await wait(page, (s) => !!s.traversal.surfaceId);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.waitForTimeout(150);
  expect((await state(page)).traversal.surfaceId).toBeNull();
  await page.keyboard.up("c");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await fixture(page, -9, 0, -51, "negative pull pause");
  await look(page, Math.PI, 1.45);
  await page.keyboard.down("q");
  await wait(page, (s) => s.traversal.phase === "PULLING");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Save Game/ })).toBeDisabled();
  await shot(page, "save-unavailable-pulling");
  const pulled = (await state(page)).pullObjects;
  await page.waitForTimeout(250);
  expect((await state(page)).pullObjects).toEqual(pulled);
  await page.getByRole("button", { name: /Resume/ }).click();
  await page.waitForTimeout(180);
  expect((await state(page)).traversal.pullId).toBeNull();
  expect((await state(page)).pullObjects.every((o) => o.speed === 0)).toBe(
    true,
  );
  await page.keyboard.up("q");
  await fixture(page, 2, 0, -49, "negative too-heavy demonstration");
  await look(page, Math.PI, 1.45);
  await page.keyboard.down("q");
  await wait(page, (s) => s.traversal.message === "Too heavy to pull");
  await shot(page, "too-heavy-feedback");
  await page.keyboard.up("q");
  await fixture(page, 10, 0, -51, "negative moving into obstructed pull path");
  await look(page, 0, 1.45);
  await page.keyboard.down("q");
  await wait(page, (s) => s.traversal.pullId === "route-step");
  await page.keyboard.down("a");
  await wait(page, (s) => s.traversal.message === "Path blocked");
  await stop(page);
  await shot(page, "blocked-pull-feedback");
  expect((await state(page)).traversal.pullId).toBeNull();
  await fixture(
    page,
    -11,
    2.6,
    -51,
    "negative finish placement without route stages",
  );
  expect((await state(page)).training.completed).toBe(false);
  for (let n = 0; n < 4; n++) {
    await fixture(
      page,
      0,
      -30,
      -40,
      "negative repeated fall and zero-health retry",
    );
    await page.waitForTimeout(750);
  }
  const recovered = await state(page);
  expect(recovered.health).toBe(100);
  expect(recovered.traversal.surfaceId).toBeNull();
  expect(recovered.traversal.pullId).toBeNull();
  expect(recovered.swing.web).toBeNull();
  expect(Object.values(recovered.velocity).every((v) => v === 0)).toBe(true);
  await writeFile(
    info.outputPath("negative-lifecycle.json"),
    JSON.stringify(
      {
        method:
          "Explicitly labeled negative placements; no route completion evidence",
        recovered,
      },
      null,
      2,
    ),
  );
});

test("WM003 RB and LB disconnect cleanup with neutral reconnect and keyboard fallback", async ({
  page,
}, info) => {
  test.setTimeout(70000);
  await controllerStart(page);
  await fixture(page, 0, 0, -60.4, "negative controller wall disconnect");
  await look(page, Math.PI / 2, 1.08);
  await setPad(page, [5], [0, -1, 0, 0]);
  await wait(page, (s) => s.traversal.surfaceId === "climb-wall");
  await page.evaluate(() => ((window as any).__wm003pad.connected = false));
  await page.waitForTimeout(200);
  expect((await state(page)).traversal.surfaceId).toBeNull();
  expect(
    await page.evaluate(
      () => window.__WM_DEBUG__!.getControllerStatus().lifecycle,
    ),
  ).toBe("CONTROLLER_DISCONNECTED");
  await page.evaluate(() => ((window as any).__wm003pad.connected = true));
  await page.waitForTimeout(120);
  expect(
    await page.evaluate(
      () => window.__WM_DEBUG__!.getControllerStatus().lifecycle,
    ),
  ).toBe("CONTROLLER_DETECTED_RELEASE_CONTROLS");
  await setPad(page);
  await page.waitForFunction(
    () =>
      window.__WM_DEBUG__!.getControllerStatus().lifecycle ===
      "CONTROLLER_READY",
  );
  await fixture(page, -9, 0, -51, "negative controller pull disconnect");
  await look(page, Math.PI, 1.45);
  await setPad(page, [4]);
  await wait(page, (s) => s.traversal.phase === "PULLING");
  const diagnostics = await page.evaluate(() =>
    window.__WM_DEBUG__!.getControllerDiagnostics(),
  );
  expect(diagnostics).toContain("pull web");
  await page.evaluate(() => ((window as any).__wm003pad.connected = false));
  await page.waitForTimeout(200);
  expect((await state(page)).traversal.pullId).toBeNull();
  expect((await state(page)).pullObjects.every((o) => o.speed === 0)).toBe(
    true,
  );
  const before = (await state(page)).position;
  await page.keyboard.down("w");
  await page.waitForTimeout(250);
  await page.keyboard.up("w");
  expect((await state(page)).position).not.toEqual(before);
  await writeFile(
    info.outputPath("controller-cleanup.json"),
    JSON.stringify(
      {
        classification: "Synthetic controller, negative placement only",
        diagnostics,
        state: await state(page),
      },
      null,
      2,
    ),
  );
});

test("WM003 original eyes palette body lattice and actual backward forward swing-leg phases", async ({
  page,
}, info) => {
  test.setTimeout(75000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await start(page);
  await look(page, Math.PI / 2, 1.08);
  await shot(page, "hero-front-eyes-palette");
  await look(page, Math.PI / 4, 1.08);
  await shot(page, "hero-three-quarter-web-patterns");
  await look(page, Math.PI / 2, 1.65);
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await wait(page, (s) => s.position.z < -18.5);
  await stop(page);
  await page.waitForTimeout(3900);
  await expect(page.locator("#toast-layer")).not.toHaveClass(/visible/);
  await hudLayout(page, "entry");
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await wait(page, (s) => s.position.z < -22);
  await page.keyboard.down("e");
  await page.keyboard.press("Space");
  await wait(page, (s) => !!s.swing.web);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  // A single ordinary drag gets the side view before the initial trailing phase passes.
  const beforeOrbit=await state(page),dx=beforeOrbit.cameraAlpha/.0035,dy=(1.15-beforeOrbit.cameraBeta)/.0035;
  await page.locator('#game-canvas').dispatchEvent('mousedown',{clientX:600,clientY:380,button:0,buttons:1,bubbles:true});
  await page.locator('body').dispatchEvent('mousemove',{clientX:600+dx,clientY:380+dy,buttons:1,bubbles:true});
  await page.locator('body').dispatchEvent('mouseup',{clientX:600+dx,clientY:380+dy,button:0,bubbles:true});
  await page.waitForTimeout(50);
  await page.keyboard.down("a");
  await wait(
    page,
    (s) => s.swing.web && s.legPose.angle < -0.08 && s.legPose.blend > 0.5,
  );
  const back = await state(page);
  expect(back.legWorld!.every((leg) => leg.forwardDisplacement < -0.05)).toBe(
    true,
  );
  await shot(page, "swing-legs-backward");
  await wait(page, (s) => s.swing.web && s.legPose.angle > 0.08);
  const forward = await state(page);
  expect(forward.legWorld!.every((leg) => leg.forwardDisplacement > 0.05)).toBe(
    true,
  );
  await shot(page, "swing-legs-forward");
  await wait(page, (s) => s.position.z < -36);
  await page.keyboard.up("e");
  await wait(page, (s) => s.training.stage === 1);
  await stop(page);
  await look(page, 0.3, 1.08);
  await page.waitForTimeout(3900);
  const landed = await state(page);
  expect(
    landed.legWorld!.every((leg) => Math.abs(leg.forwardDisplacement) < 0.02),
  ).toBe(true);
  expect(landed.health).toBe(100);
  expect(landed.training.stage).toBe(1);
  expect(landed.legPose.blend).toBeLessThan(0.02);
  expect(Math.abs(landed.legPose.angle)).toBeLessThan(0.02);
  await expect(page.locator("#toast-layer")).not.toHaveClass(/visible/);
  await shot(page, "landing-leg-blend");
  await writeFile(
    info.outputPath("presentation-phases.json"),
    JSON.stringify(
      {
        method:
          "Ordinary 1920x1080 front/three-quarter and side orbit; transient toast allowed to clear naturally; real swing with no pose/physics/UI writes",
        back,
        forward,
        landed,
      },
      null,
      2,
    ),
  );
});

for (const [name, intervals] of [
  ["near-30", [1000 / 30]],
  ["uneven", [1000 / 60, 1000 / 120, 1000 / 30]],
] as const)
  test(`WM003 complete route under ${name} rendered timing`, async ({
    page,
  }, info) => {
    test.setTimeout(160000);
    await page.addInitScript((intervals) => {
      const native = window.requestAnimationFrame.bind(window),
        last = new WeakMap<
          FrameRequestCallback,
          { next: number; index: number }
        >();
      window.requestAnimationFrame = (callback) => {
        const entry = last.get(callback) ?? {
          next: performance.now(),
          index: 0,
        };
        last.set(callback, entry);
        const check = (now: number) => {
          if (now + 0.3 >= entry.next) {
            entry.next = Math.max(
              entry.next + intervals[entry.index++ % intervals.length]!,
              now - 40,
            );
            callback(now);
          } else native(check);
        };
        return native(check);
      };
    }, intervals);
    await start(page);
    await route(page, keyboard(page), name);
    const observedPerformance = await page.evaluate(() =>
      window.__WM_DEBUG__!.performance(),
    );
    expect((await state(page)).training.stage).toBe(6);
    await writeFile(
      info.outputPath(`rendered-${name}.json`),
      JSON.stringify(
        {
          profile: name,
          requestedIntervalsMs: intervals,
          performance: observedPerformance,
          absoluteFloor: 30,
          absoluteResult:
            observedPerformance.minimum !== null &&
            observedPerformance.minimum >= 30
              ? "PASS"
              : "NOT_MET",
          method:
            "Complete genuine route with actual requestAnimationFrame schedule; fixed physics steps unchanged; functional result distinct from absolute FPS",
          state: await state(page),
        },
        null,
        2,
      ),
    );
  });

test("WM003 repeated replay pause save load clears transients and bounds resources", async ({
  page,
  context,
}, info) => {
  test.setTimeout(100000);
  await start(page);
  await page.keyboard.down("s");
  await wait(page, (s) => s.position.z < -19);
  await stop(page);
  const cdp = await context.newCDPSession(page),
    measurements = [];
  for (let cycle = 0; cycle < 12; cycle++) {
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Replay Climb/ }).click();
    await page.waitForTimeout(250);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /^Save & Quit/ }).click();
    await expect(
      page.getByRole("heading", { name: "WEBMASTER" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Continue/ }).click();
    const s = await state(page);
    expect(s.traversal.surfaceId).toBeNull();
    expect(s.traversal.pullId).toBeNull();
    expect(s.swing.web).toBeNull();
    expect(s.heroPitch).toBe(0);
    expect(s.surfaceCameraBlend).toBe(0);
    expect(s.pullObjects.every((o) => o.speed === 0)).toBe(true);
    await page.waitForTimeout(350);
    await cdp.send("HeapProfiler.collectGarbage");
    const heap = await cdp.send("Runtime.getHeapUsage"),
      dom = await cdp.send("Memory.getDOMCounters");
    measurements.push({
      cycle,
      heap: heap.usedSize,
      nodes: dom.nodes,
      listeners: dom.jsEventListeners,
    });
  }
  await writeFile(
    info.outputPath("resources.json"),
    JSON.stringify(
      {
        method:
          "12 ordinary S3 replay/pause/save/Continue cycles; 350ms settled UI then post-GC heap and DOM/listeners; finite warmup bounds",
        measurements,
      },
      null,
      2,
    ),
  );
  const warm = measurements[3]!,
    last = measurements.at(-1)!;
  expect(last.heap - warm.heap).toBeLessThan(4 * 1024 * 1024);
  expect(last.nodes - warm.nodes).toBeLessThanOrEqual(10);
  expect(last.listeners - warm.listeners).toBeLessThanOrEqual(2);
  await writeFile(
    info.outputPath("resources.json"),
    JSON.stringify(
      {
        method:
          "12 ordinary S3 replay/pause/save/Continue cycles; post-GC heap and DOM/listeners; finite warmup bounds",
        measurements,
      },
      null,
      2,
    ),
  );
});
