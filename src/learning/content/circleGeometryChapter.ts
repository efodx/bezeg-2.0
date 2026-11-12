import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {CIRCLE_GEOMETRY_CHAPTER_ID, circleGeometryGuidedExampleDemonstrations, type CircleGeometrySectionId} from './circleGeometryChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: CircleGeometrySectionId) => `${CIRCLE_GEOMETRY_CHAPTER_ID}.${sectionId}.${circleGeometryGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: CircleGeometrySectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two circle-construction sections CG1 and CG2 with a short bilingual intro each. The sections of the
 * lessons CG3 and CG4 (the Apollonius circle and the common tangents of two circles) and the guided examples of batch B join in task 05; the chapter is
 * placed in the plane-geometry strand because the circle-construction Demonstration belongs to the plane-geometry family.
 */
export const circleGeometryChapter: FamilyChapter = {
    id: CIRCLE_GEOMETRY_CHAPTER_ID,
    family: 'plane-geometry',
    title: text('Geometrija krožnice', 'Circle geometry and constructions'),
    purpose: text(
        'Krožnica je z računom in z ravnilom in šestilom povezana na več načinov. Poglavje začne z vprašanjem, koliko tangent gre skozi dano točko, in odgovor poišče z natančnim računom potence točke na krožnico, ne s sliko. Nato nariše tangenti s krožnico nad premerom in utemelji, da sta res tangenti. Drugi del primerja potence na dve krožnici: točke z enako potenco ležijo na premici, ki ji pravimo potenčna premica, in tri takšne premice se sekajo v potenčnem središču. Tako se vsaka trditev izrecno loči od slike, ki jo le ponazarja.',
        'The circle is connected to calculation and to straightedge and compass in several ways. The chapter starts from the question of how many tangents pass through a given point and answers it with an exact computation of the power of a point with respect to a circle, not with a picture. Then it draws the tangents with the circle over a diameter and argues that they really are tangents. The second part compares the powers with respect to two circles: points of equal power lie on a line called the radical axis, and three such lines meet in the radical centre. In this way every claim is kept apart from the picture that merely illustrates it.',
    ),
    prerequisites: text(
        'Pitagorov izrek, skalarni produkt vektorjev ter Talesov izrek in obodni kot. Poglavje ne ponavlja potence točke in inverzije: ta sta v poglavju Geometrija trikotnika in inverzija.',
        'The Pythagorean theorem, the dot product of vectors, and Thales\' theorem and the inscribed angle. The chapter does not repeat the power of a point and inversion: these are in the chapter Triangle geometry and inversion.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/triangle-geometry#notable-points', title: text('Geometrija trikotnika: znamenite točke in očrtana krožnica', 'Triangle geometry: notable points and the circumcircle')},
        {path: '/bezeg-2.0/learn/triangle-geometry#inscribed-angle', title: text('Geometrija trikotnika: obodni kot in Talesov izrek', 'Triangle geometry: the inscribed angle and Thales\' theorem')},
    ],
    sections: [
        withExample('tangents-from-a-point', {
            id: 'tangents-from-a-point',
            demonstrationIds: ['circle-construction'],
            investigationPrompts: {'circle-construction': text('Povleci točko \\(P\\) čez krožnico in napovej, koliko tangent gre skozi njo; nato poišči lego, pri kateri je potenca \\(0\\), in lego, pri kateri tangent ni.', 'Drag the point \\(P\\) across the circle and predict how many tangents pass through it; then find a position where the power is \\(0\\) and one where there is no tangent.')},
            title: text('Tangente iz točke', 'Tangents from a point'),
            formula: String.raw`|PT|^2=|PO|^2-\rho^2,\qquad (T-O)\cdot(T-P)=0`,
            paragraphs: [
                text('Cilj razdelka: iz položaja točke \\(P\\) glede na krožnico s središčem \\(O\\) in polmerom \\(\\rho\\) vemo, koliko tangent gre skozi \\(P\\), in jih znamo narisati. Definicija: potenca točke je \\(p(P)=|PO|^2-\\rho^2\\). Zunaj krožnice je pozitivna in tangenti sta dve, na krožnici je \\(0\\) in tangenta je ena, v notranjosti je negativna in tangent ni. Odločitev je predznak natančno izračunane potence.', 'Aim of the section: from the position of the point \\(P\\) with respect to the circle with centre \\(O\\) and radius \\(\\rho\\) we know how many tangents pass through \\(P\\) and can draw them. Definition: the power of a point is \\(p(P)=|PO|^2-\\rho^2\\). Outside the circle it is positive and there are two tangents, on the circle it is \\(0\\) and there is one tangent, inside it is negative and there is none. The decision is the sign of the exactly computed power.'),
                text('Konstrukcija: za zunanjo točko narišemo krožnico nad premerom \\(OP\\). Seka dano krožnico v dveh točkah \\(T_1\\) in \\(T_2\\). Argument: po Talesovem izreku je v vsaki od njiju kot \\(OTP\\) pravi, torej je \\(PT\\perp OT\\), in premica pravokotno na polmer v krajišču je tangenta. Tako sta \\(PT_1\\) in \\(PT_2\\) res tangenti.', 'Construction: for an outer point we draw the circle over the diameter \\(OP\\). It meets the given circle in two points \\(T_1\\) and \\(T_2\\). Argument: by Thales\' theorem the angle \\(OTP\\) is right at each of them, so \\(PT\\perp OT\\), and a line perpendicular to a radius at its endpoint is a tangent. So \\(PT_1\\) and \\(PT_2\\) really are tangents.'),
                text('Zgled: za \\(O=(0,0)\\), \\(\\rho=5\\) in \\(P=(13,0)\\) je potenca \\(169-25=144\\) in tangentna odseka sta dolga \\(\\sqrt{144}=12\\), ker v pravokotnem trikotniku \\(OTP\\) velja Pitagorov izrek. Odseka sta enako dolga, ker imata trikotnika skupno hipotenuzo in enako kateto. Dotikališči sta približno \\((1{,}9231;\\ \\pm4{,}6154)\\) in ležita na tetivi dotikališč \\(13x=25\\).', 'Example: for \\(O=(0,0)\\), \\(\\rho=5\\) and \\(P=(13,0)\\) the power is \\(169-25=144\\) and the tangent segments are \\(\\sqrt{144}=12\\) long, because the Pythagorean theorem holds in the right triangle \\(OTP\\). The segments are equally long because the triangles have a common hypotenuse and an equal leg. The points of contact are approximately \\((1.9231,\\ \\pm4.6154)\\) and lie on the chord of contact \\(13x=25\\).'),
                text('Slika kaže en položaj, zato je premikanje točke ponazoritev, ne dokaz. Skozi točko v notranjosti je vsaka premica sekanta, skozi točko na krožnici je vsaka premica razen tangente sekanta. Če je \\(P=O\\), tangente ni. Kako to uporabiš: pri nalogi najprej izračunaj potenco, šele nato riši tangenti; njuni dolžini dobiš brez konstrukcije kot \\(\\sqrt{p(P)}\\).', 'The picture shows one position, so moving the point is an illustration, not a proof. Through a point inside every line is a secant, and through a point on the circle every line except the tangent is a secant. If \\(P=O\\) there is no tangent. How to use this: in a task first compute the power and only then draw the tangents; you get their length without a construction as \\(\\sqrt{p(P)}\\).'),
            ],
        }),
        withExample('radical-axis-and-centre', {
            id: 'radical-axis-and-centre',
            demonstrationIds: ['circle-construction'],
            investigationPrompts: {'circle-construction': text('Premikaj točko \\(P\\) in primerjaj njeni potenci na krožnici \\(1\\) in \\(2\\); spreminjaj krožnici in poišči, kje je potenčna premica, ko se krožnici sekata, dotikata ali sta ločeni.', 'Move the point \\(P\\) and compare its powers with respect to the circles \\(1\\) and \\(2\\); change the circles and find where the radical axis is when the circles cross, touch or are apart.')},
            title: text('Potenčna premica in potenčno središče', 'Radical axis and radical centre'),
            formula: String.raw`2(O_2-O_1)\cdot X=|O_2|^2-|O_1|^2-\rho_2^2+\rho_1^2`,
            paragraphs: [
                text('Cilj razdelka: poiščemo točke, ki imajo enako potenco na dve krožnici, in na koncu še točko z enako potenco na tri krožnice. Izrek: če sta središči različni, te točke ležijo na premici, pravokotni na zveznico središč, to je na potenčni premici. Argument: v enačbi \\(|X-O_1|^2-\\rho_1^2=|X-O_2|^2-\\rho_2^2\\) se kvadrata \\(|X|^2\\) odštejeta in ostane enačba, linearna v \\(X\\).', 'Aim of the section: find the points that have equal power with respect to two circles, and finally a point of equal power with respect to three circles. Theorem: if the centres are different, these points lie on a line perpendicular to the line of centres, the radical axis. Argument: in the equation \\(|X-O_1|^2-\\rho_1^2=|X-O_2|^2-\\rho_2^2\\) the squares \\(|X|^2\\) cancel and an equation linear in \\(X\\) remains.'),
                text('Zgled: za krožnici s središčema \\((0,0)\\) in \\((6,0)\\) ter polmeroma \\(5\\) in \\(3\\) dobimo \\(12x=52\\), to je \\(x=\\tfrac{13}{3}\\). Skupni točki krožnic imata potenco \\(0\\) na obe, zato ležita na tej premici. Pri dotikajočih se krožnicah gre premica skozi dotikališče, pri ločenih leži med njima.', 'Example: for the circles with centres \\((0,0)\\) and \\((6,0)\\) and radii \\(5\\) and \\(3\\) we get \\(12x=52\\), that is \\(x=\\tfrac{13}{3}\\). The common points of the circles have power \\(0\\) with respect to both, so they lie on this line. For touching circles the line passes through the point of contact, for separate circles it lies between them.'),
                text('Tri krožnice s središči, ki niso na isti premici, imajo tri potenčne premice. Argument: točka, v kateri se sekata dve, ima enako potenco na vse tri krožnice, zato leži tudi na tretji; to je potenčno središče. Za \\(c_3\\) s središčem \\((3,6)\\) in polmerom \\(2\\) je potenčno središče \\((\\tfrac{13}{3},\\tfrac{10}{3})\\) s potenco \\(\\tfrac{44}{9}\\approx4{,}8889\\).', 'Three circles with centres that are not on one line have three radical axes. Argument: the point where two of them meet has equal power with respect to all three circles, so it also lies on the third; this is the radical centre. For \\(c_3\\) with centre \\((3,6)\\) and radius \\(2\\) the radical centre is \\((\\tfrac{13}{3},\\tfrac{10}{3})\\) with the power \\(\\tfrac{44}{9}\\approx4.8889\\).'),
                text('Slika ponazarja izbrane krožnice, zato posplošitev dajeta argumenta, ne premikanje. Sosrediščni krožnici nimata potenčne premice; če so središča na isti premici, sta premici vzporedni in potenčnega središča ni, razen če sovpadata. Kako to uporabiš: pri nalogi izračunaj razliko enačb obeh krožnic, saj je linearna, in presečišče dveh takih premic je iskana točka.', 'The picture illustrates the chosen circles, so the generalisation comes from the arguments, not from moving things around. Concentric circles have no radical axis; if the centres are on one line, the axes are parallel and there is no radical centre, unless they coincide. How to use this: in a task compute the difference of the equations of two circles, which is linear, and the intersection of two such lines is the point you want.'),
            ],
        }),
    ],
};
