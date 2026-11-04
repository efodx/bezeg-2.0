import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes each prepared opening scene of the School function graphs chapter, keyed by example id (S1 to S6). */
export const schoolFunctionGraphsPreviewCopy = {
    'school-function-graphs.function-transformation.function-transformation': copy(
        'Parabola \\(y=x^2\\) in njen duh, ki se z njo sklada, ter sledena točka \\((2,4)\\) na grafu.',
        'The parabola \\(y=x^2\\) and its coinciding ghost, with the tracked point \\((2,4)\\) on the graph.',
        'Pri \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\) se novi graf sklada z duhom osnovnega grafa in slika točke \\((2,4)\\) je ista točka.',
        'With \\(a=1\\), \\(b=1\\), \\(c=0\\), \\(d=0\\) the new graph coincides with the ghost of the base graph and the image of \\((2,4)\\) is the same point.',
    ),
    'school-function-graphs.function-inverse.function-inverse': copy(
        'Graf \\(y=x^2\\) na \\(x\\ge0\\), premica \\(y=x\\), točka \\(P=(2,4)\\) in njena zrcalna točka \\(P\'=(4,2)\\), povezani s črtkano daljico.',
        'The graph of \\(y=x^2\\) on \\(x\\ge0\\), the line \\(y=x\\), the point \\(P=(2,4)\\) and its mirror point \\(P\'=(4,2)\\), joined by a dashed segment.',
        'Zrcalna točka \\(P\'=(4,2)\\) ima zamenjani koordinati točke \\(P=(2,4)\\); zrcalne krivulje v tem začetnem prizoru še ni.',
        'The mirror point \\(P\'=(4,2)\\) has the coordinates of \\(P=(2,4)\\) swapped; the mirrored curve is not shown in this opening scene.',
    ),
    'school-function-graphs.polynomial-zeros.polynomial-zeros': copy(
        'Graf polinoma \\((x+2)(x-1)^2\\) z enojno ničlo \\(-2\\), kjer graf seka os \\(x\\), in dvojno ničlo \\(1\\), kjer se je dotakne; odvod je skrit.',
        'The graph of the polynomial \\((x+2)(x-1)^2\\) with the simple zero \\(-2\\), where it crosses the \\(x\\)-axis, and the double zero \\(1\\), where it touches it; the derivative is hidden.',
        'Ničli sta \\(-2\\) z večkratnostjo \\(1\\) in \\(1\\) z večkratnostjo \\(2\\); presečišče z osjo \\(y\\) je \\(p(0)=2\\).',
        'The zeros are \\(-2\\) with multiplicity \\(1\\) and \\(1\\) with multiplicity \\(2\\); the \\(y\\)-intercept is \\(p(0)=2\\).',
    ),
    'school-function-graphs.rational-function.rational-function': copy(
        'Graf funkcije \\(\\frac{x^2-1}{x-2}\\) z ničlama \\(-1\\) in \\(1\\), polom \\(2\\), črtkano navpično asimptoto \\(x=2\\) in črtkano poševno asimptoto \\(y=x+2\\).',
        'The graph of \\(\\frac{x^2-1}{x-2}\\) with the zeros \\(-1\\) and \\(1\\), the pole \\(2\\), the dashed vertical asymptote \\(x=2\\) and the dashed oblique asymptote \\(y=x+2\\).',
        'Ker je \\(f(x)=x+2+\\frac{3}{x-2}\\), se graf pri velikih \\(|x|\\) približuje premici \\(y=x+2\\), ob polu pa navpični premici \\(x=2\\).',
        'Since \\(f(x)=x+2+\\frac{3}{x-2}\\), the graph approaches the line \\(y=x+2\\) for large \\(|x|\\) and the vertical line \\(x=2\\) near the pole.',
    ),
    'school-function-graphs.geometric-series.geometric-series': copy(
        'Stolpci členov in delnih vsot geometrijske vrste \\(a=1\\), \\(q=\\tfrac12\\) s tremi prikazanimi členi in vodoravna črta limite \\(2\\).',
        'The term and partial-sum bars of the geometric series \\(a=1\\), \\(q=\\tfrac12\\) with three shown terms and the horizontal line of the limit \\(2\\).',
        'Delna vsota \\(S_3=1{,}75\\) je še pod limito \\(2\\); vsak naslednji člen je polovica prejšnjega.',
        'The partial sum \\(S_3=1.75\\) is still below the limit \\(2\\); every next term is half of the previous one.',
    ),
    'school-function-graphs.conic-focal.conic-focal': copy(
        'Elipsa z goriščema \\((\\pm4,0)\\), točko \\(P=(0,3)\\), njenima razdaljama do gorišč \\(5\\) in \\(5\\) ter vodnico; numerična ekscentričnost je \\(0{,}8\\).',
        'An ellipse with the foci \\((\\pm4,0)\\), the point \\(P=(0,3)\\), its distances \\(5\\) and \\(5\\) to the foci and a directrix; the numerical eccentricity is \\(0.8\\).',
        'Vsota razdalj od \\(P\\) do obeh gorišč je \\(10\\), razdalja do vodnice pa \\(6{,}25\\).',
        'The sum of the distances from \\(P\\) to the two foci is \\(10\\), and the distance to the directrix is \\(6.25\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
