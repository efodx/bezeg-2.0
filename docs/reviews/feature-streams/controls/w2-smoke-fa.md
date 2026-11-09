# w2 smoke group fa (preview 5e2bfc47, localhost:4327, Chromium 1280x800 + 390x844 touch)
Raw logs: .command-logs/w2-smoke-fa/main.log, mob.cjs output summarized in report. All routes: 0 console errors, language round trip kept scene.

TAYLOR
 load errs 0
  step+ Stopnja 1 -> 2 board changed true live ["Ocena napake je skrita: Tₙ in napaka sta prikazana, ocene pa še ni. Na"]
  step- 1
  btn size 44 47
  refuse Stopnja n abc error nodes: [] occurrences of "Vnesi vrednost" in page 1
  kb ArrowUp abc -> 2 Space on + -> 3 focus outline solid 3px
  type Središče c 1 -> val 1 board changed true
  lang EN labels ["Language","Example function","Center c","Point x","Degree n","Degree n"] board same after round trip true errs 0
UNIFORM
 load errs 0
  step+ Indeks 5 -> 6 board changed true live ["Supremum je skrit. Napovej, katera točka ima največjo napako in ali en"]
  step- 5
  btn size 44 47
  refuse Točka x 99 error nodes: [] occurrences of "Vnesi vrednost" in page 1
  refuse Konec območja r (območje [0; r]) -5 error nodes: [] occurrences of "Vnesi vrednost" in page 2
  kb ArrowUp 5 -> 6 Space on + -> 7 focus outline solid 3px
  lang EN labels ["Language","Sequence of functions","Domain end r (domain [0, r])","Point x","Tolerance ε","Index n"] board same after round trip true errs 0
FOURIER SERIES
 load errs 0
  step+ harmonikov 11 -> 12 board changed false live ["Pri pravokotnem valu so koeficienti sodih harmonikov enaki 0, zato je "]
  step- 11
  btn size 44 47
  kb ArrowUp 11 -> 12 Space on + -> 13 focus outline solid 3px
  whole view button count 0 Fit btn 1
  refuse Število harmonikov N abc error nodes: [] occurrences of "Vnesi vrednost" in page 1
  lang EN labels ["Language","Wave","Number of harmonics N","Number of harmonics N","Point x","Tolerance ε"] board same after round trip true errs 0
FOURIER COEFF
 load errs 0
  type Največji harmonik K 5 -> val 5 board changed true
  type Vrednost f pri x = 0 1 -> val 1 board changed true
  refuse Največji harmonik K abc error nodes: [] occurrences of "Vnesi vrednost" in page 1
  focus after tab SELECT
  lang EN labels ["Language","View","Shape of the function f","Value of f at x = −π","Value of f at x = 0","Highest harmonic K"] board same after round trip true errs 0
EPICYCLES
 load errs 0
  -1/+1 buttons 0
  N slider val 5
  N slider after ArrowRight 6 board changed true live ["N = 6; členov: 13; največji vrteči se člen: k = 1, |cₖ| = 1,0001; najv"]
  playing: live [""] btns [ 'Ustavi' ]
  after pause live ["N = 6; členov: 13; največji vrteči se člen: k = 1, |cₖ| = 1,0001; najv"]
  lang EN labels ["Language","Example","Number of terms N","Number of terms N, value","Parametrization","Time t (fraction of a turn)"] board same after round trip true errs 0
RUNGE
 load errs 0
  step+ Stopnja 10 -> 11 board changed true live []
  step- 10
  btn size 44 47
  kb ArrowUp 10 -> 11 Space on + -> 12 focus outline solid 3px
  refuse Stopnja n abc error nodes: [] occurrences of "Vnesi vrednost" in page 1
  semicircle aria-disabled true disabled attr null
  focused true
  reason ["Čebiševe točke so projekcije enakomerno razporejenih točk na polkrogu. Polkrog je na voljo le za Čebiševe točke."]
  after click checked false
  lang EN labels ["Language","Function f","Degree n","Degree n","Placement of the interpolation nodes","Show the error curve |f − p|"] board same after round trip true errs 0

Mobile 390x844: Taylor and Runge steppers 44x47 px, tap + works (1->2, 10->11); Edit 'tab' role not found (count 0) but stepper reachable.
