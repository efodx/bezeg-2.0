# Notes: combinatorics and recursion specs

Worker: spec-combinatorics-recursion. Numbers were computed with node (v24); scripts below, outputs follow each.

## Combinatorics script (BigInt binomials, factorials)
```js
const C=(n,k)=>{let r=1n;for(let i=1n;i<=BigInt(k);i++)r=r*(BigInt(n)-BigInt(k)+i)/i;return r};
const F=n=>{let r=1n;for(let i=2n;i<=BigInt(n);i++)r*=i;return r};
const p=(l,v)=>console.log(l,'=>',String(v));
p('C(8,3) paths (5,3)',C(8,3));
p('C(20,10) paths (10,10)',C(20,10));
p('C(40,20)',C(40,20));
p('C(60,30)',C(60,30)); p('2^53',2**53, ); p('C(60,30)>2^53',C(60,30)>2n**53n);
p('C(66,33)',C(66,33)); p('C(68,34)',C(68,34));
p('largest n with C(n,n/2)<2^53',[...Array(80).keys()].filter(n=>C(n,Math.floor(n/2))<=2n**53n).pop());
p('C(100,50)',C(100,50));
// enumerate paths (a,b) count by DFS
const cnt=(a,b)=>a==0||b==0?1:cnt(a-1,b)+cnt(a,b-1);
p('DFS (5,3)',cnt(5,3)); p('DFS (6,6)',cnt(6,6)); p('C(12,6)',C(12,6)); p('C(14,7)',C(14,7));
p('5!',F(5)); p('V(6,3)',F(6)/F(3)); p('6^3',6**3); p('C(6,3)',C(6,3)); 
p('MISSISSIPPI 11!/(4!4!2!)',F(11)/(F(4)*F(4)*F(2)));
p('C(7,3)',C(7,3)); p('C(6,2)+C(6,3)',C(6,2)+C(6,3)); p('C(6,2)',C(6,2)); p('C(6,3)',C(6,3));
p('row 4',[0,1,2,3,4].map(k=>C(4,k)).join(','));
p('row 10',[...Array(11).keys()].map(k=>C(10,k)).join(','));
p('(x+2)^5 coeffs',[0,1,2,3,4,5].map(k=>C(5,k)*2n**BigInt(k)).join(',')+' (x^(5-k) 2^k)');
p('x^3 coef (x+2)^5',C(5,2)*4n); p('(x+2)^5 at x=1',[0,1,2,3,4,5].map(k=>C(5,k)*2n**BigInt(k)).reduce((a,b)=>a+b)); p('3^5',3**5);
p('row sum 10',[...Array(11).keys()].reduce((s,k)=>s+C(10,k),0n)); p('2^10',2**10);
p('alt sum 10',[...Array(11).keys()].reduce((s,k)=>s+(k%2?-1n:1n)*C(10,k),0n));
p('hockey 1+4+10+20+35',[3,4,5,6,7].reduce((s,i)=>s+C(i,3),0n)); p('C(8,4)',C(8,4));
p('Bern n=5 k=2 t=.5',Number(C(5,2))*.5**2*.5**3);
p('binom n=20 k=10 p=.5',Number(C(20,10))/2**20);
p('binom pmf check n=20 k=10 vs exp(logfact)',Math.exp([...Array(21).keys()].reduce((a,i)=>i?a+Math.log(i):a,0)-2*[...Array(11).keys()].reduce((a,i)=>i?a+Math.log(i):a,0)-20*Math.log(2)));
p('Bern n=3,t=.3 k=0..3',[0,1,2,3].map(k=>Number(C(3,k))*.3**k*.7**(3-k)).join(','));
// k permutations vs paths
p('paths (3,2) positions of R: C(5,2)',C(5,2));
p('C(5,2)=C(4,1)+C(4,2)',C(4,1)+C(4,2));
p('row 20 max',C(20,10)); p('row 5',[0,1,2,3,4,5].map(k=>C(5,k)).join(','));
p('even entries row 6',[0,1,2,3,4,5,6].map(k=>C(6,k)).join(','));
p('C(30,15)',C(30,15)); p('C(52,5)',C(52,5)); p('C(49,6)',C(49,6)); p('C(4,2)*...',C(4,2));
```
### Output
```
C(8,3) paths (5,3) => 56
C(20,10) paths (10,10) => 184756
C(40,20) => 137846528820
C(60,30) => 118264581564861424
2^53 => 9007199254740992
C(60,30)>2^53 => true
C(66,33) => 7219428434016265740
C(68,34) => 28453041475240576740
largest n with C(n,n/2)<2^53 => 56
C(100,50) => 100891344545564193334812497256
DFS (5,3) => 56
DFS (6,6) => 924
C(12,6) => 924
C(14,7) => 3432
5! => 120
V(6,3) => 120
6^3 => 216
C(6,3) => 20
MISSISSIPPI 11!/(4!4!2!) => 34650
C(7,3) => 35
C(6,2)+C(6,3) => 35
C(6,2) => 15
C(6,3) => 20
row 4 => 1,4,6,4,1
row 10 => 1,10,45,120,210,252,210,120,45,10,1
(x+2)^5 coeffs => 1,10,40,80,80,32 (x^(5-k) 2^k)
x^3 coef (x+2)^5 => 40
(x+2)^5 at x=1 => 243
3^5 => 243
row sum 10 => 1024
2^10 => 1024
alt sum 10 => 0
hockey 1+4+10+20+35 => 70
C(8,4) => 70
Bern n=5 k=2 t=.5 => 0.3125
binom n=20 k=10 p=.5 => 0.17619705200195312
binom pmf check n=20 k=10 vs exp(logfact) => 0.1761970520019523
Bern n=3,t=.3 k=0..3 => 0.3429999999999999,0.4409999999999999,0.189,0.026999999999999996
paths (3,2) positions of R: C(5,2) => 10
C(5,2)=C(4,1)+C(4,2) => 10
row 20 max => 184756
row 5 => 1,5,10,10,5,1
even entries row 6 => 1,6,15,20,15,6,1
C(30,15) => 155117520
C(52,5) => 2598960
C(49,6) => 13983816
C(4,2)*... => 6
```

