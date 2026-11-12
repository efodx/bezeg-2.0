import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {KINEMATICS_CHAPTER_ID, kinematicsGuidedExampleDemonstrations, type KinematicsSectionId} from './kinematicsChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: KinematicsSectionId) => `${KINEMATICS_CHAPTER_ID}.${sectionId}.${kinematicsGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: KinematicsSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two sections of the lessons KN1 (position, velocity and acceleration) and KN2 (speed and
 * parametrization), each with a bilingual intro and its example at the end. The sections of the later lessons (projectile, tangential and normal
 * acceleration of the other motions) join in tasks 05 and 06. The chapter sits in the curves strand directly after the geometry of curves, whose
 * parametric curve, tangent and curvature it uses.
 */
export const kinematicsChapter: FamilyChapter = {
    id: KINEMATICS_CHAPTER_ID,
    family: '/bezeg-2.0/curve-geometry',
    title: text('Kinematika na krivuljah', 'Kinematics on curves'),
    purpose: text(
        'Kinematika opisuje gibanje točke po poti, ne da bi spraševala po silah. Poglavje začne z lego, hitrostjo in pospeškom kot vektorji, ki jih dobimo z odvajanjem parametrične krivulje po času, in pokaže, da hitrost leži na tangenti poti, pospešek pa kaže drugam. Nato isto pot vozi z različnimi parametrizacijami in loči, kaj se spremeni (hitrost, pospešek, čas prihoda) in kaj ne (pot, njena dolžina, smer tangente, ukrivljenost). Slika je vedno en primer gibanja, izreki pa dobijo argument v besedilu.',
        'Kinematics describes the motion of a point along a path without asking about forces. The chapter starts with position, velocity and acceleration as vectors obtained by differentiating a parametric curve with respect to time, and shows that the velocity lies on the tangent of the path while the acceleration points elsewhere. Then it drives the same path with different parametrizations and separates what changes (the speed, the acceleration, the time of arrival) from what does not (the path, its length, the direction of the tangent, the curvature). The picture is always one example of a motion, and the theorems get their argument in the text.',
    ),
    prerequisites: text(
        'Parametrična krivulja \\(r(t)\\), njen odvod kot tangentni vektor in ukrivljenost iz poglavja Geometrija krivulj ter osnovno odvajanje. Dolžina loka in enakomerna parametrizacija sta nadaljevanje: tu ju le povežemo z gibanjem, ne izpeljemo ju znova.',
        'A parametric curve \\(r(t)\\), its derivative as a tangent vector and the curvature from the Geometry of curves chapter, and basic differentiation. Arc length and the uniform parametrization are a continuation: this chapter only connects them to motion and does not derive them again.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/curve-geometry#curve-parametric', title: text('Geometrija krivulj: parametrična krivulja in tangenta', 'Geometry of curves: the parametric curve and the tangent')},
        {path: '/bezeg-2.0/learn/curve-geometry#curve-curvature', title: text('Geometrija krivulj: ukrivljenost', 'Geometry of curves: curvature')},
        {path: '/bezeg-2.0/learn/advanced-bezier#arc-length-param', title: text('Napredne Bézierjeve krivulje: dolžina loka in parametrizacija z dolžino loka', 'Advanced Bézier curves: arc length and the arc-length parametrization')},
        {path: '/bezeg-2.0/learn/parametrization#uniform-timing', title: text('Parametrizacija: enakomerna časovna parametrizacija', 'Parametrization: uniform timing')},
    ],
    sections: [
        withExample('position-velocity-acceleration', {
            id: 'position-velocity-acceleration',
            demonstrationIds: ['curve-kinematics'],
            investigationPrompts: {'curve-kinematics': text('Premikaj čas po cikloidi in pri vsakem času napovej smer hitrosti, preden prižgeš puščice. Poišči čas, pri katerem je hitrost \\(0\\), in preveri, da je pospešek takrat različen od \\(0\\). Nato izberi drugo gibanje in poišči mesto, kjer pospešek ni vzporeden s hitrostjo.', 'Move the time along the cycloid and at each time predict the direction of the velocity before you switch the arrows on. Find the time at which the velocity is \\(0\\) and check that the acceleration is not \\(0\\) then. Then choose another motion and find a place where the acceleration is not parallel to the velocity.')},
            title: text('Lega, hitrost in pospešek', 'Position, velocity and acceleration'),
            formula: String.raw`v(t)=r'(t),\qquad a(t)=r''(t)`,
            paragraphs: [
                text('Cilj razdelka: brati gibanje točke po poti kot tri vektorje. Definicija: lega \\(r(t)\\) je točka ob času \\(t\\), hitrost \\(v(t)=r\'(t)\\) je prvi odvod lege po času, pospešek \\(a(t)=r\'\'(t)\\) pa odvod hitrosti. Hitrost leži na tangenti poti, njena dolžina \\(|v|\\) je hitrost v običajnem pomenu, enote pa so metri in sekunde. Preden graf prikaže puščici, napovej njuno smer.', 'Goal of this section: read the motion of a point along a path as three vectors. Definition: the position \\(r(t)\\) is a point at time \\(t\\), the velocity \\(v(t)=r\'(t)\\) is the first derivative of the position with respect to time, and the acceleration \\(a(t)=r\'\'(t)\\) is the derivative of the velocity. The velocity lies on the tangent of the path, its length \\(|v|\\) is the speed in the usual sense, and the units are metres and seconds. Before the graph shows the arrows, predict their direction.'),
                text('Zgled je cikloida, pot točke na robu kolesa s polmerom \\(1\\ \\mathrm{m}\\), ki se kotali po tleh: \\(r(t)=(t-\\sin t;\\,1-\\cos t)\\). Odvajanje po komponentah da \\(r\'(t)=(1-\\cos t;\\,\\sin t)\\) in \\(r\'\'(t)=(\\sin t;\\,\\cos t)\\). Na vrhu loka, pri \\(t=\\pi\\), je hitrost \\((2;\\,0)\\ \\mathrm{m/s}\\) in pospešek \\((0;\\,-1)\\ \\mathrm{m/s^2}\\): točka teče vodoravno, pospešek pa kaže navpično navzdol.', 'The example is the cycloid, the path of a point on the rim of a wheel of radius \\(1\\ \\mathrm{m}\\) rolling on the ground: \\(r(t)=(t-\\sin t;\\,1-\\cos t)\\). Differentiating by components gives \\(r\'(t)=(1-\\cos t;\\,\\sin t)\\) and \\(r\'\'(t)=(\\sin t;\\,\\cos t)\\). At the top of the arch, at \\(t=\\pi\\), the velocity is \\((2;\\,0)\\ \\mathrm{m/s}\\) and the acceleration is \\((0;\\,-1)\\ \\mathrm{m/s^2}\\): the point runs horizontally, and the acceleration points straight down.'),
                text('Izrek, ki ga slika ponazori: hitrost je vedno tangentna na pot, pospešek pa ni nujno vzporeden s hitrostjo. Njegovo komponento vzdolž tangente spreminja hitrost, pravokotno komponento pa smer gibanja. Zato lahko točka pri konstantni hitrosti vseeno pospešuje, kakor pri vožnji po krožnici.', 'A theorem the picture illustrates: the velocity is always tangent to the path, but the acceleration need not be parallel to the velocity. Its component along the tangent changes the speed, and its perpendicular component changes the direction of motion. So a point can accelerate even at constant speed, as in driving along a circle.'),
                text('Meje: ob \\(t=0\\) je hitrost cikloide \\((0;\\,0)\\), točka se na trenutek ustavi, pospešek pa je \\((0;\\,1)\\ \\mathrm{m/s^2}\\), različen od \\(0\\). Hitrost \\(0\\) torej ne pomeni pospeška \\(0\\). Pri takšni špici graf ne nariše puščice hitrosti, ker je smer gibanja nedoločena. Merili puščic hitrosti in pospeška sta različni, zato njunih dolžin ne primerjamo.', 'Limits: at \\(t=0\\) the velocity of the cycloid is \\((0;\\,0)\\), the point stops for an instant, while the acceleration is \\((0;\\,1)\\ \\mathrm{m/s^2}\\), not \\(0\\). A velocity \\(0\\) does not mean an acceleration \\(0\\). At such a cusp the graph draws no velocity arrow, because the direction of motion is undefined. The scales of the velocity and acceleration arrows differ, so their lengths are not compared.'),
            ],
        }),
        withExample('speed-and-parametrization', {
            id: 'speed-and-parametrization',
            demonstrationIds: ['curve-kinematics'],
            investigationPrompts: {'curve-kinematics': text('Izberi krožno gibanje in spreminjaj parameter \\(b\\) od \\(0\\) do \\(0{,}9\\). Pri vsaki vrednosti premakni čas na \\(\\pi/2\\) in na \\(\\pi\\) ter primerjaj hitrost in pospešek; opazuj, da točka vedno leži na isti krožnici. Prižgi razcep pospeška in preveri, da je normalni del vedno enak \\(\\kappa v^2\\).', 'Choose the circular motion and vary the parameter \\(b\\) from \\(0\\) to \\(0.9\\). For each value move the time to \\(\\pi/2\\) and to \\(\\pi\\) and compare the speed and the acceleration; notice that the point always stays on the same circle. Switch on the split of the acceleration and check that the normal part always equals \\(\\kappa v^2\\).')},
            title: text('Hitrost in parametrizacija', 'Speed and parametrization'),
            formula: String.raw`r'=\theta'\,T,\qquad a_T=\theta'',\qquad a_N=\kappa v^2`,
            paragraphs: [
                text('Cilj razdelka: ločiti pot od načina, kako jo prevozimo. Definicija: parametrizacija je funkcija, ki vsakemu času priredi točko poti; ista pot ima neskončno parametrizacij. Zgled je enotska krožnica, ki jo vozimo s kotom \\(\\theta(t)=t+b\\sin t\\): za \\(b=0\\) je gibanje enakomerno s hitrostjo \\(1\\ \\mathrm{m/s}\\), za \\(b=0{,}5\\) pa točka na krožnici hiti in se upočasnjuje.', 'Goal of this section: separate the path from the way it is travelled. Definition: a parametrization is a function that assigns a point of the path to every time; one path has infinitely many parametrizations. The example is the unit circle driven by the angle \\(\\theta(t)=t+b\\sin t\\): for \\(b=0\\) the motion is uniform with speed \\(1\\ \\mathrm{m/s}\\), while for \\(b=0.5\\) the point on the circle speeds up and slows down.'),
                text('Izrek: za \\(r(t)=(\\cos\\theta;\\,\\sin\\theta)\\) velja \\(r\'=\\theta\'\\,T\\) z enotsko tangento \\(T\\), torej \\(|v|=|\\theta\'|=1+b\\cos t\\). Argument je verižno pravilo: vsaka parametrizacija iste poti da vektor hitrosti v isti smeri \\(T\\), spremeni se le dolžina. Pospešek razpade na tangentni del \\(a_T=\\theta\'\'\\) in normalni del \\(a_N=\\kappa v^2\\); ker je pot ista krožnica, je \\(\\kappa=1\\ \\mathrm{m^{-1}}\\) pri vsaki parametrizaciji.', 'Theorem: for \\(r(t)=(\\cos\\theta;\\,\\sin\\theta)\\) we have \\(r\'=\\theta\'\\,T\\) with the unit tangent \\(T\\), so \\(|v|=|\\theta\'|=1+b\\cos t\\). The argument is the chain rule: every parametrization of the same path gives a velocity vector in the same direction \\(T\\), and only the length changes. The acceleration splits into the tangential part \\(a_T=\\theta\'\'\\) and the normal part \\(a_N=\\kappa v^2\\); because the path is the same circle, \\(\\kappa=1\\ \\mathrm{m^{-1}}\\) for every parametrization.'),
                text('Zgled: pri \\(b=0{,}5\\) je ob \\(t=\\pi/2\\) hitrost \\(1\\ \\mathrm{m/s}\\), ob \\(t=\\pi\\) pa le \\(0{,}5\\ \\mathrm{m/s}\\); normalni pospešek je tam \\(a_N=1\\cdot0{,}5^2=0{,}25\\ \\mathrm{m/s^2}\\). Pot, njena dolžina in ukrivljenost so enake kakor pri \\(b=0\\); drugačna sta hitrost in čas, ob katerem pridemo na vrh. Kdor želi enakomerno hitrost, uporabi parametrizacijo z dolžino loka, kakor v povezanih poglavjih.', 'Example: for \\(b=0.5\\) the speed at \\(t=\\pi/2\\) is \\(1\\ \\mathrm{m/s}\\) and at \\(t=\\pi\\) only \\(0.5\\ \\mathrm{m/s}\\); the normal acceleration there is \\(a_N=1\\cdot0.5^2=0.25\\ \\mathrm{m/s^2}\\). The path, its length and its curvature are the same as for \\(b=0\\); different are the speed and the time at which the top is reached. Whoever wants a uniform speed uses the arc-length parametrization, as in the linked chapters.'),
                text('Meje: za \\(b\\ge1\\) kot \\(\\theta\\) ni več strogo naraščajoč in bi se točka vračala, zato drsnik sega samo do \\(0{,}9\\). Ob \\(t=\\pi\\) je \\(a_T\\) približno \\(0\\), a to je trenutek najmanjše hitrosti, ne stalna hitrost. Graf ne nariše grafa hitrosti v odvisnosti od časa; hitrost preberemo iz odčitka ob izbranem času.', 'Limits: for \\(b\\ge1\\) the angle \\(\\theta\\) is no longer strictly increasing and the point would turn back, so the slider stops at \\(0.9\\). At \\(t=\\pi\\) the value \\(a_T\\) is approximately \\(0\\), but this is the moment of smallest speed, not a constant speed. The graph draws no graph of the speed against time; the speed is read from the readout at the chosen time.'),
            ],
        }),
    ],
};
