# Notes: mechanical curves spec and linear/complex amendments (worker, 2026-11-10)

Specs: docs/specs/mechanical-curves-lessons.md (new); docs/specs/linear-maps-lessons.md (Batch D, L6-L7 added); docs/specs/complex-maps-lessons.md (Batch D, M6-M7 added). Every number is from the node scripts below, outputs verbatim.

## Searches
- src/linear (matrix2, eigen2, singular2, gridImage, linearMapModel) and src/graphs/linear/LinearMapGraph.tsx exist; no iterate/power/stability code.
- src/analysis has complexMobius.ts, complexImage.ts, complexRoots.ts, complexReciprocal*.ts; graphs only for multiplication, reciprocal, roots (no Square/Mobius graph yet). complexIntegerPower at complexRootsModel.ts:65.
- cycloidSource: src/bezeg/impl/curve/parametric-sources.ts:30; catalogue radius 0.25-3; lesson id 'cycloid' curveGeometryGuidedLessons.ts:49; route curve-parametric demonstrations.ts:68. No brachistochrone/descent code.
- PIK M-MAT-2026.txt: 4.3.4 Kompleksna stevila line 410, page 11 (footer line 464); no cikloida/brahistohrona/matrika/polarni/Moivre found. Level markers not verified.
- Not found/unverified: Brachistochrone time is also unverified against the expansion note beyond 1.00303/1.18904 (reproduced).

## Script m.js
```js
const g=9.81, PI=Math.PI;
// Gauss-Legendre 5-pt composite
const xs=[0,-0.5384693101056831,0.5384693101056831,-0.906179845938664,0.906179845938664], ws=[0.5688888888888889,0.47862867049936647,0.47862867049936647,0.23692688505618908,0.23692688505618908];
function gl(f,a,b,n=200){let s=0,h=(b-a)/n;for(let i=0;i<n;i++){const m=a+(i+.5)*h;for(let k=0;k<5;k++)s+=ws[k]*f(m+xs[k]*h/2)*h/2;}return s;}
const cyc=PI*Math.sqrt(1/g); console.log('cycloid pi*sqrt(r/g)',cyc);
const L=Math.hypot(PI,2); console.log('line L',L,'T',L/Math.sqrt(g),'ratio',L/Math.sqrt(g)/cyc,'slower %',(L/Math.sqrt(g)/cyc-1)*100);
// line via substitution t=s^2: gamma=(PI t,2t), depth y=2t, speed sqrt(2 g y)
const lineSub=gl(s=>{const t=s*s;return 2*s*L/Math.sqrt(2*g*2*t)},0,1); console.log('line sub',lineSub);
let N=1000,mid=0;for(let i=0;i<N;i++){const t=(i+.5)/N;mid+=L/Math.sqrt(2*g*2*t)/N;}console.log('line midpoint N=1000',mid,'deficit',L/Math.sqrt(g)-mid);
// circle arc centre (c,0)
const c=(PI*PI+4)/(2*PI), phi1=Math.asin(2/c); console.log('c',c,'phi1 deg',phi1*180/PI, 'phi1 rad',phi1);
// check endpoint: (c-c cos phi1, c sin phi1)
console.log('end',c-c*Math.cos(phi1),c*Math.sin(phi1));
// NOTE endpoint x=c(1-cos phi1) should be PI -> need phi in (pi/2,pi) branch? 
const phiA=PI-phi1; console.log('alt end',c-c*Math.cos(phiA),c*Math.sin(phiA),'phiA',phiA);
const circT=Math.sqrt(c/(2*g))*gl(u=>2*u/Math.sqrt(Math.sin(u*u)),1e-300,Math.sqrt(phiA),400); console.log('circle T (to phiA, passes bottom)',circT);
```
Output:
```
cycloid pi*sqrt(r/g) 1.0030333403553238
line L 3.724191778237173 T 1.1890429254666885 ratio 1.1854470610572836 slower % 18.54470610572836
line sub 1.1890429254667003
line midpoint N=1000 1.1776705896611737 deficit 0.011372335805514888
c 2.207416099162478 phi1 deg 64.9632731810595 phi1 rad 1.1338230098820188
end 1.2732395447351625 2
alt end 3.141592653589793 2 phiA 2.0077696437077743
circle T (to phiA, passes bottom) 1.028482651920851
```

