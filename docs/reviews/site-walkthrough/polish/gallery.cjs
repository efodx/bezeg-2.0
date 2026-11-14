// Builds the owner's before/after page into build/review/ (served by `just preview 4331` at /bezeg-2.0/review/index.html).
const fs = require('fs');
const path = require('path');
const root = path.resolve('.command-logs/polish');
const out = path.resolve('build/review');
fs.mkdirSync(out, {recursive: true});
let n = 0;
const img = (dir, file) => {
    const source = path.join(root, dir, file);
    if (!fs.existsSync(source)) throw new Error(`missing ${source}`);
    const name = `${String(++n).padStart(2, '0')}-${dir}-${file}`;
    fs.copyFileSync(source, path.join(out, name));
    return name;
};
const pair = (title, before, after, extra) => `<figure><figcaption>${title}</figcaption><div class="pair"><div><span>Before</span><img src="${img(...before)}" alt=""></div><div><span>After</span><img src="${img(...after)}" alt=""></div>${extra ? `<div><span>${extra[0]}</span><img src="${img(extra[1], extra[2])}" alt=""></div>` : ''}</div></figure>`;
const section = (id, status, title, text, figures) => `<section><h2><code>${id}</code> ${title} <em class="${status === 'Waiting for you' ? 'wait' : 'done'}">${status}</em></h2><p>${text}</p>${figures.join('')}</section>`;
const live = (label, href) => `<a href="/bezeg-2.0/${href}">${label}</a>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bezeg walkthrough: shell and label polish</title><style>
body{margin:0;padding:28px max(18px,calc((100vw - 1180px)/2)) 60px;background:#f6f3e6;color:#20372d;font:16px/1.5 system-ui,sans-serif}
h1{font:600 30px/1.2 Georgia,serif;margin:0 0 8px}h2{font:600 21px/1.3 Georgia,serif;margin:44px 0 6px;padding-top:18px;border-top:1px solid #d4d0bc}
code{font:700 14px ui-monospace,monospace;background:#e2ebcb;padding:2px 7px;border-radius:5px;margin-right:6px}
em{font:700 12px system-ui;font-style:normal;padding:3px 9px;border-radius:99px;vertical-align:middle;margin-left:8px}.wait{background:#f3dfb4;color:#6b4300}.done{background:#dbe8d0;color:#27501c}
p{max-width:820px;margin:6px 0 14px}figure{margin:18px 0}figcaption{font-weight:650;margin-bottom:6px}
.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;align-items:start}.pair span{display:block;font:700 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#5b675a;margin-bottom:4px}
img{max-width:100%;height:auto;border:1px solid #d4d0bc;border-radius:6px;background:#fffdf5}a{color:#2d5a1e;font-weight:650}ul{max-width:820px}
</style></head><body>
<h1>Shell and label polish: before and after</h1>
<p>Package B of the 2026-11-14 site walkthrough. The live site in this preview carries every change below: ${live('Home', '')}, ${live('Demonstrations', 'demonstrations')}, ${live('a chapter', 'learn/bezier-curves')}, ${live('Interval Sweep', 'compgeo/interval-sweep')}, ${live('Blossoming', 'bspline/blossom')}. Items marked “Waiting for you” are not on the public site; they stay on a local branch until you approve or change them.</p>
${section('H05', 'Waiting for you', 'Header mark beside the name', 'The mark was a fixed 34 px tile beside a 30 px wordmark (28 px beside 21 px on phones). It is now sized from the wordmark (0.94 of its font size) and centred on the capitals, with a proportional gap. The icon file, the header height and the one-row phone header are unchanged. Alternative I did not build: keep the old size and only fix the vertical alignment.', [
    pair('1440 px', ['before', 'header-1440-sl.png'], ['after', 'header-1440-sl.png']),
    pair('820 px', ['before', 'header-820-sl.png'], ['after', 'header-820-sl.png']),
    pair('390 px', ['before', 'header-390-sl.png'], ['after', 'header-390-sl.png']),
])}
${section('D02', 'Waiting for you', 'Catalog: topic list, family line on cards, card actions', 'Topic names drop from body size to 14 px so the list reads as navigation. The family line on each card takes the small-caps style the homepage carousel already uses. Open / Guided example stay minimal ghost buttons, at 13 px (was 12) with the homepage arrow. Card titles are unchanged. These screenshots also contain D01 (rounded capture corners).', [
    pair('Catalog, 1440 px', ['before', 'catalog-1440-sl.png'], ['after', 'catalog-1440-sl.png']),
    pair('One card', ['before', 'card-1440-sl.png'], ['after', 'card-1440-sl.png']),
    pair('Topic list, English', ['before', 'topics-1440-en.png'], ['after', 'topics-1440-en.png']),
    pair('Phone, 390 px', ['before', 'catalog-390-sl.png'], ['after', 'catalog-390-sl.png']),
])}
${section('L02 L03', 'Waiting for you', 'Chapter previous / next and “All learning content”', 'One arrow drawing now serves all three controls, sized from the text and centred on it. The “Previous chapter” / “Next chapter” line is a semibold label in the link colour. Position, card size and the chapter-title typography are unchanged. For the return control there are two treatments: A (in the live preview) removes the border and fill so it reads as a quiet link with a hover fill; B keeps the bordered button and only swaps the arrow.', [
    pair('Previous / next, 1440 px', ['before', 'neighbors-bezier-curves-1440-sl.png'], ['after', 'neighbors-bezier-curves-1440-sl.png']),
    pair('Previous / next, 390 px', ['before', 'neighbors-bezier-curves-390-sl.png'], ['after', 'neighbors-bezier-curves-390-sl.png']),
    pair('Return control, 1440 px (After = treatment A)', ['before', 'trail-bezier-curves-1440-sl.png'], ['after', 'trail-bezier-curves-1440-sl.png'], ['Treatment B', 'after-l02-b', 'trail-bezier-curves-1440-sl.png']),
    pair('Return control, 390 px (After = treatment A)', ['before', 'trail-bezier-curves-390-sl.png'], ['after', 'trail-bezier-curves-390-sl.png'], ['Treatment B', 'after-l02-b', 'trail-bezier-curves-390-sl.png']),
])}
${section('H01', 'Done', 'Homepage footer removed', 'The whole footer is gone: project description, author and supervisor credit, contact line.', [
    pair('Home, 1440 px', ['before', 'home-1440-sl.png'], ['after', 'home-1440-sl.png']),
])}
${section('D01', 'Done', 'Capture corners follow the card', 'Posters and clips are rounded concentrically with the card (card 10 px, capture 5 px), at rest, on hover and while a clip plays. See the card pictures under D02; this is the corner at 4x.', [
    pair('Top-left corner, 4x', ['before', 'card-1440-sl.png'], ['d01-check', 'corner-play-tl-1024-sl.png']),
])}
${section('M01 M02', 'Done', 'Interval Sweep and blossoming: math labels and the drag cursor', 'Interval Sweep points (and the points of the other 21 point-set graphs) now show the same pointer cursor as Bézier control points, and their labels, segment names and interval letters are typeset like other graph labels. The f(a, b) label in blossoming is typeset too. Catalog posters and clips of these graphs still show the old labels until package D recaptures them.', [
    pair('Interval Sweep', ['m01-before', 'sweep-sl.png'], ['m01-after', 'sweep-sl.png']),
    pair('Blossoming', ['m01-before', 'blossom-sl.png'], ['m01-after', 'blossom-sl.png']),
])}
<section><h2><code>M03</code> Shared movable-point path <em class="wait">Waiting for you</em></h2><p>The inventory covers all 138 graphs. Before this work 58 used the shared cursor binding, 14 carried their own copy of it, and 37 had draggable points with no hover cursor (22 of those are now fixed through the point-set base). My recommendation, written in the spec: route the remaining graphs through one point creator in two stages, the cursor first (mechanical, no visual change) and math labels second (changes how about 27 more graphs look, so it should land before package D recaptures them). I will not migrate further graphs until you answer.</p></section>
</body></html>`;
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log('wrote', path.join(out, 'index.html'), n, 'images');
