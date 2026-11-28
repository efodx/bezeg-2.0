// Declaration text of the subdivision graph: the board puck of the cut parameter and the refusal of a write. The Orodja slider keeps its old key. `en` must have exactly `sl`'s keys.
const sl = {
    "subdivision_t_name": "Parameter reza",
    "subdivision_t_refused": "Parameter reza mora biti število od 0,01 do 0,99.",
} as const;

export const subdivision = {
    sl,
    en: {
        "subdivision_t_name": "Cut parameter",
        "subdivision_t_refused": "The cut parameter must be a number from 0.01 to 0.99.",
    } satisfies Record<keyof typeof sl, string>,
};