## Script m2.js
```js
const g=9.81, PI=Math.PI;
const xs=[0,-0.5384693101056831,0.5384693101056831,-0.906179845938664,0.906179845938664], ws=[0.5688888888888889,0.47862867049936647,0.47862867049936647,0.23692688505618908,0.23692688505618908];
function gl(f,a,b,n=200){let s=0,h=(b-a)/n;for(let i=0;i<n;i++){const m=a+(i+.5)*h;for(let k=0;k<5;k++)s+=ws[k]*f(m+xs[k]*h/2)*h/2;}return s;}
// tautochrone: cycloid r=1, start theta0, end theta=PI; h=cos th0 - cos th
for(const th0 of [0.3,1,2]){
 const f=th=>2*Math.sin(th/2)/Math.sqrt(2*g*(Math.cos(th0)-Math.cos(th)));
 const w=PI-th0; const sub=gl(s=>f(th0+w*s*s)*2*s*w,0,1);
 let N=1000,mid=0;for(let i=0;i<N;i++){mid+=f(th0+w*(i+.5)/N)*w/N;}
 console.log('th0',th0,'sub',sub,'midpoint1000',mid,'target',PI/Math.sqrt(g));}
// general B: cycloid through (3.25,2)
const B=[3.25,2];let lo=1e-6,hi=2*PI-1e-6;for(let i=0;i<200;i++){const m=(lo+hi)/2;((m-Math.sin(m))/(1-Math.cos(m))<B[0]/B[1])?lo=m:hi=m;}
const thB=lo,r=B[1]/(1-Math.cos(thB));console.log('thB',thB,'r',r,'T',thB*Math.sqrt(r/g));
// quadrature check of that cycloid T from t=0 (cusp) integrand: ds/sqrt(2g y), param th
const Tq=gl(th=>{const x1=r*(1-Math.cos(th)),y1=r*Math.sin(th),y=r*(1-Math.cos(th));return Math.hypot(x1,y1)/Math.sqrt(2*g*y)},0,thB,400);console.log('Tq (cusp param, no subst needed)',Tq);
// line to B
const LB=Math.hypot(...B);console.log('line to B T',LB/Math.sqrt(g));
// Bezier track
const P=[[0,0],[0.5,2],[2,2.5],[3.25,2]];
const bz=(t,k)=>{const u=1-t;return u*u*u*P[0][k]+3*u*u*t*P[1][k]+3*u*t*t*P[2][k]+t*t*t*P[3][k]};
const d=(t,k)=>{const u=1-t;return 3*u*u*(P[1][k]-P[0][k])+6*u*t*(P[2][k]-P[1][k])+3*t*t*(P[3][k]-P[2][k])};
const F=t=>Math.hypot(d(t,0),d(t,1))/Math.sqrt(2*g*bz(t,1));
const s2=gl(s=>F(s*s)*2*s,0,1),s3=gl(s=>F(s*s*s)*3*s*s,0,1),s4=gl(s=>F(s**4)*4*s**3,0,1,400);
let N=1000,mid=0;for(let i=0;i<N;i++)mid+=F((i+.5)/N)/N;
console.log('bezier t=s2',s2,'s3',s3,'s4 n400',s4,'plain midpoint1000',mid);
let mn=1e9;for(let i=1;i<=1000;i++)mn=Math.min(mn,bz(i/1000,1));console.log('min depth t>0',mn);
```
Output:
```
th0 0.3 sub 1.0030333403553584 midpoint1000 0.9990338805004925 target 1.0030333403553235
th0 1 sub 1.003033340355207 midpoint1000 0.9964284977065154 target 1.0030333403553235
th0 2 sub 1.0030333403563083 midpoint1000 0.9948903650243777 target 1.0030333403553235
thB 3.194664786166188 r 1.0007044935095157 T 1.0203371888933386
Tq (cusp param, no subst needed) 1.0203371888933148
line to B T 1.2183819754594054
bezier t=s2 1.0366196193528516 s3 1.0366200003243216 s4 n400 1.036619619352852 plain midpoint1000 1.0257150415918435
min depth t>0 0.0059955005
```

