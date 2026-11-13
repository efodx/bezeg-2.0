import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {MECHANICAL_CURVES_CHAPTER_ID, mechanicalCurvesGuidedExampleDemonstrations, type MechanicalCurvesSectionId} from './mechanicalCurvesChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: MechanicalCurvesSectionId) => `${MECHANICAL_CURVES_CHAPTER_ID}.${sectionId}.${mechanicalCurvesGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: MechanicalCurvesSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batches A and B): the sections of the lessons MC1 (the race of three tracks), MC2 (drag the track) and MC3 (the tautochrone), each with a
 * bilingual intro and its example at the end. The chapter sits in the curves strand directly after the
 * kinematics of curves, whose velocity and speed the descent time uses.
 */
export const mechanicalCurvesChapter: FamilyChapter = {
    id: MECHANICAL_CURVES_CHAPTER_ID,
    family: '/bezeg-2.0/curve-geometry',
    title: text('Mehanske krivulje: najhitrejši spust', 'Mechanical curves: the fastest descent'),
    purpose: text(
        'Kroglica drsi brez trenja po tiru od točke \\(A\\) do točke \\(B\\), ki leži nižje. Poglavje vpraša, kateri tir je najhitrejši, in odgovor ni najkrajša pot: premica je najkrajša, a počasnejša od cikloide. Najprej tri tire primerjamo na grafu, nato tir oblikujemo sami in vidimo, da je čas spusta integral, ki ga graf izračuna. Optimalnost cikloide je izrek variacijskega računa; graf jo ponazori, ne dokaže.',
        'A bead slides without friction along a track from a point \\(A\\) to a lower point \\(B\\). The chapter asks which track is fastest, and the answer is not the shortest path: the line is the shortest but slower than the cycloid. First we compare three tracks on the graph, then we shape a track ourselves and see that the descent time is an integral that the graph computes. The optimality of the cycloid is a theorem of the calculus of variations; the graph illustrates it and does not prove it.',
    ),
    prerequisites: text(
        'Parametrična krivulja \\(r(t)\\), hitrost kot dolžina odvoda in Bézierjeva krivulja s kontrolnimi točkami; iz fizike le energijski zakon, po katerem hitrost kroglice določa padec višine. Določeni integral uporabimo kot orodje, ki ga graf izračuna namesto nas.',
        'A parametric curve \\(r(t)\\), the speed as the length of the derivative and a Bézier curve with control points; from physics only the law of energy, by which the drop in height determines the speed of the bead. The definite integral is used as a tool that the graph computes for us.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/kinematics#speed-and-parametrization', title: text('Kinematika na krivuljah: hitrost in parametrizacija', 'Kinematics on curves: speed and parametrization')},
        {path: '/bezeg-2.0/learn/curve-geometry#curve-parametric', title: text('Geometrija krivulj: parametrična krivulja in tangenta', 'Geometry of curves: the parametric curve and the tangent')},
    ],
    sections: [
        withExample('race-the-tracks', {
            id: 'race-the-tracks',
            demonstrationIds: ['mechanics-descent'],
            investigationPrompts: {'mechanics-descent': text('Napovej, katera kroglica bo prva v \\(B\\), nato premakni čas in preveri napoved. Spremeni polmer \\(r\\) na \\(0{,}25\\) in na \\(3\\) ter ugotovi, ali je vrstni red tirov še vedno enak in kolikšen je količnik časa po premici in po cikloidi.', 'Predict which bead reaches \\(B\\) first, then move the time and check the prediction. Change the radius \\(r\\) to \\(0.25\\) and to \\(3\\) and find out whether the order of the tracks stays the same and what the quotient of the time along the line and along the cycloid is.')},
            title: text('Tekma treh tirov', 'The race of three tracks'),
            formula: String.raw`v=\sqrt{2gh},\qquad T=\int \frac{ds}{v}`,
            paragraphs: [
                text('Cilj razdelka: napovedati zmagovalca tekme in ugotoviti, zakaj najkrajša pot ni najhitrejša. Definicija: tir je krivulja, po kateri drsi kroglica, čas spusta pa je čas, ki ga kroglica potrebuje od \\(A\\) do \\(B\\). Trije tiri imajo isti začetek \\(A\\) in isti konec \\(B\\): premica, krožni lok in cikloida s polmerom kotalečega se kroga \\(r\\).', 'Goal of this section: predict the winner of the race and find out why the shortest path is not the fastest. Definition: a track is the curve along which the bead slides, and the descent time is the time the bead needs from \\(A\\) to \\(B\\). The three tracks share the start \\(A\\) and the end \\(B\\): a line, a circular arc and a cycloid with rolling-circle radius \\(r\\).'),
                text('Argument: po energijskem zakonu ima kroglica po padcu za višino \\(h\\) hitrost \\(v=\\sqrt{2gh}\\), neodvisno od oblike tira. Čas \\(T=\\int ds/v\\) je zato odvisen le od tega, kako dolg je tir na posamezni višini: strm začetek hitro nabere hitrost, ki jo kasneje koristimo. Premica je najkrajša, a začne z blažjim naklonom in zato izgubi.', 'Argument: by the law of energy the bead has the speed \\(v=\\sqrt{2gh}\\) after a drop of height \\(h\\), regardless of the shape of the track. So the time \\(T=\\int ds/v\\) depends only on how long the track is at each height: a steep start quickly gains speed that is used later. The line is the shortest but starts with a gentler slope and therefore loses.'),
                text('Zgled: pri \\(r=1\\ \\mathrm{m}\\) je konec \\(B\\) približno \\((3{,}14;\\,2)\\ \\mathrm{m}\\), čas po cikloidi \\(1{,}003\\ \\mathrm{s}\\), po krožnem loku \\(1{,}0285\\ \\mathrm{s}\\) in po premici \\(1{,}189\\ \\mathrm{s}\\); premica je počasnejša za \\(18{,}5\\,\\%\\). Ta delež ostane pri vsakem polmeru, ker se vsi časi spreminjajo z \\(\\sqrt r\\).', 'Example: for \\(r=1\\ \\mathrm{m}\\) the end \\(B\\) is approximately \\((3.14;\\,2)\\ \\mathrm{m}\\), the time along the cycloid is \\(1.003\\ \\mathrm{s}\\), along the circular arc \\(1.0285\\ \\mathrm{s}\\) and along the line \\(1.189\\ \\mathrm{s}\\); the line is slower by \\(18.5\\,\\%\\). This share stays for every radius, because all the times scale with \\(\\sqrt r\\).'),
                text('Meje: graf primerja le tri tire, zato ne dokaže, da hitrejšega ni. Drsenje brez trenja je idealizacija, prava kroglica bi se tudi vrtela in izgubljala energijo. Konec \\(B\\) je vedno konec enega loka cikloide, ne poljubna točka.', 'Limits: the graph compares only three tracks, so it does not prove that no faster one exists. Sliding without friction is an idealization; a real bead would also spin and lose energy. The end \\(B\\) is always the end of one arch of the cycloid, not an arbitrary point.'),
            ],
        }),
        withExample('drag-the-track', {
            id: 'drag-the-track',
            demonstrationIds: ['mechanics-descent'],
            investigationPrompts: {'mechanics-descent': text('Preklopi na poskus s tirom in povleci kontrolni točki \\(P_1\\) in \\(P_2\\) tako, da je čas po tiru čim manjši. Primerjaj ga s časom po cikloidi skozi iste točke \\(A\\) in \\(B\\). Nato postavi \\(P_1\\) na \\((1;\\,0)\\) in preberi, kaj graf pove o vodoravnem začetku.', 'Switch to the track experiment and drag the control points \\(P_1\\) and \\(P_2\\) so that the time along the track is as small as possible. Compare it with the time along the cycloid through the same points \\(A\\) and \\(B\\). Then put \\(P_1\\) at \\((1;\\,0)\\) and read what the graph says about a horizontal start.')},
            title: text('Povleci tir', 'Drag the track'),
            formula: String.raw`T=\int_0^1 \frac{|c'(u)|}{\sqrt{2g\,y(u)}}\,du`,
            paragraphs: [
                text('Cilj razdelka: tir oblikovati sam in videti, kako se čas spusta spreminja. Definicija: tir je Bézierjeva krivulja \\(c(u)\\) s kontrolnimi točkami \\(A\\), \\(P_1\\), \\(P_2\\) in \\(B\\), \\(y(u)\\) pa je globina točke \\(c(u)\\) pod \\(A\\); čas spusta je zgornji integral \\(T\\), graf pa ga izračuna numerično za vsako lego točk.', 'Goal of this section: shape a track yourself and see how the descent time changes. Definition: the track is a Bézier curve \\(c(u)\\) with control points \\(A\\), \\(P_1\\), \\(P_2\\) and \\(B\\), and \\(y(u)\\) is the depth of the point \\(c(u)\\) below \\(A\\); the descent time is the integral \\(T\\) above, and the graph computes it numerically for every position of the points.'),
                text('Izrek, ki ga vlečenje ponazori: med vsemi tiri skozi \\(A\\) in \\(B\\) je čas po cikloidi najmanjši. Dokaz je izrek variacijskega računa (Eulerjeva enačba), ne vlečenje. Z vlečenjem lahko le poiščeš tire, ki so cikloidi vse bližje, in vidiš, da razlika ni nikoli negativna.', 'A theorem the dragging illustrates: among all tracks through \\(A\\) and \\(B\\) the time along the cycloid is the smallest. The proof is a theorem of the calculus of variations (the Euler equation), not the dragging. By dragging you can only find tracks that come ever closer to the cycloid and see that the difference is never negative.'),
                text('Zgled: privzeti tir s točkama \\(P_1=(0{,}5;\\,2)\\) in \\(P_2=(2;\\,2{,}5)\\) potrebuje \\(1{,}0366\\ \\mathrm{s}\\), cikloida skozi iste točke \\(A\\) in \\(B\\) pa \\(1{,}0203\\ \\mathrm{s}\\); razlika je \\(0{,}0163\\ \\mathrm{s}\\), to je \\(1{,}6\\,\\%\\). Tir se ji močno približa, a je ne preseže.', 'Example: the default track with the points \\(P_1=(0.5;\\,2)\\) and \\(P_2=(2;\\,2.5)\\) needs \\(1.0366\\ \\mathrm{s}\\), and the cycloid through the same points \\(A\\) and \\(B\\) \\(1.0203\\ \\mathrm{s}\\); the difference is \\(0.0163\\ \\mathrm{s}\\), that is \\(1.6\\,\\%\\). The track comes close to it but does not beat it.'),
                text('Meje: če je začetna tangenta vodoravna, kroglica ne zdrsne in graf časa ne izračuna. Tudi kadar je kontrolna točka nad \\(A\\), graf časa ne izračuna: to previdno pravilo je zadosten pogoj, da se kroglica spusti, ne potreben, zato graf nekaterih tirov, po katerih bi kroglica zdrsnila, ne meri.', 'Limits: if the initial tangent is horizontal, the bead does not slide and the graph computes no time. The graph also computes no time when a control point lies above \\(A\\): this cautious rule is a sufficient condition for the bead to descend, not a necessary one, so the graph does not time some tracks on which the bead would slide.'),
            ],
        }),
        withExample('tautochrone', {
            id: 'tautochrone',
            demonstrationIds: ['mechanics-descent'],
            investigationPrompts: {'mechanics-descent': text('Postavi tri kroglice na cikloido na različne višine, napovej, katera bo prva v najnižji točki, nato premakni čas in preberi tri čase. Potem pokaži še krožni lok skozi isto najnižjo točko in primerjaj čase kroglic.', 'Put three beads on the cycloid at different heights, predict which will reach the lowest point first, then move the time and read the three times. Then show the circular arc through the same lowest point and compare the times of the beads.')},
            title: text('Enaki časi: tavtohrona', 'Equal times: the tautochrone'),
            formula: String.raw`x=r(\theta-\sin\theta),\qquad y=r(1-\cos\theta)`,
            paragraphs: [
                text('Cilj razdelka: raziskati, kako čas spusta po cikloidi zavisi od tega, kje kroglica začne. Definicija: cikloida je zgornja krivulja z radijem \\(r\\) kotalečega se kroga in kotom kotaljenja \\(\\theta\\); \\(y\\) je globina pod vrhom, najnižja točka je pri \\(\\theta=\\pi\\). Kroglica brez trenja začne v mirovanju pri izbranem kotu \\(\\theta_0\\) in drsi do najnižje točke; njena hitrost na višini, ki jo je izgubila, je spet \\(v=\\sqrt{2gh}\\) kakor v prejšnjih razdelkih.', 'Goal of this section: explore how the descent time along the cycloid depends on where the bead starts. Definition: the cycloid is the curve above, with the radius \\(r\\) of the rolling circle and the rolling angle \\(\\theta\\); \\(y\\) is the depth below the top and the lowest point is at \\(\\theta=\\pi\\). A frictionless bead starts at rest at a chosen angle \\(\\theta_0\\) and slides to the lowest point; its speed after losing the height \\(h\\) is again \\(v=\\sqrt{2gh}\\), as in the previous sections.'),
                text('Argument: čas od začetka do najnižje točke je integral \\(\\int ds/v\\) po loku cikloide od \\(\\theta_0\\) do \\(\\pi\\). Graf ga izračuna numerično za vsak začetek; izrek o tavtohroni (krivulji enakih časov) o njem velja le kot navedek in v aplikaciji ni izpeljan. Kroglice na grafu ga ponazorijo, ne dokažejo. Za primerjavo graf pokaže krožni lok skozi isto najnižjo točko.', 'Argument: the time from the start to the lowest point is the integral \\(\\int ds/v\\) along the cycloid arc from \\(\\theta_0\\) to \\(\\pi\\). The graph computes it numerically for every start; the tautochrone theorem (the curve of equal times) is only cited about it and is not derived in the app. The beads on the graph illustrate it, they do not prove it. For comparison the graph shows a circular arc through the same lowest point.'),
                text('Zgled: pri \\(r=1\\ \\mathrm{m}\\) so začetki \\(\\theta_0=0{,}3;\\ 1;\\ 2\\) približno \\(0{,}04;\\ 0{,}46;\\ 1{,}42\\ \\mathrm{m}\\) pod vrhom cikloide, torej na zelo različnih višinah. Kar graf prebere za njihove čase, je rezultat lekcije; pred njo ga napovej sam.', 'Example: at \\(r=1\\ \\mathrm{m}\\) the starts \\(\\theta_0=0.3;\\ 1;\\ 2\\) lie about \\(0.04;\\ 0.46;\\ 1.42\\ \\mathrm{m}\\) below the top of the cycloid, so at very different heights. What the graph reads for their times is the result of the lesson; predict it yourself before it.'),
                text('Meje: začetek \\(\\theta_0=0\\), vrh cikloide, se meri kakor vsak drug začetek. Začetek \\(\\theta_0=\\pi\\) je že najnižja točka, zato graf namesto časa napiše besedilo. Tri kroglice so ponazoritev, ne dokaz, in drsenje brez trenja je idealizacija.', 'Limits: the start \\(\\theta_0=0\\), the top of the cycloid, is timed like any other start. The start \\(\\theta_0=\\pi\\) is already the lowest point, so the graph writes text instead of a time. Three beads are an illustration, not a proof, and sliding without friction is an idealisation.'),
            ],
        }),
    ],
};
