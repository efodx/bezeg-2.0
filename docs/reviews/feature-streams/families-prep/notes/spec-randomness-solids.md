# Note: randomness (#4) and solids (#8) specs

Every checked number in docs/specs/randomness-simulation-lessons.md and docs/specs/solids-volumes-lessons.md comes from the script below (node, BigInt PCG32; run as one file). Output follows.

## Script
```js
const M=(1n<<64n)-1n, MUL=6364136223846793005n;
function pcg(initstate,initseq){const s={state:0n,inc:((initseq<<1n)|1n)&M};
 s.next=()=>{const old=s.state;s.state=(old*MUL+s.inc)&M;const xs=Number((((old>>18n)^old)>>27n)&0xffffffffn);const rot=Number(old>>59n);return ((xs>>>rot)|(xs<<((-rot)&31)))>>>0;};
 s.next();s.state=(s.state+initstate)&M;s.next();return s;}
const g=pcg(42n,54n);console.log([1,2,3,4,5,6].map(()=>g.next().toString(16)).join(' '));
// timing
const t=pcg(42n,54n);let t0=performance.now();for(let i=0;i<1e6;i++)t.next();console.log('1e6 BigInt ms',performance.now()-t0);
console.log('--- lessons');
const bm=(n,p)=>{const r=[];for(let k=0;k<=n;k++){let c=1;for(let i=0;i<k;i++)c=c*(n-i)/(i+1);r.push(c*p**k*(1-p)**(n-k));}return r;};
// Galton n=10, 1000 balls, p=1/2: ball goes right iff u<2^31 per row
{const g=pcg(42n,54n);const c=Array(11).fill(0);for(let b=0;b<1000;b++){let k=0;for(let r=0;r<10;r++)if(g.next()<2**31)k++;c[k]++;}
 const m=bm(10,.5);console.log('galton counts',c.join(','),'exact*1000',m.map(x=>(x*1000).toFixed(1)).join(','),'P5',m[5],252/1024);
 console.log('chi2',c.reduce((s,o,k)=>s+(o-1000*m[k])**2/(1000*m[k]),0),'maxabs bar diff',Math.max(...c.map((o,k)=>Math.abs(o/1000-m[k]))));
 const g2=pcg(42n,54n);const c2=Array(11).fill(0);for(let b=0;b<100000;b++){let k=0;for(let r=0;r<10;r++)if(g2.next()<2**31)k++;c2[k]++;}
 console.log('1e5 maxabs',Math.max(...c2.map((o,k)=>Math.abs(o/1e5-m[k]))));}
// LLN
{const g=pcg(42n,54n);let h=0;const out={};for(let i=1;i<=10000;i++){if(g.next()<2**31)h++;if([10,100,1000,10000].includes(i))out[i]=[h,h/i,Math.abs(h/i-.5)];}console.log('lln',JSON.stringify(out));
 const tail=(n,t)=>{const m=bm(n,.5);let s=0;m.forEach((x,k)=>{if(Math.abs(k/n-.5)>=t-1e-12)s+=x});return s;};
 console.log('P(|f-.5|>=.1) n=100',tail(100,.1),'n=1000',tail(1000,.1),'chebyshev n=100',.25/100/.01);}
// MC pi
{const g=pcg(42n,54n);let k=0;const out={};for(let i=1;i<=10000;i++){const x=g.next(),y=g.next();// integer test x^2+y^2<2^64 with BigInt
 if(BigInt(x)*BigInt(x)+BigInt(y)*BigInt(y)<(1n<<64n))k++;if([100,1000,10000].includes(i))out[i]=[k,4*k/i];}console.log('pi',JSON.stringify(out),'se10000',4*Math.sqrt(Math.PI/4*(1-Math.PI/4)/1e4),'se100',4*Math.sqrt(Math.PI/4*(1-Math.PI/4)/100));}
// random walk n=100, 1000 walks
{const g=pcg(42n,54n);let s2=0,sa=0,z=0;for(let w=0;w<1000;w++){let S=0;for(let i=0;i<100;i++)S+=g.next()<2**31?1:-1;s2+=S*S;sa+=Math.abs(S);if(S==0)z++;}
 console.log('walk rms',Math.sqrt(s2/1000),'mean|S|',sa/1000,'zeros',z,'exact E|S100|',(()=>{const m=bm(100,.5);return m.reduce((s,x,k)=>s+x*Math.abs(2*k-100),0)})(),'P0',bm(100,.5)[50],'sqrt(2n/pi)',Math.sqrt(200/Math.PI));}
// Markov a=.3 b=.6
{const a=.3,b=.6;const pi=[b/(a+b),a/(a+b)];console.log('pi',pi,'lambda2',1-a-b);let p1=1;for(let n=1;n<=5;n++){p1=p1*(1-a)+(1-p1)*b;console.log('n',n,'P(state1)',p1,'closed',2/3+(1/3)*.1**n);}
 const g=pcg(42n,54n);const T=Math.round(.3*2**32),U=Math.round(.6*2**32);let s=0,c=[0,0];for(let i=1;i<=10000;i++){const u=g.next();if(s==0){if(u<T)s=1}else{if(u<U)s=0}c[s]++;if([100,1000].includes(i))console.log(i,c[0]/i)}console.log('emp share state1',c[0]/10000);}
console.log('--- CI');
{// population uniform integers 0..99 mean 49.5 var (100^2-1)/12; n=36
 const n=36, mu=49.5, sig2=(1e4-1)/12; const half=1.96*Math.sqrt(sig2/n);
 // exact pmf of sum via convolution (double)
 let pm=[1];const one=Array(100).fill(.01);for(let i=0;i<n;i++){const q=Array(pm.length+99).fill(0);pm.forEach((x,a)=>{for(let b=0;b<100;b++)q[a+b]+=x*.01});pm=q;}
 let cov=0;pm.forEach((x,S)=>{if(Math.abs(S/n-mu)<=half)cov+=x});console.log('half',half,'exact coverage',cov,'sum pmf',pm.reduce((a,b)=>a+b));
 const g=pcg(42n,54n);const mem=[];let miss=0;for(let r=0;r<100;r++){let S=0;for(let i=0;i<n;i++)S+=Number((BigInt(g.next())*100n)>>32n);if(Math.abs(S/n-mu)>half){miss++;mem.push(r+1)}}console.log('misses of 100',miss,mem.join(','));
 const bin=bm(100,.05);let c=0;const cum=[];bin.forEach((x,k)=>{c+=x;cum.push(c)});console.log('P(miss<=2)',cum[2],'P(miss>=10)',1-cum[9],'P(0..10 central) P(1..9)',cum[9]-cum[0],'mean',5);
 const g2=pcg(42n,54n);let m2=0;for(let r=0;r<10000;r++){let S=0;for(let i=0;i<n;i++)S+=Number((BigInt(g2.next())*100n)>>32n);if(Math.abs(S/n-mu)>half)m2++}console.log('misses of 10000',m2);}
console.log('--- solids');
{const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const V=[];for(let i=0;i<8;i++)V.push([i&1,(i>>1)&1,(i>>2)&1]);
 const E=[];for(let i=0;i<8;i++)for(let b=0;b<3;b++)if(!(i>>b&1))E.push([i,i|1<<b]);
 const sec=(n,d)=>{const s=V.map(v=>n[0]*v[0]+n[1]*v[1]+n[2]*v[2]-d);const pts=[];let z=0;
  E.forEach(([a,b])=>{if(s[a]*s[b]<0){const t=-s[a]/(s[b]-s[a]);pts.push(V[a].map((x,i)=>x+t*(V[b][i]-x)))}});V.forEach((v,i)=>{if(s[i]==0)pts.push(v)});return pts;};
 const area=(pts,n)=>{ // order by angle about centroid
  const c=pts.reduce((a,p)=>a.map((x,i)=>x+p[i]/pts.length),[0,0,0]);const nn=Math.hypot(...n);const u=cross(n,[1,0.3,0.2]);const un=Math.hypot(...u);const uu=u.map(x=>x/un);const vv=cross(n,uu).map(x=>x/nn);
  const q=pts.map(p=>{const r=p.map((x,i)=>x-c[i]);const a=Math.atan2(r[0]*vv[0]+r[1]*vv[1]+r[2]*vv[2],r[0]*uu[0]+r[1]*uu[1]+r[2]*uu[2]);return [a,r]}).sort((x,y)=>x[0]-y[0]);
  let A=[0,0,0];for(let i=0;i<q.length;i++){const c2=cross(q[i][1],q[(i+1)%q.length][1]);A=A.map((x,k)=>x+c2[k])}return Math.hypot(...A)/2;};
 for(const [n,d] of [[1,1,1,],[1,1,1]].slice(0,0));
 for(const d of [0.5,1,1.25,1.5,2.5,3]){const p=sec([1,1,1],d);console.log('x+y+z='+d,'vertices',p.length,'area',p.length>=3?area(p,[1,1,1]):0);}
 console.log('z=0.5 square',sec([0,0,1],.5).length,area(sec([0,0,1],.5),[0,0,1]));
 console.log('x+y=1 (diag rect) verts',sec([1,1,0],1).length,area(sec([1,1,0],1),[1,1,0]),'sqrt2',Math.SQRT2);
 console.log('x+y+z=1.5 side',Math.SQRT1_2,'hex area (3sqrt3/2)s^2',3*Math.sqrt(3)/2*.5);
 // pentagon: plane x+2y+3z? count vertices counts for few normals
 for(const [n,d] of [[[1,2,3],2],[[2,3,4],4],[[1,2,2],1.5],[[3,4,5],6]]){const p=sec(n,d);console.log(n,d,'verts',p.length,'area',area(p,n))}
}
console.log('--- volumes');
console.log('pyramid base 6 h4 V',36*4/3,'cube 3 pyramids 1/3 each');
console.log('cone r3 h4',12*Math.PI,'sqrt x [0,4] 8pi',8*Math.PI,'x^2 [0,1] pi/5',Math.PI/5,'sphere r3',36*Math.PI);
{const disc=(f,a,b,n)=>{let s=0;const h=(b-a)/n;for(let i=0;i<n;i++){const x=a+(i+.5)*h;s+=Math.PI*f(x)**2*h}return s};
 console.log('cone midpoint n=4',disc(x=>3*x/4,0,4,4),'n=10',disc(x=>3*x/4,0,4,10),'n=100',disc(x=>3*x/4,0,4,100));
 console.log('sqrt n=8',disc(Math.sqrt,0,4,8),'x^2 n=5',disc(x=>x*x,0,1,5),'sphere n=6',disc(x=>Math.sqrt(9-x*x),-3,3,6),'n=60',disc(x=>Math.sqrt(9-x*x),-3,3,60));
 for(const k of [12,24,48])console.log('inscribed revolve k',k,'volume ratio',k/(2*Math.PI)*Math.sin(2*Math.PI/k));}
{// Cavalieri: oblique prism: square base side 2 h 3 sheared; area same
 console.log('prism V',4*3,'oblique shear 1.5 same V');
 // pyramid section at height fraction t: scale^2 ; half height area ratio
 console.log('pyramid section at h/2 area ratio',.25,'cone r3 h4 section at 1 below apex? radius',3*1/4,'area',Math.PI*(9/16));}
```

