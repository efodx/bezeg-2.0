# f1-isometry-02: rosette and frieze kernel

Files: `src/isometry/rosette.ts`, `frieze.ts` and their tests. No existing file edited.

API: `rosette(n, mirrors, motif) -> {order, images[{x,y,reflected}]}` (n in 1..12, else RangeError; order exact; images ordered rotation j then its mirror). `friezeClosure(gens, L) -> {kind:'closed', elements} | {kind:'reducesPeriod'}`, `friezeGenerator`, `friezeSignature`, `friezeType` (RangeError on a non-frieze signature), `friezeRepresentative`, `friezeTypes`, `friezeCopies(type, motif: RationalPoint, L, {from,to}) -> {point, element, period}[]`.

Checks: `just unit src/isometry` passed; `npx tsc --noEmit --pretty false` clean outside src/trig/trigModel*; `just lint src/isometry` passed.

Mutations (all failed as expected, then restored, final unit run passed): reducesPeriod never returned -> 5 frieze failures; G without half-period shift -> 6 frieze failures; rosette mirror image skipped for last j (count 2n-1) -> 2 rosette failures.

Decisions: glide = H-linear part with tx not 0 mod L (in this model tx = L/2); horizontal mirror = H-linear part with tx = 0. Oracle is an integer loop at L = 4, independent of friezeClosure.

Spec L5 numbers (16/16, 10 closed sets, 7 types/signatures, five p2mg sets, sizes 1,2,2,2,2,4,4) all held; no spec issue.

## Review fixes
Added: reflect-then-rotate oracle for mirror images (sign mutation of the mirror row failed 2 rosette tests; restored); friezeCopies docstring on strip crossing plus interior-strip count test; L=3/2 V-after-G test with tx reduced from -3/4 to 3/4. unit and lint passed; tsc clean outside trigModel*.
