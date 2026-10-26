# Triangular patch geometry worker evidence

Implementation: `src/bezeg/impl/patch/triangular-bezier-patch.ts` and its focused tests. The implementation owns its control-point grid, uses the canonical descending `i`, then descending `j` order, and accepts polynomial degrees 1–4. Barycentric inputs must be finite and nonnegative; sums above `1 + 8·Number.EPSILON` are rejected, while smaller roundoff overruns are normalized to the edge with `w = 0`. Edge and vertex subdivision requests throw an explicit `RangeError`.

Subdivision computes the full barycentric de Casteljau scheme at the split point once, then reads each child net from its levels. For child control `(i,j,k)`, the three source indices are `scheme[k][index(n-k,i,j,0)]`, `scheme[k][index(n-k,0,i,j)]`, and `scheme[k][index(n-k,j,0,i)]`, corresponding to children `(A,B,P)`, `(B,C,P)`, and `(C,A,P)`. Their mappings from child barycentrics `(a,b,c)` to parent `(u,v)` are respectively `(a+c·p_u,b+c·p_v)`, `(c·p_u,a+c·p_v)`, and `(b+c·p_u,c·p_v)`.

The independently written Bernstein reference checks degrees 1–4 to 11 decimal digits. Tests also check full scheme levels against explicit degree-two values; elevation coefficients to 12 digits; subdivision reparameterizations to 10 digits; central finite-difference partials with `h=10⁻⁶` to 7 digits; unit normals to 12 digits; full boundary equality at interior parameters; and positive mesh-face orientation. Cross-type checks compare `S(x,y)=(x,y,xy)` from a bilinear tensor patch with the exact degree-two triangular representations on both halves of the square. Cache tests edit a real `PointImpl` stamp, replace the control net after priming, confirm refresh across mesh densities, reject non-finite point edits after priming caches, exercise a volatile function-backed point, and verify defensive outputs. Issued boundary curves retain their original point references across grid replacement.

Mutation evidence: temporarily adding `+1` to each barycentric recurrence reduction caused 7 of 10 triangular tests to fail, including the independent Bernstein check, vertex interpolation, elevation, subdivision, mesh refresh, and tensor/triangle equivalence. The mutation was removed, and the focused tests, typecheck, and scoped lint passed afterward.

Verification logs:

- Pre-fix `eval(0.8,0.2)` reproduction: `.command-logs/2026-10-26T21-24-08-537Z-88124-6ce5fed0.log` (confirmed a `RangeError`).
- Pre-fix `sampleMesh(5)` reproduction: `.command-logs/2026-10-26T21-26-19-139Z-110900-f1fcf6d0.log` (confirmed lattice sampling throws the same `RangeError`).
- Focused patch/kernel/curve tests after the fix and added boundary/cache cases: `.command-logs/2026-10-26T21-26-33-092Z-111144-db558a31.log` (passed; includes edge lattice checks at all densities 1–256 and meshes at densities 5, 6, 8, 10, 16, 256).
- Typecheck after the fix: `.command-logs/2026-10-26T21-26-40-537Z-105200-42800c6c.log` (passed).
- Scoped lint after the fix: `.command-logs/2026-10-26T21-26-53-531Z-99684-5ffabbc9.log` (passed).
- Focused patch/kernel/curve tests: `.command-logs/2026-10-26T21-21-07-319Z-103188-b61b5913.log` (passed; 112 tests across 6 files).
- Typecheck: `.command-logs/2026-10-26T21-21-14-516Z-94956-5730cfae.log` (passed).
- Scoped lint: `.command-logs/2026-10-26T21-21-28-173Z-107116-996ec283.log` (passed).
- Mutation run: `.command-logs/2026-10-26T21-20-54-991Z-89288-2af50048.log` (expected failure; mutation removed).

No UI, route, shared interface, tensor implementation, curve kernel, or existing curve code was changed. Independent handler review and final acceptance remain outstanding.
