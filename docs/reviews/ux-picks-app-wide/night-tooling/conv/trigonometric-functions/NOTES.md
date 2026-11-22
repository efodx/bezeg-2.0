# trigonometric-functions (functions/trigonometric) - DONE
Files: src/graphs/functions/TrigonometricFunctionsGraph.tsx, src/learning/content/functionGuidedLessons.ts (trig steps).
Declared: formula equationText ({,}); groups wave(phi, amplitude), derived(period, shift, range); tangent note; legend curve / reference (when on) / midline / asymptotes (tan only).
Pucks: trig.A, trig.omega (help trig_omega_help), trig.phi (help trig_phase_help), trig.B; paramKey on the 4 Sliders.
ToolSections: trig-function (no title), trig-parameters (pickTitle inline "Parametri"). trig-reference (workspaceGraphDisplay group) left plain.
Removed under pick: board caption (equation + reference line), inspector readout.
Frames: base-sine obs hl range,period; amplitude expl legend hl amplitude,range / obs amplitude; vertical-shift hl range both; frequency hl period both; cosine-shifted expl hl shift,phi / obs open; period-shift expl hl period,shift,range / obs period; tangent expl legend hl amplitude,range,period / obs open.
Inline: "Parametri", "Asimptote". Others reuse trig_* keys.
Checks: tsc clean; just unit TrigonometricFunctionsGraph.test + functionGuidedLessons.test passed; shots all1440/all1024/none; walk 16 frames no page errors.
Known: with pucks the Parametri section is empty (sliders live as pucks). Pick-off markup and tan view not visually verified.
