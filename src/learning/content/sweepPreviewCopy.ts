import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of each Sweep algorithms lesson, keyed by example id. */
export const sweepPreviewCopy = {
    'sweep-algorithms.interval-sweep.interval-sweep': copy(
        'Pet intervalov \\(a=[0,4]\\), \\(b=[2,7]\\), \\(c=[3,5]\\), \\(d=[6,9]\\), \\(e=[8,10]\\), vsak v svoji vrstici z oznako od \\(a\\) do \\(e\\), črtkana modra črta vzdolž \\(a\\) in pometalna premica pri \\(x=0\\).',
        'Five intervals \\(a=[0,4]\\), \\(b=[2,7]\\), \\(c=[3,5]\\), \\(d=[6,9]\\), \\(e=[8,10]\\), each in its own row and labelled \\(a\\) to \\(e\\), a dashed blue line along \\(a\\) and the sweep line at \\(x=0\\).',
        'Pet intervalov v ločenih vrsticah; pometalna premica je na začetku, odprtih intervalov še ni.',
        'Five intervals in separate rows; the sweep line is at the start and no interval is open yet.',
    ),
    'sweep-algorithms.segment-intersections.segment-intersections': copy(
        'Štiri daljice: \\(s_1\\) od \\((0,0)\\) do \\((6,4)\\), \\(s_2\\) od \\((0,4)\\) do \\((6,0)\\), \\(s_3\\) od \\((1,-1)\\) do \\((2,5)\\) in \\(s_4\\) od \\((4,5)\\) do \\((5,-1)\\); oznaki \\(s_1\\) in \\(s_2\\) se na sredini prekrivata.',
        'Four segments: \\(s_1\\) from \\((0,0)\\) to \\((6,4)\\), \\(s_2\\) from \\((0,4)\\) to \\((6,0)\\), \\(s_3\\) from \\((1,-1)\\) to \\((2,5)\\) and \\(s_4\\) from \\((4,5)\\) to \\((5,-1)\\); the labels \\(s_1\\) and \\(s_2\\) overlap at the middle.',
        'Štiri daljice, ki jih bo pometalna premica obdelala od zgoraj navzdol; sled je še na začetku.',
        'Four segments that the sweep line will process from top to bottom; the trace is still at the start.',
    ),
    'sweep-algorithms.monotone-partition.monotone-partition': copy(
        'Večkotnik z oglišči \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) in vodoravna pometalna premica nad njim.',
        'The polygon with the vertices \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\) and a horizontal sweep line above it.',
        'Večkotnik je še cel; pometalna premica je nad njim, diagonal še ni.',
        'The polygon is still whole; the sweep line is above it and there are no diagonals yet.',
    ),
    'sweep-algorithms.monotone-triangulation.monotone-triangulation': copy(
        'Večkotnik z oglišči \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\), z zelenimi preostalimi robovi in črtkano modro diagonalo \\(v_2\\)–\\(v_5\\). Prvi kos \\((0,0)\\), \\((4,3)\\), \\((8,5)\\), \\((4,8)\\) je obrobljen z debelo modro črto. Oranžna pometalna premica poteka na vrhu skozi oglišče \\((4,8)\\), ki je obkroženo. Oznake so »1 spodnje oglišče«, »2 desna veriga«, »5 desna veriga« in »6 zgornje oglišče«.',
        'The polygon with the vertices \\((0,0)\\), \\((4,3)\\), \\((8,0)\\), \\((12,8)\\), \\((8,5)\\), \\((4,8)\\), with green remaining edges and the dashed blue diagonal \\(v_2\\)–\\(v_5\\). The first piece \\((0,0)\\), \\((4,3)\\), \\((8,5)\\), \\((4,8)\\) is outlined by a thick blue line. An orange sweep line runs along the top through the vertex \\((4,8)\\), which has a ring around it. The labels read "1 spodnje oglišče" (bottom vertex), "2 desna veriga" (right chain), "5 desna veriga" and "6 zgornje oglišče" (top vertex).',
        'Prvi monoton kos je pripravljen na triangulacijo; sklad je prazen in trikotnikov še ni.',
        'The first monotone piece is ready to be triangulated; the stack is empty and there are no triangles yet.',
    ),
    'sweep-algorithms.fortune.fortune': copy(
        'Štiri mesta \\((0,5)\\), \\((-4,3)\\), \\((4,3)\\), \\((0,-3)\\) in vodoravna pometalna premica nad njimi.',
        'Four sites \\((0,5)\\), \\((-4,3)\\), \\((4,3)\\), \\((0,-3)\\) and a horizontal sweep line above them.',
        'Pometalna premica je nad vsemi mesti; obalne črte še ni.',
        'The sweep line is above all the sites; there is no beach line yet.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
