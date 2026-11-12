import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {WAVES_CHAPTER_ID, wavesGuidedExampleDemonstrations, type WavesSectionId} from './wavesChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

const keyFor = (sectionId: WavesSectionId) => `${WAVES_CHAPTER_ID}.${sectionId}.${wavesGuidedExampleDemonstrations[sectionId]}`;

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: WavesSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: keyFor(sectionId)},
    ];
    return {...section, orderedContent: content};
}

/**
 * Chapter skeleton (families-prep F3, batch A): the two sections of the lessons WV1 (superposition and phase) and WV2 (beats), each with a
 * bilingual intro and its example at the end. The standing-wave and sampling sections join in tasks 05 and 06. The chapter sits in the functions
 * strand directly after the Fourier series, whose harmonics are the waves added here.
 */
export const wavesChapter: FamilyChapter = {
    id: WAVES_CHAPTER_ID,
    family: '/bezeg-2.0/functions',
    title: text('Valovanje, utripanje in vzorčenje', 'Waves, beats and sampling'),
    purpose: text(
        'Kosinusni val je najpreprostejše nihanje: določajo ga amplituda, frekvenca in faza. Poglavje vpraša, kaj nastane, ko seštejemo dva takšna vala. Če sta frekvenci enaki, je vsota spet val iste frekvence, njegova amplituda pa je odvisna od razlike faz in je lahko večja ali manjša od obeh amplitud; vrteči se puščice (kazalci) to pokažejo kot seštevanje vektorjev. Če se frekvenci malo razlikujeta, vsota nabrekne in zamre, kar slišimo kot utripanje. Graf vsoto izračuna in narisana ovojnica se ujema z obrazcem, ki ga v poglavju utemeljimo.',
        'A cosine wave is the simplest oscillation: it is determined by an amplitude, a frequency and a phase. The chapter asks what arises when two such waves are added. If the frequencies are equal, the sum is again a wave of that frequency, and its amplitude depends on the phase difference and can be larger or smaller than both amplitudes; rotating arrows (phasors) show this as the addition of vectors. If the frequencies differ slightly, the sum swells and fades, which we hear as beats. The graph computes the sum, and the drawn envelope agrees with the identity that the chapter justifies.',
    ),
    prerequisites: text(
        'Kosinusni val \\(A\\cos(2\\pi ft+\\varphi)\\) z amplitudo, frekvenco v hercih in fazo, kosinus na enotski krožnici ter obrazec za vsoto kosinusov. Fourierovo vrsto poznaš le toliko, da je vsota harmonikov: tu seštevamo samo dva vala, brez neskončne vrste.',
        'A cosine wave \\(A\\cos(2\\pi ft+\\varphi)\\) with an amplitude, a frequency in hertz and a phase, the cosine on the unit circle and the identity for a sum of cosines. You need to know the Fourier series only as a sum of harmonics: here we add just two waves, with no infinite series.',
    ),
    prerequisiteLinks: [
        {path: '/bezeg-2.0/learn/trigonometry#radian-sine-cosine', title: text('Trigonometrija: kot v radianih, sinus in kosinus', 'Trigonometry: the angle in radians, sine and cosine')},
        {path: '/bezeg-2.0/learn/fourier-series#fourier-series', title: text('Fourierove vrste: delne vsote', 'Fourier series: partial sums')},
    ],
    sections: [
        withExample('superposition-and-phase', {
            id: 'superposition-and-phase',
            demonstrationIds: ['waves'],
            investigationPrompts: {waves: text('Nastavi dva vala z enakima amplitudama in frekvencama ter spreminjaj fazo drugega vala od \\(0^\\circ\\) do \\(180^\\circ\\). Napovej, pri kateri razliki faz je amplituda vsote največja in pri kateri najmanjša, nato preveri na odčitku. Nato nastavi amplitudi \\(3\\) in \\(2\\) ter poišči razliko faz, pri kateri je amplituda vsote \\(1\\).', 'Set two waves with equal amplitudes and frequencies and change the phase of the second wave from \\(0^\\circ\\) to \\(180^\\circ\\). Predict at which phase difference the amplitude of the sum is the largest and at which the smallest, then check on the readout. Then set the amplitudes \\(3\\) and \\(2\\) and find the phase difference at which the amplitude of the sum is \\(1\\).')},
            title: text('Seštevanje valov in faza', 'Superposition and phase'),
            formula: String.raw`A=\sqrt{A_1^2+A_2^2+2A_1A_2\cos\Delta\varphi},\qquad \Delta\varphi=\varphi_2-\varphi_1`,
            paragraphs: [
                text('Cilj razdelka: napovedati amplitudo vsote dveh valov iste frekvence. Definicija: superpozicija je seštevanje valovanj točko za točko in v vsakem trenutku, razlika faz \\(\\Delta\\varphi\\) pa pove, za koliko je drugi val premaknjen glede na prvega. Kazalec vala je puščica dolžine \\(A\\), ki se vrti s kotno hitrostjo \\(2\\pi f\\); vrednost vala je njena vodoravna projekcija.', 'Goal of this section: predict the amplitude of the sum of two waves of the same frequency. Definition: superposition is adding the waves point by point and at every moment, and the phase difference \\(\\Delta\\varphi\\) tells by how much the second wave is shifted relative to the first. The phasor of a wave is an arrow of length \\(A\\) that rotates at the angular velocity \\(2\\pi f\\); the value of the wave is its horizontal projection.'),
                text('Argument: pri enaki frekvenci se oba kazalca vrtita enako hitro, zato je kot med njima ves čas \\(\\Delta\\varphi\\). Vsota valov je vodoravna projekcija vsote kazalcev, ta pa je puščica stalne dolžine \\(A\\), ki sledi iz kosinusnega izreka. Pri \\(\\Delta\\varphi=0^\\circ\\) se amplitudi seštejeta, pri \\(180^\\circ\\) se odštejeta, vmes je vsota med tem.', 'Argument: for equal frequencies both phasors rotate equally fast, so the angle between them is \\(\\Delta\\varphi\\) at all times. The sum of the waves is the horizontal projection of the sum of the phasors, and that is an arrow of constant length \\(A\\), which follows from the law of cosines. At \\(\\Delta\\varphi=0^\\circ\\) the amplitudes add, at \\(180^\\circ\\) they subtract, and in between the sum lies between the two.'),
                text('Zgled: pri amplitudah \\(3\\) in \\(2\\) ter \\(\\Delta\\varphi=90^\\circ\\) je \\(A=\\sqrt{9+4}\\approx 3{,}606\\), pri \\(\\Delta\\varphi=0^\\circ\\) je \\(A=5\\) in pri \\(180^\\circ\\) je \\(A=1\\). Pri enakih amplitudah in \\(180^\\circ\\) se vala izničita: vsota je povsod \\(0\\).', 'Example: for the amplitudes \\(3\\) and \\(2\\) and \\(\\Delta\\varphi=90^\\circ\\) it is \\(A=\\sqrt{9+4}\\approx 3.606\\), for \\(\\Delta\\varphi=0^\\circ\\) it is \\(A=5\\) and for \\(180^\\circ\\) it is \\(A=1\\). With equal amplitudes and \\(180^\\circ\\) the waves cancel: the sum is \\(0\\) everywhere.'),
                text('Meje: obrazec velja samo za enaki frekvenci; pri različnih frekvencah vsota ni val s stalno amplitudo, kar obravnava naslednji razdelek. Graf prikaže en časovni izsek, zato iz njega ne preberemo obnašanja za vse čase, izpeljava pa ga zajame.', 'Limits: the formula holds only for equal frequencies; for different frequencies the sum is not a wave of constant amplitude, which the next section treats. The graph shows one window of time, so it does not show the behaviour for all times, but the derivation covers it.'),
            ],
        }),
        withExample('beats', {
            id: 'beats',
            demonstrationIds: ['waves'],
            investigationPrompts: {waves: text('Nastavi frekvenci \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\) in premakni čas. Preštej, kolikokrat vsota v eni sekundi nabrekne, nato spremeni drugo frekvenco na \\(14\\ \\mathrm{Hz}\\) in napovej novo frekvenco utripanja, preden jo preveriš.', 'Set the frequencies \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\) and move the time. Count how many times the sum swells in one second, then change the second frequency to \\(14\\ \\mathrm{Hz}\\) and predict the new beat frequency before checking it.')},
            title: text('Utripanje', 'Beats'),
            formula: String.raw`\cos a+\cos b=2\cos\tfrac{a-b}{2}\,\cos\tfrac{a+b}{2}`,
            paragraphs: [
                text('Cilj razdelka: razumeti, zakaj se vsota dveh blizu si frekvenc spreminja v počasnem ritmu. Definicija: utripanje je počasno nabrekanje in zamiranje amplitude vsote dveh valov, frekvenca utripanja pa je razlika frekvenc \\(\\Delta f=|f_1-f_2|\\). Ovojnica je krivulja, ki od zgoraj in spodaj omejuje vsoto, dolžina njene periode je \\(\\tfrac{1}{\\Delta f}\\).', 'Goal of this section: understand why the sum of two waves of nearby frequencies changes at a slow rhythm. Definition: beats are the slow swelling and fading of the amplitude of the sum of two waves, and the beat frequency is the frequency difference \\(\\Delta f=|f_1-f_2|\\). The envelope is the curve that bounds the sum from above and below, and the length of its period is \\(\\tfrac{1}{\\Delta f}\\).'),
                text('Argument: obrazec za vsoto kosinusov razdeli vsoto v produkt dveh kosinusov. Eden niha s povprečno frekvenco \\(\\tfrac{f_1+f_2}{2}\\), drugi počasi s polovico razlike, in ta počasni faktor je ovojnica. Njegova absolutna vrednost doseže vrh \\(\\Delta f\\)-krat na sekundo, zato slišimo toliko udarcev.', 'Argument: the identity for a sum of cosines splits the sum into a product of two cosines. One oscillates at the mean frequency \\(\\tfrac{f_1+f_2}{2}\\), the other slowly at half the difference, and this slow factor is the envelope. Its absolute value peaks \\(\\Delta f\\) times per second, so we hear that many beats.'),
                text('Zgled: pri \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\) je utripanje \\(2\\ \\mathrm{Hz}\\), povprečna frekvenca \\(11\\ \\mathrm{Hz}\\) in perioda utripanja \\(0{,}5\\ \\mathrm{s}\\); pri \\(10\\ \\mathrm{Hz}\\) in \\(14\\ \\mathrm{Hz}\\) je utripanje \\(4\\ \\mathrm{Hz}\\). Pri enakih frekvencah utripanja ni.', 'Example: at \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\) the beat frequency is \\(2\\ \\mathrm{Hz}\\), the mean frequency \\(11\\ \\mathrm{Hz}\\) and the beat period \\(0.5\\ \\mathrm{s}\\); at \\(10\\ \\mathrm{Hz}\\) and \\(14\\ \\mathrm{Hz}\\) the beat frequency is \\(4\\ \\mathrm{Hz}\\). With equal frequencies there are no beats.'),
                text('Meje: obrazec je enakost za vsak čas, graf pa jo ponazori le na izseku. Če sta frekvenci zelo različni, ovojnica ni več počasna in utripanja ne zaznamo kot ritem, ampak kot dva tona.', 'Limits: the identity holds for every time, but the graph illustrates it only on a window. If the frequencies are very different, the envelope is no longer slow and we do not perceive beats as a rhythm but as two tones.'),
            ],
        }),
    ],
};
