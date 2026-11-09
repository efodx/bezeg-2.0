# w2 smoke group kf (preview 5e2bfc47, Chromium 1280x800 + 390x844 touch)
Scripts and raw log: .command-logs/w2-smoke-kf/ (main.cjs, ex1-4.cjs, main.log). Screenshots there too.

== lagrange load errs 0 live regions 1
 typed Točka 2, y 5 board changed true
 refusal abc hints [ 'Vnesi vrednost med −1000 in 1000.' ] val after abc
 slider Položaj s na krivuljah 0.5 -> 0.52 board changed true outline solid 3px
  exact field -> 0,25 slider 0.25
  refusal hints [ 'Vnesi vrednost med 0 in 1.' ]
 count+ board changed true btn 44 44 outline solid3px val −
5
+
 live [ 'Lagrange: t = 0,75 (na [0, 3]), uteži 0,1172; 1,0547; −0,210' ]
 EN labels [ 'Point 1, x', 'Point 1, y', 'Point 2, x', 'Point 2, y' ] errs 0
 round trip board same true errs 0
== hermite load errs 0 live regions 0
 typed Točka 3, y 1 board changed true
 refusal abc hints [ 'Vnesi vrednost med −1000 in 1000.' ] val after abc
 slider Napetost 1 -> 1.1 board changed true outline solid 3px
  exact field -> 0,25 slider 0.25
  refusal hints [ 'Vnesi vrednost med 0 in 2.' ]
 live []
 EN labels [ 'Point 1, x', 'Point 1, y', 'Point 2, x', 'Point 2, y' ] errs 0
 round trip board same true errs 0
== curvature load errs 0 live regions 1
 slider Parameter t 0.5 -> 0.52 board changed true outline solid 3px
  exact field -> 0,25 slider 0.25
  refusal hints [ 'Vnesi vrednost med 0 in 1.' ]
 live [ 'Ukrivljenost κ = 0,7071. Krivinski polmer R = 1,4142. Smerni' ]
 EN labels [ 'Parameter t, value', 'Parameter t' ] errs 0
 round trip board same true errs 0
== decasteljau load errs 0 live regions 0
 typed p₂, y 1 board changed true
 refusal abc hints [ 'Vnesi vrednost med −1000000 in 1000000.' ] val after abc
 slider Parameter t 0.5 -> 0.52 board changed true outline solid 3px
  exact field -> 0,25 slider 0.25
  refusal hints [ 'Vnesi vrednost med 0 in 1.' ]
 live []
 EN labels [ 'p₀, x', 'p₀, y', 'p₁, x', 'p₁, y' ] errs 0
 round trip board same true errs 0
== reduction load errs 0 live regions 1
 typed p₁, y 1 board changed true
 refusal abc hints [ 'Vnesi vrednost med −1000000 in 1000000.' ] val after abc
 live [ 'Tretja diferenca: (0; −5) Ni nižljiva (toleranca 10⁻⁹) Najve' ]
 EN labels [
  'Show the reduced (quadratic) curve',
  'Show the elevated net of the quadratic',
  'p₀, x',
  'p₀, y'
] errs 0
 round trip board same true errs 0
== alpha load errs 0 live regions 0
 typed p₂, y 0 board changed true
 refusal abc hints [ 'Vnesi vrednost med −1000000 in 1000000.' ] val after abc
 slider Parameter α 0.5 -> 0.52 board changed true outline solid 3px
  exact field -> 0,25 slider 0.25
  refusal hints [ 'Vnesi vrednost med 0 in 1.' ]
 slider Število točk 10 -> 12 board changed true outline solid 3px
  exact field -> 0,25 slider 12
  refusal hints [ 'Vnesi vrednost med 1 in 40.' ]
 live []
 EN labels [ 'p₀, x', 'p₀, y', 'p₁, x', 'p₁, y' ] errs 0
 round trip board same true errs 0

Extras: Lagrange chord-length + P2=P1 refusal text occurs once, inside the Point 2 y field hint (.number-input-hint), not a graph-level notice; board kept last valid curve. Hermite same (once, field hint). Hermite tension: aria-disabled true, focusable, reason once (describedby), ArrowRight leaves value 1, EN reason relabelled. Alpha count field: 7 ok, 0,25/7,6/50 refused with 'Vnesi vrednost med 1 in 40.'. Curvature Prikaz tab: no count control. Mobile: Lagrange +/- 44x44, tap works; alpha point fields 88x44; Edit button present.
