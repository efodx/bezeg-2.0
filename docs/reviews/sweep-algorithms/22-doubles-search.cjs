// Exhaustive search: circumcircle lowest points over all grid triples in [-L,L]^2 vs each other and vs site heights.
const L = Number(process.argv[2] || 10);
const pts = [];
for (let y = -L; y <= L; y++) for (let x = -L; x <= L; x++) pts.push([x, y]);
const N = pts.length;
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const seen = new Set();
const classes = new Map(); // exact rational height -> entries
const irr = []; // {cy, S, dd, cx, code}
let triples = 0, circles = 0, ratCircles = 0;
const hash = (a, b, c, d) => {
  let h1 = 0x9e3779b1, h2 = 0x85ebca6b;
  for (const v of [a, b, c, d]) {
    h1 = Math.imul(h1 ^ (v | 0), 0x01000193) ^ (h1 >>> 15);
    h2 = Math.imul(h2 + (v | 0), 0xcc9e2d51) ^ (h2 >>> 13);
    h1 = Math.imul(h1, 0x1b873593); h2 = Math.imul(h2, 0x27d4eb2d);
  }
  return (h1 >>> 0) * 2097152 + (h2 >>> 11);
};
function addEntry(cx, cy, dd, S, code) {
  const rs = Math.round(Math.sqrt(S));
  if (rs * rs === S) {
    const num = cy - rs; const g = gcd(num, dd) || dd; // num may be 0
    const k = `${num / g}/${dd / g}`;
    let list = classes.get(k); if (!list) classes.set(k, list = []);
    list.push({cx, cy, dd, S, code}); ratCircles++;
  } else irr.push({cx, cy, dd, S, code});
}
for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) for (let k = j + 1; k < N; k++) {
  const [ax, ay] = pts[i];
  const bx = pts[j][0] - ax, by = pts[j][1] - ay, cx0 = pts[k][0] - ax, cy0 = pts[k][1] - ay;
  const d = 2 * (bx * cy0 - by * cx0);
  if (d === 0) continue;
  triples++;
  const bb = bx * bx + by * by, cc = cx0 * cx0 + cy0 * cy0;
  const Nx = cy0 * bb - by * cc, Ny = bx * cc - cx0 * bb;
  const sg = d < 0 ? -1 : 1, dd = Math.abs(d);
  let CX = sg * (ax * d + Nx), CY = sg * (ay * d + Ny);
  const g = gcd(gcd(CX, CY), dd);
  CX /= g; CY /= g; const d2 = dd / g;
  const S = (CX - ax * d2) ** 2 + (CY - ay * d2) ** 2;
  const hk = hash(CX, CY, d2, S);
  if (seen.has(hk)) continue; seen.add(hk); circles++;
  addEntry(CX, CY, d2, S, [i, j, k]);
}
for (let s = 0; s < N; s++) addEntry(pts[s][0], pts[s][1], 1, 0, [s]); // sites: S = 0, centre = the site
console.log(`L=${L} triples=${triples} distinct circles=${circles} rational-height circles=${ratCircles} irrational=${irr.length}`);
const dbl = (e) => e.cy / e.dd - Math.sqrt(e.S / (e.dd * e.dd));
// Rational classes: wrong pair = exact tie, x_i < x_j (i first), but double_i < double_j.
let multi = 0, splitTies = 0, wrong = 0; const examples = [];
for (const [key, list] of classes) {
  if (list.length < 2) continue;
  multi++;
  const ds = new Set(list.map(dbl));
  if (ds.size > 1) splitTies++;
  for (let a = 0; a < list.length; a++) for (let b = 0; b < list.length; b++) {
    const [p, q] = [list[a], list[b]];
    if (p.cx * q.dd >= q.cx * p.dd) continue; // want x_p < x_q
    if (dbl(p) < dbl(q)) { wrong++; if (examples.length < 400000) examples.push({key, p, q}); }
  }
}
console.log(`rational classes with >=2 entries: ${multi}; classes whose doubles are not all equal: ${splitTies}; wrong ordered pairs: ${wrong}`);
const size = (e) => new Set([...e.p.code, ...e.q.code]).size;
examples.sort((a, b) => size(a) - size(b));
require('fs').writeFileSync(process.argv[3]+'/examples.json', JSON.stringify(examples.slice(0, 30000).map((e) => ({key: e.key, p: e.p.code.map((i) => pts[i]), q: e.q.code.map((i) => pts[i]), dp: dbl(e.p), dq: dbl(e.q), size: size(e)}))));
// Irrational: sort by double height, exact comparison inside windows.
irr.forEach((e) => { e.h = dbl(e); });
irr.sort((a, b) => a.h - b.h);
const B = BigInt;
function sgn2(a, b, r) { // sign of a + b sqrt(r), r >= 0, BigInt
  const sa = a === 0n ? 0 : a > 0n ? 1 : -1; const sb = (r === 0n || b === 0n) ? 0 : b > 0n ? 1 : -1;
  if (sb === 0) return sa; if (sa === 0 || sa === sb) return sb;
  const m = b * b * r - a * a; return sb > 0 ? (m > 0n ? 1 : m < 0n ? -1 : 0) : (m > 0n ? -1 : m < 0n ? 1 : 0);
}
function exactCmp(e, f) { // sign of h_e - h_f ; h = (CY - sqrt S)/dd
  const p = B(e.cy) * B(f.dd) - B(f.cy) * B(e.dd), u = B(e.dd) ** 2n * B(f.S), v = B(f.dd) ** 2n * B(e.S);
  // sign of p + sqrt(u) - sqrt(v)
  const t = sgn2(p, 1n, u);
  if (t < 0) return -1;
  if (t === 0) return v === 0n ? 0 : -1;
  // t>0: compare t^2 vs v: (p^2 + u - v) + 2p sqrt(u)
  return sgn2(p * p + u - v, 2n * p, u);
}
let pairs = 0, inverted = 0, tied = 0; const irrEx = [];
for (let i = 0; i < irr.length; i++) {
  for (let j = i + 1; j < irr.length && irr[j].h - irr[i].h < 1e-9 * Math.max(1, Math.abs(irr[i].h)); j++) {
    pairs++;
    const c = exactCmp(irr[i], irr[j]); // sign(h_i - h_j); doubles: h_i <= h_j
    if (c > 0 || (c !== 0 && irr[i].h === irr[j].h)) { inverted++; if (irrEx.length < 20) irrEx.push([irr[i].code.map((a) => pts[a]), irr[j].code.map((a) => pts[a]), c, irr[i].h, irr[j].h]); }
    if (c === 0 && (irr[i].cx * irr[j].dd !== irr[j].cx * irr[i].dd || irr[i].S * irr[j].dd ** 2 !== irr[j].S * irr[i].dd ** 2)) tied++;
  }
}
console.log(`irrational/site near pairs checked: ${pairs}; doubles invert or tie distinct exact values: ${inverted}; exact ties with different (centre or r): ${tied}`);
console.log(JSON.stringify(irrEx.slice(0, 5)));
