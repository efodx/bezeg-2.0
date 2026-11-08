'use strict';
module.exports = [
    {
        id: 'quadrature',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Spodnja meja a', step: 0.01},
        // Start a = 0 (route default; the recipe sets nothing). n is an integer slider (1..150, step 1) with no stepper, and b starts at pi but is rounded to 0.01, so the lower bound a moves.
        path: [0, 0.75, 1.5, 0.75, 0],
        lessonQuote: 'Zamenjaj funkcijo, premakni meji, spremeni \\(n\\) in pravilo ter opazuj razmerje napak.',
        discreteReason: null,
    },
    {
        id: 'euler-method',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Začetni y₀', step: 0.01},
        // Start y0 = 1 (DEFAULT_EULER_MODEL in eulerModel.ts:33, x0 = 0, step 0.5, end x = 1); y0 goes down so the exact curve and the polyline stay under the camera top (3); 0.2 and 0.6 left it at the bottom, 0.8 gave too few distinct frames, so it stops at 0.5.
        path: [1, 0.75, 0.5, 0.75, 1],
        lessonQuote: 'Povleci začetno točko in opazuj, kako se spremenita lomljenka ter napaka.',
        discreteReason: null,
    },
    {
        id: 'fourier-series',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Točka x', step: 0.01},
        // Start x = 0.5 (DEFAULT_FOURIER_SERIES_MODEL in fourierSeriesModel.ts:42, N = 11, epsilon 0.1; the recipe sets nothing). N is an integer stepper, so x moves; the lesson's N half is not done.
        path: [0.5, 1.75, 3, 1.75, 0.5],
        lessonQuote: 'Povleci \\(x\\) in \\(N\\) in napovej napako pri \\(N=1001\\), preden jo preveriš.',
        discreteReason: null,
    },
    {
        id: 'epicycles',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Čas t (del obhoda)', step: 0.01},
        // The poster is the rhombus example at N = 8 (the recipe adds three Povečaj N za 1 presses). The vertex fields are hidden in the poster scene, an N sweep fails (a whole-number slider gives too few distinct frames below a 25 range and a pixel jump above it), so the time slider t carries the tip once half way round the trace and back: the learner can see where the tip leaves the rhombus loop.
        path: [0, 3.14, 0],
        lessonQuote: 'Poišči mesto, kjer se sled in zanka najbolj razhajata, in oceni, ali je razlika vidna.',
        discreteReason: null,
    },
    // fourier-coefficients: unresolved. The poster is the default |x| layout, whose handle fields ("Vrednost f pri x = 0", 0 -> 1 -> 0, quote "Povleci konico gor in dol (ali uporabi tipki ↑ in ↓) in opazuj stolpce \(a_1\) in \(a_3\).") do not exist in the route probe, which was taken on the jump layout, so _check.cjs would fail; a canvas drag snaps to 0.05 on unnamed handles.
];
