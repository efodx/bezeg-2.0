// Declaration text of the logistic-map graph (ADR 0066): the bare names of the two pucks (the symbols r and x₀ are typeset next to them), the legend
// of what the board draws, and the two ways the status sentence joins its parts. `en` must have exactly `sl`'s keys.
const sl = {
    "logistic_r_name": "Parameter",
    "logistic_x0_name": "Začetek",
    "logistic_legend_map": "Preslikava",
    "logistic_legend_diagonal": "Diagonala",
    "logistic_legend_cobweb": "Pajkova mreža",
    "logistic_legend_fixed": "Negibna točka",
    "logistic_legend_cycle": "Dvocikel",
    "logistic_legend_iterate": "Zadnji korak",
    "logistic_legend_diagram": "Bifurkacijski diagram",
    "logistic_status_plain": "{value0} {value1} {value2}",
    "logistic_status_claimless": "{value0} {value1} {value2} {value3}",
    "logistic_board_label": "Logistična preslikava: levo pajkova mreža preslikave y = r·x·(1 − x) z diagonalo, desno bifurkacijski diagram dolgoročnih vrednosti x glede na r s kazalcem pri trenutnem r. Začetek x₀ povleci po diagonali, parameter r in začetek x₀ pa nastavi s krmilnikoma ali vpiši njuni vrednosti.",
} as const;

export const logisticMap = {
    sl,
    en: {
        "logistic_r_name": "Parameter",
        "logistic_x0_name": "Start",
        "logistic_legend_map": "Map",
        "logistic_legend_diagonal": "Diagonal",
        "logistic_legend_cobweb": "Cobweb",
        "logistic_legend_fixed": "Fixed point",
        "logistic_legend_cycle": "2-cycle",
        "logistic_legend_iterate": "Last step",
        "logistic_legend_diagram": "Bifurcation diagram",
        "logistic_status_plain": "{value0} {value1} {value2}",
        "logistic_status_claimless": "{value0} {value1} {value2} {value3}",
        "logistic_board_label": "Logistic map: on the left the cobweb of y = r·x·(1 − x) with the diagonal, on the right the bifurcation diagram of the long-run values of x against r with a cursor at the current r. Drag the start x₀ along the diagonal, or set the parameter r and the start x₀ with their controls or type them in.",
    } satisfies Record<keyof typeof sl, string>,
};
