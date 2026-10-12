# Compact workspace controls

Status: implemented and browser-verified. Physical-device and projector review remain follow-up evidence. Refined prototype C was the accepted source design.

## Problem and agreed solution

The tools are useful and should remain visible, but their large rounded buttons and inconsistent switches felt awkward. Preserve the existing graph-centered layout, topic navigation, panel frames, solid green active states, inspector groups, and learning prompts. Implement compact square controls with consistent spacing.

## Acceptance criteria

- All shared demonstration workspaces use 34px minimum-height desktop buttons, compact padding, and 2px corners. Connected tabs and number-control groups retain their active states.
- Selects and coordinate inputs use the same desktop proportions. Slider values use tabular digits in small badges; bounds have readable label/number spacing.
- Display switches align labels left and toggles right, with neutral off and green on styling. Keyboard focus, label clicks, disabled states, and native keyboard activation remain usable.
- The panel collapse action uses its localized label and an aligned SVG chevron reflecting open/closed state. Collapse and tab switching retain control values.
- Narrow screens and coarse pointers keep 44px minimum-height buttons, select/coordinate fields, and switch rows. The graph-first responsive layout and explicit presentation controls remain intact.
- Remove prototype imports, components, styles, switcher, query handling, and global arrow-key listeners. Old `variant` links render the normal workspace without changing the URL or route meaning.
- Preserve mathematics, board ownership, routes, preset keys, and file formats. No renderer/build/dependency changes or deployment.

## Source and alternatives

The complete comparison is archived at `9886c8d` on `codex/prototype-calm-tools`. Initial quieter panels, tools on demand, and bottom-tray layouts were rejected because they reduced visibility. The owner chose C's square proportions over A's rounder controls and B's original large controls, then refined switch rows, slider bounds, and the collapse icon. Implementation is on `codex/compact-workspace-controls`.

## Verification

Use the existing workspace interaction tests for tab/collapse retention, learning prompts, pan delegation, and presentation controls. Build production with `npm run build`. Review the default Bézier route, PH controls, display/save sections, a 390px layout, and presentation mode. Verify label and keyboard switch activation, focus, and removal of the comparison bar. Mathematical algorithms are unaffected; physical-device and classroom projection review remain follow-up evidence.

Implementation verification: all five existing workspace tests passed. Browser review covered the normal Bézier route, label-click and Space-key switch activation, the 390×844 graph-first layout, PH selection/hodograph controls, save-section availability, and presentation open-controls/exit. No preset writes were made. Production build succeeded with existing lint/tooling warnings in untouched files; the test runner also emitted existing deprecation/open-handle notices. Prototype source references are absent from `src`.

PH selection initially triggered a ResizeObserver warning when the inspector acquired a scrollbar. Reserving a stable scrollbar gutter removed the warning in two fresh-page selection checks and through presentation toggling, without changing board lifecycle or mathematics. This is a bounded layout fix; no mocked test was added because it would not exercise browser layout feedback. Physical-device and projector review remain outstanding.
