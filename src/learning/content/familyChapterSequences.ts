import type {FamilyChapterFigure, FamilyChapterSection} from './familyChapters';
import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';

type Item = string | {sl: string; en: string};
type SequenceSpec = Readonly<Record<string, readonly Item[]>>;

const authored: Readonly<Record<string, SequenceSpec>> = {
    'rational-curves': {
        'why-rational': ['p0', 'p1', 'f', 'e:rational-curves.why-rational.rational-weight', {sl: 'Kartica kaže kubični primer z utežmi \\(1,2,1,1\\). Izračunani krožni lok v razdelku o krožnem loku je kvadratičen z utežmi \\(1,\\frac{1}{\\sqrt2},1\\); kartica ni tisti lok.', en: 'The card shows a cubic example with weights \\(1,2,1,1\\). The worked circular arc in the circular-arc section is quadratic with weights \\(1,\\frac{1}{\\sqrt2},1\\); the card is not that arc.'}],
        homogeneous: ['p0', 'p1', 'f', 'e:rational-curves.homogeneous.rational-decasteljau'],
        'worked-conic': ['p0', 'p1', 'e:rational-curves.worked-conic.circle', {sl: 'Kartica sestavi celotno krožnico polmera \\(3\\) iz treh lokov. Izračun četrtinskega loka na enotski krožnici je natančen dokaz za en lok, ne za to tridelno konstrukcijo.', en: 'The card builds a complete circle of radius \\(3\\) from three arcs. The quarter-arc calculation on the unit circle proves one arc exactly, not this three-piece construction.'}, 'p2'],
        operations: ['p0', 'e:rational-curves.operations.rational-elevation', {sl: 'Višanje stopnje spremeni kontrolni zapis, ne pa geometrijske sledi.', en: 'Degree elevation changes the control representation, not the geometric trace.'}, 'e:rational-curves.operations.rational-subdivision', {sl: 'Subdivizija izbere parameter in razdeli isto krivuljo na dva racionalna kosa.', en: 'Subdivision chooses a parameter and splits the same curve into two rational pieces.'}, 'e:rational-curves.operations.farin', {sl: 'Farinove točke primerjaj kot dodatno konstrukcijo; vsaka operacija ohranja svojo matematično vlogo.', en: 'Compare Farin points as an additional construction; each operation has its own mathematical role.'}, 'p1'],
        'investigate-rational': ['p0', 'p1', {sl: 'Pri ekstrapolaciji Bernsteinove osnove zunaj \\(0\\le t\\le1\\) lahko imenovalec izgine. Preveri njegov predznak, preden sklepaš, da je krivulja določena.', en: 'During extrapolation, Bernstein basis functions outside \\(0\\le t\\le1\\) can make the denominator vanish. Check its sign before concluding that the curve is defined.'}, 'e:rational-curves.investigate-rational.rational-extrapolation'],
    },
    splines: {
        piecewise: ['p0', 'p1', 'e:splines.piecewise.spline-cn'],
        'continuity-levels': ['p0', 'p1', 'f', 'e:splines.continuity-levels.spline-c1', {sl: 'Kartica ponazori konstrukcijo večdelnega kvadratnega zlepka \\(C^1\\), ne dokaza enakosti odvodov, in ni par parabol iz izračunanega primera. Ujemanje prvih odvodov zagotavlja \\(C^1\\); za \\(C^2\\) mora biti usklajen tudi drugi odvod.', en: 'The card illustrates the construction of a multi-piece quadratic \\(C^1\\) spline, not a proof that the derivatives are equal, and it is not the pair of parabolas in the worked example. Matching first derivatives gives \\(C^1\\); \\(C^2\\) also requires matching second derivatives.'}, 'e:splines.continuity-levels.spline-c2'],
        'geometric-vs-parametric': ['p0', 'p1', 'f', 'e:splines.geometric-vs-parametric.spline-g1', {sl: 'Kartica kaže poravnani tangentni smeri pri različno dolgih krakih podpornega poligona; ne dokazuje pogoja \\(G^1\\). Prosti pozitivni faktor pri \\(G^1\\) dopušča asimetričen spoj. Simetrična konstrukcija doda omejitve in ni isti pogoj.', en: 'The card shows aligned tangent directions with legs of unequal length; it does not prove the \\(G^1\\) condition. The free positive factor in \\(G^1\\) allows an asymmetric join. A symmetric construction adds constraints and is a different condition.'}, 'e:splines.geometric-vs-parametric.spline-g1-symmetric'],
        'worked-join': ['p0', 'e:splines.worked-join.spline-c1.parabola-derivatives', 'p1', {sl: 'Paraboli sta \\(C^1\\) pri obravnavani parametrizaciji, medtem ko je za \\(C^2\\) potrebna dodatna enačba za \\(a\\).', en: 'The parabolas are \\(C^1\\) under this parametrization, while \\(C^2\\) requires an additional equation for \\(a\\).'}, 'p2'],
    },
    'ph-curves': {
        'arc-length-problem': ['p0', 'f', 'fig0', 'p1', 'e:ph-curves.arc-length-problem.ph-cubic-speed', {sl: 'Kubični primer loči polinomsko hitrost od splošno težavnega integrala hitrosti.', en: 'The cubic example separates polynomial speed from the generally difficult speed integral.'}, 'e:ph-curves.arc-length-problem.ph-quintic-comparison'],
        'complex-hodograph': ['p0', 'e:ph-curves.complex-hodograph.ph-cubic-generator', 'p1'],
        'worked-length': ['p0', 'p1', 'e:ph-curves.worked-length.ph-cubic-offset-length', 'p2'],
        offsets: ['p0', 'p1', 'fig0', 'e:ph-curves.offsets.ph-quintic-offsets', 'p2'],
        'investigate-ph': ['p0', 'e:ph-curves.investigate-ph.ph-cubic-singularity', {sl: 'Odmiki kubične in kvintične krivulje obravnavaj ločeno, saj se njuna geometrija in singularnosti razlikujejo.', en: 'Treat cubic and quintic offsets separately because their geometry and singularities differ.'}, 'e:ph-curves.investigate-ph.ph-quintic-singularity', 'p1'],
    },
    parametrization: {
        'trace-vs-parameter': ['p0', 'f', 'fig0', 'fig1', 'p1'],
        'weighted-knot': ['p0', 'f', 'p1', 'e:parametrization.weighted-knot.spline-parameterization', {sl: 'Utež \\(\\alpha\\) spreminja dodelitev vozlišč in lahko spremeni tudi rekonstruirano geometrijo zlepka.', en: 'The weight \\(\\alpha\\) changes knot allocation and can also change the reconstructed spline geometry.'}, 'e:parametrization.weighted-knot.weighted-parameterization', 'p2'],
        'worked-timing': ['p0', 'p1'],
        'uniform-timing': ['p0', 'f', 'fig0', 'e:parametrization.uniform-timing.uniform-parameterization', 'p1'],
        'investigate-param': ['p0', 'p1'],
    },
    'functions-and-calculus': {
        'function-rules': ['p0', 'p1', 'e:functions-and-calculus.function-rules.linear-function', {sl: 'Konstantni prirastek vhoda daje pri premici konstantni prirastek izhoda.', en: 'A constant input increment gives a linear function a constant output increment.'}, 'e:functions-and-calculus.function-rules.exponential-function', {sl: 'Pri eksponentni funkciji enaki vhodni koraki vrednosti množijo z istim faktorjem.', en: 'For an exponential function, equal input steps multiply values by the same factor.'}, 'e:functions-and-calculus.function-rules.trigonometric-functions'],
        continuity: ['p0', 'fig0', 'p1', 'e:functions-and-calculus.continuity.continuity'],
        derivatives: ['p0', 'fig0', 'p1', 'e:functions-and-calculus.derivatives.derivative'],
        integrals: ['p0', 'fig0', 'e:functions-and-calculus.integrals.definite-integral', 'p1', {sl: 'Akumulacijska funkcija pokaže, kako se prispevek spreminja z zgornjo mejo integracije.', en: 'The accumulation function shows how the accumulated contribution changes with the upper integration limit.'}, 'e:functions-and-calculus.integrals.accumulation'],
        applications: ['p0', 'e:functions-and-calculus.applications.area-between-curves', {sl: 'Za ploščino določi vrstni red grafov ali razdeli interval pri presečiščih.', en: 'For area, determine which graph is above or split the interval at intersections.'}, 'e:functions-and-calculus.applications.arc-length', 'p1'],
    },
    analysis: {
        existence: ['p0', 'p1', 'fig0', 'e:analysis.existence.bisection'],
        integrability: ['p0', 'fig0', 'e:analysis.integrability.darboux', 'p1'],
        'derivative-results': ['p0', 'e:analysis.derivative-results.mean-value', {sl: 'Pri ekstremih preveri tudi krajišča in kritične točke; ničelni odvod je nujen pogoj le v notranji točki, kjer odvod obstaja.', en: 'For extrema, also check endpoints and critical points; a zero derivative is necessary only at an interior point where the derivative exists.'}, 'p1', 'e:analysis.derivative-results.extrema', {sl: 'Zdaj loči lokalno razvrščanje stacionarne točke od pogoja konveksnosti na celotnem intervalu.', en: 'Now distinguish classifying a stationary point locally from the condition for convexity across an interval.'}, 'e:analysis.derivative-results.convexity'],
        taylor: ['p0', 'p1', 'e:analysis.taylor.taylor'],
        convergence: [{sl: 'Zaporedje \\(a_n\\) lahko konvergira k številu \\(L\\), če se njegovi členi z večanjem \\(n\\) poljubno približajo \\(L\\). Graf končnih členov pokaže vzorec, medtem ko sklep o limiti zahteva argument za vse dovolj velike \\(n\\).', en: 'A sequence \\(a_n\\) can converge to a number \\(L\\) when its terms get arbitrarily close to \\(L\\) as \\(n\\) grows. A graph of finitely many terms shows a pattern, while a limit claim needs an argument for every sufficiently large \\(n\\).'}, 'e:analysis.convergence.sequence', 'p0', 'p1', 'p2', {sl: 'Za enakomerno konvergenco mora isti prag veljati za vse točke domene.', en: 'For uniform convergence, the same threshold must work for every point in the domain.'}, 'p3', 'fig0', 'e:analysis.convergence.uniform-convergence', {sl: 'Pri fiksni točki preveri še domeno preslikave in pogoje, ki zagotavljajo konvergenco iteracij.', en: 'For a fixed point, also check the map’s domain and the conditions that ensure iteration converges.'}, 'p4', 'e:analysis.convergence.fixed-point'],
        investigate: ['p0', 'p1'],
    },
};

/** Returns the authored reading order for the six migrated family chapters. */
export function authorFamilyChapterSequence(
    chapterId: string,
    section: FamilyChapterSection,
): readonly OrderedChapterContent<LocalizedText, FamilyChapterFigure>[] | undefined {
    const spec = authored[chapterId]?.[section.id];
    if (!spec) return undefined;
    return spec.map(item => {
        if (typeof item !== 'string') return {kind: 'paragraph', text: item};
        if (item === 'f') return section.formula ? {kind: 'formula', latex: section.formula} : undefined;
        if (item.startsWith('e:')) return {kind: 'example', exampleId: item.slice(2)};
        if (item.startsWith('p')) {
            const text = section.paragraphs[Number(item.slice(1))];
            return text ? {kind: 'paragraph', text} : undefined;
        }
        if (item.startsWith('fig')) {
            const figure = section.figures?.[Number(item.slice(3))];
            return figure ? {kind: 'figure', figure} : undefined;
        }
        return undefined;
    }).filter((item): item is OrderedChapterContent<LocalizedText, FamilyChapterFigure> => item !== undefined);
}
