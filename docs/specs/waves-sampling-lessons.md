# Waves, beats and sampling (Valovanje, utripanje in vzorčenje)

**Status:** draft, 2026-11-10 (stream families-prep); prepared, not scheduled for release. Tasks: [docs/tasks/waves](../tasks/waves/README.md). Decisions 1–3: [ADR 0055](../adr/0055-waves-one-graph-integer-frequencies-drawn-sampler.md).
**Agreed:** owner scheduled preparation 2026-11-10 (family #14 of the [top-15 research note](../research/lesson-family-candidates-2026-11-09.md), the runner-up that took the freed slot); details below are proposals for owner review.
**Source:** the research note's entry 14 (opening lesson, lesson list, risks) and the matura catalogue M-MAT-2026, text extraction read for this spec: §4.10.9 *Kotne funkcije* (page 19; contents *Transformacije grafov kotnih funkcij*, *Adicijski izreki*, *Faktorizacija in razčlenitev produkta*, *Kotne funkcije v tehniki in naravoslovju*; objectives "uporabi transformacije grafov kotnih funkcij" and "uporabi adicijske izreke"). Superposition and beats are the product-to-sum identity in use and the amplitude, frequency and phase transformations in an applied setting; **sampling, aliasing and the Nyquist rate are not in the extraction and are enrichment**. Level markers (VR) were not verified. Part of the [new lesson families](new-lesson-families.md) (the index entry is added by the handler).

## Problem Statement

Bezeg draws \(A\sin(\omega x+\varphi)\) with sliders (demonstration `trigonometric-functions`, route `/functions/trigonometric`, `src/demonstrations.ts:94`; lesson steps `trig-frequency`, `trig-phase-cosine`, `trig-combined`, `src/learning/content/functionGuidedLessons.ts:690`, 717, 744) and sums of sinusoids as Fourier partial sums (`fourier-wave`, `fourier-third`, `src/learning/content/fourierSeriesGuidedLessons.ts:132`, 147). It never shows two waves *added*: that the sum of equal frequencies is again a sinusoid with a new amplitude and phase, that two close frequencies beat, that two travelling waves make a standing one, or what happens when a wave is observed only at discrete instants. The last is the wagon-wheel effect and the reason a recording needs a minimum rate. These ideas appear in the matura's applied trigonometry and in everyday sound and video.

## Solution

Add a Learn chapter **Valovanje, utripanje in vzorčenje / Waves, beats and sampling** with five guided activities, each backed by a Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary and first-year university. Each lesson is 5–7 steps, predicts before it reveals and ends in free exploration. No exercises, grading or progress. Each picture is labelled an **argument** or an **illustration**.

**Cross-links, not repeats.** `trig-frequency`, `trig-phase-cosine`, `trig-combined` teach amplitude, frequency and phase of one sinusoid and are prerequisites. The Fourier lessons (`fourier-wave`, `fourier-third`, `fourier-more`) are the follow-up of WV1. The epicycle lessons (`epi-loop`, `epi-add`, `src/learning/content/epicyclesGuidedLessons.ts:148`, 178) show rotating arrows that add; WV1 uses the same picture for a sum of two rotations. The unit-circle lesson TR1 of [trigonometry-lessons](trigonometry-lessons.md) is an optional prerequisite for phasors (that spec is a draft).

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| 0 (foundation) | Kernel `src/waves/` (below) with oracle tests; ADRs 1–3 accepted | Kernel tests pass; no learner-visible route needed |
| A | WV1 Superposition and phase; WV2 Beats | Batch 0 done; the waves graph passes the batch gate |
| B | WV3 Standing waves | Batch A released |
| C | WV4 Sampling and aliasing (the wheel); WV5 The Nyquist rate and reconstruction | Batch B released; ADR 2 accepted |

Publish batches separately. Do not expose unimplemented Demonstrations.

### Reuse and new modules

Verified by search in `src/`:

- Animated time: `AnimationDriver` (`src/learning/runtime/animation.ts:12`); `EpicycleGraph` (`src/graphs/functions/EpicycleGraph.tsx`, registered at `src/graphs/graphFactories.ts:207`, route `/analysis/epicycles` at `src/demonstrations.ts:120`) keeps time and the playing flag as host state outside Presets; `src/analysis/epicycleModel.ts` (`EPICYCLE_TRACE_SAMPLES = 2000`, line 39) is the precedent for a stated trace resolution.
- `src/analysis/fourier.ts`, `fourierSeriesModel.ts`: Fourier series data. A sum of two sinusoids does not need them; the partial sum of a square wave can be shown as a link only.
- Searched `beat`, `Nyquist`, `alias`, `sampler`, `standing` in `src/`: no wave, sampler or aliasing code (only unrelated matches).

New modules (names suggested): `src/waves/sinusoid.ts` (components, sum, phasor sum), `src/waves/beats.ts` (envelope, beat frequency), `src/waves/standing.ts`, `src/waves/sampling.ts` (sampler, exact alias, reconstruction), `src/waves/wavesModel.ts` (state parse/validation), graph `src/graphs/functions/WavesGraph.tsx` with modes `sum`, `beats`, `standing`, `sampling`. Pure maths stays free of React, JSXGraph, localization and graph-global state.

### Decisions needing an ADR

1. **Graph shape and placement.** (a) One `WavesGraph` with four modes; (b) one graph per lesson; (c) extend the trigonometric function graph. (c) changes an existing route and stored Presets; (b) duplicates the time and trace code. Proposal: (a), placed beside `/functions/trigonometric`. Before Batch A.
2. **Frequency grid and sampling policy.** (a) Integer frequencies \(f\in\{1,\dots,40\}\) Hz and integer sampling rates \(f_s\in\{2,\dots,64\}\) Hz, so aliases are exact integer arithmetic, with the continuous wave drawn at \(2048\) points per \(1\) s window; (b) real-valued frequencies with a tolerance; (c) frequencies as ratios of the sampling rate. Proposal: (a). Before Batch C.
3. **Time and the display's own frame rate.** (a) The animation parameter \(t\) is continuous and the sampler is a drawn strip of instants \(n/f_s\), never the browser's frame rate; (b) let the animation frame rate act as the sampler. Proposal: (a): the browser's refresh would alias by itself and make the lesson depend on the machine. Before Batch C.

## Waves kernel (owned by this spec)

1. **Components.** `Sinusoid = {amplitude, frequency, phase}` with \(x(t)=A\cos(2\pi ft+\varphi)\); `sumAt(components, t)` adds doubles (computed).
2. **Phasor sum.** For equal frequencies `phasorSum(c1, c2)` returns amplitude \(\sqrt{A_1^2+A_2^2+2A_1A_2\cos\Delta\varphi}\) and phase \(\operatorname{atan2}(A_2\sin\Delta\varphi,\,A_1+A_2\cos\Delta\varphi)\) (computed).
3. **Beats.** For equal amplitudes \(A\): sum \(=2A\cos(\pi\Delta f\,t)\cos(\pi(f_1+f_2)t)\); `envelope(t) = 2A|cos(πΔf t)|`; the beat frequency is \(|f_1-f_2|\) (integer, exact). The signed factor \(2A\cos(\pi\Delta f\,t)\) has frequency \(\Delta f/2\); the visible envelope \(|\cdot|\) and the heard beat repeat with frequency \(\Delta f=|f_1-f_2|\), period \(1/\Delta f\). The sum is a sinusoid at the mean frequency only within one lobe: the sign flips (a phase jump of \(\pi\)) at each envelope node.
4. **Standing wave.** \(\sin(kx-\omega t)+\sin(kx+\omega t)=2\sin kx\cos\omega t\); nodes at \(x=n\pi/k\), antinodes at \((n+\tfrac12)\pi/k\).
5. **Sampler and alias.** `sample(component, fs, n)` gives \(x(n/f_s)\). `alias(f, fs)` is exact on integers: \(r=f \bmod f_s\); if \(2r=f_s\) the result is `ambiguous`; else the signed alias is \(r\) when \(2r<f_s\) and \(r-f_s\) otherwise (magnitude \(\min(r,f_s-r)\)). `reconstruct` for a single tone returns \(A\cos(2\pi f_a t+\varphi)\) with the signed alias \(f_a\), which has exactly the same samples; for sums it is the truncated sinc interpolation over the samples \(n=-E,\dots,f_s+E\) of the window \([0,1]\) s plus \(E\) extra samples on each side, with \(E\) and its error shown.

## Concept contracts and acceptance criteria

Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept. Every number was computed by the author with `node -e`-style scripts (listed with their outputs in the families-prep note `docs/reviews/feature-streams/families-prep/notes/spec-kinematics-waves.md`); none is guessed.

### WV1. Superposition and phase

- Learning goal: two sinusoids of the same frequency add to one sinusoid; the new amplitude depends on the phase difference, from \(A_1+A_2\) (in phase) to \(|A_1-A_2|\) (opposite); rotating arrows add like vectors.
- Prerequisites: `trig-phase-cosine`, `trig-combined`. Follow-up: `fourier-wave`, `epi-add`.
- Default example (*checked*): \(A_1=A_2=1\): phase difference \(0^\circ\) gives amplitude \(2\), \(120^\circ\) gives \(1\), \(180^\circ\) gives a computed amplitude that is a rounding residue near \(0\) (a double, never called exactly \(0\)). "Opposite phase" is declared by an exact input test (equal amplitudes and \(\Delta\varphi=180^\circ\) on the snapped grid); the readout then says "the waves cancel" and the phase of the sum is "not defined" (`atan2` of a rounding residue is arbitrary). Otherwise the phase of the sum is relative to component 1. \(A_1=3,A_2=2\): at \(90^\circ\) the amplitude is \(\sqrt{13}=3{,}60555\) with phase \(33{,}69^\circ\); at \(60^\circ\) it is \(4{,}35890\) with phase \(23{,}41^\circ\). The oracle is the maximum of the sampled sum refined by golden-section search around the best grid point (agreement \(10^{-8}\), tolerance); the unrefined grid maximum on \(2048\) points per second can miss the peak by up to \(A_\mathrm{sum}(\pi f/2048)^2/2\) (checked: \(1{,}2\cdot10^{-6}A\) at \(1\) Hz, \(1{,}9\cdot10^{-3}A\) at \(40\) Hz).
- Steps: (1) one wave; predict the sum of two equal waves; (2) drag the phase of the second; (3) in phase and opposite phase; (4) the sum is again a sinusoid of the same frequency (a wave with a new amplitude and phase); (5) the arrow picture: two rotating arrows and their vector sum; (6) different amplitudes; (7) free exploration.
- Graph needs: amplitude and phase fields for two components (steppers), time slider with Play, the two waves and their sum, the phasor picture with the sum arrow, readouts of amplitude and phase of the sum, text statuses.
- Acceptance:
  1. Numbers agree with `phasorSum`; the drawn maximum agrees with the formula within the stated drawing tolerance.
  2. The sum curve and the phasor sum are computed from the same two components.
  3. Argument or illustration: the phasor construction is an **argument** (the vector sum of the drawn arrows has the drawn height); particular amplitudes are an **illustration**. The prose says "same frequency" explicitly.
  4. Reset, Preset (components only; time and playing are not stored), restore, both languages pass.

### WV2. Beats

- Learning goal: two sinusoids of nearby frequency add to a sinusoid at the mean frequency whose amplitude swells and fades at the difference frequency; the envelope is the product-to-sum identity.
- Prerequisites: WV1. Follow-up: `fourier-more`.
- Default example (*checked*): \(f_1=10\) Hz, \(f_2=12\) Hz, \(A=1\): difference \(2\) Hz, mean \(11\) Hz, envelope \(2|\cos(2\pi t)|\) with period \(0{,}5\) s; envelope \(2\) at \(t=0\) and \(0{,}5\), \(0\) at \(t=0{,}25\). The identity \(\cos 2\pi f_1t+\cos2\pi f_2t=2\cos\pi\Delta ft\,\cos\pi(f_1+f_2)t\) agrees to \(7\cdot10^{-14}\) on \(t\in[0,2]\). With \(f_2=11\) the beat period is \(1\) s.
- Steps: (1) two close waves; predict the sum; (2) play, hear-free picture: the sum swells and fades; (3) show the envelope; (4) change \(f_2\) and read the beat frequency; (5) predict the beat period for \(f_1=10,f_2=11\); (6) the identity; (7) free exploration.
- Graph needs: frequency fields (integer, step \(1\)), window of \(2\) s, envelope toggle, readouts of difference frequency, mean frequency, beat period; the curves are drawn at \(2048\) points per second of window, so the chord error is \((2\pi f/2048)^2/8\) of the amplitude: \(0{,}00188\) at \(40\) Hz and \(0{,}0118\) at \(100\) Hz (about a pixel on a 100 px amplitude and visibly polygonal beyond); the grid therefore stops at \(40\) Hz.
- Acceptance:
  1. Numbers agree with the formulas and with direct summation at \(10^{-12}\) relative.
  2. The envelope is drawn from `envelope`, not fitted to the sum.
  3. Argument or illustration: the identity step is an **argument** (it is exact); the particular frequencies are an **illustration**. The prose says plainly that the envelope and the beat have frequency \(\Delta f\) (period \(1/\Delta f\)), while the signed factor \(\cos(\pi\Delta f\,t)\) has \(\Delta f/2\) and the sign flips at the nodes.
  4. Reset, Preset, restore, both languages pass.

### WV3. Standing waves

- Learning goal: two equal waves travelling in opposite directions add to a pattern that does not travel: fixed nodes, antinodes that oscillate with the time factor \(\cos\omega t\).
- Prerequisites: WV1. Follow-up: none; link to Fourier modes of a string as optional prose.
- Default example (*checked*): \(k=\pi\), \(\omega=2\pi\) (wavelength \(2\), period \(1\)): \(\sin(kx-\omega t)+\sin(kx+\omega t)=2\sin kx\cos\omega t\) to \(1{,}1\cdot10^{-15}\) on a grid; nodes at \(x=0,1,2\); antinodes at \(0{,}5\) and \(1{,}5\) with amplitude \(2\); at \(t=\tfrac14\) the whole pattern is flat.
- Steps: (1) one wave moving right; (2) add one moving left; predict; (3) play; (4) mark the nodes; they never move; (5) change the wavelength and count the nodes; (6) free exploration.
- Graph needs: wavelength field (grid \(\lambda\in\{1,\tfrac43,2,4\}\) or integer \(n\) half-wavelengths \(1\ldots6\) on a fixed length \(L\)), time slider with Play, the two travelling waves in light colour and the sum in strong colour, node markers, readouts.
- Acceptance:
  1. Nodes are at \(x=nL/m\) computed from the integer half-wave count \(m\); the sum at a node is zero for every \(t\) within \(10^{-12}\).
  2. Argument or illustration: the sum identity is an **argument** (exact); the node positions are an **illustration**.
  3. Reset, Preset, restore, both languages pass.

### WV4. Sampling and aliasing (the wheel)

- Learning goal: if a rotation is observed only at instants \(n/f_s\), a fast rotation looks like a slower one, possibly backwards.
- Prerequisites: WV1. Follow-up: WV5.
- Default example (*checked*): a mark on a wheel turning \(f=23\) revolutions per second, filmed at \(f_s=24\) frames per second, appears to turn \(-1\) rev/s (backwards, \(1\) rev/s). \(f=25\) appears \(+1\). \(f=9\), \(f_s=12\): appears \(-3\) (magnitude \(3\)). \(f=13\), \(f_s=24\): \(-11\). \(f=5\), \(f_s=12\): \(5\) (no alias, \(2{,}4\) frames per revolution). \(f=6\), \(f_s=12\): ambiguous (exactly half the rate). The samples of \(\cos(2\pi\cdot23\,n/24+0{,}4)\) and of the reconstruction with \(-1\) Hz agree to \(7\cdot10^{-14}\).
- Steps: (1) a wheel turns slowly; the film shows it correctly; (2) speed it up; predict; (3) at the rate close to \(f_s\) the wheel seems to crawl backwards; (4) the strip of snapshots at \(n/f_s\) with the continuous wave behind; (5) the wave through the same dots with the alias frequency; (6) change \(f_s\); (7) free exploration.
- Graph needs: frequency and rate fields (integers), a continuous wheel (animated \(t\) is the true time), a strip of snapshot positions at the sampling instants, the wave on a time axis with dots, the alias readout "appears to turn \(f_a\) rev/s" with direction text, ambiguous status at \(2f=f_s\).
- Acceptance:
  1. Alias values come from `alias` (integer arithmetic); the readouts for the defaults above agree.
  2. The drawn continuous wave uses \(2048\) points per \(1\) s window; at \(f=40\) Hz that is \(51{,}2\) points per period and the chord error is at most \(0{,}00188\) of the amplitude (checked, below the pixel size), so the drawing does not alias; the screen states the resolution.
  3. The sampler is the strip of instants, not the animation frame rate (ADR 3).
  4. Argument or illustration: "the dots lie on both the fast wave and the alias wave" is an **argument** (both waves are evaluated at the same dots and agree); the wheel is an **illustration**.
  5. Reset, Preset, restore, both languages pass; a text status states the alias for readers without the picture.

### WV5. The Nyquist rate and reconstruction

- Learning goal: more than two samples per period determine a pure tone among the tones below \(f_s/2\); at or below that, several tones fit the dots; connecting dots by straight lines misrepresents the tone.
- Prerequisites: WV4.
- Default example (*checked*): \(f=5\) Hz at \(f_s=12\) Hz: \(2{,}4\) samples per period; linear interpolation misses the wave by up to \(0{,}7348\) of the amplitude at phase \(0{,}4\) (\(0{,}7183\) at phase \(0\)), maximum over the window \([0,1]\) s; the single-tone reconstruction is exact. At \(f_s=2f=12\) with \(f=6\) the direction and the amplitude are not determined: the samples are \(A\cos\varphi\,(1,-1,1,-1,\dots)\), so a sine phase (\(\varphi=\pi/2\)) gives all zeros (rounding residues) and the apparent amplitude is \(A\cos\varphi\) (\(0{,}9211A\) at \(\varphi=0{,}4\)); the rate \(2f\) is not enough. The truncated sinc interpolation of the same tone (\(f=5\), phase \(0{,}4\), \(f_s=12\)) uses the samples \(n=-E,\dots,f_s+E\), that is the \(f_s+1\) samples of the window \([0,1]\) s plus \(E\) extra samples on each side; its maximum error over the middle interval \(t\in[0{,}4;\,0{,}6]\) s is \(0{,}0253\) for \(E=12\), \(0{,}0086\) for \(E=48\) and \(0{,}0023\) for \(E=192\) (the truncation error falls slowly; sums of tones are not checked). (Corrected at F1, 2026-11-10: lost math markup restored, the linear-join maximum \(0{,}7347712\) rounded to \(0{,}7348\), and the sample range defined.)
- Steps: (1) dots of a tone; predict the tone; (2) join with lines; compare; (3) slide \(f_s\) down through \(2f\); (4) at exactly \(2f\) the dots depend on the phase; (5) the tone and its alias share the dots; (6) free exploration.
- Graph needs: fields for \(f\), \(f_s\), phase; toggles for dots, linear join, exact reconstruction, sinc approximation with a window field; error readout.
- Acceptance:
  1. Decision "above, at or below \(2f\)" is an exact integer comparison \(f_s>2f\), \(f_s=2f\), \(f_s<2f\).
  2. Linear interpolation error is measured on the drawn grid by comparing with the true tone; the sinc window and the displayed error are labelled approximate.
  3. Argument or illustration: "samples of \(\cos(2\pi ft+\varphi)\) and \(\cos(2\pi f_at+\varphi)\) coincide" is an **argument** by the periodicity of cosine; the error values are an **illustration**. The prose says "pure tone"; the general theorem is stated without proof.
  4. Reset, Preset, restore, both languages pass.

## User Stories

1. As a student, I add two waves and see the amplitude depend on the phase.
2. As a student, I see beats appear when two frequencies come close.
3. As a student, I make a wheel turn backwards by changing the frame rate.
4. As an educator, I project a standing wave and show that the nodes do not move.
5. As a reader on a phone or keyboard, I enter frequencies numerically and read the alias from a status line.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

Searched `src/localization/sl.ts`: *Amplituda*, *Faza*, *Perioda*, *Frekvenca* exist (`trig_amplitude_label`, `trig_phase_label`, `trig_period_readout`, `trig_omega_label`); no *utripanje*, *valovanje* or *vzorčenje* in the table (the word *vzorčenje* appears only in an unrelated remark about sampling points). No source beyond usage in school physics was opened.

| English | Slovenian proposal | Basis |
| --- | --- | --- |
| wave | valovanje (val) | standard school physics |
| superposition | seštevanje valovanj (superpozicija) | standard |
| beats | utripanje | standard |
| standing wave | stoječe valovanje | standard |
| node; antinode | vozel; hrbet | standard school physics |
| sampling; sampling rate | vzorčenje; frekvenca vzorčenja | standard |
| aliasing | pojav lažne frekvence (aliasing) | proposal; English gloss on first mention |
| Nyquist rate | Nyquistova frekvenca | standard |
| frequency, amplitude, phase, period | frekvenca, amplituda, faza, perioda | existing |

## Implementation Decisions

- The kernel is new pure TypeScript (`src/waves/`); `WavesGraph` adapts it. The existing trigonometric function graph and the Fourier graphs are not edited.
- Graph state: mode, components (integers and snapped amplitudes and phases), sampling rate and options. Time and the playing flag are host state, never in a Preset. Derived values are recomputed from validated state.
- Lesson scenes use typed actions (`set-mode`, `set-components`, `set-sampling`, `set-time`) through the lesson-action registry as in the [linear-maps spec](linear-maps-lessons.md#reuse-and-new-modules); multi-action scenes run synchronously in one tick and are unit tested that way.
- Routes and Presets are additive; no breaking change.
- **Gating** (boundary in [families-prep](../tasks/feature-streams/families-prep.md#boundary-with-the-controls-stream-owner-decision-2026-11-10)). Ungated now: this spec, F0 plan and ADR drafts, F1 kernel (`src/waves/` pure files and oracle tests). **Waits on Controls step 5:** F2a `WavesGraph` (animated time, steppers, step counters). **Waits on Controls step 7:** F2b registration and routes, F3 lessons, F4 chapter, F5 media. The spec plans no edits to `BaseGraph.tsx`, `GraphSession.ts`, `src/inputs/`, the lesson runtime or existing panels; shared play or stepper controls are a dependency on the Controls stream.
- Lesson text is one-shot ([rule](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31)); prose follows `lessonMathNotation.test.ts`.
- **Handler decision, reversible.** Frequencies are integers (ADR 2) so that aliasing is exact; a non-integer frequency would need a tolerance and is deferred.

## Testing Decisions

- Kernel oracles: phasor sum against numeric maximum of the sampled sum; beat identity against direct addition; standing wave against direct addition on a grid; `alias` against brute force (find the smallest \(|g|\) in \((-f_s/2,f_s/2]\) with \(f-g\) a multiple of \(f_s\)) over the whole grid \(f\in1..40\), \(f_s\in2..64\); sample equality of a tone and its reconstruction at \(10^{-12}\); linear interpolation and sinc errors against the true tone.
- Edge tests: \(2f=f_s\) (ambiguous), \(f\) a multiple of \(f_s\) (alias \(0\), standstill, said as "appears at rest"), \(f<f_s/2\), \(f_s=2\), zero amplitude, phase at \(\pm\pi\).
- Scene, Preset (save/reopen, export/import, malformed or out-of-range input), lesson/content tests as in the other families.
- Browser: smoke row per lesson (default scene, play and pause, numeric entry, ambiguous case, restore, catalog link, narrow viewport, keyboard, reduced motion).
- Performance: playing redraws up to two waves and a sum at \(2048\) points; measure per [the performance plan](../performance-plan.md).

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contracts are met with checked examples; discrete decisions are exact integer tests and the drawing resolution is stated on screen.
3. Both languages, accessible numeric inputs, restore on exit, Presets and figure export pass; check legibility in Presentation mode and with reduced motion.
4. Existing routes, Presets, the trigonometric and Fourier lessons behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass.

## Correctness Notes

- Alias and the Nyquist decision are exact on the integer grid; amplitudes, phases and reconstructions are computed doubles and labelled so.
- At \(f_s=2f\) the alias is ambiguous (samples depend on phase) and is reported as such, not as a frequency.
- A pure tone is the only case with an exact reconstruction; for sums the sinc interpolation is truncated and its error shown.
- The drawing is itself a sampling at \(2048\) points per second: the chord error \((2\pi f/2048)^2/8\) of the amplitude is \(0{,}00188\) at \(40\) Hz. The grid never reaches a frequency where the drawing aliases.
- The phase of an alias flips with the sign of the alias frequency (\(\cos\) even, \(\sin\) odd); the reconstruction keeps \(\varphi\) and uses the signed alias.
- Pictures illustrate instances; every "always" statement is a theorem or an explicit argument.

## Out of Scope

- Sound output and audio files, the discrete Fourier transform and spectra, filters, quantization.
- Dispersion, the wave equation, two- and three-dimensional waves, Doppler.
- Exercises, grading, progress, free-text input, a formula parser.
- Changing the trigonometric function graph, the Fourier graphs or the epicycle graph.
- Renderer replacement or build-tool changes.

## Further Notes

The aliasing lesson is the one most sensitive to drawing and frame rate: keep the strip of snapshots and the stated resolution, and do not claim the animation shows a real film frame rate. Sampling is enrichment beyond the matura; WV1–WV3 sit on §4.10.9.
