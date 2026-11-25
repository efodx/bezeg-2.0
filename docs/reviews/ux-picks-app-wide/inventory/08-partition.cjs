// Task 08 step 4: partition the remaining demonstrations into lanes (sessions) and rounds.
// Run from the worktree root: node docs/reviews/ux-picks-app-wide/inventory/08-partition.cjs
// Input: inventory.json (node scripts/inventory/inventory.cjs) + graph file text. Output: 08-partition.json (+ stdout assertions).
const fs = require("fs");
const dir = "docs/reviews/ux-picks-app-wide/inventory/";
const inv = JSON.parse(fs.readFileSync(dir + "inventory.json", "utf8"));
const D = inv.demonstrations;
const txt = f => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const short = f => f.replace(/^src\//, "");
// Registries the inventory lists as chapter files but that are not lesson files: they name many demonstrations (activities,
// guided-example previews) and would glue unrelated lanes together.
const REGISTRY = /learning\/chapter\/(activities|guidedExamplePreviews)\.ts$/;
const lessonish = f => !REGISTRY.test(f);

// Already declared: graph file overrides declaration() or opts into a step-2 workspace; rational-decasteljau inherits De Casteljau's.
const declared = new Set(D.filter(d => /override declaration\(|override declares\w+Workspace\(/.test(txt(d.graphFile)) || d.id === "rational-decasteljau").map(d => d.id));

// Step-2 bases/panels: not shared edits (lanes do not edit them).
const STEP2 = new Set(["BaseFunctionGraph", "BaseCurveGraph", "BaseBezierCurveGraph", "PointSetGraph", "PointSetControls", "FunctionReadout", "FunctionStatus", "CurvePointControls", "CurveWorkspaceControls", "Commands"].map(n => D.flatMap(d => d.sharedFiles).find(f => f.endsWith("/" + n + ".tsx"))).filter(Boolean));

// Union-find over lesson/chapter files (lesson files only), all 138 demonstrations.
const par = {}; const find = x => (par[x] === x ? x : (par[x] = find(par[x])));
D.forEach(d => (par[d.id] = d.id));
const byFile = {};
for (const d of D) for (const f of [...d.lessons.map(l => l.file), ...d.chapterFiles].filter(lessonish)) (byFile[f] ??= []).push(d.id);
for (const ids of Object.values(byFile)) ids.slice(1).forEach(i => (par[find(i)] = find(ids[0])));
const comps = {};
D.forEach(d => (comps[find(d.id)] ??= []).push(d.id));
const byId = Object.fromEntries(D.map(d => [d.id, d]));

// Test usage: a test naming <= 6 demonstrations spanning lanes is an undirected conflict; larger shared suites are handler-owned.
const testUsers = {};
for (const d of D) for (const t of new Set([...d.tests, ...d.lessonTests])) (testUsers[t] ??= []).push(d.id);
const lessonFileOf = new Set(Object.keys(byFile));

// Lanes: components minus declared demos.
let lanes = Object.values(comps).map(ids => ids.filter(i => !declared.has(i))).filter(a => a.length).map(a => a.sort());
const cost = id => { const c = byId[id]; const f = c.flags || []; return 1 + (f.includes("playback") ? 2 : 0) + (f.includes("point-set") ? 2 : 0) + (f.includes("surface") ? 8 : 0) + (f.includes("legacy-step") ? 1 : 0) + (c.blocker === "contract" ? 15 : 0); };
const CONTRACT = new Set(D.filter(d => d.surface || d.baseClasses.includes("BaseSurfaceGraph") || /bspline-basis|surface|solid/.test(d.id)).map(d => d.id));
const laneScore = ids => ids.reduce((s, i) => s + cost(i), 0) + (ids.some(i => CONTRACT.has(i)) ? 40 : 0);
lanes.sort((a, b) => laneScore(a) - laneScore(b) || a[0].localeCompare(b[0]));
lanes = lanes.map((ids, i) => ({ id: "L" + String(i + 1).padStart(2, "0"), demos: ids, score: laneScore(ids) }));
// Lane ids stay as in the previous 08-partition.json (the lane notes and briefs cite them): a lane takes the id of the previous
// lane it overlaps most; a lane that no previous lane overlaps (a component split by an input change) gets the next free number.
const prev = fs.existsSync(dir + "08-partition.json") ? JSON.parse(fs.readFileSync(dir + "08-partition.json", "utf8")).lanes : [];
{
  const claimed = new Set(); const pairs = [];
  for (const l of lanes) for (const p of prev) { const n = l.demos.filter(d => p.demonstrations.includes(d)).length; if (n) pairs.push({ l, p, n }); }
  pairs.sort((a, b) => b.n - a.n || a.p.id.localeCompare(b.p.id) || a.l.demos[0].localeCompare(b.l.demos[0]));
  const assigned = new Map();
  for (const { l, p } of pairs) if (!assigned.has(l) && !claimed.has(p.id)) { assigned.set(l, p.id); claimed.add(p.id); }
  let next = Math.max(0, ...prev.map(p => +p.id.slice(1)));
  for (const l of lanes) l.id = assigned.get(l) ?? "L" + String(++next).padStart(2, "0");
  lanes.sort((a, b) => a.id.localeCompare(b.id));
}
const laneOf = {}; lanes.forEach(l => l.demos.forEach(i => (laneOf[i] = l.id)));

// Shared files per lane (non step-2, non lesson, not the demonstration's own graph file).
const usersOf = {};
for (const d of D) for (const f of d.sharedFiles) if (!STEP2.has(f) && !lessonFileOf.has(f)) (usersOf[f] ??= new Set()).add(d.id);
for (const d of D) if (usersOf[d.graphFile]) usersOf[d.graphFile].add(d.id);
const edges = []; // undirected conflicts {a,b,file}
const owners = {}; // directional: file -> owner lane
const lanesOfFile = f => [...new Set([...usersOf[f]].filter(i => laneOf[i]).map(i => laneOf[i]))];
const dir_ = []; // {owner, user, file}
for (const f of Object.keys(usersOf)) {
  const ls = lanesOfFile(f); if (ls.length < 2) continue;
  const n = usersOf[f].size;
  if (n > 6 || /Base[A-Za-z]*Graph\.tsx$|IterativeFunctionGraph|KnotEditor/.test(f)) {
    const owner = ls.slice().sort((a, b) => lanes.find(l => l.id === a).score - lanes.find(l => l.id === b).score)[0];
    owners[f] = owner; { const us = ls.filter(l => l !== owner); us.forEach(l => dir_.push({ owner, user: l, file: short(f) })); for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) edges.push({ a: us[i], b: us[j], file: short(f) }); }
  } else for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) edges.push({ a: ls[i], b: ls[j], file: short(f) });
}
const suites = [];
const SHARED_MAX = 15; // a test naming more demonstrations than this is an all-graph suite
for (const [t, us] of Object.entries(testUsers)) {
  const ls = [...new Set(us.filter(i => laneOf[i]).map(i => laneOf[i]))];
  if (ls.length < 2) continue;
  if (us.length > 6) { suites.push(short(t)); continue; }
  for (let i = 0; i < ls.length; i++) for (let j = i + 1; j < ls.length; j++) edges.push({ a: ls[i], b: ls[j], file: short(t) });
}

// Lanes of the previous partition whose demonstrations are all declared now are done: they leave the lane list, are kept in
// `done` (with the round they ran in) and the remaining rounds count on from the last of them.
const laneDone = prev.filter(p => p.demonstrations.every(d => declared.has(d)));
const done = [...(JSON.parse(fs.readFileSync(dir + "08-partition.json", "utf8")).done ?? []), ...laneDone.map(p => ({ id: p.id, round: p.round, demonstrations: p.demonstrations }))];
const ROUND0 = Math.max(0, ...done.map(d => d.round));
// Rounds: greedy, at most 3 lanes, owner lanes in earlier rounds, no undirected conflict inside a round. Lanes holding what the
// later rounds rely on go first (root-finding: IterativeFunctionGraph and the iteration lease; bezier-clipping: the point-set
// base; arc-length: the function-graph family), so rounds 2-3 exercise each step-2 base and the lease.
const PRIORITY = ["root-finding", "bezier-clipping", "arc-length"].map(d => laneOf[d]);
const roundOf = {}; const rounds = [];
const conflict = (a, b) => edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
let left = lanes.map(l => l.id).sort((a, b) => Number(PRIORITY.includes(b)) - Number(PRIORITY.includes(a)));
while (left.length) {
  const r = [];
  for (const id of left) {
    if (r.length >= 3) break;
    if (dir_.some(e => e.user === id && !(e.owner in roundOf))) continue;
    if (r.some(o => conflict(o, id))) continue;
    r.push(id);
  }
  if (!r.length) throw new Error("no schedulable lane: " + left);
  r.forEach(id => (roundOf[id] = ROUND0 + rounds.length + 1)); rounds.push(r); left = left.filter(i => !r.includes(i));
}

// Sessions of 2-3 demos (1 only for a singleton lane); demos using an owned base come first.
const split = n => { if (n <= 3) return [n]; const k = Math.ceil(n / 3); const base = Math.floor(n / k); const rem = n % k; return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0)); };
const out = { generated: new Date().toISOString().slice(0, 10), declared: [...declared].sort(), step2Bases: [...STEP2].map(short).sort(), lanes: [], done, rounds: rounds.map((r, i) => ({ round: ROUND0 + i + 1, lanes: r })), conflictEdges: edges, ownerEdges: dir_, sharedSuitesHandlerOwned: suites.sort() };
for (const l of lanes) {
  const ownedBases = Object.entries(owners).filter(([, o]) => o === l.id).map(([f]) => f);
  const usesOwned = id => byId[id].sharedFiles.some(f => ownedBases.includes(f));
  const demos = l.demos.slice().sort((a, b) => Number(usesOwned(b)) - Number(usesOwned(a)) || a.localeCompare(b));
  const sessions = []; let p = 0; for (const n of split(demos.length)) { sessions.push(demos.slice(p, p + n)); p += n; }
  const own = k => [...new Set(demos.flatMap(k))].sort();
  const ownTests = [...new Set(Object.entries(testUsers).filter(([t, us]) => us.length <= 6 || us.every(u => laneOf[u] === l.id)).filter(([, us]) => us.some(u => demos.includes(u)) && us.filter(u => laneOf[u]).every(u => laneOf[u] === l.id)).map(([t]) => short(t)))].sort();
  // Tests that name this lane's graph and also other lanes' (a lane runs them without owning them); the all-graph suites
  // (more than SHARED_MAX demonstrations) are the handler's.
  const sharedTests = [...new Set(Object.entries(testUsers).filter(([, us]) => us.length <= SHARED_MAX && us.some(u => demos.includes(u))).map(([t]) => short(t)))].filter(t => !ownTests.includes(t)).sort();
  out.lanes.push({
    id: l.id, round: roundOf[l.id], demonstrations: demos, sessions,
    graphFiles: own(i => [short(byId[i].graphFile)]),
    lessonFiles: own(i => [...byId[i].lessons.map(x => x.file), ...byId[i].chapterFiles].filter(lessonish).map(short)),
    ownTests, sharedTests,
    sharedFilesUsed: own(i => byId[i].sharedFiles.filter(f => usersOf[f] && !lessonFileOf.has(f)).map(short)),
    ownedBases: ownedBases.map(short).sort(),
  });
}
fs.writeFileSync(dir + "08-partition.json", JSON.stringify(out, null, 1) + "\n");

