import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of each Convexity and hulls lesson (A1 to A6), keyed by example id. */
export const convexityPreviewCopy = {
    'convexity-hulls.orientation.orientation': copy(
        'Točki \\(p=(0,0)\\) in \\(q=(4,0)\\) ter črtkana premica \\(pq\\) skozi njiju; tretje točke ni.',
        'The points \\(p=(0,0)\\) and \\(q=(4,0)\\) and the dashed line \\(pq\\) through them; there is no third point.',
        'Premica \\(pq\\) loči ravnino na dve strani; tretje točke \\(r\\) še ni, zato zavoj še ni določen.',
        'The line \\(pq\\) splits the plane into two sides; there is no third point \\(r\\) yet, so no turn is determined.',
    ),
    'convexity-hulls.polygon-area.polygon-area': copy(
        'Petkotnik z oglišči \\((-1,3)\\), \\((0,0)\\), \\((4,0)\\), \\((5,3)\\), \\((2,5)\\) in dve diagonali iz prvega oglišča \\((-1,3)\\), med katerima so obarvani trikotniki.',
        'The pentagon with the vertices \\((-1,3)\\), \\((0,0)\\), \\((4,0)\\), \\((5,3)\\), \\((2,5)\\) and two diagonals from the first vertex \\((-1,3)\\), with shaded triangles between them.',
        'Petkotnik je razrezan na trikotnike iz prvega oglišča; vsakemu pripada dvojna predznačena ploščina \\(D\\), vrednosti pa še niso izpisane.',
        'The pentagon is cut into triangles from its first vertex; each has a doubled signed area \\(D\\), but the values are not shown yet.',
    ),
    'convexity-hulls.point-in-polygon.point-in-polygon': copy(
        'Petkotnik z zarezo z oglišči \\((0,0)\\), \\((6,0)\\), \\((6,4)\\), \\((3,2)\\), \\((0,4)\\) in točka \\(q=(3,1)\\) pod zarezo.',
        'The notched pentagon with the vertices \\((0,0)\\), \\((6,0)\\), \\((6,4)\\), \\((3,2)\\), \\((0,4)\\) and the point \\(q=(3,1)\\) below the notch.',
        'Točko \\(q\\) lahko premikaš po grafu; poltraka iz \\(q\\) in štetja presečišč še ni.',
        'The point \\(q\\) can be dragged on the graph; the ray from \\(q\\) and the crossing count are not shown yet.',
    ),
    'convexity-hulls.convex-hull.convex-hull': copy(
        'Devet točk in dve črtkani daljici iz točke \\((2,2)\\): do točke \\((4,0)\\) in do točke \\((0,0)\\).',
        'Nine points and two dashed segments from the point \\((2,2)\\): to the point \\((4,0)\\) and to the point \\((0,0)\\).',
        'Počasen preizkus robov je pri prvem urejenem paru točk; sprejetih robov in ovojnice še ni.',
        'The slow edge test is at its first ordered pair of points; there are no accepted edges and no hull yet.',
    ),
    'convexity-hulls.hull-robustness.hull-robustness': copy(
        'Tri kolinearne točke \\((0,0)\\), \\((2,0)\\) in \\((4,0)\\) na osi \\(x\\) z obema verigama in obrisom ovojnice.',
        'The three collinear points \\((0,0)\\), \\((2,0)\\) and \\((4,0)\\) on the \\(x\\)-axis, with both chains and the outline of the hull.',
        'Monotona veriga s pravilom \\(<\\) je končala delo na treh točkah z \\(D=0\\); na grafu sta verigi in izpisana ovojnica.',
        'The monotone chain with the rule \\(<\\) has finished on three points with \\(D=0\\); the graph shows the chains and the output hull.',
    ),
    'convexity-hulls.bezier-hulls.bezier-hulls': copy(
        'Kvadratni Bézierjevi krivulji \\(A\\) (polna črta) s kontrolnimi točkami \\((0,0)\\), \\((2,4)\\), \\((4,0)\\) in \\(B\\) (črtkana črta) s kontrolnimi točkami \\((0,3)\\), \\((2,-1)\\), \\((4,3)\\), vsaka s kontrolnim poligonom in ovojnico kontrolnih točk.',
        'The quadratic Bézier curves \\(A\\) (solid) with control points \\((0,0)\\), \\((2,4)\\), \\((4,0)\\) and \\(B\\) (dashed) with \\((0,3)\\), \\((2,-1)\\), \\((4,3)\\), each with its control polygon and the hull of its control points.',
        'Prikazani sta celotni ovojnici kontrolnih točk obeh krivulj; razpolavljanja na manjše kose še ni.',
        'The whole hulls of the control points of both curves are shown; the halving into smaller pieces has not started.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
