import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {ANALYTIC_LINES_CHAPTER_ID, analyticLinesGuidedExampleDemonstrations, type AnalyticLinesSectionId} from './analyticLinesChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: AnalyticLinesSectionId) => `${ANALYTIC_LINES_CHAPTER_ID}.${sectionId}.${analyticLinesGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: AnalyticLinesSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two line-geometry sections with a short bilingual intro each. The sections of lessons L3 to L5
 * (dot product and angle, distance, intersections) and the guided examples of batches B and C join in tasks 05 and 06; the chapter is placed in the
 * plane-geometry strand because the line-geometry Demonstration belongs to the plane-geometry family.
 */
export const analyticLinesChapter: FamilyChapter = {
    id: ANALYTIC_LINES_CHAPTER_ID,
    family: 'plane-geometry',
    title: text('Analitična geometrija premice', 'Analytic geometry of lines'),
    purpose: text(
        'Premico v ravnini lahko zapišemo na več načinov: z dvema točkama, z enačbo \\(ax+by=c\\), z enačbo \\(y=kx+n\\) ali z odseki na oseh. Poglavje pokaže, da opisujejo isto premico, in odgovori, kdaj katera oblika odpove. Nato iz koeficientov \\((a,b)\\) preberemo normalni vektor in z njim natančno odločimo, ali sta dve premici vzporedni, pravokotni ali nobeno od tega. Vse odločitve so izračunane z danimi celimi števili, zato je odgovor vedno natančen, in ne le videti pravilen na sliki.',
        'A line in the plane can be written in several ways: with two points, with the equation \\(ax+by=c\\), with the equation \\(y=kx+n\\) or with its intercepts on the axes. The chapter shows that they describe the same line and answers when each form fails. Then we read the normal vector from the coefficients \\((a,b)\\) and use it to decide exactly whether two lines are parallel, perpendicular or neither. All decisions are computed from the given integers, so the answer is always exact and does not merely look right in the picture.',
    ),
    prerequisites: text(
        'Linearna funkcija (smerni koeficient in začetna vrednost), koordinatni sistem in osnove vektorjev, predvsem skalarni produkt. Pozneje se pojmi iz tega poglavja vrnejo pri kotu med premicama, razdalji točke od premice in presečišču.',
        'The linear function (slope and initial value), the coordinate plane and the basics of vectors, above all the dot product. Later the concepts of this chapter return in the angle between lines, the distance from a point to a line and the intersection.',
    ),
    sections: [
        withExample('forms-of-a-line', {
            id: 'forms-of-a-line',
            demonstrationIds: ['line-geometry'],
            investigationPrompts: {'line-geometry': text('Povleci točki \\(P\\) in \\(Q\\) ali vpiši njuni koordinati ter v odčitku primerjaj dvotočkovno, implicitno, eksplicitno in odsekovno obliko; poišči lego, pri kateri nekatera oblika izgine.', 'Drag the points \\(P\\) and \\(Q\\) or type their coordinates, and in the readout compare the two-point, implicit, explicit and intercept forms; find a position where some form disappears.')},
            title: text('Oblike enačbe premice', 'Forms of a line'),
            formula: String.raw`ax+by=c,\qquad y=kx+n,\qquad \frac{x}{m}+\frac{y}{n}=1`,
            paragraphs: [
                text('Cilj razdelka: isto premico zapišemo na več načinov in vemo, kdaj kateri odpove. Premica skozi točki \\(P\\) in \\(Q\\) ima implicitno enačbo \\(ax+by=c\\) s \\(a=q_y-p_y\\), \\(b=p_x-q_x\\) in \\(c=ap_x+bp_y\\). Koeficiente okrajšamo z največjim skupnim deliteljem in izberemo predznak tako, da je prvi neničelni koeficient pozitiven; tako imata enaki premici enake koeficiente, tudi če sta nastali iz različnih parov točk.', 'Aim of the section: write the same line in several ways and know when each one fails. The line through the points \\(P\\) and \\(Q\\) has the implicit equation \\(ax+by=c\\) with \\(a=q_y-p_y\\), \\(b=p_x-q_x\\) and \\(c=ap_x+bp_y\\). We reduce the coefficients by the greatest common divisor and choose the sign so that the first nonzero coefficient is positive; then equal lines have equal coefficients, even when they came from different pairs of points.'),
                text('Zgled: za \\(P=(-2,1)\\) in \\(Q=(4,4)\\) dobimo \\(3x-6y=-12\\), okrajšano \\(x-2y=-4\\). Če je \\(b\\ne0\\), je \\(k=-\\tfrac ab=\\tfrac12\\) in \\(n=\\tfrac cb=2\\), zato je \\(y=\\tfrac12x+2\\); odseka na oseh sta \\(-4\\) in \\(2\\), zato je \\(\\tfrac{x}{-4}+\\tfrac y2=1\\). Vse štiri zapise preveriš tako, da vstaviš obe točki.', 'Example: for \\(P=(-2,1)\\) and \\(Q=(4,4)\\) we get \\(3x-6y=-12\\), reduced \\(x-2y=-4\\). If \\(b\\ne0\\), then \\(k=-\\tfrac ab=\\tfrac12\\) and \\(n=\\tfrac cb=2\\), so \\(y=\\tfrac12x+2\\); the intercepts on the axes are \\(-4\\) and \\(2\\), so \\(\\tfrac{x}{-4}+\\tfrac y2=1\\). You check all four forms by substituting both points.'),
                text('Eksplicitna oblika je graf funkcije, funkcija pa vsakemu \\(x\\) priredi en \\(y\\). Zato navpična premica, na primer \\(x=3\\), nima eksplicitne oblike: smerni koeficient ni določen. Odsekovna oblika zahteva, da sta oba odseka neničelna, zato je ni za premico skozi izhodišče in ne za premico, vzporedno z osjo. Implicitna oblika nikjer ne odpove, zato je v tem poglavju osnovna.', 'The explicit form is the graph of a function, and a function assigns one \\(y\\) to each \\(x\\). So a vertical line, for example \\(x=3\\), has no explicit form: its slope is undefined. The intercept form needs both intercepts to be nonzero, so it does not exist for a line through the origin or for a line parallel to an axis. The implicit form fails nowhere, so it is the basic one in this chapter.'),
                text('Slika pokaže en par točk, zato je premikanje točk ponazoritev, ne dokaz: drug par bi dal enake odnose med oblikami. Kako to uporabiš: pri nalogi z dvema točkama najprej zapiši implicitno obliko in jo okrajšaj, šele nato jo po potrebi pretvori v eksplicitno ali odsekovno obliko, če obstaja. Če točki sovpadata, premice ni in odčitek to pove.', 'The picture shows one pair of points, so moving the points is an illustration, not a proof: another pair would give the same relations between the forms. How to use this: in a task with two points, first write the implicit form and reduce it, and only then convert it to the explicit or intercept form if it exists. If the points coincide there is no line and the readout says so.'),
            ],
        }),
        withExample('normal-parallel-perpendicular', {
            id: 'normal-parallel-perpendicular',
            demonstrationIds: ['line-geometry'],
            investigationPrompts: {'line-geometry': text('Izberi prikaz normalnega vektorja in lege premic, premikaj točki \\(R\\) in \\(S\\) druge premice in poišči lege, pri katerih stanje pove: vzporedni, pravokotni, sovpadata ali ne vzporedni ne pravokotni.', 'Choose the display of the normal vector and relative position of lines, move the points \\(R\\) and \\(S\\) of the second line and find positions where the status says parallel, perpendicular, coincide or neither.')},
            title: text('Normalni vektor, vzporednost in pravokotnost', 'Normal vector, parallel and perpendicular'),
            formula: String.raw`\vec n=(a,b),\qquad a_1b_2-a_2b_1=0,\qquad a_1a_2+b_1b_2=0`,
            paragraphs: [
                text('Cilj razdelka: iz enačbe premice preberemo normalni vektor in z njim natančno odločimo o vzporednosti in pravokotnosti. Za premico \\(ax+by=c\\) je normalni vektor \\(\\vec n=(a,b)\\), smerni vektor pa \\(\\vec d=(-b,a)\\). Argument: dve točki premice dasta \\(a\\,\\Delta x+b\\,\\Delta y=0\\), to je \\((a,b)\\cdot\\Delta=0\\), zato je \\(\\vec n\\) pravokoten na vsak vektor vzdolž premice.', 'Aim of the section: read the normal vector from the equation of a line and use it to decide parallelism and perpendicularity exactly. For the line \\(ax+by=c\\) the normal vector is \\(\\vec n=(a,b)\\) and the direction vector is \\(\\vec d=(-b,a)\\). Argument: two points of the line give \\(a\\,\\Delta x+b\\,\\Delta y=0\\), that is \\((a,b)\\cdot\\Delta=0\\), so \\(\\vec n\\) is perpendicular to every vector along the line.'),
                text('Definicija: premici sta pravokotni, kadar je skalarni produkt njunih normalnih vektorjev enak \\(0\\), to je \\(a_1a_2+b_1b_2=0\\). Premici sta vzporedni, kadar sta normalna vektorja sorazmerna, to je \\(a_1b_2-a_2b_1=0\\). Obe odločitvi uporabljata le cela števila, zato sta natančni in ne potrebujeta nobene tolerance. Če sta poleg tega tudi okrajšani enačbi enaki, premici sovpadata.', 'Definition: two lines are perpendicular when the dot product of their normal vectors is \\(0\\), that is \\(a_1a_2+b_1b_2=0\\). They are parallel when the normal vectors are proportional, that is \\(a_1b_2-a_2b_1=0\\). Both decisions use only integers, so they are exact and need no tolerance. If in addition the reduced equations are equal, the lines coincide.'),
                text('Zgled: \\(x-2y=-4\\) ima normalo \\((1,-2)\\); premica skozi \\(T=(3,-2)\\), pravokotna nanjo, je \\(2x+y=4\\), saj je \\(2\\cdot3+(-2)=4\\) in \\(1\\cdot2+(-2)\\cdot1=0\\). Smerna koeficienta \\(\\tfrac12\\) in \\(-2\\) imata zmnožek \\(-1\\); to pravilo je posledica definicije in velja le za premice, ki nista navpični. Premici \\(x-2y=-4\\) in \\(x-2y=3\\) sta vzporedni, ker je \\(1\\cdot(-2)-1\\cdot(-2)=0\\).', 'Example: \\(x-2y=-4\\) has the normal \\((1,-2)\\); the line through \\(T=(3,-2)\\) perpendicular to it is \\(2x+y=4\\), since \\(2\\cdot3+(-2)=4\\) and \\(1\\cdot2+(-2)\\cdot1=0\\). The slopes \\(\\tfrac12\\) and \\(-2\\) have product \\(-1\\); this rule is a corollary of the definition and holds only for lines that are not vertical. The lines \\(x-2y=-4\\) and \\(x-2y=3\\) are parallel because \\(1\\cdot(-2)-1\\cdot(-2)=0\\).'),
                text('Navpična in vodoravna premica sta pravokotni, čeprav smernega koeficienta navpične premice ni: normali \\((1,0)\\) in \\((0,1)\\) imata skalarni produkt \\(0\\). Zato je skalarni produkt zanesljivejši od pravila z zmnožkom. Stanje v grafu definicijo ponazarja, dokaz pa ni.Kako to uporabiš: pri nalogi izračunaj oba izraza iz koeficientov in šele nato premisli, ali sta premici vzporedni ali pravokotni.', 'A vertical and a horizontal line are perpendicular although the vertical line has no slope: the normals \\((1,0)\\) and \\((0,1)\\) have dot product \\(0\\). So the dot product is more reliable than the rule with the product of slopes. The status in the graph illustrates the definition and does not prove it. How to use this: in a task compute both expressions from the coefficients and only then decide whether the lines are parallel or perpendicular.'),
            ],
        }),
    ],
};
