// Third stage: writes 08-triage.md (head + table + sections a-c). Run 08-triage.cjs, 08-triage-md.cjs, then this.
const fs = require("fs");
const dir = "docs/reviews/ux-picks-app-wide/inventory/";
const o = JSON.parse(fs.readFileSync(dir + "08-triage.tmp.json", "utf8"));
const table = fs.readFileSync(dir + "08-triage.table.tmp.md", "utf8");
const R = o.rows;
const n = k => (o.classCount[k] || []).length;
const b = f => f.split("/").pop().replace(/\.(tsx|ts)$/, "");
let md = `# 08 triage (task 08 step 1)

Generated 2026-11-25 on \`board-workspace-2\` (after the 03-07 release) by \`08-triage.cjs\`, \`08-triage-md.cjs\`, \`08-triage-sections.cjs\` from \`inventory-2026-11-25.json\` (fresh \`node scripts/inventory/inventory.cjs\`: 138 demonstrations, 29 components, 80 ignoring hubs; the run overwrote \`inventory.json\` and \`inventory.md\` in place). Heuristics over source text, no browser; the table says which class rule fired.

## Counts (a demonstration carries several classes)

| Class | n | Rule |
|---|---|---|
| declared (pilots) | ${n("declared")} | graph file overrides \`declaration()\`: ${o.declared.map(b).join(", ")} (9 files); plus \`rational-decasteljau\`, which inherits De Casteljau's declaration unreviewed (guide section 6). The task text says eight pilots; the tree holds nine declaring files |
| plain | ${n("plain")} | none of the classes below |
| several modes | ${n("modes")} | a ChoiceSelect whose catalog key names mode, view, kind, type, system, variant, method, family, style or display |
| expensive redraw | ${n("expensive")} | candidate only: 20 or more sampling, grid, simulation, contour or refine words in the graph file; needs a measurement before it counts |
| playback | ${n("playback")} | scope file imports PlaybackButtons, AnimationDriver, useLease or the animation runtime |
| board-drawn legend | ${n("board-legend")} | regex found legend text drawn with \`board.create('text')\`; weak: the inventory counts 42 demonstrations with legend entries but does not tell where they are drawn, so the converter checks each |
| point-set | ${n("point-set")} | PointSetGraph chain or mouse position read (inventory flag) |
| curve control points | ${n("curve-points")} | shares CurveWorkspaceControls/CurvePointControls (Bezier, rational, spline, PH graphs), not in point-set |
| surface | ${n("surface")} | BaseSurfaceGraph chain (patch-*, solids) |
| controls outside BaseGraph | 0 registered | the Playground: ${"see section c"} |
| needs a contract change | ${n("contract")} | hard gaps of section c (3D camera or second board, vector-valued parameter) |

Prototype declarations to port: ${R.filter(r => r.ownProto).length} graph files carry \`workspaceUx\` at \`aff6df6c\` (the task says 29: the commit has 29 files with the string, of which \`BaseGraph.tsx\` and \`DemonstrationWorkspace.tsx\` are infrastructure, so 27 graph files; ids: ${R.filter(r => r.ownProto).map(r => r.d.id).join(", ")}). Of those, already converted on master: ${R.filter(r => r.ownProto && r.cls.includes("declared")).map(r => r.d.id).join(", ")}.

Legend of the table: **mode / exp / play / legend / pts / curve / surf / CONTRACT / DECL** as above. S/C/Ch/T = slider (incl. AngleSlider), CountSetter, choice (ChoiceSelect, select), toggle (OnOffSwitch, BooleanField, checkbox); own count, \`+Ni\` inherited from a base class or panel. \`proto\` Y = graph file has a prototype declaration, b = shares a prototype-declared base file. Lessons: lesson or chapter file; panels: shared files with fewer than 20 users (hubs FunctionReadout, BaseFunctionGraph, BaseCurveGraph, Commands, CurvePointControls, CurveWorkspaceControls, FunctionStatus omitted). \`(cap n)\` = board captions found. Gaps: soft ones named inline (equalAxisUnits, own AnimationDriver).

## Table (one row per demonstration)

${table}
`;
// (a) shared files
const users = {};
for (const r of R) for (const f of r.d.sharedFiles) (users[f] ??= []).push(r.d.id);
const rank = Object.entries(users).sort((a, c) => c[1].length - a[1].length);
const ctl = f => /Controls\.tsx$|Panel\.tsx$|Readout|Status|Editor/.test(f);
const inventoryInherited = id => R.find(r => r.d.id === id).d.controls.inherited;
const declared = new Set((o.classCount.declared || []));
md += `\n## (a) Shared-code candidates for step 2 (files ranked by demonstrations that use them; not-yet-declared users in brackets)\n\n| files | users | undeclared | inherited controls on those users | note |\n|---|---|---|---|---|\n`;
for (const [f, ids] of rank.slice(0, 32)) {
  const und = ids.filter(i => !declared.has(i));
  const inh = ids.reduce((s, i) => s + inventoryInherited(i), 0);
  md += `| ${f.replace("src/graphs/", "")} | ${ids.length} | ${und.length} | ${inh} | ${/BaseFunctionGraph|IterativeFunctionGraph/.test(f) ? "base class; subclasses inherit nothing declared yet" : /Base\w*Graph|PointSetGraph/.test(f) ? "base class" : ctl(f) ? "panel" : ""} |\n`;
}
const bfg = R.filter(r => r.d.baseClasses.includes("BaseFunctionGraph")).map(r => r.d.id);
md += `\n- **BaseFunctionGraph** (${bfg.length} subclasses: 35 direct plus ${R.filter(r => r.d.baseClasses[0] === "IterativeFunctionGraph").length} via IterativeFunctionGraph): ${bfg.join(", ")}.\n`;
const anim = R.filter(r => r.g.some(x => /playback driver/.test(x))).map(r => r.d.id);
md += `- **IterationController useLease passthrough** (\`src/learning/runtime/iterationController.ts\`): graphs with their own AnimationDriver (the gap line in the table) and no lease yet: ${anim.join(", ")}. All ${n("playback")} playback demonstrations ride on it or on PlaybackButtons; ${anim.length} take the driver directly.\n`;
md += `- **Curve control points**: CurvePointControls/CurveWorkspaceControls/BezierCurveControls reach ${n("curve-points")} demonstrations (plus ${R.filter(r => r.cls.includes("point-set")).length} point-set ones through PointSetControls). They bind points, which the arbiter kinds (range, count, choice, toggle) do not cover; see (c).\n`;
md += `- Step 2 ranking by unlock: (1) BaseFunctionGraph and FunctionReadout/FunctionStatus (35 subclasses, 52 readout users); (2) the curve workspace trio (32); (3) PointSetGraph and PointSetControls (22); (4) BaseSurfaceGraph / TensorPatchGraph (8, blocked by (c)); (5) IterativeFunctionGraph (6); (6) the per-family panels (inventory hubs list the rest).\n`;
// (b) components
const comp = (title, arr) => {
  let s = `\n### ${title}: ${arr.length} components\n\n| size | demonstrations |\n|---|---|\n`;
  for (const c of arr.filter(x => x.length >= 3)) s += `| ${c.length} | ${c.length > 30 ? c.slice(0, 14).join(", ") + ", ... (+" + (c.length - 14) + ")" : c.join(", ")} |\n`;
  const pairs = arr.filter(x => x.length === 2).length, singles = arr.filter(x => x.length === 1).length;
  return s + `\nPlus ${pairs} components of two and ${singles} singletons.\n`;
};
md += `\n## (b) Connected components (input for step 4)\n\nEdges: **graph-file-sharing** = shared non-hub files; **lessons** = a lesson or chapter file naming the demonstration; **tests** = own tests that name at most six demonstrations (Routes.test and the all-graph suites left out). Hub threshold 20 users, as the inventory.\n`;
md += comp("Graph files only, shared files of at most six users plus own tests (what stays shared after step 2 converts the hub panels)", o.Cc);
md += comp("Lesson files only (lessons edited in frames: the 16-demonstration compgeoGuidedLessons is the largest)", o.Dd);
md += comp("Everything: shared files of at most six users + lessons + tests (the real lane constraint)", o.B);
md += `\nFor reference the inventory's own figures: 29 components with all shared files, 80 without hub files; with every non-hub shared file plus lessons and tests the largest component is ${o.A[0].length} demonstrations (${o.A.length} components). Because one lesson file edit touches every demonstration it frames, step 4 either splits the big lesson files by demonstration (frames are per step, so a file can be edited by sequential sessions) or treats the lesson-linked giant as one lane for several consecutive sessions, as the task says.\n`;
md += `\n## (c) Contract-change list for the handler\n\n`;
const gl = k => (o.gaps[k] || []).join(", ");
md += `Hard (the contract has no way to say it; lane stops at the demonstration):\n\n`;
md += `1. **Second board / inset**: ${gl("multi-board")}. \`src/graphs/patches/parameterInset.ts\` mounts a second JSXGraph board (\`TensorPatchGraph.tsx:5\`, \`TriangularPatchGraph.tsx\`); the presenters render one board and ViewMarks/followView are one board's coordinates.\n`;
md += `2. **3D camera**: ${gl("3D camera + second board")}. Camera (az, el, distance, projection, target) is state outside range/count/choice/toggle (\`CoonsPatchGraph.tsx:58-63, 176-193\`); \`ViewMarks\` (\`graphDeclaration.ts:207-216\`) are 2D point/box/polyline. Coons is a pilot, so the declaration works with camera left in the graph's own controls; the question is whether that stays allowed for the other 7 (and \`solids\`).\n`;
md += `3. **Vector-valued parameter** (list or knot vector): bspline-basis, bspline-deboor, bspline-extraction, bspline-insertion (\`curves/bspline/KnotEditor.tsx:42\`), prob-summary (\`SummaryStatisticsGraph.tsx:350\`, ValueListInput). Pilots linear-map (\`LinearMapGraph.tsx:1076\`) and phase-portrait (\`PhasePortraitGraph.tsx:1463\`) hold their NumberGrid in Orodja, so the same decision (leave in Orodja, listed by the inventory) may cover these; the handler confirms. Parameter kinds are only range, count, choice, toggle (\`graphDeclaration.ts:52-99\`).\n\n`;
md += `Soft (need a handler ruling before the lanes start, no demonstration is stopped by them if the pilot precedent is accepted):\n\n`;
md += `4. **Point and point-set parameters**: ${n("point-set")} point-set and ${n("curve-points")} curve demonstrations edit points through \`PointSetControls.tsx:219\`, \`CurvePointControls.tsx:65\`. Pilot triangle-centres (point-set) left the points on the board; rule: the same for all, or add a point kind. Guide section 6 lists it as a gap.\n`;
md += `5. **ViewMarks reach tier, zoom limits, equalAxisUnits in marks**: ${(o.gaps["equalAxisUnits=false"] || []).length} demonstrations override \`equalAxisUnits\` to false (e.g. \`GeometricSeriesGraph.tsx:76\`); a marks fit that keeps equal units would mis-frame them. Bisection works through \`followView\`. Demonstrations that declare no \`marks\` are unaffected. Ids: ${gl("equalAxisUnits=false")}.\n`;
md += `6. **Board captions and insets with no place** (guide section 6): ${R.filter(r => r.d.boardCaptions.count).length} demonstrations draw board captions (counts in the table); the legend and readout cannot own them yet. Parity reports \`uncoveredCaptions\`.\n`;
md += `7. **Non-numeric and formula values**: no formula kind (guide); choice values are strings, so numeric choices (phase-equilibrium 0/1) need a mapping. The script found no native text inputs (function-expression inputs may sit in components outside \`src/graphs\`: the blind spot).\n`;
md += `8. **Playback lease** (step 2, not a contract change): own AnimationDriver in ${anim.length} graphs, see (a).\n`;
md += `9. **Controls outside BaseGraph (Playground)**: no registered demonstration; the inventory lists these \`src/learning\` files as unreachable: DrawingPlayground.tsx, LookUnderneath.tsx, collisions/CollisionInspect.tsx, collisions/CollisionPlayground.tsx and others (see \`outsideBaseGraph\` in inventory.json). They need a separate decision (leave as is, or a playground declaration).\n`;
md += `\n## What the script could not see\n\n- Readouts, legends, captions built by helpers with other names; controls wrapped in components outside \`src/graphs\`; strings built at run time (inventory README blind spots).\n- Whether a graph is expensive (candidates only), whether a legend is drawn on the board, mode meaning of a ChoiceSelect (catalog-key regex), per-mode controls (counted once), steps whose text sits in variables or helpers (frames of helper-built steps not enumerated), \`declares\` field of the inventory is false for all pilots (it looks for the old import), so the declared list here comes from \`override declaration(\`.\n- Prototype: only file-level presence of \`workspaceUx\` was checked; the declaration content (and \`night/conv/<id>/NOTES.md\`) was not read.\n- Scratch outputs 08-triage.tmp.json and 08-triage.table.tmp.md are intermediate and can be deleted by the handler.\n`;
fs.writeFileSync(dir + "08-triage.md", md);
console.log("bytes", md.length);
