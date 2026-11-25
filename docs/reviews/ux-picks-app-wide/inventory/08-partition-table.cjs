// Writes the "Lane table" section of docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md from 08-partition.json.
const fs = require("fs");
const o = JSON.parse(fs.readFileSync("docs/reviews/ux-picks-app-wide/inventory/08-partition.json", "utf8"));
const base = f => f.split("/").pop().replace(/\.tsx?$/, "");
let t = "## Lane table\n\nComputed by `docs/reviews/ux-picks-app-wide/inventory/08-partition.cjs` into `08-partition.json` (lanes, sessions, owned files, conflict edges): lanes are the lesson-file components of the " + o.lanes.reduce((n, l) => n + l.demonstrations.length, 0) + " demonstrations not yet declared, in sessions of 2-3 demonstrations (` ; ` separates sessions); rounds are greedy (at most 3 lanes, the owner lane of an unconverted shared base first, no shared graph file or own test inside a round). Already declared (" + o.declared.length + ", in no lane): " + o.declared.join(", ") + ".\n\n| Round | Lane | Demonstrations | Files owned (short) | Status |\n| --- | --- | --- | --- | --- |\n";
for (const l of o.lanes.slice().sort((a, b) => a.round - b.round || a.id.localeCompare(b.id))) {
  const lf = l.lessonFiles.map(base).join(", ");
  const own = "graph files + `" + (lf.length > 70 ? base(l.lessonFiles[0]) + " +" + (l.lessonFiles.length - 1) : lf) + "`" + (l.ownedBases.length ? "; owns first `" + l.ownedBases.map(base).join(", ") + "`" : "");
  t += `| ${l.round} | ${l.id} | ${l.sessions.map(s => s.join(", ")).join(" ; ")} | ${own} | not started |\n`;
}
const f = "docs/tasks/ux-picks-app-wide/08-convert-all-graphs.md";
let s = fs.readFileSync(f, "utf8");
const i = s.indexOf("## Lane table");
const rest = s.slice(i + 5);
const j = rest.search(/\n## /);
s = s.slice(0, i) + t + (j < 0 ? "" : rest.slice(j));
fs.writeFileSync(f, s);
