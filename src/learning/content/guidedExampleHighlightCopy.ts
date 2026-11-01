import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Card copy for examples whose captured image is an authored highlight state (kind 'highlight' in
 * `guidedExampleHighlightRecipes`), keyed by example id. Examples without an entry use the demonstration copy.
 * Captions are plain text: the card does not typeset math.
 */
export const guidedExampleHighlightCopy: Readonly<Record<string, GuidedExamplePreviewCopy>> = {
    'ph-curves.offsets.ph-quintic-offsets': copy(
        'Kvintična PH-krivulja v zeleni barvi s kontrolnimi točkami in njen modri odmik na eni strani krivulje.',
        'The quintic PH curve in green with its control points and its blue offset on one side of the curve.',
        'Odmik pri d = 0,5 je vzdolž normale na razdalji 0,5 od krivulje. Do tega pogleda prideš z vklopom odmika pri tej razdalji; slika sama ne dokazuje, da je odmik gladek.',
        'The offset at d = 0.5 lies along the normal at distance 0.5 from the curve. Turn on the offset at that distance to reach this view; the picture alone does not prove the offset is smooth.',
    ),
    'rational-curves.why-rational.rational-weight': copy(
        'Racionalna kubična Bézierjeva krivulja z utežmi 1, 2, 1, 1, kontrolnimi točkami in označeno točko R(1/2).',
        'A rational cubic Bézier curve with weights 1, 2, 1, 1, its control points and the marked point R(1/2).',
        'Pri utežeh 1, 2, 1, 1 večja druga utež potegne krivuljo proti drugi kontrolni točki; označena točka je R(1/2) = (−9/11, 21/11), krajišči pa nista odvisni od uteži.',
        'With weights 1, 2, 1, 1 the larger second weight pulls the curve toward the second control point; the marked point is R(1/2) = (−9/11, 21/11), and the endpoints do not depend on the weights.',
    ),
    'parametrization.weighted-knot.weighted-parameterization': copy(
        'Ista Bézierjeva krivulja kot v začetnem prizoru, z α = 1/4 in tremi označenimi vzorci, pomaknjenimi proti koncu krivulje.',
        'The same Bézier curve as in the start scene, with α = 1/4 and three marked samples shifted toward the end of the curve.',
        'Pri α = 1/4 so vzorci v točkah B(φ(k/4)) za k = 1, 2, 3, torej pri parametrih 1/2, 3/4 in 9/10, zato se zgostijo proti koncu; razmiki so opazka, ne dokaz o hitrosti.',
        'At α = 1/4 the samples sit at B(φ(k/4)) for k = 1, 2, 3, that is at parameters 1/2, 3/4 and 9/10, so they bunch toward the end; the spacing is an observation, not a speed proof.',
    ),
};
