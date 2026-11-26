// Declaration text of the arc-length parametrization graph (ADR 0066): the bare name of the pieces puck, the short mode segments,
// the legend entry of the moving point and the refusals of a parameter write. `en` must have exactly `sl`'s keys.
const sl = {
    "arcparam_pieces_name": "Število delov",
    "arcparam_mode_parameter_short": "Po t",
    "arcparam_mode_arc_short": "Po loku",
    "arcparam_legend_mover": "Premična točka",
    "arcparam_pieces_refused": "Število delov mora biti celo število od {value0} do {value1}.",
    "arcparam_mode_refused": "Premikanje točke je lahko z enakimi koraki v t ali s stalno hitrostjo po krivulji.",
    "arcparam_position_refused": "Lega točke mora biti število od 0 do 1.",
} as const;

export const arcLengthParam = {
    sl,
    en: {
        "arcparam_pieces_name": "Pieces",
        "arcparam_mode_parameter_short": "By t",
        "arcparam_mode_arc_short": "By arc",
        "arcparam_legend_mover": "Moving point",
        "arcparam_pieces_refused": "The number of pieces must be an integer from {value0} to {value1}.",
        "arcparam_mode_refused": "The point can move in equal steps of t or at constant speed along the curve.",
        "arcparam_position_refused": "The point position must be a number from 0 to 1.",
    } satisfies Record<keyof typeof sl, string>,
};
