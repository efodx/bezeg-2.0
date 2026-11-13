import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Phase portraits lesson, keyed by example id. The two phase-plane cards show the first frame of
 * PP1 and PP2 (matrix and seed set by the scene); the two logistic-map cards show PP4 (r = 2.9, start 0.2, step 20) and PP5 (the same r and
 * start at step 0, so the cobweb is still empty). The copy names the frame only and does not answer the lesson's first prediction.
 * The board texts (legend rows, captions) are pixel-sized and overlap in the 840x520 frame; the card alt text does not rely on them.
 * Every scene is deterministic: no source draws random numbers.
 */
export const phasePortraitsPreviewCopy = {
    'phase-portraits.linear-system.phase-portrait': copy(
        'Fazna ravnina s koordinatnima osema na krem ozadju. Debela zelena krivulja izhaja iz oranžne pike na osi \\(x\\) pri \\(1\\) in se vije navzgor in v desno proti modrima rombkoma pri \\((4,2)\\) in \\((1,3)\\), ki sta stolpca matrike. Čez izhodišče potekata dve rjavi črtkani premici, ena pada in ena raste. Na platnu je več prekrivajočih se besedil.',
        'A phase plane with coordinate axes on a cream background. A thick green curve leaves an orange dot on the \\(x\\)-axis at \\(1\\) and curves up and to the right toward two blue diamonds at \\((4,2)\\) and \\((1,3)\\), which are the columns of the matrix. Two brown dashed lines pass through the origin, one falling and one rising. Several overlapping board texts are visible.',
        'Linearni sistem z matriko \\(A=\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}\\) in začetno točko \\((1,0)\\).',
        'A linear system with the matrix \\(A=\\begin{pmatrix}4&1\\\\2&3\\end{pmatrix}\\) and the starting point \\((1,0)\\).',
    ),
    'phase-portraits.pendulum.phase-portrait': copy(
        'Fazna ravnina s koordinatnima osema na krem ozadju. Temnozelena sklenjena krivulja, krožnica s polmerom \\(1\\) okoli izhodišča, poteka skozi oranžno piko pri \\((1,0)\\). Modra rombka stojita pri \\((1,0)\\) in \\((0,-1)\\). Na platnu je več prekrivajočih se besedil.',
        'A phase plane with coordinate axes on a cream background. A dark green closed curve, a circle of radius \\(1\\) around the origin, passes through an orange dot at \\((1,0)\\). Blue diamonds stand at \\((1,0)\\) and \\((0,-1)\\). Several overlapping board texts are visible.',
        'Linearni sistem z matriko \\(A=\\begin{pmatrix}0&1\\\\-1&0\\end{pmatrix}\\) in začetno točko \\((1,0)\\).',
        'A linear system with the matrix \\(A=\\begin{pmatrix}0&1\\\\-1&0\\end{pmatrix}\\) and the starting point \\((1,0)\\).',
    ),
    'phase-portraits.logistic-map.logistic-map': copy(
        'Levo parabola, ki se dviga od \\(0\\) do vrha nad \\(0{,}7\\) in pada nazaj do \\(0\\) pri \\(1\\), s črtkano diagonalo. Pajkova mreža stopnic se začne pri oranžni piki pri \\(0{,}2\\) in se steka v majhen kvadrat na presečišču parabole in diagonale. Desno bifurkacijski diagram z navpičnim oranžnim kazalcem. Pod osjo je stolpec besedil.',
        'On the left a parabola rising from \\(0\\) to a peak above \\(0{,}7\\) and falling back to \\(0\\) at \\(1\\), with a dashed diagonal. A cobweb of steps starts at an orange dot at \\(0{,}2\\) and closes in on a small square where the parabola meets the diagonal. On the right a bifurcation diagram with a vertical orange cursor. A column of texts sits under the axis.',
        'Logistična preslikava \\(y=r\\,x(1-x)\\) pri \\(r=2{,}9\\), začetek \\(x_0=0{,}2\\), \\(20\\) korakov.',
        'The logistic map \\(y=r\\,x(1-x)\\) at \\(r=2{,}9\\), start \\(x_0=0{,}2\\), \\(20\\) steps.',
    ),
    'phase-portraits.bifurcation.logistic-map': copy(
        'Levo parabola, ki se dviga od \\(0\\) do vrha nad \\(0{,}7\\) in pada nazaj do \\(0\\) pri \\(1\\), s črtkano diagonalo in modrim kvadratkom na njunem presečišču. Oranžna pika leži pri \\(0{,}2\\), pajkove mreže še ni. Desno bifurkacijski diagram z navpičnim oranžnim kazalcem. Pod osjo je stolpec besedil.',
        'On the left a parabola rising from \\(0\\) to a peak above \\(0{,}7\\) and falling back to \\(0\\) at \\(1\\), with a dashed diagonal and a blue square where they meet. An orange dot sits at \\(0{,}2\\); there is no cobweb yet. On the right a bifurcation diagram with a vertical orange cursor. A column of texts sits under the axis.',
        'Logistična preslikava \\(y=r\\,x(1-x)\\) pri \\(r=2{,}9\\), začetek \\(x_0=0{,}2\\), brez korakov; desno bifurkacijski diagram.',
        'The logistic map \\(y=r\\,x(1-x)\\) at \\(r=2{,}9\\), start \\(x_0=0{,}2\\), no steps; the bifurcation diagram on the right.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
