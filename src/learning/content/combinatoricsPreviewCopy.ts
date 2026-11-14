import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

const latticeAltSl = 'Krem ozadje brez koordinatnih osi. Majhna kvadratna mreža štirih polj, oranžna debela pot gre od spodnjega levega oglišča, označenega s sivim kvadratkom, navzgor po levem robu in nato desno po zgornjem robu do oranžne točke v zgornjem desnem oglišču. Nad mrežo je oranžno besedilo »cilj (2; 2)« in »izbrana pot: GGDD«, pod njo siva oznaka »začetek (0; 0)«.';
const latticeAltEn = 'Cream background without coordinate axes. A small square grid of four cells, with a thick orange route from the lower left corner, marked by a grey square, up the left edge and then right along the top edge to an orange point at the upper right corner. Above the grid is orange text reading the target (2; 2) and the selected route, and below it a grey label for the start (0; 0).';

/**
 * Describes the prepared opening scene of each Combinatorics lesson, keyed by example id: CB1 and CB3 (the lattice-paths board with the target (2, 2), route 1 selected, no counts and no colour split;
 * both lessons open on the same scene, so their two cards show the same frame), CB2 (the counting tree of the ordered choices of 2 out of 3 without repetition) and CB4 (the expansion view of
 * (x + 1) to the power 1). The copy names the frame only and states none of the answers the first steps ask for (the number of routes to (2, 2), the number of leaves, the sizes of the two last-step
 * groups, the number of products of two factors). Every scene is deterministic: no source draws random numbers.
 */
export const combinatoricsPreviewCopy = {
    'combinatorics.binomial-theorem.lattice-paths': copy(
        'Krem ozadje brez koordinatnih osi. Vodoravna siva črta, na njej stojita dva zelena debela stolpca tik drug ob drugem, pod njima oznaki »x¹« in »x⁰«, nad njima števili 1 in 1. Zgoraj levo je zeleno besedilo »(x + 1)¹«.',
        'Cream background without coordinate axes. A horizontal grey line with two thick green bars standing side by side on it, the labels x¹ and x⁰ beneath them and the numbers 1 and 1 above them. At the upper left is green text reading (x + 1)¹.',
        'Razvoj dvočlenika \\((x+1)^1\\) s stolpcema koeficientov.',
        'The expansion of the binomial \\((x+1)^1\\) with its bars of coefficients.',
    ),
    'combinatorics.counting-and-choices.counting-tree': copy(
        'Krem ozadje brez koordinatnih osi. Zeleno drevo z ogliščem v korenu na vrhu: iz korena gredo tri veje, iz vsake pa še dve, na koncu vsake veje je številka 12, 13, 21, 23, 31 in 32. Zgoraj levo sta dve vrstici besedila: »list drevesa = ena izbira« in »Variacije: n = 3, k = 2«.',
        'Cream background without coordinate axes. A green tree with a dark dot at the root on top: three branches leave the root and two more leave each of them, with the numbers 12, 13, 21, 23, 31 and 32 under the ends. At the upper left are two lines of text: a leaf of the tree is one choice, and the kind of choice with n = 3 and k = 2.',
        'Drevo izbir dveh od treh predmetov \\(1,2,3\\), po vrstnem redu in brez ponavljanja.',
        'The tree of choices of two out of three items \\(1,2,3\\), in order and without repetition.',
    ),
    'combinatorics.lattice-paths-and-pascal.lattice-paths': copy(
        latticeAltSl,
        latticeAltEn,
        'Mreža s ciljem \\((2,2)\\) in izbrano potjo GGDD.',
        'The grid with the target \\((2,2)\\) and the selected route UURR.',
    ),
    'combinatorics.pascal-identity.lattice-paths': copy(
        latticeAltSl,
        latticeAltEn,
        'Mreža s ciljem \\((2,2)\\) in izbrano potjo GGDD, pred ločitvijo poti po zadnjem koraku.',
        'The grid with the target \\((2,2)\\) and the selected route UURR, before the routes are split by their last step.',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