## Output
```
a15c02b7 7b47f409 ba1d3330 83d2f293 bfa4784b cbed606e
1e6 BigInt ms 103.4647
--- lessons
galton counts 0,12,38,118,218,229,207,125,42,11,0 exact*1000 1.0,9.8,43.9,117.2,205.1,246.1,205.1,117.2,43.9,9.8,1.0 P5 0.24609375 0.24609375
chi2 6.056838095238095 maxabs bar diff 0.01709374999999999
1e5 maxabs 0.0011281250000000076
lln {"10":[1,0.1,0.4],"100":[45,0.45,0.04999999999999999],"1000":[493,0.493,0.007000000000000006],"10000":[5011,0.5011,0.0010999999999999899]}
P(|f-.5|>=.1) n=100 0.05688793364098078 n=1000 2.728464156066017e-10 chebyshev n=100 0.25
pi {"100":[76,3.04],"1000":[779,3.116],"10000":[7833,3.1332]} se10000 0.01642183367736324 se100 0.1642183367736324
walk rms 10.313292393799372 mean|S| 8.218 zeros 68 exact E|S100| 7.958923738717875 P0 0.07958923738717875 sqrt(2n/pi) 7.978845608028654
pi [ 0.6666666666666667, 0.33333333333333337 ] lambda2 0.09999999999999998
n 1 P(state1) 0.7 closed 0.7
n 2 P(state1) 0.6699999999999999 closed 0.6699999999999999
n 3 P(state1) 0.6669999999999999 closed 0.6669999999999999
n 4 P(state1) 0.6667 closed 0.6667
n 5 P(state1) 0.66667 closed 0.66667
100 0.71
1000 0.66
emp share state1 0.6713
--- CI
half 9.429582882255891 exact coverage 0.9503007981300023 sum pmf 0.9999999999999994
misses of 100 2 21,28
P(miss<=2) 0.1182629811851204 P(miss>=10) 0.028188294163420058 P(0..10 central) P(1..9) 0.9658911766162459 mean 5
misses of 10000 524
--- solids
x+y+z=0.5 vertices 3 area 0.21650635094610968
x+y+z=1 vertices 3 area 0.8660254037844387
x+y+z=1.25 vertices 6 area 1.1907849302036029
x+y+z=1.5 vertices 6 area 1.299038105676658
x+y+z=2.5 vertices 3 area 0.21650635094610965
x+y+z=3 vertices 1 area 0
z=0.5 square 4 1
x+y=1 (diag rect) verts 4 1.4142135623730951 sqrt2 1.4142135623730951
x+y+z=1.5 side 0.7071067811865476 hex area (3sqrt3/2)s^2 1.299038105676658
[ 1, 2, 3 ] 2 verts 4 area 0.9354143466934852
[ 2, 3, 4 ] 4 verts 5 area 1.234100268301657
[ 1, 2, 2 ] 1.5 verts 4 area 0.75
[ 3, 4, 5 ] 6 verts 6 area 1.296362432175337
--- volumes
pyramid base 6 h4 V 48 cube 3 pyramids 1/3 each
cone r3 h4 37.69911184307752 sqrt x [0,4] 8pi 25.132741228718345 x^2 [0,1] pi/5 0.6283185307179586 sphere r3 113.09733552923255
cone midpoint n=4 37.110063220529426 n=10 37.60486406346983 n=100 37.69816936528144
sqrt n=8 25.132741228718345 x^2 n=5 0.6075211873511943 sphere n=6 114.66813185602744 n=60 113.11304349250048
inscribed revolve k 12 volume ratio 0.9549296585513719
inscribed revolve k 24 volume ratio 0.9886159294653691
inscribed revolve k 48 volume ratio 0.9971466573496368
prism V 12 oblique shear 1.5 same V
pyramid section at h/2 area ratio 0.25 cone r3 h4 section at 1 below apex? radius 0.75 area 1.7671458676442586
```

