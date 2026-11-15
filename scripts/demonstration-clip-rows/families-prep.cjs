'use strict';
// Families-prep Demonstrations (F5 batch 1). Each poster is the opening scene of the lesson that gives the quote; the motion is one control of the route, out and back.
module.exports = [
    {
        id: 'unit-circle',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Kot θ (°)', step: 1},
        // The poster scene is the angle 0 of the radian lesson. The angle goes round to 270 degrees (three quadrants) and back.
        path: [0, 135, 270, 135, 0],
        lessonQuote: 'Nastavi kot z drsnikom ali ga povleci po krožnici',
        discreteReason: null,
    },
    {
        id: 'circle-construction',
        motion: 'discrete-exact-steps',
        control: {kind: 'number-field', label: 'P, x', step: -1},
        // The poster scene is the tangents mode with the circle of radius 5 at the origin and P = (13, 0). The point P has no name on the board, so the row moves its abscissa field:
        // P goes 13, 11, 9, 7, 5 (on the circle) and 3 (inside, no tangent), then back to 13, which is the lesson's drag of P across the circle.
        path: [0, 2, 4, 6, 8, 10, 0],
        lessonQuote: 'Povleci točko \\(P\\) čez krožnico in napovej, koliko tangent gre skozi njo',
        discreteReason: 'The abscissa field of P holds whole numbers (a typed 12.8 reads back 13) and P has no name on the board to drag, so each checkpoint types the next whole abscissa.',
    },
    {
        id: 'recursion-growth',
        motion: 'discrete-exact-steps',
        control: {kind: 'number-field', label: 'Razlika d', step: 1},
        // The poster scene is the arithmetic sequence a1 = 3, d = 2 (six bars). The difference rises to 6 in whole steps and returns to 2; the window holds a6 up to 33.
        path: [0, 1, 2, 3, 4, 2, 0],
        lessonQuote: 'Nastavi aritmetično zaporedje s prvim členom \\(3\\) in razliko \\(2\\), napovej deseti člen in vsoto prvih desetih členov ter ju primerjaj z odčitkom.',
        discreteReason: 'The common difference is a whole number (the slider steps by 1 from -20 to 20), so a sweep from 2 to 6 has only five distinct bar pictures; each checkpoint types the next whole value.',
    },
    {
        id: 'logistic-map',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Parameter r', step: 0.01},
        // The poster scene is r = 2.9. The lesson raises r to 3 and 3.1; the sweep goes to 3.1 and back (a wider path moves the caption text over a quarter of the frame).
        path: [2.9, 3, 3.1, 3, 2.9],
        lessonQuote: 'Nato povečaj \\(r\\) na \\(3\\), \\(3{,}1\\) in \\(3{,}5\\)',
        discreteReason: null,
    },
    {
        id: 'lattice-paths',
        motion: 'discrete-exact-steps',
        control: {kind: 'number-field', label: 'Izbrana pot (številka)', step: 1},
        // The poster scene is the target (2, 2) with route 1 selected; the six routes are shown one after the other.
        path: [0, 1, 2, 3, 4, 5, 0],
        lessonQuote: 'nato povleci cilj in preveri, da je število poti simetrično',
        discreteReason: 'The selected route is a whole number from 1 to 6 (six routes to the target), so a sweep has only six distinct pictures; each checkpoint types the next route number.',
    },
    {
        id: 'waves',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Faza 2. vala v stopinjah', step: 5},
        // The poster scene has two equal waves of amplitude 1 at 3 Hz, the second with the phase 120. The phase goes to 0 (in phase) and to 180 (opposite phase), the lesson's range, and back.
        path: [120, 0, 120, 180, 120],
        lessonQuote: 'Nastavi dva vala z enakima amplitudama in frekvencama ter spreminjaj fazo drugega vala',
        discreteReason: null,
    },
    {
        id: 'counting-tree',
        motion: 'discrete-exact-steps',
        control: {kind: 'number-field', label: 'Število predmetov n', step: 1},
        // The poster scene is the tree of the ordered choices of k = 2 out of n = 3. The number of objects n goes up to 5 and back, so the tree grows from 6 to 20 leaves.
        path: [0, 1, 2, 1, 0],
        lessonQuote: 'Spreminjaj \\(n\\) in \\(k\\) ter stikali za vrstni red in ponavljanje',
        discreteReason: 'The number of objects n is a whole count in a count setter with plus and minus buttons, so a sweep has only the values 3, 4 and 5; each checkpoint types the next whole n.',
    },
    {
        id: 'linear-program',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Vrednost k premice cilja', step: 1},
        // The poster scene is the default region. The line of the objective slides to the largest value of k (the optimum vertex) and back.
        path: [9, 15, 9, -1, 9],
        lessonQuote: 'Premakni premico cilja, dokler je ne ujameš v enem samem oglišču',
        discreteReason: null,
    },
];
