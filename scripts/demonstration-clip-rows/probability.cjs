'use strict';
module.exports = [
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
];
