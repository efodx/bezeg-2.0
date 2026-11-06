import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of each Triangulations and Voronoi lesson, keyed by example id. */
export const triangulationPreviewCopy = {
    'triangulations-voronoi.ear-clipping.ear-clipping': copy(
        'Petkotnik z oglišči \\((0,0)\\), \\((6,0)\\), \\((6,4)\\), \\((3,2)\\), \\((0,4)\\); vbočeno je oglišče \\((3,2)\\).',
        'The pentagon with the vertices \\((0,0)\\), \\((6,0)\\), \\((6,4)\\), \\((3,2)\\), \\((0,4)\\); the vertex \\((3,2)\\) is the reflex one.',
        'Večkotnik z enim vbočenim ogliščem je še cel; nobeno uho ni odrezano in triangulacije še ni.',
        'The polygon with one reflex vertex is still whole; no ear has been cut and there is no triangulation yet.',
    ),
    'triangulations-voronoi.point-set-triangulation.point-set-triangulation': copy(
        'Sedem točk \\((0,0)\\), \\((8,0)\\), \\((9,6)\\), \\((4,8)\\), \\((-1,5)\\), \\((3,3)\\) in \\((6,3)\\) brez narisanih robov.',
        'Seven points \\((0,0)\\), \\((8,0)\\), \\((9,6)\\), \\((4,8)\\), \\((-1,5)\\), \\((3,3)\\) and \\((6,3)\\) with no edges drawn.',
        'Množica sedmih točk, ki jo bomo razrezali na trikotnike; robovi triangulacije so skriti.',
        'A set of seven points to be cut into triangles; the edges of the triangulation are hidden.',
    ),
    'triangulations-voronoi.delaunay.delaunay': copy(
        'Štiri točke \\((0,0)\\), \\((4,0)\\), \\((5,3)\\), \\((0,2)\\) s triangulacijo iz petih robov; diagonala od \\((0,0)\\) do \\((5,3)\\) je črtkana z oznako neustrezen rob.',
        'Four points \\((0,0)\\), \\((4,0)\\), \\((5,3)\\), \\((0,2)\\) with a triangulation of five edges; the diagonal from \\((0,0)\\) to \\((5,3)\\) is dashed and labelled as an illegal edge.',
        'Štirikotnik je razrezan na dva trikotnika z diagonalo od točke \\((0,0)\\) do točke \\((5,3)\\), ki je označena kot neustrezen rob; zamenjave roba še ni.',
        'The quadrilateral is cut into two triangles by the diagonal from the point \\((0,0)\\) to the point \\((5,3)\\), which is marked as an illegal edge; the edge has not been flipped yet.',
    ),
    'triangulations-voronoi.voronoi.voronoi': copy(
        'Sedem mest \\((0,0)\\), \\((8,0)\\), \\((9,6)\\), \\((4,8)\\), \\((-1,5)\\), \\((3,3)\\) in \\((6,3)\\) ter točka poizvedbe v obliki kvadrata \\((-2,1)\\); diagrama ni.',
        'Seven sites \\((0,0)\\), \\((8,0)\\), \\((9,6)\\), \\((4,8)\\), \\((-1,5)\\), \\((3,3)\\) and \\((6,3)\\) and a square query point \\((-2,1)\\); no diagram is drawn.',
        'Sedem mest in točka poizvedbe, ki jo lahko premikaš; celic in simetral še ni.',
        'Seven sites and a query point that can be dragged; no cells or bisectors are shown yet.',
    ),
    'triangulations-voronoi.voronoi-degenerate.voronoi-degenerate': copy(
        'Štiri mesta \\((5,0)\\), \\((3,4)\\), \\((-4,3)\\), \\((1,-5)\\) in točka poizvedbe v obliki kvadrata \\((4,2)\\); diagrama in triangulacije ni.',
        'Four sites \\((5,0)\\), \\((3,4)\\), \\((-4,3)\\), \\((1,-5)\\) and a square query point \\((4,2)\\); no diagram or triangulation is drawn.',
        'Štiri mesta, ki ležijo skoraj na isti krožnici; diagram in Delaunayeva triangulacija sta skrita.',
        'Four sites lying close to one circle; the diagram and the Delaunay triangulation are hidden.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
