'use strict';
module.exports = [
    {
        id: 'function-transformation',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Vodoravni premik c', step: 0.1},
        // The poster scene has c = 3 (the capture reads it). The quote compares the shift's direction with the sign in x-c, so c runs from 3 through 0 to -1 and back, inside the camera (x from -6 to 12).
        path: [3, 1, -1, 1, 3],
        lessonQuote: 'Primerjaj smer prenosa s predznakom v \\(x-c\\).',
        discreteReason: null,
    },
    {
        id: 'function-inverse',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Točka P: abscisa x₀', step: 0.1},
        // The poster scene is x^2 on x>=0 with P=(2,4). The field moves P along the parabola (the lesson's P drag); x0 stays inside 0..2.8 and off 0, where the mirrored tangent has no slope.
        path: [2, 0.2, 2, 2.7, 2],
        lessonQuote: 'Povleci \\(P\\), zamenjaj omejitev, premakni osnovo in vsakič preveri, da sta koordinati zrcalne točke zamenjani in da je zmnožek smernih koeficientov \\(1\\).',
        discreteReason: null,
    },
    {
        id: 'polynomial-zeros',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Ničla 1: položaj x', step: 0.1},
        // The poster scene is (x+2)(x-1)^2. The simple zero -2 goes left to -3.5, back, right to -0.5 (below the double zero 1, so no merge) and back; zeros lie on a 0.1 grid.
        path: [-2, -3.5, -2, -0.5, -2],
        lessonQuote: 'Povleci enojno ničlo in preveri, da graf vedno seka os \\(x\\) v njej.',
        discreteReason: null,
    },
];
