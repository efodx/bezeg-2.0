import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Mechanical curves lesson, keyed by example id: MC1 (the race of three beads on a line, a circular arc and a cycloid from A to B, time 0), MC2 (the track
 * experiment at time 0: the Bezier track with its control points against the line and the cycloid) and MC3 (the tautochrone at time 0: three beads at rest on one cycloid at the angles 0.3, 1 and 2 rad).
 * The copy names the frame only and states none of the answers the first steps ask for (which track wins the race, whether the bent track beats the line and by how much, which bead is first at the lowest point).
 * No time readout or winner is named. Every scene is deterministic: no source draws random numbers.
 */
export const mechanicalCurvesPreviewCopy = {
    'mechanical-curves.drag-the-track.mechanics-descent': copy(
        'Krem ozadje. Zgoraj vrstice besedila s pospeškom \\(g\\), časom kroglice in časi tira, cikloide in premice. Pod njimi pada od točke A levo zgoraj navzdol v desno trojica krivulj do skupnega konca: ravna črtkana premica, gladka cikloida in debela tirnica, ki se ravno tako začne v A. Tirnica ima tri okrogle ročaje, enega v točki B in dva ob njej, povezane s črtkano lomljenko. Tri kroglice stojijo v točki A.',
        'Cream background. At the top rows of text with the acceleration \\(g\\), the bead time and the times of the track, the cycloid and the line. Below them three curves fall from the point A at the upper left towards the lower right and end at one common point: a straight dashed line, a smooth cycloid and a thick track that also starts at A. The track has three round handles, one at the point B and two beside the track, joined by a dashed polyline. The beads stand at the point A.',
        'Poskus Tir ob času \\(0\\): Bézierjev tir od \\(A\\) do \\(B=(3{,}25;\\,2)\\ \\mathrm{m}\\) s kontrolnima točkama \\(P_1\\) in \\(P_2\\), premica in cikloida do iste točke \\(B\\).',
        'The experiment Track at time \\(0\\): a Bézier track from \\(A\\) to \\(B=(3.25;\\,2)\\ \\mathrm{m}\\) with control points \\(P_1\\) and \\(P_2\\), and the line and the cycloid to the same point \\(B\\).',
    ),
    'mechanical-curves.race-the-tracks.mechanics-descent': copy(
        'Krem ozadje. Zgoraj vrstice besedila: pospešek \\(g\\), čas kroglice, časi treh tirov in končna točka B. Pod njimi trije tiri od točke A levo zgoraj do točke B desno spodaj: ravna črtkana premica, krožni lok in cikloida. Vsak tir ima ime. Na točki A stojijo tri kroglice.',
        'Cream background. At the top rows of text: the acceleration \\(g\\), the bead time, the times of the three tracks and the end point B. Below them three tracks run from the point A at the upper left to the point B at the lower right: a straight dashed line, a circular arc and a cycloid. Each track carries its name. Three beads stand at the point A.',
        'Tekma treh kroglic ob času \\(0\\): premica, krožni lok in cikloida od \\(A\\) do \\(B\\), konec enega loka cikloide s polmerom \\(r=1\\ \\mathrm{m}\\).',
        'The race of three beads at time \\(0\\): a line, a circular arc and a cycloid from \\(A\\) to \\(B\\), the end of one arch of the cycloid with radius \\(r=1\\ \\mathrm{m}\\).',
    ),
    'mechanical-curves.tautochrone.mechanics-descent': copy(
        'Krem ozadje. Zgoraj vrstice besedila: pospešek \\(g\\), čas kroglice, zaprta formula in tri vrstice s kroglicami in njihovimi koti. Pod njimi en lok cikloide z vrhom levo zgoraj in najnižjo točko desno spodaj. Na njem mirujejo tri oštevilčene kroglice z ročaji, prva tik pod vrhom, druga nižje in tretja najnižje. Krožnega loka ni.',
        'Cream background. At the top rows of text: the acceleration \\(g\\), the bead time, the closed form and three rows with the beads and their angles. Below them one arch of a cycloid with its top at the upper left and its lowest point at the lower right. Three numbered beads with handles rest on it, the first close below the top, the second lower and the third lowest. There is no circular arc.',
        'Tavtohrona ob času \\(0\\): tri kroglice mirujejo na cikloidi s polmerom \\(r=1\\ \\mathrm{m}\\) pri kotih \\(\\theta=0{,}3\\), \\(1\\) in \\(2\\ \\mathrm{rad}\\), krožni lok je skrit.',
        'The tautochrone at time \\(0\\): three beads rest on the cycloid with radius \\(r=1\\ \\mathrm{m}\\) at the angles \\(\\theta=0.3\\), \\(1\\) and \\(2\\ \\mathrm{rad}\\), the circular arc is hidden.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