## PIK anchors read
- 4.7 Geometrijski liki in telesa: TOC page 14; text read at extraction line 586 (Cavalierijevo pravilo, Posevna telesa, Vrtenine, prostornina rotacijskih teles).
- 4.14 Integralski racun: TOC page 21; text at line 1044 (Uporaba doloc. integrala: ploscine, prostornine vrtenin) falls after the page-21 footer, so on page 22 by the footer convention; TOC says 21. Cited as 21-22.
- 4.16 Verjetnostni racun (page 22, line 1088): empiricna vs matematicna verjetnost, zaporedje neodvisnih poskusov, normalna porazdelitev. 4.17 Statistika (page 23, line 1116). Confidence intervals, simulation, Markov chains: not found in the extraction (grep zaupan, simulac, markov: none).

## Unverified
- Slovenian terms (no FMF source opened); VR markers; Lemire rejection variant of bounded integers (numbers computed with multiply-shift without rejection; rejection chance ~2e-8 per draw, re-verify in the kernel test); drawing performance of 3D mesh not measured.

## Solids extra script (/tmp/w/b.js) and output
```js
const Vd=d=>d<=1?d**3/6:d<=2?d**3/6-3*(d-1)**3/6:0;
for(const d of [0.5,1,1.25,1.5])console.log('V(x+y+z<'+d+')',Vd(d));
console.log('pyramid base4 h4 V',16*4/3,'section z=1 side',3,'area',9,'z=2 area',4,'axial triangle area',8);
console.log('hex section area 1.5 as fraction of cube face',3*Math.sqrt(3)/4);
// revolve mesh volume via signed tetra, sqrt(x) 0..4 with m=8 profile points, k=48 around x axis
const k=48,xs=[...Array(9).keys()].map(i=>i/2);const prof=xs.map(x=>[x,Math.sqrt(x)]);
// frustum-based exact volume of polyline revolved (profile piecewise linear) inscribed k-gon factor
let Vr=0;for(let i=0;i<8;i++){const [x0,r0]=prof[i],[x1,r1]=prof[i+1];Vr+=Math.PI*(x1-x0)/3*(r0*r0+r0*r1+r1*r1)}
const f=k/(2*Math.PI)*Math.sin(2*Math.PI/k);console.log('profile frustum sum',Vr,'times k-gon factor',Vr*f,'exact 8pi',8*Math.PI);
console.log('triangles of revolve k=48, 9 profile points: side',8*k*2,'caps 2*k (profile r0=0 apex at x=0 degenerate: skip)');
// oblique prism sections
console.log('cube 3 pyramids',1/3*3);
```
```
V(x+y+z<0.5) 0.020833333333333332
V(x+y+z<1) 0.16666666666666666
V(x+y+z<1.25) 0.3177083333333333
V(x+y+z<1.5) 0.5
pyramid base4 h4 V 21.333333333333332 section z=1 side 3 area 9 z=2 area 4 axial triangle area 8
hex section area 1.5 as fraction of cube face 1.299038105676658
profile frustum sum 24.93409359250133 times k-gon factor 24.862948079805697 exact 8pi 25.132741228718345
triangles of revolve k=48, 9 profile points: side 768 caps 2*k (profile r0=0 apex at x=0 degenerate: skip)
cube 3 pyramids 1
```