## Script m3.js
```js
const ap=(A,v)=>[A[0][0]*v[0]+A[0][1]*v[1],A[1][0]*v[0]+A[1][1]*v[1]];
const deg=v=>Math.atan2(v[1],v[0])*180/Math.PI;
const E=[[4,1],[2,3]];
let v=[1,0];console.log('E, v0=(1,0): n, A^n v, angle deg, angle error to 45, ratio|A^n+1 v|/|A^n v|');
for(let n=0;n<=8;n++){const w=ap(E,v);console.log(n,v.join(','),deg(v).toFixed(4),(deg(v)-45).toFixed(5),(Math.hypot(...w)/Math.hypot(...v)).toFixed(5));v=w;}
// closed form: A^n v0 = (2/3)5^n(1,1)+(1/3)2^n(1,-2); tan error
for(const n of [1,2,3,5,10]){const a=(2/3)*5**n+(1/3)*2**n, b=(2/3)*5**n-(2/3)*2**n;console.log('n',n,'closed',a,b,'angle',deg([a,b]));}
// first n with angle error <1 deg and <0.01 deg
let u=[1,0],n1,n2;for(let n=0;n<60;n++){const e=Math.abs(deg(u)-45);if(n1===undefined&&e<1)n1=n;if(n2===undefined&&e<0.01)n2=n;u=ap(E,u);u=[u[0]/Math.hypot(...u),u[1]/Math.hypot(...u)];}console.log('first n err<1deg',n1,'<0.01deg',n2);
// v0 on subdominant
let s=[1,-2];for(let n=0;n<4;n++){console.log('sub n',n,s.join(','));s=ap(E,s);}
// perturbed
const eps=1e-6;let p=[1+eps,-2+eps];let m=0;let q=p;
for(;m<200;m++){ // normalised
  const a=Math.abs(deg(q)-45), b=Math.abs(deg(q)-deg([1,-2]));
  const aa=Math.min(a,Math.abs(a-180));if(aa<1){break;}
  q=ap(E,q);const nn=Math.hypot(...q);q=[q[0]/nn,q[1]/nn];}
console.log('eps 1e-6 first n within 1deg of dominant line',m);
// failure cases
const R=[[0,-1],[1,0]];v=[1,0];let o=[];for(let n=0;n<9;n++){o.push(deg(v).toFixed(0));v=ap(R,v);}console.log('R angles',o.join(' '));
const S=[[1,-1],[1,1]];v=[1,0];o=[];for(let n=0;n<9;n++){o.push(deg(v).toFixed(1)+'|'+Math.hypot(...v).toFixed(3));v=ap(S,v);}console.log('spiral [[1,-1],[1,1]] angle|norm',o.join(' '),'tr det',2,2,'disc',4-8);
const Q=[[0,3],[3,0]];v=[1,0];o=[];for(let n=0;n<6;n++){o.push(v.join(','));v=ap(Q,v);}console.log('Q',o.join(' -> '));
v=[1,1];o=[];for(let n=0;n<3;n++){o.push(v.join(','));v=ap(Q,v);}console.log('Q v0=(1,1)',o.join(' -> '));
v=[1,-1];o=[];for(let n=0;n<3;n++){o.push(v.join(','));v=ap(Q,v);}console.log('Q v0=(1,-1)',o.join(' -> '));
const Sh=[[1,1],[0,1]];v=[0,1];o=[];for(const n of [1,2,5,10,100]){let w=[0,1];for(let i=0;i<n;i++)w=ap(Sh,w);o.push(n+':'+deg(w).toFixed(3)+'deg (tan^-1(1/n)='+(Math.atan(1/n)*180/Math.PI).toFixed(3)+')');}console.log('shear',o.join('; '));
// stability triangle examples
const ex={E:[[4,1],[2,3]],N:[[-4,-1],[-2,-3]],M:[[.5,.25],[.25,.5]],Sp:[[.5,-.5],[.5,.5]],R:[[0,-1],[1,0]],Q:[[0,3],[3,0]],Sh:[[1,1],[0,1]],Sa:[[2,0],[0,.5]]};
for(const k in ex){const A=ex[k];const t=A[0][0]+A[1][1],d=A[0][0]*A[1][1]-A[0][1]*A[1][0],D=t*t-4*d;
 const disc=D>0?'real':D<0?'complex':'rep';
 const stable=(d<1&&Math.abs(t)<1+d)?'discrete-stable':'not';
 const cont=(t<0&&d>0)?'cont-stable':'cont-not';
 const mod=D<0?Math.sqrt(d):(D>=0?Math.max(Math.abs((t+Math.sqrt(D))/2),Math.abs((t-Math.sqrt(D))/2)):0);
 console.log(k,'tau',t,'det',d,'Delta',D,disc,'max|lambda|',mod.toFixed(4),stable,cont);}
```
Output:
```
E, v0=(1,0): n, A^n v, angle deg, angle error to 45, ratio|A^n+1 v|/|A^n v|
0 1,0 0.0000 -45.00000 4.47214
1 4,2 26.5651 -18.43495 5.09902
2 18,14 37.8750 -7.12502 5.09147
3 86,78 42.2073 -2.79270 5.04373
4 422,406 43.8930 -1.10703 5.01854
5 2094,2062 44.5588 -0.44115 5.00757
6 10438,10374 44.8238 -0.17619 5.00306
7 52126,51998 44.9296 -0.07043 5.00123
8 260502,260246 44.9718 -0.02817 5.00049
n 1 closed 3.9999999999999996 1.9999999999999998 angle 26.56505117707799
n 2 closed 17.999999999999996 13.999999999999998 angle 37.8749836510982
n 3 closed 86 78 angle 42.20729763428672
n 5 closed 2093.9999999999995 2061.9999999999995 angle 44.55884775913232
n 10 closed 6510757.999999999 6509733.999999999 angle 44.995493958438715
first n err<1deg 5 <0.01deg 10
sub n 0 1,-2
sub n 1 2,-4
sub n 2 4,-8
sub n 3 8,-16
eps 1e-6 first n within 1deg of dominant line 20
R angles 0 90 180 -90 0 90 180 -90 0
spiral [[1,-1],[1,1]] angle|norm 0.0|1.000 45.0|1.414 90.0|2.000 135.0|2.828 180.0|4.000 -135.0|5.657 -90.0|8.000 -45.0|11.314 0.0|16.000 tr det 2 2 disc -4
Q 1,0 -> 0,3 -> 9,0 -> 0,27 -> 81,0 -> 0,243
Q v0=(1,1) 1,1 -> 3,3 -> 9,9
Q v0=(1,-1) 1,-1 -> -3,3 -> 9,-9
shear 1:45.000deg (tan^-1(1/n)=45.000); 2:26.565deg (tan^-1(1/n)=26.565); 5:11.310deg (tan^-1(1/n)=11.310); 10:5.711deg (tan^-1(1/n)=5.711); 100:0.573deg (tan^-1(1/n)=0.573)
E tau 7 det 10 Delta 9 real max|lambda| 5.0000 not cont-not
N tau -7 det 10 Delta 9 real max|lambda| 5.0000 not cont-stable
M tau 1 det 0.1875 Delta 0.25 real max|lambda| 0.7500 discrete-stable cont-not
Sp tau 1 det 0.5 Delta -1 complex max|lambda| 0.7071 discrete-stable cont-not
R tau 0 det 1 Delta -4 complex max|lambda| 1.0000 not cont-not
Q tau 0 det -9 Delta 36 real max|lambda| 3.0000 not cont-not
Sh tau 2 det 1 Delta 0 rep max|lambda| 1.0000 not cont-not
Sa tau 2.5 det 1 Delta 2.25 real max|lambda| 2.0000 not cont-not
```

