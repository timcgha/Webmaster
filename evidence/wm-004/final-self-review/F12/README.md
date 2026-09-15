# F-WM004-SR-12 — blocking ceiling presentation intersection

Owner/reviewer: WEBMASTER_PRODUCT_OWNER; SELF_REVIEW, not independent QA.
Disposition: NOT_PASS; three authorized substantive correction cycles exhausted.
Exact candidate HEAD aef5f5ae4dac555d8efed6bbc6553b87a9a2a444 / TREE b3c41a9ad436b3eddf2a131045fd7457852933db.

Actual ordinary keyboard/controller captures from run34986861320 show mainly the boots while transitioning from wall to ceiling. Source-bound analytic reconstruction confirms this is not solely an end-on camera silhouette: the stable rotated pelvis overlaps the wall, and the torso/mask pass to its far side. The upright gameplay capsule remains clear and the functional route passes.

Use capture-references.json for immutable screenshot/actual-route locations and hashes. geometry.json and ceiling-review.mjs retain the corroborating reconstruction. This is a read-only geometry calculation using the actual earned ceilingStart, exact authored box dimensions and Babylon matrix implementation. Sampled angles are reconstructed, not claimed to be measured screenshot angles. Intermediate AABBs are conservative; at stable90degrees the boxes are axis-aligned and positive pelvis intersection is exact. The parent root rotation block is byte-identical to merged WM003; inherited provenance does not waive WM004's explicit visual acceptance requirement.

The script runs from the unchanged candidate checkout after the locked install, with the archived keyboard-route.json path as its argument; its output folder ../wm004-ceiling-review must exist. No product or browser gameplay state was modified by this diagnosis. It does not constitute another substantive repair.

All40 inherited cases have passing exact-source evidence across35+1+4 rechecks; final run34989357431 SUCCESS4/4,438sourcehashesPASS, evidence77e4e149fef861d173641b7a64cadf30f662e312. This functional PASS does not override the adverse personal visual finding. No preview published.

Attribution correction: reused archive-filter recovery-manifest headers in derived inherited rechecks still name originalR3run34983009905/artifact10402767443. For those derived outputs, use their enclosing run directory, actual workflow/job logs and evidence commit for attribution. Per-file hashes remain valid. Original headers are retained as historical outputs, not silently relabelled.
