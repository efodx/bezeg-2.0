import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of the Numerical methods chapter, keyed by example id (N1 opens the root-finding lesson, N4 the quadrature lesson, N5 the Euler lesson). */
export const numericalPreviewCopy = {
    'numerical-methods.root-finding.root-finding': copy(
        'Graf funkcije \\(f(x)=x^2-2\\), začetni približek \\(x_0=1\\) na osi \\(x\\) in točka \\((1,-1)\\) na grafu, povezani s črtkano navpičnico.',
        'The graph of \\(f(x)=x^2-2\\), the starting iterate \\(x_0=1\\) on the \\(x\\)-axis and the point \\((1,-1)\\) on the graph, joined by a dashed vertical line.',
        'Začetni približek \\(x_0=1\\) leži levo od ničle \\(\\sqrt2\\approx1{,}4142\\); tangente in prvega koraka Newtonove metode še ni.',
        'The starting iterate \\(x_0=1\\) lies to the left of the root \\(\\sqrt2\\approx1.4142\\); the tangent and the first step of Newton\'s method are not shown yet.',
    ),
    'numerical-methods.euler-method.euler-method': copy(
        'Polje smeri enačbe \\(y\'=y\\): kratke daljice z naklonom \\(y\\), ob \\(y=1\\) z naklonom \\(1\\), više strmejše, in začetna točka \\((0,1)\\) na osi \\(y\\); Eulerjevih korakov in natančne krivulje še ni.',
        'The direction field of \\(y\'=y\\): short segments with the slope \\(y\\), slope \\(1\\) at \\(y=1\\) and steeper higher up, and the initial point \\((0,1)\\) on the \\(y\\)-axis; there are no Euler steps and no exact curve yet.',
        'Samo iz polja smeri napovej, kam gre rešitev skozi \\((0,1)\\) do \\(x=1\\), preden se pokaže prvi Eulerjev korak.',
        'From the direction field alone, predict where the solution through \\((0,1)\\) goes up to \\(x=1\\) before the first Euler step appears.',
    ),
    'numerical-methods.quadrature.quadrature': copy(
        'Graf funkcije \\(\\sin x\\) na \\([0,\\pi]\\), pod njim dva trapeza trapeznega pravila z \\(n=2\\) (tetivi do vrha pri \\(x=\\tfrac\\pi2\\)) in točki \\(a=0\\) ter \\(b=\\pi\\) na osi \\(x\\).',
        'The graph of \\(\\sin x\\) on \\([0,\\pi]\\), with the two trapezoids of the trapezoid rule at \\(n=2\\) under it (chords up to the peak at \\(x=\\tfrac\\pi2\\)) and the points \\(a=0\\) and \\(b=\\pi\\) on the \\(x\\)-axis.',
        'Dva trapeza pokrijeta le del ploščine pod \\(\\sin x\\): približek \\(T_2=\\tfrac\\pi2\\approx1{,}5708\\) je precej pod natančno vrednostjo \\(2\\).',
        'Two trapezoids cover only part of the area under \\(\\sin x\\): the approximation \\(T_2=\\tfrac\\pi2\\approx1.5708\\) is well below the exact value \\(2\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