## Script m4.js
```js
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
const pw=(z,n)=>{let p=[1,0];for(let i=0;i<n;i++)p=mul(p,z);return p};
const mod=z=>Math.hypot(...z), ar=z=>Math.atan2(z[1],z[0])*180/Math.PI;
let z=[1,1],p=pw(z,5);console.log('(1+i)^5',p,'mod',mod(p),'sqrt2^5',Math.SQRT2**5,'arg',ar(p),'5*45=',225);
z=[0.8,0.6];p=pw(z,10);console.log('0.8+0.6i arg',ar(z),'^10',p,'mod',mod(p),'arg',ar(p),'10*arg mod 360',(10*ar(z))%360);
z=[0.5,0.5];for(const n of [1,2,4,8]){p=pw(z,n);console.log('(.5+.5i)^'+n,p,'mod',mod(p),'(sqrt.5)^n',Math.SQRT1_2**n,'arg',ar(p));}
const th=20*Math.PI/180;console.log('cos60 via 4c^3-3c',4*Math.cos(th)**3-3*Math.cos(th),'cos3th',Math.cos(3*th),'sin3th',Math.sin(3*th),'3s-4s^3',3*Math.sin(th)-4*Math.sin(th)**3);
const p3=pw([Math.cos(th),Math.sin(th)],3);console.log('(cos20+isin20)^3',p3);
// exact integer-unit check (1+i)^8 =16
console.log('(1+i)^8',pw([1,1],8));
console.log('units bound 56.57^8',(20*Math.SQRT2*2)**8/1, '2^53',2**53,'(40*sqrt2)^10',(40*Math.SQRT2)**10);
// series e^{i pi}
const t=Math.PI;let sum=[0,0],term=[1,0];const out=[];for(let k=0;k<=24;k++){sum=[sum[0]+term[0],sum[1]+term[1]];if([1,3,5,9,13,21,24].includes(k))out.push(k+':'+sum[0].toFixed(7)+(sum[1]<0?'':'+')+sum[1].toExponential(2)+'i');term=mul(term,[0,t/(k+1)]);}console.log('partial sums e^{i pi}',out.join(' | '));
let a=[0,0],tm=[1,0];for(let k=0;k<=30;k++){a=[a[0]+tm[0],a[1]+tm[1]];tm=mul(tm,[0,t/(k+1)]);}console.log('N=30',a);
// velocity
const w=2,f=s=>[Math.cos(w*s),Math.sin(w*s)];const s0=Math.PI/12,h=1e-6;const d=[(f(s0+h)[0]-f(s0-h)[0])/(2*h),(f(s0+h)[1]-f(s0-h)[1])/(2*h)];
console.log('z',f(s0),'numeric z\'',d,'i*w*z',mul([0,w],f(s0)),'dot',d[0]*f(s0)[0]+d[1]*f(s0)[1],'speed',mod(d));
console.log('e^{i pi/6}',f(Math.PI/12*1)); console.log('pi/6',[Math.cos(Math.PI/6),Math.sin(Math.PI/6)]);
console.log('e^{ia}e^{ib} a=30 b=45',mul([Math.cos(Math.PI/6),Math.sin(Math.PI/6)],[Math.cos(Math.PI/4),Math.sin(Math.PI/4)]),'cos75 sin75',Math.cos(75*Math.PI/180),Math.sin(75*Math.PI/180));
```
Output:
```
(1+i)^5 [ -4, -4 ] mod 5.656854249492381 sqrt2^5 5.656854249492382 arg -135 5*45= 225
0.8+0.6i arg 36.86989764584401 ^10 [ 0.9884965888000005, 0.15124316159999956 ] mod 1.0000000000000004 arg 8.698976458440185 10*arg mod 360 8.698976458440143
(.5+.5i)^1 [ 0.5, 0.5 ] mod 0.7071067811865476 (sqrt.5)^n 0.7071067811865476 arg 45
(.5+.5i)^2 [ 0, 0.5 ] mod 0.5 (sqrt.5)^n 0.5000000000000001 arg 90
(.5+.5i)^4 [ -0.25, 0 ] mod 0.25 (sqrt.5)^n 0.25000000000000006 arg 180
(.5+.5i)^8 [ 0.0625, 0 ] mod 0.0625 (sqrt.5)^n 0.06250000000000003 arg 0
cos60 via 4c^3-3c 0.5000000000000004 cos3th 0.5000000000000001 sin3th 0.8660254037844386 3s-4s^3 0.8660254037844387
(cos20+isin20)^3 [ 0.5000000000000001, 0.8660254037844387 ]
(1+i)^8 [ 16, 0 ]
units bound 56.57^8 104857600000000.03 2^53 9007199254740992 (40*sqrt2)^10 335544320000000100
partial sums e^{i pi} 1:1.0000000+3.14e+0i | 3:-3.9348022-2.03e+0i | 5:0.1239099+5.24e-1i | 9:-0.9760222+6.93e-3i | 13:-0.9998995+2.11e-5i | 21:-1.0000000+1.03e-11i | 24:-1.0000000-1.70e-13i
N=30 [ -1, 3.338819470481049e-16 ]
z [ 0.8660254037844387, 0.49999999999999994 ] numeric z' [ -0.9999999999732445, 1.7320508075291396 ] i*w*z [ -0.9999999999999999, 1.7320508075688774 ] dot 3.301914297537678e-12 speed 1.9999999999522085
e^{i pi/6} [ 0.8660254037844387, 0.49999999999999994 ]
pi/6 [ 0.8660254037844387, 0.49999999999999994 ]
e^{ia}e^{ib} a=30 b=45 [ 0.2588190451025209, 0.9659258262890682 ] cos75 sin75 0.25881904510252074 0.9659258262890683
```
