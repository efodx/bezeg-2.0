# Notes: trig and circle specs (worker, 2026-11-10)

Specs: docs/specs/trigonometry-lessons.md, docs/specs/circle-geometry-lessons.md. All checked numbers come from the three node scripts below (run with node, outputs verbatim).

## Searches (src/)
- No existing: solveTriangle, lawOfCos, sineRule, radicalAxis, apollonius, commonTangent, src/trig/. Matches only: src/projective/conic.ts tangentPoints (line 355) and polar (239), used as independent oracle for C1.
- Existing: src/compgeo/circle.ts (intersectLineCircle:118, intersectCircles:137, powerOfPoint:96, circumcircle:157, angleBetween:179, thalesDot:189, invertExact:194), triangle.ts (incentre:274, inradius:286, circumradius:294), grid.ts GRID_COORD_LIMIT=2**25, graphs/compgeo/InscribedAngleGraph.tsx, graphFactories.ts:218 'inscribed-angle', demonstrations.ts:94 'trigonometric-functions' (/functions/trigonometric), lesson steps trig-base-sine..trig-tangent in functionGuidedLessons.ts:518-789, lesson 'inscribed-angle-thales' triangleGeometryChapterLessons.ts:104, 'inversion' :321 (chapter T5 covers secant product and tangent length).
- PIK: M-MAT-2026.txt: 4.6 table lines 550-583 (page 13: footer 'Matematika 13' line 585); 4.7 line 586 (ToC p14); 4.10.9 Kotne funkcije lines 871-901 (page 18 header line 868); 4.11 Stoznice line 886 (ToC p19). Power of a point, radical axis, Apollonius: not found (grep potenc/tangent/tetiv).

## Script 1 (/tmp/w/n.js) output
```
1rad deg 57.29578
pi/6 [0.8660254,0.5]
2rad [-0.4161468,0.9092974]
135deg rad 2.35619
arc r=3 theta=2 6
sin(pi-0.5),sin(0.5) [0.4794255,0.4794255]
sin75,cos75 [0.9659258,-0.258819]
formula [0.9659258,-0.258819]
(sqrt6+sqrt2)/4,(sqrt6-sqrt2)/4 [0.9659258,0.258819]
sides a,b,c [6.40312,4.47214,7]
angles deg [63.4349,38.6598,77.9052]
R2=205/16 [12.8125,12.8125]
a/sinA,b/sinB,c/sinC,2R [7.15891,7.15891,7.15891,7.15891]
CA.CB 6
right (0,0),(4,0),(0,3): c2 25
SSS 5,6,7 angles [44.4153,57.1217,78.463]
Heron 9*4*3*2 [14.696938456699069,14.69694]
SAS b5 c7 A60: a2,a [39,6.245]
SAS angles B,C [43.8979,76.1021]
ASA A40 B60 c8: C,a,b [80,5.22163,7.03508]
a=2.5 {"disc":-2.75,"roots":[],"valid":[]}
a=3 {"disc":0,"roots":[4,4],"valid":[4,4]}
a=4 {"disc":7,"roots":[1.35425,6.64575],"valid":[1.35425,6.64575]}
a=5 {"disc":16,"roots":[0,8],"valid":[8]}
a=6 {"disc":27,"roots":[-1.19615,9.19615],"valid":[9.19615]}
a=4 B.x 6.64575
a=4 B.x 1.35425
sinB=b sinA/a 0.75
min rel gap |a-b sinA|/b, a,b in 1/4..12 step 1/4, A=1..179 int deg excl 30,90,150 [0.000010968116339594378,[0.75,10.75,176]]
a=b/2 pairs 24
```