// Assertions
const seen = {}; out.lanes.forEach(l => l.demonstrations.forEach(i => (seen[i] = (seen[i] || 0) + 1)));
D.forEach(d => { const n = (seen[d.id] || 0) + (declared.has(d.id) ? 1 : 0); if (n !== 1) throw new Error("demonstration count " + d.id + " = " + n); });
for (const l of out.lanes) { const s = l.sessions.map(x => x.length); if (s.some(n => n > 3) || (l.demonstrations.length > 1 && s.some(n => n < 2))) throw new Error("session size " + l.id + s); }
for (const r of out.rounds) {
  if (r.lanes.length > 3) throw new Error("round > 3 lanes");
  const ls = r.lanes.map(id => out.lanes.find(l => l.id === id)); const used = new Set();
  for (const l of ls) for (const f of new Set([...l.graphFiles, ...l.lessonFiles, ...l.ownTests, ...l.sharedFilesUsed.filter(f => !STEP2.has("src/" + f))])) { if (used.has(f)) throw new Error("round " + r.round + " shares " + f); used.add(f); }
}
for (const e of dir_) if (!(roundOf[e.owner] < roundOf[e.user])) throw new Error("owner order " + e.file);
console.log(`ok: ${D.length} demonstrations = ${declared.size} declared + ${Object.keys(seen).length} in ${out.lanes.length} lanes; ${out.rounds.length} rounds; lessons-only components ${Object.keys(comps).length}`);
console.log("rounds:", out.rounds.map(r => r.round + ":" + r.lanes.join("+")).join("  "));
console.log("owned bases:", JSON.stringify(Object.fromEntries(out.lanes.filter(l => l.ownedBases.length).map(l => [l.id, l.ownedBases]))));
console.log("shared suites (handler-owned):", out.sharedSuitesHandlerOwned.length);
