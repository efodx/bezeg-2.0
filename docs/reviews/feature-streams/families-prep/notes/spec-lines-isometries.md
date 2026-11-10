# Note: lines and isometries specs (worker evidence)

Scripts run with `node` (Node, BigInt fractions; scripts in a temp directory outside the repo). Outputs below are copied verbatim.

## Lines (script `n.js`): line through (-2,1),(4,4) = 3x-6y=-12, point T=(3,-2), circle centre (1,0) through (3,1)
```
line a,b,c (lineThrough) => [ 3, -6, -12 ]
slope,intercept => [ 0.5, 2 ]
intercepts x-2y=-4: x at y=0, y at x=0 => [ -4, 2 ]
lineValue x-2y+4 at T => 11
dist T => [ 4.919349550499537, 4.919349550499537 ]
foot => [ 0.7999999999999998, 2.4000000000000004 ]
perp 2x+y at T => 4
proj PT.n/|n| => 4.919349550499537
angle dirs (2,1),(1,3): dot,cross,deg => [ 5, 5, 45, 45.00000000000001 ]
cosrule |u-v|^2 vs => [ 5, 5 ]
angle (4,1),(1,3) => [ 7, 11, 57.528807709151515, 57.52880770915152 ]
angle (2,1),(1,0) => 26.56505117707799
s => 5
disc 5r2-s^2 for r2=5,4,8 => [ 0, -5, 15 ]
tangent point => [ 0, 2 ]
r2=8 points => [
  -1.5491933384829668,
  1.2254033307585166,
  1.5491933384829668,
  2.7745966692414834
]
two lines x-2y=-4 & 2x+y=4 => [ 0.8, 2.4 ]
double intercept mismatch => [
  [ -8, -8 ],
  [ -2, -6 ],
  [ -2, -6 ],
  [ 4, -4 ],
  -5.333333333333334,
  -5.333333333333333
]
```

## Isometries (script `i.js`): helper F = exact fraction, M=[a,b,c,d,tx,ty]
```
Sb o Sa => ["3/5","-4/5","4/5","3/5","0","0"]
S_a(3,1),S_b S_a (3,1) => [["3","-1"],["1","3"]]
triangle image => [["1","3"],["11/5","23/5"],["-7/5","24/5"]]
angle 2phi deg => 53.13010235415598
parallel composite => ["1","0","0","1","6","0"]
rot90 about (1,2): matrix with t=(3,1)? centre => ["1","2"]
check A(c)=c => ["1","2"]
glide g1 (axis dir w, glide vector) => [["1","1"],["2","2"]]
glide r1 => [["1","1"],["0","0"]]
r1 fixes (2,1) => ["2","1"]
dilation k=3/2 about (1,1) images => [["-1/2","-1/2"],["11/2","-1/2"],["-1/2","4"]]
areas => [6,13.5]
centre of dilation => ["1","1"]
side lengths 5 -> 7.5 => [5,7.5]
k=-1/2 images => [["3/2","3/2"],["-1/2","3/2"],["3/2","0"]]
sim matrix => ["9/10","-6/5","6/5","9/10","0","0"]
sim fixed pt det(I-A) => ["29/20"]
sim fixed pt => ["-46/29","28/29"]
lambda^2 = a^2+c^2 => ["9/4"]
```

## Frieze closure (script `fr.js`): period L=4, generators V0 x->-x, V1 x->-x+2, H y->-y, R half-turn, G (x+2,-y); 32 subsets; valid = no pure translation by L/2
```
bad (period halves): 16 valid subsets 16 distinct groups 10
1 | none
2 | V0
2 | V1
2 | H
4 | V0+H ; V0+R ; H+R ; V0+H+R
4 | V1+H
2 | R
4 | V1+R ; V1+G ; R+G ; V1+R+G
2 | G
4 | V0+G
```
Reading: 10 distinct groups as sets because mirror/centre positions differ; modulo shifting the origin they fall in 7 classes with distinct feature signatures {vertical mirror, horizontal mirror, half-turn, glide}: p1 none; p1m1 V; p11m H; p2 R; p11g G; p2mm V+H+R; p2mg V+R+G.

## PIK anchors (text extraction lines in `M-MAT-2026.txt`; page from the footer)
- 4.6 line 548, page 13: 'Togi premiki in skladnost', 'Vzporedni premik, zrcaljenje, vrtez, orientacija trikotnika', 'Pravokotna projekcija', 'Srediscni razteg, podobnost'.
- 4.8 line 632, pages 14-15: 'Skalarni produkt, kot med vektorjema in dolzina vektorja', 'Pravokotna projekcija vektorja na drug vektor', 'Povezava med skalarnim produktom in kosinusnim izrekom', 'utemelji pravokotnost in vzporednost vektorjev'.
- 4.9 line 680, page 15: 'Razdalja med tockama', 'Ploscina trikotnika'.
- 4.10.1 line 727, page 16: 'Enacbe premice v ravnini', 'Kot med premicama'.
- Formula sheet line 1949, page 40: 'Razdalja tocke od premice' d = |a x0 + b y0 + c| / sqrt(a^2+b^2) (also area of triangle, line 1940).
- No PIK entry for frieze/rosette/wallpaper groups or glide reflection: the extraction has none of 'friz', 'rozet', 'drsn' (see search below).
