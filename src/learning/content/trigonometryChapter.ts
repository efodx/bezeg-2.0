import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {TRIGONOMETRY_CHAPTER_ID, trigonometryGuidedExampleDemonstrations, type TrigonometrySectionId} from './trigonometryChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: TrigonometrySectionId) => `${TRIGONOMETRY_CHAPTER_ID}.${sectionId}.${trigonometryGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: TrigonometrySectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two unit-circle sections with a short bilingual intro each. The triangle sections
 * (sine and cosine rules, ambiguous case) and the guided examples of TR3 to TR5 join in tasks 08 and 09; the chapter is placed in the
 * functions strand because the unit-circle Demonstration belongs to the functions family.
 */
export const trigonometryChapter: FamilyChapter = {
    id: TRIGONOMETRY_CHAPTER_ID,
    family: '/bezeg-2.0/functions',
    title: text('Trigonometrija na enotski krožnici in v trikotniku', 'Trigonometry of the unit circle and triangle'),
    purpose: text('Kotne funkcije najprej razumemo na enotski krožnici: kot meriš z dolžino loka, kosinus in sinus pa sta koordinati točke na krožnici. Iz zrcalnih slik točke in zavrtenega koordinatnega okvirja nato izpeljemo enakosti in adicijska izreka. Vsak razdelek poda izrek in primer, ki ga lahko preračunaš sam.', 'The trigonometric functions are first understood on the unit circle: an angle is measured by an arc length, and the cosine and sine are the coordinates of a point on the circle. The mirror images of the point and a rotated coordinate frame then give the identities and the addition formulas. Each section states a theorem and an example you can recompute yourself.'),
    prerequisites: text('Trigonometrija pravokotnega trikotnika (razmerja stranic), Pitagorov izrek in koordinatni sistem. Kasneje se k pojmom iz tega poglavja vrnemo pri grafih kotnih funkcij.', 'Trigonometry of the right triangle (ratios of sides), the Pythagorean theorem and the coordinate plane. Later the graphs of the trigonometric functions return to the notions of this chapter.'),
    sections: [
        withExample('radian-sine-cosine', {
            id: 'radian-sine-cosine',
            demonstrationIds: ['unit-circle'],
            investigationPrompts: {'unit-circle': text('Vpiši kot ali ga povleci po krožnici in opazuj, kako se spreminjata koordinati točke ter njuna predznaka po kvadrantih.', 'Type an angle or drag it around the circle and watch how the coordinates of the point and their signs change by quadrant.')},
            title: text('Radian, sinus in kosinus na enotski krožnici', 'Radian, sine and cosine on the unit circle'),
            formula: String.raw`P(\theta)=(\cos\theta,\ \sin\theta),\qquad \sin^2\theta+\cos^2\theta=1`,
            paragraphs: [
                text('Cilj razdelka: kot izmeriš z dolžino loka in iz točke na enotski krožnici odčitaš kosinus in sinus. Radian je kot, ki na enotski krožnici odreže lok dolžine \\(1\\). Kot \\(\\theta\\) v radianih je torej dolžina loka od točke \\((1,0)\\) do točke \\(P\\), merjena v pozitivni smeri. Polni obhod ima dolžino \\(2\\pi\\), zato je \\(180^\\circ=\\pi\\) in en radian je približno \\(57{,}3^\\circ\\).', 'Learning outcome: you measure an angle by an arc length and read the cosine and sine from a point on the unit circle. The radian is the angle that cuts off an arc of length \\(1\\) on the unit circle. An angle \\(\\theta\\) in radians is therefore the length of the arc from the point \\((1,0)\\) to the point \\(P\\), measured in the positive direction. A full turn has length \\(2\\pi\\), so \\(180^\\circ=\\pi\\), and one radian is about \\(57.3^\\circ\\).'),
                text('Izrek: točka na loku dolžine \\(\\theta\\) ima koordinati \\((\\cos\\theta,\\sin\\theta)\\), saj sta to prav razmerji stranic pravokotnega trikotnika s hipotenuzo \\(1\\). Iz Pitagorovega izreka sledi \\(\\sin^2\\theta+\\cos^2\\theta=1\\). Predznaka določa kvadrant: v prvem sta oba pozitivna, v drugem je kosinus negativen, v tretjem sta oba negativna, v četrtem je sinus negativen.', 'Theorem: the point at arc length \\(\\theta\\) has coordinates \\((\\cos\\theta,\\sin\\theta)\\), since these are exactly the ratios of the sides of a right triangle with hypotenuse \\(1\\). The Pythagorean theorem gives \\(\\sin^2\\theta+\\cos^2\\theta=1\\). The quadrant fixes the signs: in the first both are positive, in the second the cosine is negative, in the third both are negative, in the fourth the sine is negative.'),
                text('Zgled: pri \\(\\theta=30^\\circ\\) je \\(\\cos\\theta=\\tfrac{\\sqrt3}{2}\\approx0{,}866\\) in \\(\\sin\\theta=\\tfrac12\\); preveri: \\(\\tfrac34+\\tfrac14=1\\). Graf odčita zaokrožene vrednosti, natančne so le pri posebnih kotih, kot pa je na mreži polovičnih stopinj. Kako to uporabiš: pri vsakem kotu najprej napovej kvadrant in predznaka, nato šele preberi vrednosti.', 'Example: at \\(\\theta=30^\\circ\\) we have \\(\\cos\\theta=\\tfrac{\\sqrt3}{2}\\approx0.866\\) and \\(\\sin\\theta=\\tfrac12\\); check: \\(\\tfrac34+\\tfrac14=1\\). The graph reads rounded values; they are exact only at the special angles, and the angle lies on the grid of half degrees. How to use it: for every angle first predict the quadrant and the signs, and only then read the values.'),
                text('Posebni koti so tisti, pri katerih sta vrednosti natančni: pri \\(0^\\circ\\), \\(30^\\circ\\), \\(45^\\circ\\), \\(60^\\circ\\) in \\(90^\\circ\\) sta kosinus in sinus med \\(0\\), \\(\\tfrac12\\), \\(\\tfrac{\\sqrt2}{2}\\), \\(\\tfrac{\\sqrt3}{2}\\) in \\(1\\). Vrednosti v drugih kvadrantih dobiš z zrcaljenjem, ki je tema naslednjega razdelka. Ko izbereš kot v drugem, tretjem ali četrtem kvadrantu, se zato vprašaj, kateri kot prvega kvadranta ima enaki absolutni vrednosti koordinat.', 'The special angles are those with exact values: at \\(0^\\circ\\), \\(30^\\circ\\), \\(45^\\circ\\), \\(60^\\circ\\) and \\(90^\\circ\\) the cosine and sine are among \\(0\\), \\(\\tfrac12\\), \\(\\tfrac{\\sqrt2}{2}\\), \\(\\tfrac{\\sqrt3}{2}\\) and \\(1\\). The values in the other quadrants come from reflections, which is the topic of the next section. When you choose an angle in the second, third or fourth quadrant, ask which angle of the first quadrant has the same absolute values of the coordinates.'),
            ],
        }),
        withExample('addition-formulas', {
            id: 'addition-formulas',
            demonstrationIds: ['unit-circle'],
            investigationPrompts: {'unit-circle': text('Vključi zrcalne slike in poglej, katera koordinata se ob zrcaljenju ohrani; nato vključi vsoto kotov in primerjaj točko na vsoti s formulo.', 'Turn on the mirror images and see which coordinate the reflection keeps; then turn on the sum of the angles and compare the point at the sum with the formula.')},
            title: text('Simetrije in adicijski izreki', 'Symmetries and addition formulas'),
            formula: String.raw`\sin(\alpha+\beta)=\sin\alpha\cos\beta+\cos\alpha\sin\beta,\qquad \cos(\alpha+\beta)=\cos\alpha\cos\beta-\sin\alpha\sin\beta`,
            paragraphs: [
                text('Cilj razdelka: iz zrcalnih slik točke izpelješ enakosti in iz zavrtenega okvirja adicijska izreka. Zrcaljenje točke \\(P(x)\\) čez navpično os da točko za kot \\(\\pi-x\\), zrcaljenje čez vodoravno os točko za kot \\(-x\\), polobrat okoli izhodišča pa točko za kot \\(x+\\pi\\). Od tod sledijo enakosti \\(\\sin(\\pi-x)=\\sin x\\), \\(\\cos(-x)=\\cos x\\) in \\(\\sin(x+\\pi)=-\\sin x\\).', 'Learning outcome: from the mirror images of a point you derive identities, and from a rotated frame the addition formulas. Reflecting the point \\(P(x)\\) in the vertical axis gives the point for the angle \\(\\pi-x\\), reflecting it in the horizontal axis gives the point for \\(-x\\), and the half-turn about the origin gives the point for \\(x+\\pi\\). From these follow \\(\\sin(\\pi-x)=\\sin x\\), \\(\\cos(-x)=\\cos x\\) and \\(\\sin(x+\\pi)=-\\sin x\\).'),
                text('Izrek (adicijska izreka): okvir zavrtimo za kot \\(\\alpha\\), tako da je nova vodoravna os v smeri točke \\(P(\\alpha)\\). Točka z lego \\(\\beta\\) v zavrtenem okvirju ima koordinati \\((\\cos\\beta,\\sin\\beta)\\) glede na zavrteni osi, kar da formuli za \\(\\sin(\\alpha+\\beta)\\) in \\(\\cos(\\alpha+\\beta)\\). Zgled: za \\(\\alpha=60^\\circ\\) in \\(\\beta=45^\\circ\\) je \\(\\sin105^\\circ=\\tfrac{\\sqrt6+\\sqrt2}{4}\\approx0{,}9659\\) in \\(\\cos105^\\circ=\\tfrac{\\sqrt2-\\sqrt6}{4}\\approx-0{,}2588\\).', 'Theorem (addition formulas): rotate the frame by the angle \\(\\alpha\\), so that the new horizontal axis points along \\(P(\\alpha)\\). The point at position \\(\\beta\\) in the rotated frame has coordinates \\((\\cos\\beta,\\sin\\beta)\\) with respect to the rotated axes, which gives the formulas for \\(\\sin(\\alpha+\\beta)\\) and \\(\\cos(\\alpha+\\beta)\\). Example: for \\(\\alpha=60^\\circ\\) and \\(\\beta=45^\\circ\\) we get \\(\\sin105^\\circ=\\tfrac{\\sqrt6+\\sqrt2}{4}\\approx0.9659\\) and \\(\\cos105^\\circ=\\tfrac{\\sqrt2-\\sqrt6}{4}\\approx-0.2588\\).'),
                text('Slika pokaže en par kotov, formule pa veljajo za vsak par; premikanje kotov je ponazoritev izreka, ne dokaz. Kako to uporabiš: ko poznaš vrednosti pri \\(\\alpha\\) in \\(\\beta\\), izračunaj vsoto po formuli in šele nato preberi točko na vsoti kotov z grafa.', 'The picture shows one pair of angles, while the formulas hold for every pair; moving the angles illustrates the theorem and does not prove it. How to use it: when you know the values at \\(\\alpha\\) and \\(\\beta\\), compute the sum by the formula and only then read the point at the sum of the angles from the graph.'),
                text('Vsota kotov se zloži v en obhod: če je \\(\\alpha+\\beta\\) vsaj \\(360^\\circ\\), je točka na istem mestu kot pri vsoti, zmanjšani za \\(360^\\circ\\), saj se po polnem obhodu vrneš na isto mesto. Zato formuli veljata tudi za velike kote. Poseben primer \\(\\beta=\\alpha\\) da formuli za dvojni kot, ki ju lahko preveriš na grafu pri več različnih kotih.', 'The sum of angles is folded into one turn: if \\(\\alpha+\\beta\\) is at least \\(360^\\circ\\), the point lies where it lies for the sum reduced by \\(360^\\circ\\), since after a full turn you return to the same place. The formulas therefore hold for large angles too. The special case \\(\\beta=\\alpha\\) gives the double-angle formulas, which you can check on the graph at several different angles.'),
            ],
        }),
    ],
};
