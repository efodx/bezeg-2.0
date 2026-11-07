'use strict';
module.exports = [
    {
        id: 'projective-pole-polar',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Točka P: y', step: 0.2},
        // The poster keeps the default P = (1, 4.2) outside the ellipse 9x^2 + 25y^2 = 225. At x = 1 the conic is crossed at y = 2.94, so P moves onto the conic and inside it, as the prompt says. The polar of (1, y0) is y = 9(1 - x/25)/y0, so P stops at y0 = 1 inside, where the polar is still on camera (at -0.4 it left the picture), then rises to 5.8 for 24 distinct values on the field's 1/5 grid.
        path: [4.2, 1, 4.2, 5.8, 4.2],
        lessonQuote: 'Premakni \\(P\\) na stožnico in znotraj nje ter opazuj, kaj se zgodi s polaro.',
        discreteReason: null,
    },
    {
        id: 'projective-five-point',
        motion: 'parameter-sweep',
        control: {kind: 'number', label: 'Točka E: x', step: 0.2},
        // The poster keeps the five default points A = (5, 0), B = (0, 3), C = (-5, 0), D = (4, 1.8), E = (-3, 2.4) on the ellipse. E moves right along y = 2.4 to (2, 2.4), where B, D and E are collinear (the line through B and D has slope -0.3), as the prompt asks, and back (handler 5). The derived points of the highlighted arc stay inside the recipe camera (preflight). Moving A or B flings P1 out of the camera.
        path: [-3, 2, -3],
        lessonQuote: 'Premakni točke tako, da so tri kolinearne, nato štiri, in preberi stanje.',
        discreteReason: null,
    },
    {
        id: 'projective-three-views',
        motion: 'parameter-sweep',
        control: {kind: 'slider', label: 'Višina premice L (c, v desetinkah)', step: 1},
        // The poster keeps the default c = 2 (slider 20 tenths): the line L misses the circle. Sliding to -0.4 (slider -4) passes the touching c = 1 and crosses the circle; the slider's integer step is a tenth of c.
        path: [20, -4, 20],
        lessonQuote: 'Napovej vrsto slike krožnice, ko je premica \\(L\\) zunaj nje, nato jo drsi do dotika in čez.',
        discreteReason: null,
    },
];
