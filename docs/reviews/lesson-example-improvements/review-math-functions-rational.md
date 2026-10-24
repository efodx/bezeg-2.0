# Math review: functions and rational lessons

Reviewer: independent, read-only. Working tree as found (including uncommitted 03b edits).

## Findings

No blocker, major or minor mathematical errors found.

Observations (not defects):
- constructionGuidedLessons.ts (rsd-homogeneous-scheme prose, "uteži delov se spremenijo le, kadar so izvirne uteži različne"): strictly true for equal weights only when they equal 1 (or after normalisation). Negligible; severity minor/optional.
- functionGuidedLessons.ts area-beyond-step sl prose uses `[0;0{,}7753]` (semicolon interval); style only.
- Claims about UI behaviour (original polygon no longer drawn after elevation, view boxes actually applied) were not checked; only maths.

## Verified (node scripts in jobs tmp dir: a.cjs, r.cjs, f.cjs, or by hand)
- Trig: each step (A=2, B=1, omega=2, phi=pi/2) changes one quantity vs sin x; range [-2,2], [0,2], [-1,1]; period 2pi/omega=pi; phi>0 shifts left by phi/omega (sl and en agree); combined example 2sin(2x+pi/2)+1: range [-1,3], period pi, shift -pi/4, max 3 at x=0.
- Area (numeric integration): [1,3] signed=area=14/3, under g 16/3, under f 2/3; intersections 2-/+sqrt(1.5)=0.77526, 3.22474; [0,4] signed 4/3, area 8.4646, int f 16/3, int g 20/3 (5.3333/6.6667); [1,3.5] signed 55/12=4.5833, area 4.9823, extra piece 0.1995; b=3.2 both 4.7813; b=3.3 4.7687 / 4.7970.
- Alternative De Casteljau cubic: Q1(1/2)=(-3/2,2), Q2(1/2)=(3/2,3/2), B(1/2)=(0,7/4); t=1/4: Q1=(-23/8,1/2), Q2=(-1/8,23/8), B=(-35/16,35/32), matches (27p0+27p1+9p2+p3)/64; edge-case t=1 helpers p2,p3 correct.
- Rational elevation: w'=(1,7/4,3/2,1,1), Q1=(-22/7,15/7), hat Q1=(-11/2,15/4,7/4).
- Rational subdivision t=1/2 (4,-3 default): weights, junction (-9/11,21/11) w 11/8; equal-weight B(1/2)=(0,3/2).
- Rational extrapolation (fixture end point (4,-1) matches graph default): t=6/5 weights 1,2.2,0.52,1.144, third point (176/13,33/13); t=3/2 weights 1,5/2,-1/2,17/8, point (-29.5,6); D(s)=1+3s(1-s)^2, D(3/2)=17/8, only real root -0.2229; weight root (1+sqrt3)/2. Prose does not equate negative control weight with a pole and states positive weights on [0,1] do not exclude outside poles. View boxes contain the stated points.
- Farin: ratio gives w1=2,w2=1,w3=1 from default; prose says up to common positive factor, normalised w0=1; standardisation of 1,3,9,27: R(1/2)=B(3/4)=(79/32,3/8) and standardised point at 1/2 is (0,3/2), same locus, different parameterisation.
- Circle: n=3 middle weight cos(pi/3)=1/2, control point distance 6, points (+-5.196,-3),(0,6); n=4 sqrt2/2, 3sqrt2; n=6 sqrt3/2, 2sqrt3; "exact for every n, more pieces do not improve accuracy" correct.

## Lessons reviewed
trigonometric-functions (steps 2-6), area-between-curves (steps 1-5), decasteljau-alternative (new cubic steps, edge cases), rational-elevation, rational-subdivision, rational-extrapolation, farin, circle.

## Not reached
Trig tangent step and unchanged earlier steps; unchanged rest of farin/circle/decasteljau lessons; unit tests and rendering.
