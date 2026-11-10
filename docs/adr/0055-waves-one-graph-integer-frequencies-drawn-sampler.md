# Waves: one mode-based graph, integer frequencies, a drawn sampler independent of the frame rate

Accepted on 2026-11-10 (F0 of the [waves spec](../specs/waves-sampling-lessons.md), stream `families-prep`). It records the spec's three ADR decisions.

## 1. One `WavesGraph` with modes

One graph, `src/graphs/functions/WavesGraph.tsx`, has the modes `sum | beats | standing | sampling`. It is placed beside `/functions/trigonometric`. Time and the playing flag are host state and never enter a Preset, as in `EpicycleGraph`.

Alternatives:

- One graph per lesson. This duplicates the time and trace code.
- Extending the trigonometric function graph. This changes an existing route and its stored Presets.

## 2. Integer frequencies and sampling rates

Frequencies are \(f\in\{1,\dots,40\}\) Hz and sampling rates \(f_s\in\{2,\dots,64\}\) Hz. `alias(f, fs)` is then exact integer arithmetic:

- \(r=f\bmod f_s\);
- the result is `ambiguous` when \(2r=f_s\);
- otherwise the signed alias is \(r\) or \(r-f_s\).

The beat frequency \(|f_1-f_2|\) is an exact integer. The continuous wave is drawn at 2048 points per 1 s window. Non-integer frequencies would need a tolerance, so they are deferred.

Alternatives:

- Real frequencies with a tolerance. Whether a frequency aliases would then depend on \(\varepsilon\).
- Frequencies as ratios of the sampling rate. This hides the hertz values that WV4 and WV5 are about.

## 3. The sampler is a drawn strip of instants

The animation parameter \(t\) is continuous. The sampler is a drawn strip of the instants \(n/f_s\), computed from \(n\), and is never the browser's frame rate. Otherwise the screen refresh would alias the picture by itself, and what the lesson shows would depend on the machine.

Alternatives:

- Letting the frame rate act as the sampler. The result is machine-dependent and cannot be reproduced.

## Consequences

- Additive only. The trigonometric function graph, the Fourier graphs and their Presets are unchanged.
- The pure kernel lives in `src/waves/`.
- F2a needs animated time and steppers, so it waits on Controls step 5.