## Recursion script
```js
const p=(l,v)=>console.log(l,'=>',String(v));
// RG1
let a=3,s=0;for(let i=1;i<=10;i++){s+=a;if(i<10)a+=2}p('arith a1=3 d=2: a10,S10',a+', '+s+' ; formula n(a1+an)/2='+10*(3+a)/2);
let g=3,gs=0;for(let i=1;i<=10;i++){gs+=g;if(i<10)g*=2}p('geom a1=3 q=2: a10,S10',g+', '+gs+' ; a1(q^n-1)/(q-1)='+3*(2**10-1));
let h=3,hs=0;for(let i=1;i<=10;i++){hs+=h;if(i<10)h/=2}p('geom a1=3 q=1/2: a10,S10,limit',h+', '+hs+', '+3/(1-.5));
p('S10 recursion a1=3,q=2 first 6',[3,6,12,24,48,96].join(','));
// RG2 cobweb
const run=(f,x0,n)=>{const r=[x0];for(let i=0;i<n;i++)r.push(f(r[r.length-1]));return r};
const show=(l,f,x0,n,xs)=>{const r=run(f,x0,n);p(l,r.map(v=>v.toFixed(5)).join(' | ')+'  x*='+xs)};
show('m=0.5,c=1,x0=0',x=>.5*x+1,0,6,2);
show('m=-0.8,c=9,x0=1',x=>-.8*x+9,1,8,5);
show('m=-1.2,c=11,x0=5.1',x=>-1.2*x+11,5.1,6,5);
show('m=1.5,c=-1,x0=2.1',x=>1.5*x-1,2.1,6,2);
show('m=-1,c=6,x0=1',x=>-x+6,1,5,3);
const xs=run(Math.cos,0,2000).pop();p('cos fixed pt',xs); p('|f\'|=sin x*',Math.sin(xs));
p('cos x0=0 x8',run(Math.cos,0,8)[8]);
p('cos x0=0 first 6',run(Math.cos,0,6).map(v=>v.toFixed(6)).join(' | '));
p('error ratio e5/e4 cos',(run(Math.cos,0,6)[6]-xs)/(run(Math.cos,0,6)[5]-xs));
// iterations to reach |x-x*|<1e-3 for m=0.5 and m=0.9 and m=-0.8
const it=(m,c,x0,tol)=>{const xs=c/(1-m);let x=x0,n=0;while(Math.abs(x-xs)>=tol&&n<10000){x=m*x+c;n++}return n};
p('steps to 1e-3 m=.5,c=1,x0=0',it(.5,1,0,1e-3)); p('m=.9,c=.2,x0=0 (x*=2)',it(.9,.2,0,1e-3)); p('m=-.8,c=9,x0=1',it(-.8,9,1,1e-3));
p('ceil log bound m=.5: ln(2/1e-3)/ln2',Math.ceil(Math.log(2/1e-3)/Math.log(2)));
// RG3
p('simple 1000,5%,10y',1000*(1+.05*10)); p('compound 1000,5%,10y',(1000*1.05**10).toFixed(2));
p('monthly relative 0.05/12, 120',(1000*(1+.05/12)**120).toFixed(2));
p('conformal monthly rate',((1.05)**(1/12)-1)*100); p('conformal 12 months back',(1000*(1+(1.05**(1/12)-1))**120).toFixed(2));
for(const n of [1,10,100,1000,1e6])p('(1+1/n)^n n='+n,(1+1/n)**n); p('e',Math.E);
p('(1+1/n)^n n=1e15 (double breakdown)',(1+1/1e15)**1e15);
p('doubling time 5%',Math.log(2)/Math.log(1.05)); p('72/5',72/5);
p('years to double integer: 1.05^15',1.05**15); p('1.05^14',1.05**14);
p('continuous e^0.5',Math.exp(.5)); p('1000e^0.05*10',1000*Math.exp(.5));
// RG4 logistic
const lg=r=>x=>r*x*(1-x);
for(const r of [1.5,2.5,2.9]){const x=run(lg(r),0.1,200);p('logistic r='+r+' x*='+(1-1/r)+' f\'(x*)='+(2-r)+' first6',x.slice(0,7).map(v=>v.toFixed(5)).join(' | ')+' x200='+x[200])}
p('logistic r=1.5 x*',1-1/1.5);
// RG5
p('ln y vs n slope ln1.05',Math.log(1.05)); p('log10(1.05)',Math.log10(1.05)); p('log10(1000*1.05^10)',Math.log10(1000*1.05**10)); p('log10 1000=3 +10*log10(1.05)',3+10*Math.log10(1.05));
p('double stagnation C(60,30) by double Pascal',(()=>{let row=[1];for(let n=1;n<=60;n++){const nr=[1];for(let k=1;k<n;k++)nr.push(row[k-1]+row[k]);nr.push(1);row=nr}return row[30]})());
```
### Output
```
arith a1=3 d=2: a10,S10 => 21, 120 ; formula n(a1+an)/2=120
geom a1=3 q=2: a10,S10 => 1536, 3069 ; a1(q^n-1)/(q-1)=3069
geom a1=3 q=1/2: a10,S10,limit => 0.005859375, 5.994140625, 6
S10 recursion a1=3,q=2 first 6 => 3,6,12,24,48,96
m=0.5,c=1,x0=0 => 0.00000 | 1.00000 | 1.50000 | 1.75000 | 1.87500 | 1.93750 | 1.96875  x*=2
m=-0.8,c=9,x0=1 => 1.00000 | 8.20000 | 2.44000 | 7.04800 | 3.36160 | 6.31072 | 3.95142 | 5.83886 | 4.32891  x*=5
m=-1.2,c=11,x0=5.1 => 5.10000 | 4.88000 | 5.14400 | 4.82720 | 5.20736 | 4.75117 | 5.29860  x*=5
m=1.5,c=-1,x0=2.1 => 2.10000 | 2.15000 | 2.22500 | 2.33750 | 2.50625 | 2.75938 | 3.13906  x*=2
m=-1,c=6,x0=1 => 1.00000 | 5.00000 | 1.00000 | 5.00000 | 1.00000 | 5.00000  x*=3
cos fixed pt => 0.7390851332151607
|f'|=sin x* => 0.6736120291832148
cos x0=0 x8 => 0.7221024250267077
cos x0=0 first 6 => 0.000000 | 1.000000 | 0.540302 | 0.857553 | 0.654290 | 0.793480 | 0.701369
error ratio e5/e4 cos => -0.693376288575221
steps to 1e-3 m=.5,c=1,x0=0 => 11
m=.9,c=.2,x0=0 (x*=2) => 73
m=-.8,c=9,x0=1 => 38
ceil log bound m=.5: ln(2/1e-3)/ln2 => 11
simple 1000,5%,10y => 1500
compound 1000,5%,10y => 1628.89
monthly relative 0.05/12, 120 => 1647.01
conformal monthly rate => 0.40741237836483535
conformal 12 months back => 1628.89
(1+1/n)^n n=1 => 2
(1+1/n)^n n=10 => 2.5937424601000023
(1+1/n)^n n=100 => 2.7048138294215285
(1+1/n)^n n=1000 => 2.7169239322355936
(1+1/n)^n n=1000000 => 2.7182804690957534
e => 2.718281828459045
(1+1/n)^n n=1e15 (double breakdown) => 3.035035206549262
doubling time 5% => 14.206699082890461
72/5 => 14.4
years to double integer: 1.05^15 => 2.0789281794113688
1.05^14 => 1.9799315994393987
continuous e^0.5 => 1.6487212707001282
1000e^0.05*10 => 1648.7212707001281
logistic r=1.5 x*=0.33333333333333337 f'(x*)=0.5 first6 => 0.10000 | 0.13500 | 0.17516 | 0.21672 | 0.25463 | 0.28469 | 0.30546 x200=0.33333333333333337
logistic r=2.5 x*=0.6 f'(x*)=-0.5 first6 => 0.10000 | 0.22500 | 0.43594 | 0.61474 | 0.59209 | 0.60380 | 0.59806 x200=0.6000000000000001
logistic r=2.9 x*=0.6551724137931034 f'(x*)=-0.8999999999999999 first6 => 0.10000 | 0.26100 | 0.55935 | 0.71479 | 0.59122 | 0.70087 | 0.60799 x200=0.655172413740602
logistic r=1.5 x* => 0.33333333333333337
ln y vs n slope ln1.05 => 0.04879016416943205
log10(1.05) => 0.021189299069938092
log10(1000*1.05^10) => 3.211892990699381
log10 1000=3 +10*log10(1.05) => 3.211892990699381
double stagnation C(60,30) by double Pascal => 118264581564861420
```

