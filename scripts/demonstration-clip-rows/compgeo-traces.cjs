'use strict';
// Compgeo algorithm traces: the Next step button is pressed to each checkpoint's cumulative count on a fresh poster scene and the
// step is read back from the page's "Korak N od M" text (control.kind trace-step, see README.md).
module.exports = [
    {id: "convex-hull", motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}, path: [0,2,4,6,0],
        lessonQuote: "Pritiskaj Naslednji korak in opazuj, kako kandidat potuje med točkami.",
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
    {id: "bezier-hulls", motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}, path: [0,1,2,0],
        lessonQuote: "Pritiskaj Naslednji korak in opazuj ovojnice odsekov; premakni kontrolno točko tako, da se krivulji ne sekata več, in poišči globino, pri kateri izgine zadnji par.",
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
    {id: "delaunay", motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}, path: [0,1,2,0],
        lessonQuote: "Pritisni Naslednji korak, dokler se algoritem ne konča, in preberi število zamenjav ter najmanjši kot.",
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
    {id: "interval-sweep", motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}, path: [0,2,4,6,0],
        lessonQuote: "Pritiskaj Naslednji korak in pri vsakem dogodku povej, ali stanje naraste ali se skrči.",
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
    {id: "segment-intersections", motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1},
        // Poster step 25 of 47. The sweep line stays at y = 2 for steps 25-30, y = 1 for 31-38, y = 0 for 39-42 and y = -1 for 43-47, so each checkpoint shows a new event: the swap at (3,2), the crossings at y = 1 left and right, then the lower endpoints.
        path: [0,6,10,14,18,0],
        lessonQuote: "Primerjaj vrstni red daljic v stanju pred zamenjavo in po njej.",
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
    {id: "monotone-partition", motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}, path: [0,2,4,6,0],
        lessonQuote: "Pritiskaj Naslednji korak in pri vsakem obdelanem oglišču preberi vrsto in razlog v izpisu.",
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
    {id: "monotone-triangulation", motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}, path: [0,2,5,7,9,0],
        lessonQuote: "Premikaj oglišča večkotnika \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) po mreži in pritiskaj Naslednji korak.",
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
    {id: "fortune",
        // Poster step 5 of 8 (the false alarm); steps 6 and 7 are the two true circle events that make the Voronoi vertices, step 8 the end.
        motion: 'discrete-exact-steps', control: {kind: 'trace-step', label: 'Naslednji korak', step: 1}, path: [0,1,2,3,0],
        lessonQuote: "Preberi višino pometalne premice, obalno črto in število oglišč; primerjaj z vrednostmi, ki jih pove besedilo.",
        offCamera: {points: ['fortune-breakpoint'], reason: 'Beach-line breakpoints run along Voronoi edges, which reach infinity; between wide arcs a breakpoint lies far outside the board already in the poster scene.'},
        discreteReason: "The trace has no value input and every edit to the graph restarts it at step 1, so a pointer drag or slider cannot hold a later step; only the Next step button reaches it."},
];