## Script 2 (/tmp/w/m.js) output
```
SSA a=4 B.x=6.64575 [{"A":36.8699,"B":48.59038,"C":94.53972,"c":6.64575,"a":4}]
SSA a=4 B.x=1.35425 [{"A":36.8699,"B":131.40962,"C":11.72048,"c":1.35425,"a":4}]
B1+B2 [180]
tangent a=3: B=(4,0) angB [90]
C1 T=(25/13,60/13) [1.9230769230769231,4.615384615384615,"dotOT.TP",-3.552713678800501e-15,"|PT|2",143.99999999999997,"power",144]
contact line x=r2/13 [1.9230769230769231]
secant t [[0.74227,1],"t1t2",0.74227,"c/a",0.7422680412371134,"PA.PB",144,"power",144]
inside P=(3,0) power [-16,"segments",2,8]
x=13/3 y=sqrt(56/9) [4.333333333333333,2.49444,"pow1",-3.552713678800501e-15,"pow2",0]
disjoint (10,0) r2=4 axis x=121/20 [6.05,"pow diff at 6.05",-1.7763568394002505e-15]
tangent (8,0) r2 9 axis x=5 [0,0]
radical centre (13/3,10/3) [4.888888888888886,4.888888888888891,4.8888888888888875,"44/9",4.888888888888889,"tangent length",2.21108]
A(0,0)B(6,0) k=2: centre(8,0) r=4; pts [[4,12],"PA/PB",2,2,"(8,4)",4,"OA*OB",16,"r2",16]
k=1/2 centre (-2,0) r2 [16,"(-2,... ) pt (-6,0): PA/PB",0.5,"(2,0)",0.5]
(-2,4): PA2,PB2 [20]
```

## Script 3 (/tmp/w/k.js) output
```
X ext [15,"I int",7.5,"asin 3/15 deg",11.53696,"asin 3/7.5",23.57818]
T on c1 from X=(15,0) [0.6,2.93939,"dot (T)(T-X)",0]
seg ext [9.79796,"seg int",9.16515]
e [1,1,"cos t",0.2,"t deg",78.46304,"tangent line angle from x-axis",-11.53696]
e [1,-1,"cos t",0.4,"t deg",66.42182,"tangent line angle from x-axis",-23.57818]
equal: int angle [36.8699]
counts [4,3,1,0,2,0,"coincident"]
min sep [0.00006103515625]
200deg [-0.939693,-0.34202]
sin^2+cos^2 at 2 [1]
```

Note: script 1 prints sin/cos of a+b=105 deg under the label "sin75,cos75" (a=60 deg, b=45 deg): sin105=0.9659258, cos105=-0.258819.

