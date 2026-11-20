// Merges crawler findings and worker reports into one deduplicated triage table.
// Usage: node scripts/lesson-crawl/merge.cjs <outDir> [--min low|medium|high] > triage.md
// Reads <outDir>/*/findings.jsonl (crawler) and <outDir>/*/review.jsonl (worker visual review, same schema).
// Groups by kind + normalized detail (numbers, point indices and quoted names after the first word are blurred),
// so one root cause across many lessons becomes one row with its occurrence count and up to 3 example locations.
const fs = require('fs');
const path = require('path');
const [dir, ...rest] = process.argv.slice(2);
const min = rest[rest.indexOf('--min') + 1] && rest.includes('--min') ? rest[rest.indexOf('--min') + 1] : 'low';
const rank = {high: 3, medium: 2, low: 1, info: 0};
const rows = [];
for (const chapter of fs.readdirSync(dir)) {
    const chapterDir = path.join(dir, chapter);
    if (!fs.statSync(chapterDir).isDirectory()) continue;
    for (const file of ['findings.jsonl', ...fs.readdirSync(chapterDir).filter(f => /^review.*\.jsonl$/.test(f))]) {
        const f = path.join(dir, chapter, file);
        if (!fs.existsSync(f)) continue;
        for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
            if (!line.trim()) continue;
            try { rows.push({...JSON.parse(line), source: file.startsWith('review') ? 'review' : 'crawl'}); } catch { /* skip malformed */ }
        }
    }
}
const norm = d => String(d)
    .replace(/\| after sweep actions:.*$/, '')
    .replace(/-?\d+([.,]\d+)?/g, '#')
    .replace(/p[₀-₉]+/g, 'pᵢ')
    .replace(/\s+/g, ' ').trim().slice(0, 110);
const groups = new Map();
for (const r of rows) {
    if ((rank[r.severity] ?? 0) < rank[min]) continue;
    const key = `${r.kind}|${norm(r.detail)}`;
    if (!groups.has(key)) groups.set(key, {kind: r.kind, severity: r.severity, detail: r.detail, count: 0, chapters: new Set(), where: [], sources: new Set()});
    const g = groups.get(key);
    g.count++; g.chapters.add(r.chapter); g.sources.add(r.source);
    if ((rank[r.severity] ?? 0) > (rank[g.severity] ?? 0)) g.severity = r.severity;
    if (g.where.length < 3) g.where.push(`${r.example || r.route} @${r.frame}${r.shot ? ` [${r.shot}]` : ''}`);
}
const sorted = [...groups.values()].sort((a, b) => (rank[b.severity] - rank[a.severity]) || (b.count - a.count));
console.log(`# Lesson crawl triage (${rows.length} raw findings → ${sorted.length} groups, min severity ${min})\n`);
console.log('| # | sev | kind | n | chapters | detail | examples |');
console.log('|---|---|---|---|---|---|---|');
sorted.forEach((g, i) => console.log(`| ${i + 1} | ${g.severity} | ${g.kind}${g.sources.has('review') ? ' (review)' : ''} | ${g.count} | ${g.chapters.size} | ${g.detail.replace(/\|/g, '/').slice(0, 220)} | ${g.where.join('<br>').replace(/\|/g, '/')} |`));
