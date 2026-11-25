// Second stage: renders 08-triage.table.tmp.md from 08-triage.tmp.json (run 08-triage.cjs first).
const fs = require("fs");
const dir = "docs/reviews/ux-picks-app-wide/inventory/";
const o = JSON.parse(fs.readFileSync(dir + "08-triage.tmp.json", "utf8"));
const short = f => f.replace(/^src\/graphs\//, "");
const abbr = { declared: "DECL", modes: "mode", expensive: "exp", playback: "play", "board-legend": "legend", "point-set": "pts", "curve-points": "curve", surface: "surf", contract: "CONTRACT", plain: "plain" };
let md = "| id | graph file | base | classes | S/C/Ch/T | proto | lessons | panels (shared, <20 users) | gaps (file:line) |\n|---|---|---|---|---|---|---|---|---|\n";
for (const r of o.rows) {
  const d = r.d;
  const g = r.g.filter(x => !/^board captions/.test(x) && !(/^point\/point-set/.test(x) && (r.cls.includes("point-set") || r.cls.includes("curve-points")))).map(x => x.replace(/src\/graphs\//g, "").replace(/ \(useLease passthrough, step 2\)/, "").replace("playback driver private to graph", "own AnimationDriver").replace(/ \(marks\/fit\)/, "").replace(/ \(parameter inset\)/, "")).join("; ");
  md += `| ${d.id} | ${short(d.graphFile)} | ${d.baseClasses[0]} | ${r.cls.map(c => abbr[c]).join(",")} | ${r.S}/${r.C}/${r.Ch}/${r.T} | ${r.ownProto ? "Y" : r.protoFile ? "b" : ""} | ${r.lessons.join(",") || "-"} | ${r.panels.join(",") || "-"} | ${g || "-"}${d.boardCaptions.count ? ` (cap ${d.boardCaptions.count})` : ""} |\n`;
}
fs.writeFileSync(dir + "08-triage.table.tmp.md", md);
console.log("table bytes", md.length);
