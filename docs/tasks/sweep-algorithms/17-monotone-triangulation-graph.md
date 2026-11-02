# 17 — Monotone triangulation graph (C4)

Status: planned 2026-11-02 (geometry handler 26). Source: [spec C4](../../specs/sweep-algorithms-lessons.md#c4-triangulating-a-monotone-polygon) (steps, capabilities, acceptance 1, 3–5), common criteria C-1–C-7. Kind: F2a (no route, no registration), engineering, mathematical (counts) and UI/accessibility review. Depends on 15 (`partitionAndTriangulate`) and 16 (`MonotonePartitionGraph`, run module, side lists).

`MonotoneTriangulationGraph extends MonotonePartitionGraph` in `src/graphs/compgeo/`. It steps through the combined trace of task 15: the partition events first (drawn as in task 16), then each piece's triangulation.

1. **Trace stepping:** as task 16 over the combined sequence; Next step crosses from the partition phase to the first piece and between pieces without a dead step. An edit resets the step to \(0\) and pauses.
2. **Board (C-7):** in the triangulation phase, the current piece outlined, its vertices labelled by chain (left, right) in text as well as colour, the current vertex emphasised, the stack vertices marked, the vertex pair of a visibility test shown while it is the current event, diagonals and finished triangles drawn as reported.
3. **Side lists (C-7):** in the partition phase as task 16; in the triangulation phase, the piece's vertices top to bottom with their chain, and the stack bottom to top, current entries highlighted.
4. **Readouts:** step \(i/N\) and the phase (*razdelitev* / *triangulacija kosa \(k\) od \(m\)*); the current test and its outcome; triangles so far; when done, the \(n-2\) count. A comparison panel shows the predicate count of the monotone method (partition plus triangulation) and of ear clipping on the same polygon, from task 15's `counts`, with the growth statement \(O(n^2)\) versus \(O(n\log n)\) for the whole method (\(O(n)\) per piece after sorting) and the note that small counts illustrate and do not prove.
5. **Monotone input:** a \(y\)-monotone polygon shows the partition phase with no diagonal and says so ("already monotone"), then triangulates (acceptance 3).
6. **Refusals and Presets:** task 16's refusals; Presets are C3's two examples plus one \(y\)-monotone polygon chosen by the worker, validated as in task 16.
7. **Localization:** one key block after task 16's, same position in both catalogs.
8. **Tests** (host tests):
   - The C3 example through to done: the stack after each step equals the kernel's recorded stacks (task 15 report); \(4\) triangles and \(3\) diagonals; the counts panel equals task 15's `counts` (acceptance 4).
   - The monotone Preset shows no partition diagonal and the "already monotone" text.
   - Next step and Play reach identical states across the phase boundary; an edit resets and pauses.
   - Preset round trip, Reset, live language switch; disposal leaves nothing behind.

   Observe each new assertion fail against a deliberate mutation.

Not in scope: route and registration (18), the C4 lesson (20).

Checks: as task 16.