## Script sources
```js
const d=r=>r*180/Math.PI, f=(x,n=6)=>+x.toFixed(n);
const L=(s,v)=>console.log(s,JSON.stringify(v));
// Tr1
L('1rad deg',f(d(1)));L('pi/6',[Math.cos(Math.PI/6),Math.sin(Math.PI/6)].map(x=>f(x,7)));
L('2rad',[Math.cos(2),Math.sin(2)].map(x=>f(x,7)),f(d(2),4));
L('135deg rad',f(135*Math.PI/180,5),f(3*Math.PI/4,5));
L('arc r=3 theta=2',3*2);
L('sin(pi-0.5),sin(0.5)',[Math.sin(Math.PI-0.5),Math.sin(0.5)].map(x=>f(x,7)));
// Tr2 addition a=60 b=45
const a=Math.PI/3,b=Math.PI/4;
L('sin75,cos75',[Math.sin(a+b),Math.cos(a+b)].map(x=>f(x,7)));
L('formula',[Math.sin(a)*Math.cos(b)+Math.cos(a)*Math.sin(b),Math.cos(a)*Math.cos(b)-Math.sin(a)*Math.sin(b)].map(x=>f(x,7)));
L('(sqrt6+sqrt2)/4,(sqrt6-sqrt2)/4',[(Math.sqrt(6)+Math.sqrt(2))/4,(Math.sqrt(6)-Math.sqrt(2))/4].map(x=>f(x,7)));
// Tr3/4 triangle A(0,0)B(7,0)C(2,4)
const A=[0,0],B=[7,0],C=[2,4];const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
const aa=dist(B,C),bb=dist(A,C),cc=dist(A,B);const S=14;
const ang=(v,p,q)=>Math.atan2(Math.abs((p[0]-v[0])*(q[1]-v[1])-(p[1]-v[1])*(q[0]-v[0])),(p[0]-v[0])*(q[0]-v[0])+(p[1]-v[1])*(q[1]-v[1]));
const Aa=ang(A,B,C),Bb=ang(B,A,C),Cc=ang(C,A,B);
L('sides a,b,c',[aa,bb,cc].map(x=>f(x,5)));L('angles deg',[Aa,Bb,Cc].map(x=>f(d(x),4)),f(d(Aa+Bb+Cc),9));
const R=Math.sqrt(205/16);L('R2=205/16',[41*20*49/(16*196),205/16],'R',f(R,5),'abc/4S',f(aa*bb*cc/(4*S),5));
L('a/sinA,b/sinB,c/sinC,2R',[aa/Math.sin(Aa),bb/Math.sin(Bb),cc/Math.sin(Cc),2*R].map(x=>f(x,5)));
const dotC=(A[0]-C[0])*(B[0]-C[0])+(A[1]-C[1])*(B[1]-C[1]);L('CA.CB',dotC,'2ab cosC',f(2*aa*bb*Math.cos(Cc),9),'c2',49,'a2+b2-12',41+20-12);
L('right (0,0),(4,0),(0,3): c2',25,'dot at origin',0);
// Tr5
const ang3=(a,b,c)=>d(Math.acos((b*b+c*c-a*a)/(2*b*c)));
L('SSS 5,6,7 angles',[ang3(5,6,7),ang3(6,5,7),ang3(7,5,6)].map(x=>f(x,4)),'sum',f(ang3(5,6,7)+ang3(6,5,7)+ang3(7,5,6),9));
L('Heron 9*4*3*2',[Math.sqrt(216),f(Math.sqrt(216),5)]);
L('SAS b5 c7 A60: a2,a',[25+49-35,f(Math.sqrt(39),5)]);
const cosB=(39+49-25)/(2*Math.sqrt(39)*7);L('SAS angles B,C',[f(d(Math.acos(cosB)),4),f(180-60-d(Math.acos(cosB)),4)]);
L('ASA A40 B60 c8: C,a,b',[80,f(8*Math.sin(40*Math.PI/180)/Math.sin(80*Math.PI/180),5),f(8*Math.sin(60*Math.PI/180)/Math.sin(80*Math.PI/180),5)]);
// SSA geometric: A=(0,0), C=(4,3), line y=0, a variable
for(const a of [2.5,3,4,5,6]){const h2=9,a2=a*a;const disc=a2-h2;let roots=[];if(disc>=0){const s=Math.sqrt(disc);roots=[4-s,4+s]}
 L('a='+a,{disc:a2-h2,roots:roots.map(x=>f(x,5)),valid:roots.filter(x=>x>0).map(x=>f(x,5))});}
{const s=Math.sqrt(7);for(const x of [4+s,4-s]){const c=x,Bp=[x,0];const aB=ang([x,0],A,C);const AA=ang(A,Bp,C);const CC=ang(C,A,Bp);L('a=4 B.x',f(x,5),{angB:f(d(aB),4),angA:f(d(AA),4),angC:f(d(CC),4),side_c:f(c,5),area:f(c*3/2,5)});}}
L('sinB=b sinA/a',5*0.6/4,'B',f(d(Math.asin(.75)),4),f(180-d(Math.asin(.75)),4));
// margin for angle-input ambiguity
let mn=1e9,arg;for(let q=1;q<=48;q++)for(let r=1;r<=48;r++)for(let A=1;A<=179;A++){if([30,90,150].includes(A))continue;const a=q/4,b=r/4;const g=Math.abs(a-b*Math.sin(A*Math.PI/180))/b;if(g<mn){mn=g;arg=[a,b,A]}}
L('min rel gap |a-b sinA|/b, a,b in 1/4..12 step 1/4, A=1..179 int deg excl 30,90,150',[mn,arg]);
let c30=0;for(let q=1;q<=48;q++)for(let r=1;r<=48;r++)if(q/4===r/4*0.5)c30++;L('a=b/2 pairs',c30);
const d=r=>r*180/Math.PI, f=(x,n=5)=>+x.toFixed(n);
const L=(s,...v)=>console.log(s,JSON.stringify(v));
const ang=(v,p,q)=>Math.atan2(Math.abs((p[0]-v[0])*(q[1]-v[1])-(p[1]-v[1])*(q[0]-v[0])),(p[0]-v[0])*(q[0]-v[0])+(p[1]-v[1])*(q[1]-v[1]));
const A=[0,0],C=[4,3];
for(const x of [4+Math.sqrt(7),4-Math.sqrt(7)]){const B=[x,0];L('SSA a=4 B.x='+f(x),{A:f(d(ang(A,B,C))),B:f(d(ang(B,A,C))),C:f(d(ang(C,A,B))),c:f(x),a:f(Math.hypot(C[0]-B[0],C[1]-B[1]))});}
L('B1+B2',f(d(ang([4+Math.sqrt(7),0],A,C))+d(ang([4-Math.sqrt(7),0],A,C))));
L('tangent a=3: B=(4,0) angB',f(d(ang([4,0],A,C))));
// circles
L('C1 T=(25/13,60/13)',25/13,60/13,'dotOT.TP',(25/13)*(25/13-13)+(60/13)**2,'|PT|2',(25/13-13)**2+(60/13)**2,'power',169-25);
L('contact line x=r2/13',25/13);
// secant from P=(13,0) through Q(0,5)? line direction (-13,5); param t: |P+t u - O|^2=25
{const u=[-13,5];const a=u[0]**2+u[1]**2,b=2*13*u[0],c=169-25;const disc=b*b-4*a*c;const t=[(-b-Math.sqrt(disc))/(2*a),(-b+Math.sqrt(disc))/(2*a)];L('secant t',t.map(x=>f(x)),'t1t2',f(t[0]*t[1]),'c/a',c/a,'PA.PB',f(t[0]*t[1]*a),'power',c);}
// inside P=(3,0): chord y=0 -> 2 and 8
L('inside P=(3,0) power',9-25,'segments',2,8);
// C2 radical
const pw=(c,r2,p)=>(p[0]-c[0])**2+(p[1]-c[1])**2-r2;
L('x=13/3 y=sqrt(56/9)',13/3,f(Math.sqrt(56/9)),'pow1',pw([0,0],25,[13/3,Math.sqrt(56/9)]),'pow2',pw([6,0],9,[13/3,Math.sqrt(56/9)]));
L('disjoint (10,0) r2=4 axis x=121/20',121/20, 'pow diff at 6.05', pw([0,0],25,[6.05,0])-pw([10,0],4,[6.05,0]));
L('tangent (8,0) r2 9 axis x=5',pw([0,0],25,[5,0]),pw([8,0],9,[5,0]));
L('radical centre (13/3,10/3)',pw([0,0],25,[13/3,10/3]),pw([6,0],9,[13/3,10/3]),pw([3,6],4,[13/3,10/3]),'44/9',44/9,'tangent length',f(Math.sqrt(44/9)));
// C3 Apollonius
L('A(0,0)B(6,0) k=2: centre(8,0) r=4; pts',[4,12],'PA/PB',4/2,12/6,'(8,4)',80/20,'OA*OB',8*2,'r2',16);
L('k=1/2 centre (-2,0) r2',0.25*36/(0.75**2),'(-2,... ) pt (-6,0): PA/PB',6/12,'(2,0)',2/4);
L('(-2,4): PA2,PB2',20);
const d=r=>r*180/Math.PI, f=(x,n=5)=>+x.toFixed(n);
const L=(s,...v)=>console.log(s,JSON.stringify(v));
// c1 (0,0) r3, c2 (10,0) r1
L('X ext',(3*10-1*0)/(3-1),'I int',(1*0+3*10)/(3+1),'asin 3/15 deg',f(d(Math.asin(3/15))),'asin 3/7.5',f(d(Math.asin(0.4))));
L('T on c1 from X=(15,0)',9/15,f(Math.sqrt(9-0.36)),'dot (T)(T-X)',0.6*(0.6-15)+(9-0.36));
L('seg ext',f(Math.sqrt(100-4)),'seg int',f(Math.sqrt(100-16)));
// support function oracle: normal n=(cos t, sin t), n.c1+e1 r1 = n.c2 + e2 r2 -> cos t*10 = e1*3 - e2*1  (h equal)
for(const [e1,e2] of [[1,1],[1,-1]]){const cs=(e1*3-e2*1)/10;const t=Math.acos(cs);L('e',e1,e2,'cos t',cs,'t deg',f(d(t)),'tangent line angle from x-axis',f(d(t)-90));}
// equal radii r=3 d=10: ext y=±3, int sin=3/5
L('equal: int angle',f(d(Math.asin(0.6))));
// counts via disc: d2,r1,r2
const cnt=(d2,r1,r2)=>{const k=d2-r1*r1-r2*r2;const D=4*r1*r1*r2*r2-k*k;if(d2===0)return r1===r2?'coincident':0;if(D>0)return 2;if(D===0)return k>0?3:1;return k>0?4:0};
L('counts',cnt(100,3,1),cnt(64,5,3),cnt(4,5,3),cnt(1,5,3),cnt(49,5,3),cnt(0,5,3),cnt(0,3,3));
// min positive disc granularity: centres integer in [-8,8]^2 d2<=512 ; r quarter grid -> r2 mult of 1/16
L('min sep',Math.sqrt(1/256)/(2*512));
// Tr1 extra: signs by quadrant sample 200deg
L('200deg',f(Math.cos(200*Math.PI/180),6),f(Math.sin(200*Math.PI/180),6));
L('sin^2+cos^2 at 2',Math.sin(2)**2+Math.cos(2)**2);
```

