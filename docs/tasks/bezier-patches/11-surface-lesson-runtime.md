# 11 — Surface lesson capabilities and actions

Status: ready after08/10. Source: [scene state and lesson contract](../../specs/bezier-patches.md#presets-scene-state-and-lessons). Extend existing chapter-owned guided examples; no parallel lesson system.

Add LessonPoint3, patch fixtures, camera/3D-box data and surface capabilities with opaque checkpoints. Register shared validated patch evaluation, visibility, subdivision, elevation and camera-preset actions, plus u/v sweeps. Respect canonical triangular order and barycentric tolerance. Geometry and actions never touch renderer objects. Scene-store writes remain synchronous in one tick; board effects occur after host commit. Capture/restore declared selection and preview state, and cancel animations on exit/restore.

Acceptance: integration tests run multi-action scenes synchronously, including edit→evaluate, elevate/subdivide→read, camera→checkpoint/restore and invalid inputs. Verify restored model, controls and actual adapter geometry after indirect changes. Preserve every existing curve lesson action/checkpoint. No graph-field state mirrors.

Verification: focused action/transient/runtime tests, `just check`, independent engineering review and mathematical review of action premises, full `$smoke-tester` checklist because shared lesson runtime changes. Cover midway return/focus, completion retaining editability, cancellation/remount and bilingual use. Evidence: `docs/reviews/bezier-patches/surface-lesson-runtime.md`.
