// Declaration text of the hull robustness graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "hullrobust_list_join": "{value0}, {value1}",
    "hullrobust_puck_pop_label": "Kolinearne točke",
    "hullrobust_puck_pop_drop": "Izpusti",
    "hullrobust_puck_pop_keep": "Obdrži",
    "hullrobust_puck_duplicates_merge": "Združi",
    "hullrobust_puck_duplicates_keep": "Vse kopije",
    "hullrobust_puck_panel_label": "Zemljevid",
    "hullrobust_puck_panel_inexact": "Nenatančno",
    "hullrobust_puck_panel_exact": "Natančno",
} as const;

export const hullRobustness = {
    sl,
    en: {
        "hullrobust_list_join": "{value0}, {value1}",
        "hullrobust_puck_pop_label": "Collinear points",
        "hullrobust_puck_pop_drop": "Drop",
        "hullrobust_puck_pop_keep": "Keep",
        "hullrobust_puck_duplicates_merge": "Merge",
        "hullrobust_puck_duplicates_keep": "Keep all",
        "hullrobust_puck_panel_label": "Map",
        "hullrobust_puck_panel_inexact": "Inexact",
        "hullrobust_puck_panel_exact": "Exact",
    } satisfies Record<keyof typeof sl, string>,
};
