import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {ISOMETRIES_CHAPTER_ID, isometriesGuidedExampleDemonstrations, type IsometriesSectionId} from './isometriesChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: IsometriesSectionId) => `${ISOMETRIES_CHAPTER_ID}.${sectionId}.${isometriesGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: IsometriesSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two sections of lessons L1 and L2 with a bilingual intro each. The sections of the similarity,
 * rosette and frieze lessons join in the later batches (docs/tasks/isometries); the chapter is placed in the maps strand after the complex maps,
 * because an isometry is a map of the plane that keeps distances.
 */
export const isometriesChapter: FamilyChapter = {
    id: ISOMETRIES_CHAPTER_ID,
    family: 'maps',
    title: text('Izometrije, podobnost in simetrija', 'Isometries, similarity and symmetry'),
    purpose: text(
        'Izometrija je preslikava ravnine, ki ohranja razdalje med točkami. Poglavje začne pri najpreprostejši izometriji, zrcaljenju v premici, in pokaže, da je vsak togi premik sestavljen iz največ treh zrcaljenj. Z zrcali lahko tako razložimo vrtež, vzporedni premik in zrcalni zdrs ter natančno napovemo, katera od njih nastane. Pozneje poglavje doda podobnost, rozete in friz, kjer se isti pojmi vrnejo kot simetrija vzorca.',
        'An isometry is a map of the plane that keeps the distances between points. The chapter starts from the simplest isometry, the reflection in a line, and shows that every rigid motion is a composite of at most three reflections. Mirrors thus explain the rotation, the translation and the glide reflection, and let us predict exactly which of them occurs. Later the chapter adds similarity, rosettes and friezes, where the same ideas return as the symmetry of a pattern.',
    ),
    prerequisites: text(
        'Koordinatni sistem, vektorji in kot med premicama ter osnovno znanje o zrcaljenju, vrtenju in vzporednem premiku iz geometrije. Matrično zapisano zrcaljenje je enako preslikavam iz poglavja o linearnih preslikavah; zaradi mrežnih točk so vsi računi natančni, brez zaokrožanja.',
        'The coordinate plane, vectors and the angle between two lines, and the basic reflection, rotation and translation from school geometry. The reflection written as a matrix is the same as the maps of the chapter on linear maps; because the mirrors pass through grid points, all computations are exact, with no rounding.',
    ),
    sections: [
        withExample('two-mirrors', {
            id: 'two-mirrors',
            demonstrationIds: ['isometries'],
            investigationPrompts: {isometries: text('V načinu zrcal premikaj točke obeh zrcal in opazuj sestavljeno gibanje: poišči lego, pri kateri je rezultat vrtež, in lego, pri kateri je vzporedni premik; nato zamenjaj vrstni red zrcal.', 'In the mirrors mode move the points of both mirrors and watch the composite motion: find a position where the result is a rotation and one where it is a translation; then swap the order of the mirrors.')},
            title: text('Dve zrcali', 'Two mirrors'),
            formula: String.raw`\sigma_2\circ\sigma_1=\rho_{2\varphi},\qquad \sigma_2\circ\sigma_1=T_{2\vec d}`,
            paragraphs: [
                text('Cilj razdelka: razumeti, kaj naredita dve zaporedni zrcaljenji. Zrcaljenje \\(\\sigma\\) v premici ohrani razdaljo točke od premice in jo prenese na drugo stran. Če zrcalo poteka skozi mrežni točki, ima matrika zrcaljenja racionalne vnose, zato so slike natančne. Zrcaljenje obrne orientacijo: trikotnik \\(ABC\\), obhojen v nasprotni smeri urnega kazalca, se preslika v trikotnik, obhojen v smeri urnega kazalca.', 'Goal of the section: understand what two reflections in a row do. A reflection \\(\\sigma\\) in a line keeps the distance of a point from the line and carries it to the other side. When the mirror passes through two grid points, the reflection matrix has rational entries, so the images are exact. A reflection reverses orientation: a triangle \\(ABC\\) traversed counterclockwise is carried to a triangle traversed clockwise.'),
                text('Izrek: če se zrcali sekata v točki \\(O\\) pod kotom \\(\\varphi\\), je \\(\\sigma_2\\circ\\sigma_1\\) vrtež okoli \\(O\\) za kot \\(2\\varphi\\); najprej deluje prvo zrcalo. Če sta zrcali vzporedni z razdaljo \\(d\\), je sestavljeno gibanje vzporedni premik za \\(2d\\), pravokotno na zrcali. Slika na eni legi ponazori izrek, ne dokaže ga; dokaz je račun z matrikami ali s skladnimi trikotniki.', 'Theorem: if the mirrors meet at a point \\(O\\) at an angle \\(\\varphi\\), then \\(\\sigma_2\\circ\\sigma_1\\) is a rotation about \\(O\\) by the angle \\(2\\varphi\\); the first mirror acts first. If the mirrors are parallel at a distance \\(d\\), the composite is a translation by \\(2d\\), perpendicular to the mirrors. The figure on one position illustrates the theorem; it does not prove it, and the proof is a matrix computation or one with congruent triangles.'),
                text('Zgled: zrcali skozi izhodišče v smereh \\((1,0)\\) in \\((2,1)\\) oklepata kot z \\(\\tan\\varphi=\\tfrac12\\), torej je vrtež za približno \\(53{,}13^\\circ\\). Če zrcali zamenjamo, se vrtež obrne v nasprotno smer: \\(\\sigma_1\\circ\\sigma_2\\) je vrtež za \\(-53{,}13^\\circ\\). Vrstni red zrcal torej šteje, saj sestavljanje zrcaljenj ni komutativno.', 'Example: mirrors through the origin in the directions \\((1,0)\\) and \\((2,1)\\) enclose an angle with \\(\\tan\\varphi=\\tfrac12\\), so the composite is a rotation by about \\(53.13^\\circ\\). Swapping the mirrors turns the rotation the other way: \\(\\sigma_1\\circ\\sigma_2\\) is a rotation by \\(-53.13^\\circ\\). The order of the mirrors therefore matters, because composition of reflections is not commutative.'),
                text('Kako to uporabiš: pri nalogi z dvema zrcaloma najprej preveri, ali sta zrcali vzporedni (vektorski produkt smernih vektorjev je \\(0\\)); če nista, poišči presečišče in kot. Stanje v lekciji je odčitek za izbrano lego, zato iz njega ne sklepaj o drugih legah.', 'How to use it: in a task with two mirrors first check whether the mirrors are parallel (the cross product of the direction vectors is \\(0\\)); if not, find the meeting point and the angle. The state in the lesson is a readout for the chosen position, so do not conclude about other positions from it.'),
            ],
        }),
        withExample('classifying-a-motion', {
            id: 'classifying-a-motion',
            demonstrationIds: ['isometries'],
            investigationPrompts: {isometries: text('V načinu razvrščanja izberi število zrcal od \\(1\\) do \\(3\\), premikaj zrcala in preberi razred gibanja, negibne točke in orientacijo; poišči lego, pri kateri tri zrcala niso zrcaljenje.', 'In the classify mode choose the number of mirrors from \\(1\\) to \\(3\\), move the mirrors and read the class of the motion, the fixed points and the orientation; find a position where three mirrors are not a reflection.')},
            title: text('Razvrščanje gibanj', 'Classifying a motion'),
            formula: String.raw`\det=(-1)^{n},\qquad n\in\{1,2,3\}`,
            paragraphs: [
                text('Cilj razdelka: iz števila zrcal in njihove lege napovedati, katera izometrija nastane. Orientacijo ohranijo sestavi sodega števila zrcal, obrnejo pa jo sestavi lihega števila, saj vsako zrcaljenje obrne orientacijo; determinanta matrike je \\((-1)^n\\). To loči vrtež in vzporedni premik (ohranjata orientacijo) od zrcaljenja in zrcalnega zdrsa (obrneta jo).', 'Goal of the section: from the number of mirrors and their position predict which isometry occurs. An even number of mirrors preserves orientation and an odd number reverses it, because each reflection reverses orientation; the determinant of the matrix is \\((-1)^n\\). This separates the rotation and the translation (which preserve orientation) from the reflection and the glide reflection (which reverse it).'),
                text('Izrek: vsaka izometrija ravnine je sestavljena iz največ treh zrcaljenj. Eno zrcalo je zrcaljenje, dve sta vrtež ali vzporedni premik, tri pa zrcaljenje ali zrcalni zdrs, to je zrcaljenje, ki mu sledi vzporedni premik vzdolž zrcala. Negibne točke razkrijejo razred: zrcaljenje jih ima cel premico, vrtež eno, vzporedni premik in zrcalni zdrs pa nobene.', 'Theorem: every isometry of the plane is a composite of at most three reflections. One mirror is a reflection, two are a rotation or a translation, and three are a reflection or a glide reflection, that is a reflection followed by a translation along the mirror. The fixed points reveal the class: a reflection has a whole line of them, a rotation one, and a translation and a glide reflection none.'),
                text('Zgled: zrcali \\(x\\)-os in \\(y\\)-os skupaj sta vrtež za \\(180^\\circ\\) okoli izhodišča, z eno negibno točko. Tri zrcala so zrcaljenje le v posebnih legah, na primer ko gredo vsa skozi isto točko; v splošni legi dajo zrcalni zdrs brez negibnih točk. Zato pri trojici zrcal ne ugibaj, ampak preberi negibne točke.', 'Example: the mirrors given by the \\(x\\)-axis and the \\(y\\)-axis together make a rotation by \\(180^\\circ\\) about the origin, with one fixed point. Three mirrors make a reflection only in special positions, for instance when all pass through one point; in a general position they make a glide reflection with no fixed point. So with three mirrors do not guess, read the fixed points.'),
                text('Kako to uporabiš: pri vsaki izometriji najprej presodi, ali ohrani orientacijo, nato poišči negibne točke; ta dva podatka določita razred. Ponazoritev na izbranih legah ni dokaz izreka o treh zrcalih.', 'How to use it: for any isometry first decide whether it preserves orientation, then look for fixed points; these two facts determine the class. The illustration on chosen positions is not a proof of the three-mirror theorem.'),
            ],
        }),
    ],
};