## Repair round (randomness): Lemire rejection re-run, replaces the multiply-shift CI sampler of the first script (CI numbers above are identical)
```js
// Lemire rejection re-run of RS6 (seed 42, seq 54), plus repair-round numbers.
const M=(1n<<64n)-1n, MUL=6364136223846793005n;
function pcg(i,q){const s={state:0n,inc:((q<<1n)|1n)&M};
 s.next=()=>{const o=s.state;s.state=(o*MUL+s.inc)&M;const xs=Number((((o>>18n)^o)>>27n)&0xffffffffn);const r=Number(o>>59n);return ((xs>>>r)|(xs<<((-r)&31)))>>>0;};
 s.next();s.state=(s.state+i)&M;s.next();return s;}
let rej=0;
const below=(g,m)=>{const mb=BigInt(m);let p=BigInt(g.next())*mb;let l=p&0xffffffffn;if(l<mb){const t=(1n<<32n)%mb;while(l<t){rej++;p=BigInt(g.next())*mb;l=p&0xffffffffn}}return Number(p>>32n)};
const n=36,half=1.96*Math.sqrt((1e4-1)/12/n);
let g=pcg(42n,54n),miss=[];for(let r=0;r<100;r++){let S=0;for(let i=0;i<n;i++)S+=below(g,100);if(Math.abs(S-1782)>339)miss.push(r+1);if(Math.abs(S/n-49.5)>half!==(Math.abs(S-1782)>339))console.log('MISMATCH')}
console.log('100 intervals misses',miss.join(','),'rejections',rej);
g=pcg(42n,54n);rej=0;let m2=0;for(let r=0;r<10000;r++){let S=0;for(let i=0;i<n;i++)S+=below(g,100);if(Math.abs(S-1782)>339)m2++}
console.log('10000 intervals misses',m2,'rejections',rej,'draws',10000*36);
console.log('half*36',half*36);
```
```
100 intervals misses 21,28 rejections 0
10000 intervals misses 524 rejections 0 draws 360000
half*36 339.46498376121207
```
Coverage per n, exact miss probability and miss laws (script /tmp/w/c.js: convolution of 100-point pmf, binomial(100, 1-coverage)):
```
cov n 1 1.00000
cov n 2 0.96200
cov n 4 0.95336
cov n 9 0.95152
cov n 16 0.95083
cov n 36 0.95030
cov n 100 0.94999
miss p 0.049699201869997656 P(<=2) 0.12080566885011923 P(>=10) 0.027195514066655768
half*36 339.4649837612121 339.46498376121207 bound |S-1782|<=339 ; 2S-3564
x^2 about y axis 1.5707963267948966 x-axis 0.6283185307179586
```
