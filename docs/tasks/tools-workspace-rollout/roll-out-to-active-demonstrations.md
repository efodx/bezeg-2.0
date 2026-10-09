# Roll out the demonstration workspace to active routes

Source spec: [Tools usability redesign](../../specs/tools-usability-redesign.md).

Status: implemented and reviewed on 2026-10-08. Verification details are in the [workspace implementation review](../../reviews/tools-workspace-redesign.md).

## Objective

After the owner accepted the Bézier and cubic PH pilots, apply the shared graph-centered workspace to all 26 active demonstration routes while retaining each route's current controls, mathematical behavior, routes, and preset compatibility.

## Work

1. Supply route title and workspace description metadata to graph pages through the existing app context; leave the home page outside the demonstration shell.
2. Make every active graph route use the shared topic navigator, graph, inspector sections, visible pan/zoom controls, presentation controls, and responsive layout.
3. Keep route-specific graph and selected-curve commands available under **Uredi**. Keep shared view controls under **Prikaz** and preset/import/export controls under **Shrani**.
4. Preserve structured point editing only where free control-point editing is already supported. Preserve PH hodograph editing and do not add direct coordinate editing for constrained or derived spline points.
5. Update the architecture, capability, UI, spec, and implementation review documents to describe the completed rollout and its verification limits.

## Acceptance criteria

- Every active route in `src/Routes.js` except the home route renders the shared workspace shell.
- Route titles remain localized and meaningful, including spline degree notation; the active route and topic group remain navigable.
- Existing demonstration commands, selected-curve controls, preset controls, reset, import/export, and figure-export controls remain reachable.
- Selection, route-specific operations, and special controls for Bernstein, rational weights, splines, PH hodographs/offsets, and parameterizations remain functional.
- The home page, route paths, preset keys, class identifiers, and stored file formats remain unchanged.
- Type checking and the production build succeed. Browser review covers one route from each demonstration family at desktop and narrow widths, plus specialized selection/editing workflows.

## Verification

The rollout previously passed `npx.cmd tsc --noEmit` and `npm.cmd run build`, with existing CRA, Browserslist, and lint warnings. Browser review covered all 26 active routes at a 390-pixel viewport, the home route outside the workspace, selected rational and spline curves, the PH hodograph editor, and the uniform PH parameter controls. Follow-up browser checks confirmed that repeated Bézier subdivision immediately adds a selectable curve, rational subdivision adds one picker entry per generated curve, and a newly subdivided general Bézier curve can itself be subdivided and listed.

Follow-up after localization integration: `npx.cmd tsc --noEmit` and `npm.cmd run build` passed after removing the stale generated `node_modules/.cache/tsconfig.tsbuildinfo`. A fresh development compile reported no TypeScript issues; existing CRA, Browserslist, dependency, and lint warnings remain. In English, browser traversal covered all 26 active routes; each showed its translated title, graph, and shared inspector. Switching from Slovenian to English and back with a Bézier curve selected retained the selection and the same JSXGraph SVG board IDs. The saved language was restored to Slovenian. The focused automated suite was not rerun in this continuation. Do not claim physical phone, projector, or export fidelity based solely on viewport simulation.
