# Utah teapot data for the Bézier renderer spike

Research date: 2026-10-26. This note verifies a reusable 32-patch Utah teapot dataset for a renderer prototype. It is provenance and extraction guidance, not a decision to add a runtime dependency or ship the dataset in production.

## Recommended source and license

Use the `teapotPatches` and `teapotVertices` literals in three.js `TeapotGeometry.js` at release r180, pinned by the release commit `0af9729` (the release page shows this commit). The source comment identifies it as Martin Newell's Utah teapot database and says the implementation is based on SPD software. The [r180 source file](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/geometries/TeapotGeometry.js) labels the table as `32 * 4 * 4 Bezier spline patches`, and the [r180 release entry](https://github.com/mrdoob/three.js/releases/tag/r180) pins the source revision. The short commit is `0af9729`; GitHub's raw URL can use that revision too: `https://raw.githubusercontent.com/mrdoob/three.js/0af9729/examples/jsm/geometries/TeapotGeometry.js`.

The repository's [LICENSE at r180](https://raw.githubusercontent.com/mrdoob/three.js/r180/LICENSE) is MIT. If copying these literals or substantial portions of the source, preserve its copyright and license notice (three.js authors, 2010–2025). Keep Newell/SPD attribution from the source header. This verifies the license of the selected three.js source distribution; it does not claim that every historical redistribution of the teapot data had identical provenance.

## Data shape and ordering

- `teapotPatches` has 32 consecutive blocks of 16 integer indices (512 indices total). Each block is one bicubic patch. The source block labels order them as rim 0–3, body 4–11, handle 12–15, spout 16–19, lid 20–27, and bottom 28–31.
- `teapotVertices` is a flat xyz list of 290 points (870 scalar values), addressed by zero-based indices 0–289. Each patch's control-point indices are in row-major table order `r * 4 + c`, with `r,c = 0..3`; unpack to `P[r][c] = vertices[patchIndices[r*4+c]]`, preserving source coordinates `(x,y,z)`.
- These are 32 explicit patches, not a 10-patch source with symmetry to be expanded. The table explicitly enumerates all four quadrants for the rotationally symmetric rim/body/lid/bottom regions and both sides for handle/spout. Do not label repeated/symmetric control points as repeated patches.
- Sanity checks for an extractor: 512 indices, min 0, max 289; 870 finite coordinates; each patch resolves to 16 xyz points. First control point is index 0 = `(1.4, 0, 2.4)`. Final vertex index 289 = `(2.8, 0.15, 2.4)`. Patch 0 begins with indices `[0,1,2,3]` and ends with `[12,13,14,15]`.

The source's evaluator intentionally transposes the 4x4 control grid while filling its `Matrix4` (`g[c*4+r]`, source lines marked `// transposed`) and then evaluates with its power-basis matrices. A direct Bernstein adapter should define and document its own `(u,v)` convention and verify endpoint/corner correspondence against the source evaluator before capturing a golden image; do not assume the source's local `s,t` labels map directly to array rows/columns.

## Degeneracies and shape transforms

Patches 20–23 (upper lid) and 28–31 (bottom) each have a collapsed control edge: respectively the first or last grid row repeats one point four times. These are cusp boundaries, not wholly degenerate patches. three.js removes triangles with repeated evaluated vertices at the lid/bottom cusps and describes its resulting count as `64*n*n - 8*n` for all 32 patches at `n` segments. A surface renderer should retain the patches and handle the zero-area boundary in its tessellation/normal logic.

The source coordinates have z-up, with extent z = 0..3.15. Its default `blinn=true` uses the distributed shorter proportions; `blinn=false` multiplies source z by 1.3 to restore the taller original proportions. It then centers vertically using `maxHeight/2` and rotates to y-up as output `(x, z-maxHeight/2, -y)`, scaled by `size/(maxHeight/2)`. The default `fitLid=true` separately multiplies x and y control coordinates of patches 20–27 by 1.077 (not z), empirically to avoid a gap. For a truthful fixture, preserve raw source data and make each of these transforms explicit fixture settings; choose and record `fitLid` and `blinn` values instead of baking them into the raw points.

## Extraction and adapter seam

Copy only the two literal arrays from the pinned source into a small prototype data module, retaining the MIT notice and a provenance comment with source URL/revision. Keep it as raw xyz points plus patch index lists. Add one adapter function that resolves a patch to 16 ordered points and, separately, applies explicitly configured lid-fit, Blinn, and display-space transforms. This keeps the surface evaluator independent of three.js and prevents presentation adjustments from obscuring the canonical controls. Record the source commit and selected transform flags beside any golden fixture.

## Primary references

- [three.js r180 `TeapotGeometry.js`](https://raw.githubusercontent.com/mrdoob/three.js/r180/examples/jsm/geometries/TeapotGeometry.js) — patch and point literals, source layout, cusp filtering, Blinn/fit-lid behavior, output coordinates, and source attribution.
- [three.js r180 release](https://github.com/mrdoob/three.js/releases/tag/r180) — release commit `0af9729`.
- [three.js r180 MIT license](https://raw.githubusercontent.com/mrdoob/three.js/r180/LICENSE) — reuse conditions and copyright notice.
- [Three.js `TeapotGeometry` documentation](https://threejs.org/docs/pages/TeapotGeometry.html) — public option names/defaults and stated tessellated triangle behavior.
