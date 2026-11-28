// Declaration text of the descent graph (mechanics-descent): the bare names of the board pucks, the legend of the control polygon, the two switch pucks and the
// small value words the declared rows share. The rows reuse the `descent_graph_r_*` and `descent_graph_value_*` keys. `en` must have exactly `sl`'s keys.
const sl = {
    "descent_name_time": "Čas",
    "descent_name_radius": "Polmer",
    "descent_value_seconds": "{value0} s",
    "descent_value_percent": "%",
    "descent_value_pi": "π",
    "descent_legend_polygon": "Kontrolni poligon",
    "descent_action_cycloid": "Pokaži cikloido",
    "descent_action_arc": "Krožni lok",
} as const;

export const mechanicsDescent = {
    sl,
    en: {
        "descent_name_time": "Time",
        "descent_name_radius": "Radius",
        "descent_value_seconds": "{value0} s",
        "descent_value_percent": "%",
        "descent_value_pi": "π",
        "descent_legend_polygon": "Control polygon",
        "descent_action_cycloid": "Show cycloid",
        "descent_action_arc": "Circular arc",
    } satisfies Record<keyof typeof sl, string>,
};
