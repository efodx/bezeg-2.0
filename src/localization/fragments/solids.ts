// Declaration text of the solids graph (ADR 0066): bare puck names of at most 16 characters (the symbol is typeset next to the name) and the unit of the compared slice height. `en` must have exactly `sl`'s keys.
const sl = {
    "solids_decl_normal_name": "Komponenta {value0}",
    "solids_decl_cursor_name": "Višina rezine",
    "solids_decl_unit_percent": "%",
    "solids_decl_pyramids_name": "Tri piramide",
} as const;

export const solids = {
    sl,
    en: {
        "solids_decl_normal_name": "Component {value0}",
        "solids_decl_cursor_name": "Slice height",
        "solids_decl_unit_percent": "%",
        "solids_decl_pyramids_name": "Three pyramids",
    } satisfies Record<keyof typeof sl, string>,
};
