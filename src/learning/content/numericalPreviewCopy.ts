import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of the Numerical methods chapter, keyed by example id (N1, which opens the root-finding lesson). */
export const numericalPreviewCopy = {
    'numerical-methods.root-finding.root-finding': copy(
        'Graf funkcije \\(f(x)=x^2-2\\), začetni približek \\(x_0=1\\) na osi \\(x\\) in točka \\((1,-1)\\) na grafu, povezani s črtkano navpičnico.',
        'The graph of \\(f(x)=x^2-2\\), the starting iterate \\(x_0=1\\) on the \\(x\\)-axis and the point \\((1,-1)\\) on the graph, joined by a dashed vertical line.',
        'Začetni približek \\(x_0=1\\) leži levo od ničle \\(\\sqrt2\\approx1{,}4142\\); tangente in prvega koraka Newtonove metode še ni.',
        'The starting iterate \\(x_0=1\\) lies to the left of the root \\(\\sqrt2\\approx1.4142\\); the tangent and the first step of Newton\'s method are not shown yet.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