## Searches (Grep over src/)
- binomial-explore: src/learning/content/probabilityGuidedLessons.ts:325 (order 6; siblings binomial-bars, -shade, -correction, -growing-n, -poisson). Route /bezeg-2.0/probability/binomial (src/demonstrations.ts:123). binomialPmf uses logFactorial (src/analysis/distributions.ts:108,130), doubles, no BigInt.
- Bernstein: demonstration id bernstein, route /bezeg-2.0/bernstein (demonstrations.ts:38); lesson steps bernstein-definition, bernstein-partition-of-unity, bernstein-basis (foundationGuidedLessons.ts:39-182); chapter activities src/learning/chapter/activities.ts:42-46; binomial theorem already named at foundationGuidedLessons.ts:66.
- Fixed point: src/analysis/fixedPoint.ts (fixedPointHistory:240, FixedPointStep:197, FIXED_POINT_MAX_STEPS 60, fixed example table only affine/cosine/reflection), fixedPointModel.ts, FixedPointGraph.tsx, IterationController src/learning/runtime/iterationController.ts:34, PlaybackButtons src/graphs/base/controls/PlaybackButtons, lesson fixed-point-cosine-step analysisGuidedLessons.ts ~2926.
- sequence-* analysisGuidedLessons.ts:2356+ (limit/epsilon, oscillation); series-* schoolFunctionGraphsBatchCGuidedLessons.ts:69+ (partial sums, geometric series, decimals); exponential-* functionGuidedLessons.ts:280+; inverse-logarithm schoolFunctionGraphsGuidedLessons.ts:306; demonstrations sequence (/analysis/sequence), exponential-function (/functions/exponential), geometric series (/functions/geometric-series at demonstrations.ts:99).
- No Pascal/combination/compound-interest/e-limit code or lessons found (searched pascal, binomialCoefficient, factorial, compound, obrest).
- PIK: TOC lines 83 and 86 give 4.12 on page 20 and 4.15 on page 22; section text read at extraction lines 950-985 (4.12) and 1073-1086 (4.15). Page of the section text itself taken from the TOC, not a footer.
- Terms in src/localization/sl.ts: iteracija, Geometrijska vrsta, Pajkova mreža (line 1556), negibna točka.
