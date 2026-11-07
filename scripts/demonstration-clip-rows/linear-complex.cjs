'use strict';
module.exports = [
    {
        id: 'complex-reciprocal',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Re z', step: 0.05},
        // The recipe selects the "inside" example, z = 0.5 + 0.5i, and shows 1/z. Re z from 0.5 to 2 takes z across the unit circle at about 0.87; z = 2 + 0.5i and 1/z stay inside the recipe camera.
        path: [0.5, 2, 0.5],
        lessonQuote: 'Povleci \\(z\\) čez krožnico in opazuj, na kateri strani je \\(1/z\\).',
        discreteReason: null,
    },
    {
        id: 'complex-roots',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Re w', step: 0.05},
        // The recipe selects w = 2i, n = 3, with the roots and the polygon shown. With Im w = 2 kept, Re w from 0 to 2 turns arg w from 90 to 45 degrees; w and the roots (radius at most about 1.41) stay inside the recipe camera.
        path: [0, 2, 0],
        lessonQuote: 'Povleci \\(w\\) in opazuj, kako se zavrti pravilni \\(n\\)-kotnik.',
        discreteReason: null,
    },
];
