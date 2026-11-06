import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/** Describes the prepared opening scene of each Interpolation lesson, keyed by example id. The boards draw no axes and no point labels. */
export const interpolationPreviewCopy = {
    'interpolation.lagrange.interp-lagrange': copy(
        'Lok krivulje skozi štiri točke \\((0,0)\\), \\((1,2)\\), \\((3,3)\\) in \\((4,0)\\), vse so majhni temni krogci brez oznak, ter večji zeleni krogec na krivulji med drugo in tretjo točko, pri \\((2;\\ 2{,}8125)\\).',
        'An arc of a curve through four points \\((0,0)\\), \\((1,2)\\), \\((3,3)\\) and \\((4,0)\\), all small dark dots without labels, and a larger green dot on the curve between the second and third point, at \\((2;\\ 2.8125)\\).',
        'Lagrangeeva krivulja gre skozi vse štiri točke; večji krogec je njena točka pri \\(s=0{,}5\\), torej \\(t=3/2\\). Ovojnica, Bézierova krivulja in napis z odčitki niso prikazani.',
        'The Lagrange curve passes through all four points; the larger dot is its point at \\(s=0.5\\), that is \\(t=3/2\\). The hull, the Bézier curve and the readout text are not shown.',
    ),
    'interpolation.runge.interp-runge': copy(
        'Bleda modrikasta krivulja v obliki zvona, ki je najvišja na sredini, in zelena krivulja, ki gre skozi sedem zelenih krogcev na bledi krivulji: pri \\(x=-1\\), \\(-\\tfrac23\\), \\(-\\tfrac13\\), \\(0\\), \\(\\tfrac13\\), \\(\\tfrac23\\) in \\(1\\). Zelena krivulja ima na vsaki strani ob vrhu majhno grbo nad bledo krivuljo, nato vdolbino pod njo in blizu konca veliko grbo nad njo; na sredini se jima vrhova ujemata.',
        'A faint bluish bell-shaped curve that is highest in the middle, and a green curve through seven green dots lying on the faint curve: at \\(x=-1\\), \\(-\\tfrac23\\), \\(-\\tfrac13\\), \\(0\\), \\(\\tfrac13\\), \\(\\tfrac23\\) and \\(1\\). On each side the green curve has a small bump above the faint curve beside the peak, then a dip below it and a large bump above it near the end; in the middle their peaks coincide.',
        'Rungejeva funkcija \\(f(x)=\\frac1{1+25x^2}\\) (bleda krivulja) in njen interpolacijski polinom \\(p\\) stopnje \\(6\\) skozi \\(7\\) enakomerno razporejenih točk (zelena krivulja); polinom niha okoli funkcije. Krivulja napake je skrita.',
        'The Runge function \\(f(x)=\\frac1{1+25x^2}\\) (the faint curve) and its interpolation polynomial \\(p\\) of degree \\(6\\) through \\(7\\) equally spaced nodes (the green curve); the polynomial wobbles around the function. The error curve is hidden.',
    ),
    'interpolation.hermite.interp-hermite': copy(
        'Zelena krivulja skozi točke \\((0,0)\\), \\((1,2)\\), \\((3,3)\\) in \\((4,0)\\), pri čemer so \\((0,0)\\), \\((3,3)\\) in \\((4,0)\\) temni krogci, točka \\((1,2)\\) pa je oranžna, ker jo prekriva konec tangente. Štiri oranžne puščice izhajajo iz teh točk in se končajo v oranžnih krogcih, ki jih lahko vlečeš: \\((1,2)\\), \\((2{,}5;\\ 3{,}5)\\), \\((4{,}5;\\ 2)\\) in \\((5;\\ -3)\\). Na plošči je napis »Hermiteova krivulja z izbranimi tangentami«.',
        'A green curve through the points \\((0,0)\\), \\((1,2)\\), \\((3,3)\\) and \\((4,0)\\); \\((0,0)\\), \\((3,3)\\) and \\((4,0)\\) are dark dots, and the point \\((1,2)\\) looks orange because the end of a tangent covers it. Four orange arrows start at these points and end in orange dots that can be dragged: \\((1,2)\\), \\((2.5;\\ 3.5)\\), \\((4.5;\\ 2)\\) and \\((5;\\ -3)\\). The board carries the text "Hermite curve with chosen tangents".',
        'Hermiteova krivulja ima v vsaki točki tangento: puščica vodi iz točke \\(P_i\\) v \\(P_i+m_i\\) in kaže smer krivulje. Tangenta v \\(P_0\\) se konča v \\(P_1\\), zato je ta točka videti oranžna. Bézierove kontrolne točke odsekov niso prikazane.',
        'The Hermite curve has a tangent at every point: the arrow leads from \\(P_i\\) to \\(P_i+m_i\\) and shows the direction of the curve. The tangent at \\(P_0\\) ends at \\(P_1\\), so that point looks orange. The Bézier control points of the pieces are not shown.',
    ),
    'interpolation.least-squares.interp-least-squares': copy(
        'Vodoravna modra črta na višini \\(y=2\\), ki prečka celotno ploščo, in štirje oranžni krogci: \\((0,1)\\) pod črto, \\((1,2)\\) in \\((2,2)\\) na črti ter \\((3,4)\\) nad njo. Rjavi črtkani navpičnici povezujeta \\((0,1)\\) in \\((3,4)\\) s črto; druga je dvakrat daljša od prve. Pri točkah na črti ostankov ni.',
        'A horizontal blue line at the level \\(y=2\\) crossing the whole board, and four orange dots: \\((0,1)\\) below the line, \\((1,2)\\) and \\((2,2)\\) on the line and \\((3,4)\\) above it. Brown dashed verticals join \\((0,1)\\) and \\((3,4)\\) to the line; the second is twice as long as the first. The points on the line have no residual.',
        'Podatki in vodoravna ročna premica \\(y=2\\); črtkani odseki so ostanki \\(-1\\) in \\(2\\), pri točkah na premici je ostanek \\(0\\). Najboljša premica in kvadrati ostankov še niso prikazani.',
        'The data and the horizontal manual line \\(y=2\\); the dashed segments are the residuals \\(-1\\) and \\(2\\), and the points on the line have residual \\(0\\). The best line and the squares of the residuals are not shown yet.',
    ),
    'interpolation.subdivision.interp-subdivision': copy(
        'Odprt poligon z oglišči \\((0,0)\\), \\((1,2)\\), \\((3,3)\\) in \\((4,0)\\): štirje temni krogci, povezani s tremi zelenimi stranicami, brez oznak. Na plošči je napis »Chaikinovo pravilo, korak 0 od 6, 4 oglišč«.',
        'An open polygon with the vertices \\((0,0)\\), \\((1,2)\\), \\((3,3)\\) and \\((4,0)\\): four dark dots joined by three green edges, without labels. The board carries the text "Chaikin rule, step 0 of 6, 4 vertices".',
        'Začetni poligon pred prvim rezanjem vogalov, korak \\(0\\) od \\(6\\). Limitna krivulja ni prikazana.',
        'The starting polygon before the first corner cutting, step \\(0\\) of \\(6\\). The limit curve is not shown.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
