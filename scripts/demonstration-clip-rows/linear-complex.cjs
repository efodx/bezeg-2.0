'use strict';
module.exports = [
    {
        id: 'complex-reciprocal',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'z, Re', step: 0.05},
        // The recipe selects the "inside" example, z = 0.5 + 0.5i, and shows 1/z. Re z from 0.5 to 2 takes z across the unit circle at about 0.87; z = 2 + 0.5i and 1/z stay inside the recipe camera.
        path: [0.5, 2, 0.5],
        lessonQuote: 'Povleci \\(z\\) čez krožnico in opazuj, na kateri strani je \\(1/z\\).',
        discreteReason: null,
    },
    {
        id: 'complex-roots',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'w, Re', step: 0.05},
        // The recipe selects w = 2i, n = 3, with the roots and the polygon shown. With Im w = 2 kept, Re w from 0 to 2 turns arg w from 90 to 45 degrees; w and the roots (radius at most about 1.41) stay inside the recipe camera.
        path: [0, 2, 0],
        lessonQuote: 'Povleci \\(w\\) in opazuj, kako se zavrti pravilni \\(n\\)-kotnik.',
        discreteReason: null,
    },
    {
        id: 'linear-map',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'a₁: x', step: 0.25},
        // The recipe selects example A ("basis-default"): the column handles start at a1 = (2, 1) and a2 = (-1, 1) (recipe check). Entries are multiples of 1/4 between -4 and 4; with a1 = (x, 1) the determinant is x + 1 and the handle stays inside the recipe camera (x from -1.6) for x from -1.5 to 4. A pointer drag on the handle fails the state check (it snaps to the 1/4 grid).
        path: [2, 4, -1.5, 2],
        lessonQuote: 'Povleci \\(a_1\\) drugam in preberi nov \\(A(1,1)\\).',
        discreteReason: null,
    },
];
