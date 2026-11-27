// Declaration text of the envelope graph: the board pucks of the parameter t and the line count are named here, the read-off rows
// reuse those names, the puck of the curve switch and the refusals of a write. The Orodja controls keep their old keys. `en` must have exactly `sl`'s keys.
const sl = {
    "envelope_t_name": "Parameter",
    "envelope_t_refused": "Parameter t mora biti število od 0 do 1.",
    "envelope_lines_refused": "Število premic mora biti celo število od {value0} do {value1}.",
} as const;

export const curveEnvelope = {
    sl,
    en: {
        "envelope_t_name": "Parameter",
        "envelope_t_refused": "The parameter t must be a number from 0 to 1.",
        "envelope_lines_refused": "The number of lines must be an integer from {value0} to {value1}.",
    } satisfies Record<keyof typeof sl, string>,
};