## Script 4 (/tmp/w/p.js): SSA A=30 b=8, circumcircle sine-rule construction
```
a 5 h 4 roots c [ 3.9282, 9.9282 ]
a 4 h 4 roots c [ 6.9282, 6.9282 ]
a 3.5 h 4 roots c none
a 8 h 4 roots c [ 0, 13.85641 ]
a 9 h 4 roots c [ -1.13405, 14.99046 ]
B [53.1301,"C",96.8699,"c=a sinC/sinA",9.9282,"area 1/2 b c sinA",19.8564]
B [126.8699,"C",23.1301,"c=a sinC/sinA",3.9282,"area 1/2 b c sinA",7.8564]
b cosA [6.9282,"4sqrt3",6.9282]
a=8 A=30 b=8: C [120,"c",13.85641]
CA.CB check 2ab cosC [12.000041952254609,"exact 12 via dot",6]
CA.CB [6,"2*",12]
O [[3.5,0.75],"A prime",[0,1.5],"(B-C).(A'-C)",0,"|BA'|",7.15891,"2R",7.15891]
angle at A' between A'B and A'C [63.4349]
sqrt2-sqrt6 /4 [-0.258819]
states [720]
```
```js
const d=r=>r*180/Math.PI, f=(x,n=5)=>+x.toFixed(n), r=x=>x*Math.PI/180;
const L=(s,...v)=>console.log(s,JSON.stringify(v));
const A=30,b=8;
for(const a of [5,4,3.5,8,9]){const h=b*Math.sin(r(A));const s=Math.sqrt(Math.max(0,a*a-h*h));console.log('a',a,'h',f(h),'roots c',a*a<h*h?'none':[b*Math.cos(r(A))-s,b*Math.cos(r(A))+s].map(x=>f(x)));}
for(const B of [Math.asin(0.8),Math.PI-Math.asin(0.8)]){const Bd=d(B),C=180-A-Bd;L('B',f(Bd,4),'C',f(C,4),'c=a sinC/sinA',f(5*Math.sin(r(C))/Math.sin(r(A)),4),'area 1/2 b c sinA',f(0.5*8*(5*Math.sin(r(C))/Math.sin(r(A)))*Math.sin(r(A)),4));}
L('b cosA',f(8*Math.cos(r(30)),5),'4sqrt3',f(4*Math.sqrt(3),5));
L('a=8 A=30 b=8: C',120,'c',f(2*8*Math.cos(r(30)),5));
L('CA.CB check 2ab cosC', 2*Math.hypot(5,4)*Math.hypot(2,4)*Math.cos(r(77.9052)), 'exact 12 via dot', (-2*5)+(-4*-4)*1 );
// check dot properly: CA=(-2,-4), CB=(5,-4)
L('CA.CB',(-2)*5+(-4)*(-4),'2*',2*((-2)*5+(-4)*(-4)));
L('O',[3.5,0.75],'A prime',[0,1.5],'(B-C).(A\'-C)',(5)*(-2)+(-4)*(-2.5), '|BA\'|',f(Math.hypot(7,1.5)),'2R',f(2*Math.sqrt(205/16)));
const aa=Math.hypot(5,4);const Ap=Math.atan2(Math.abs(5*(-2.5)*0+0),1);
L('angle at A\' between A\'B and A\'C',f(d(Math.atan2(Math.abs(7*(2.5)-(-1.5)*2),7*2+(-1.5)*2.5)),4));
L('sqrt2-sqrt6 /4',f((Math.SQRT2-Math.sqrt(6))/4,7));
// sin 0.5 vs; half-degree states
L('states',720);
```
