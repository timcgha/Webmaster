# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: wm003.spec.ts >> WM003 repeated replay pause save load clears transients and bounds resources
- Location: e2e\wm003.spec.ts:615:1

# Error details

```
Error: expect(received).toBeLessThanOrEqual(expected)

Expected: <= 10
Received:    11
```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic "Webmaster 3D practice area" [ref=e3]
  - generic:
    - generic:
      - region "Current objective":
        - text: CLIMB & PULL 1 / 6
        - strong: "Climb & Pull: turn toward the south ring. Jump, hold your swing web, then release over the far roof."
      - region "Swing status":
        - text: "SWING: Hold E / LT • release to let go"
        - strong: Ring in reach
        - generic: Ring ready. Hold E or LT / L2. Release to sail forward.
    - region "Health 100 percent":
      - text: HERO ENERGY
      - strong: 100 / 100
    - generic:
      - generic: Slot 1 • Normal
      - generic: 0, 0, -20 • 49 FPS
      - generic: 20-ring course starts across the south practice gap. Cross over, then follow the numbered rings north.
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
    - region "Climb and Pull status":
      - strong: CLIMB C / RB • PULL Q / LB
      - generic: "South of practice: follow the Climb & Pull arrows."
  - status: Continued slot 1 manual
```

# Test source

```ts
  569 |         const entry = last.get(callback) ?? {
  570 |           next: performance.now(),
  571 |           index: 0,
  572 |         };
  573 |         last.set(callback, entry);
  574 |         const check = (now: number) => {
  575 |           if (now + 0.3 >= entry.next) {
  576 |             entry.next = Math.max(
  577 |               entry.next + intervals[entry.index++ % intervals.length]!,
  578 |               now - 40,
  579 |             );
  580 |             callback(now);
  581 |           } else native(check);
  582 |         };
  583 |         return native(check);
  584 |       };
  585 |     }, intervals);
  586 |     await start(page);
  587 |     await route(page, keyboard(page), name);
  588 |     const observedPerformance = await page.evaluate(() =>
  589 |       window.__WM_DEBUG__!.performance(),
  590 |     );
  591 |     expect((await state(page)).training.stage).toBe(6);
  592 |     await writeFile(
  593 |       info.outputPath(`rendered-${name}.json`),
  594 |       JSON.stringify(
  595 |         {
  596 |           profile: name,
  597 |           requestedIntervalsMs: intervals,
  598 |           performance: observedPerformance,
  599 |           absoluteFloor: 30,
  600 |           absoluteResult:
  601 |             observedPerformance.minimum !== null &&
  602 |             observedPerformance.minimum >= 30
  603 |               ? "PASS"
  604 |               : "NOT_MET",
  605 |           method:
  606 |             "Complete genuine route with actual requestAnimationFrame schedule; fixed physics steps unchanged; functional result distinct from absolute FPS",
  607 |           state: await state(page),
  608 |         },
  609 |         null,
  610 |         2,
  611 |       ),
  612 |     );
  613 |   });
  614 | 
  615 | test("WM003 repeated replay pause save load clears transients and bounds resources", async ({
  616 |   page,
  617 |   context,
  618 | }, info) => {
  619 |   test.setTimeout(100000);
  620 |   await start(page);
  621 |   await page.keyboard.down("s");
  622 |   await wait(page, (s) => s.position.z < -19);
  623 |   await stop(page);
  624 |   const cdp = await context.newCDPSession(page),
  625 |     measurements = [];
  626 |   for (let cycle = 0; cycle < 12; cycle++) {
  627 |     await page.keyboard.press("Escape");
  628 |     await page.getByRole("button", { name: /Replay Climb/ }).click();
  629 |     await page.waitForTimeout(250);
  630 |     await page.keyboard.press("Escape");
  631 |     await page.getByRole("button", { name: /^Save & Quit/ }).click();
  632 |     await expect(
  633 |       page.getByRole("heading", { name: "WEBMASTER" }),
  634 |     ).toBeVisible();
  635 |     await page.getByRole("button", { name: /Continue/ }).click();
  636 |     const s = await state(page);
  637 |     expect(s.traversal.surfaceId).toBeNull();
  638 |     expect(s.traversal.pullId).toBeNull();
  639 |     expect(s.swing.web).toBeNull();
  640 |     expect(s.heroPitch).toBe(0);
  641 |     expect(s.surfaceCameraBlend).toBe(0);
  642 |     expect(s.pullObjects.every((o) => o.speed === 0)).toBe(true);
  643 |     await page.waitForTimeout(350);
  644 |     await cdp.send("HeapProfiler.collectGarbage");
  645 |     const heap = await cdp.send("Runtime.getHeapUsage"),
  646 |       dom = await cdp.send("Memory.getDOMCounters");
  647 |     measurements.push({
  648 |       cycle,
  649 |       heap: heap.usedSize,
  650 |       nodes: dom.nodes,
  651 |       listeners: dom.jsEventListeners,
  652 |     });
  653 |   }
  654 |   await writeFile(
  655 |     info.outputPath("resources.json"),
  656 |     JSON.stringify(
  657 |       {
  658 |         method:
  659 |           "12 ordinary S3 replay/pause/save/Continue cycles; 350ms settled UI then post-GC heap and DOM/listeners; finite warmup bounds",
  660 |         measurements,
  661 |       },
  662 |       null,
  663 |       2,
  664 |     ),
  665 |   );
  666 |   const warm = measurements[3]!,
  667 |     last = measurements.at(-1)!;
  668 |   expect(last.heap - warm.heap).toBeLessThan(4 * 1024 * 1024);
> 669 |   expect(last.nodes - warm.nodes).toBeLessThanOrEqual(10);
      |                                   ^ Error: expect(received).toBeLessThanOrEqual(expected)
  670 |   expect(last.listeners - warm.listeners).toBeLessThanOrEqual(2);
  671 |   await writeFile(
  672 |     info.outputPath("resources.json"),
  673 |     JSON.stringify(
  674 |       {
  675 |         method:
  676 |           "12 ordinary S3 replay/pause/save/Continue cycles; post-GC heap and DOM/listeners; finite warmup bounds",
  677 |         measurements,
  678 |       },
  679 |       null,
  680 |       2,
  681 |     ),
  682 |   );
  683 | });
  684 | 
  685 | 
```