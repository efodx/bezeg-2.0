'use strict';
module.exports = [
    {
        id: 'prob-density',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Povprečje μ', step: 0.1},
        // The poster is N(0; 1) with a = -1 and b = 1 (DEFAULT_DENSITY_AREA_MODEL). Dragging the bounds snaps to 0.01 and cannot follow a schedule, so the mean slider moves the bell to mu = -2.5 and back (the quote names mu = -1); sigma and the bounds stay put and the bell stays inside the recipe camera.
        path: [0, -2.5, 0],
        lessonQuote: 'Z drsnikoma spremeni \\(\\mu\\) in \\(\\sigma\\), na primer \\(\\mu=-1\\), \\(\\sigma=0{,}85\\) z mejama \\(-1{,}85\\) in \\(-0{,}15\\): krivulja je ožja in višja, delež je spet \\(68{,}27\\ \\%\\).',
        discreteReason: null,
    },
    {
        id: 'prob-binomial-normal',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Verjetnost uspeha p', step: 0.01},
        // The poster is B(20; 1/2) with k = 8 (DEFAULT_BINOMIAL_NORMAL_MODEL). The k point moves in whole steps and cannot be dragged smoothly, so p goes up to 0.72, down to 0.28 and back to 0.5; the pmf peak stays below the recipe camera's 0.2.
        path: [0.5, 0.72, 0.28, 0.5],
        lessonQuote: 'Poskusi \\(p=0{,}9\\): stolpci so zrcalna slika primera s \\(p=0{,}1\\).',
        discreteReason: null,
    },
    {
        id: 'prob-clt',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Višina 1 (pri x = 0)', step: 0.05},
        // The poster is the skewed example at n = 3 (recipe); the skewed heights are 2, 1.5, 1, 0.5, 0 (cltModel). The first height rises to 5 and back, which reshapes the standardized sum.
        path: [2, 5, 2],
        lessonQuote: 'Povleci drsnike višin osnovne gostote: oblika se normira in vsota pri istem \\(n\\) se izračuna znova.',
        discreteReason: null,
    },
    {
        id: 'prob-correlation',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Točka 4, y', step: 0.1},
        // The poster is the outlier example (recipe), whose fourth point is (3, 8) (correlationModel). A drag snaps to tenths and cannot follow a schedule, so the field moves y down to 4 (the point's value in the default example) and back, inside the recipe camera.
        path: [8, 4, 8],
        lessonQuote: 'Povleci to točko sam in opazuj, kako se premakneta \\(r\\) in premica.',
        discreteReason: null,
    },
    {
        id: 'prob-summary',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Vrednost 7', step: 0.1},
        // The poster is the default data 4, 5, 5, 6, 6, 7, 8 (DEFAULT_SUMMARY_MODEL), so value 7 is 8. A drag snaps to tenths and cannot follow a schedule, so the field moves it to 10.8 (inside the recipe camera, which ends at 11) and back; no value crosses another, so the median stays and the mean moves.
        path: [8, 10.8, 8],
        lessonQuote: 'Povleci to piko sam in opazuj trikotnik in kvadrat.',
        discreteReason: null,
    },
];
