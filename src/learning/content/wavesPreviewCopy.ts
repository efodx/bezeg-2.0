import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Waves lesson, keyed by example id: WV1 (the sum of wave 1, amplitude 1 and 3 Hz, and a second wave of amplitude 0, at time 0), WV2 (the beats of two waves
 * of amplitude 1 at 10 Hz and 12 Hz, envelope hidden, at time 0) and WV3 (the standing wave of two half waves, amplitude 1 for each travelling wave, at time 0).
 * The copy names the frame only and states none of the answers the first steps ask for (the amplitude and shape of the sum of two equal waves, whether the beats keep one amplitude and how often they reach
 * their maximum, the shape and height of the standing wave). No readout value is named. Every scene is deterministic: no source draws random numbers.
 */
export const wavesPreviewCopy = {
    'waves.beats.waves': copy(
        'Krem ozadje. Zgoraj pet vrstic besedila: Vodoravno: čas t v sekundah, navpično: odmik y; Črtkano: val 1 (modro); Črtkano: val 2 (oranžno); Debelo: vsota (zeleno); Krivulje so narisane s 2048 točkami na sekundo. Pod njimi graf od časa 0 do 2 s z osjo y med −2 in 2. Gosta debela zelena krivulja prečka vodoravno os velikokrat, pod njo sta tanjši črtkani modra in oranžna krivulja. Na levem robu je velika zelena pika. Ovojnice ni.',
        'Cream background. Five lines of text at the top: Vodoravno: čas t v sekundah, navpično: odmik y (horizontal: time t in seconds, vertical: displacement y); Črtkano: val 1 (dashed: wave 1, blue); Črtkano: val 2 (dashed: wave 2, orange); Debelo: vsota (thick: the sum, green); Krivulje so narisane s 2048 točkami na sekundo (the curves are drawn with 2048 points per second). Below them a graph from time 0 to 2 s with the y axis between −2 and 2. A dense thick green curve crosses the horizontal axis many times, with a thinner dashed blue curve and a thinner dashed orange curve behind it. A large green dot stands at the left edge. There is no envelope.',
        'Utripanje dveh valov z amplitudo \\(1\\) in frekvencama \\(10\\ \\mathrm{Hz}\\) in \\(12\\ \\mathrm{Hz}\\), ovojnica skrita, čas \\(0\\).',
        'Beats of two waves of amplitude \\(1\\) with frequencies \\(10\\ \\mathrm{Hz}\\) and \\(12\\ \\mathrm{Hz}\\), envelope hidden, time \\(0\\).',
    ),
    'waves.standing-waves.waves': copy(
        'Krem ozadje. Zgoraj sedem vrstic besedila: Vodoravno: lega x, navpično: odmik y; Črtkano: val v desno (modro); Črtkano: val v levo (oranžno); Debelo: stoječe valovanje (zeleno); Kvadrati: vozli valovanja; Rombi: hrbti; Krivulje so narisane z delitvijo dolžine 2 na 2048 delov. Pod njimi graf od lege 0 do 2 z osjo y med −2 in 2. Debela zelena krivulja ima en lok nad vodoravno osjo in en lok pod njo, tanjši črtkani modra in oranžna krivulja potekata skupaj. Na osi so trije kvadrati, na vrhu in dnu debele krivulje pa po en romb.',
        'Cream background. Seven lines of text at the top: Vodoravno: lega x, navpično: odmik y (horizontal: position x, vertical: displacement y); Črtkano: val v desno (dashed: wave to the right, blue); Črtkano: val v levo (dashed: wave to the left, orange); Debelo: stoječe valovanje (thick: the standing wave, green); Kvadrati: vozli valovanja (squares: nodes); Rombi: hrbti (diamonds: antinodes); Krivulje so narisane z delitvijo dolžine 2 na 2048 delov (the curves are drawn by splitting the length 2 into 2048 parts). Below them a graph from position 0 to 2 with the y axis between −2 and 2. The thick green curve has one arch above the horizontal axis and one below it, and a thinner dashed blue curve and a thinner dashed orange curve run together. Three squares stand on the axis, and one diamond on the top of the first arch and one on the bottom of the second.',
        'Stoječe valovanje na dolžini \\(2\\) z dvema polvaloma, amplituda vsakega vala \\(1\\), čas \\(0\\).',
        'Standing wave on the length \\(2\\) with two half waves, amplitude of each wave \\(1\\), time \\(0\\).',
    ),
    'waves.superposition-and-phase.waves': copy(
        'Krem ozadje. Zgoraj pet vrstic besedila: Vodoravno: čas t v sekundah, navpično: odmik y; Črtkano: val 1 (modro); Črtkano: val 2 (oranžno); Debelo: vsota (zeleno); Puščice: kazalca vala 1 in vala 2 ter vsota; Krivulje so narisane s 2048 točkami na sekundo. Spodaj levo velik siv krog z eno debelo zeleno puščico, ki kaže navzgor, in oznakami 1, 2 in 1+2. Desno graf od časa 0 do 1 s z osjo y med −1 in 1: debela zelena krivulja z več valovi, ki se začne z veliko zeleno piko na vrhu, in oranžna črtkana črta vzdolž vodoravne osi z oranžno piko.',
        'Cream background. Five lines of text at the top: Vodoravno: čas t v sekundah, navpično: odmik y (horizontal: time t in seconds, vertical: displacement y); Črtkano: val 1 (dashed: wave 1, blue); Črtkano: val 2 (dashed: wave 2, orange); Debelo: vsota (thick: the sum, green); Puščice: kazalca vala 1 in vala 2 ter vsota (arrows: the phasors of wave 1 and wave 2 and the sum); Krivulje so narisane s 2048 točkami na sekundo (the curves are drawn with 2048 points per second). At the lower left a large grey circle with one thick green arrow pointing up, and the labels 1, 2 and 1+2. At the right a graph from time 0 to 1 s with the y axis between −1 and 1: a thick green curve with several waves, starting with a large green dot at the top, and an orange dashed line along the horizontal axis with an orange dot.',
        'Seštevanje valov: val 1 z amplitudo \\(1\\) in frekvenco \\(3\\ \\mathrm{Hz}\\), val 2 z amplitudo \\(0\\), čas \\(0\\).',
        'Adding waves: wave 1 with amplitude \\(1\\) and frequency \\(3\\ \\mathrm{Hz}\\), wave 2 with amplitude \\(0\\), time \\(0\\).',
    ),
} as const satisfies Readonly<Record<string, GuidedExamplePreviewCopy>>;
