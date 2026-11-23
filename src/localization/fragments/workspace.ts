// Text of the board workspace's card bodies (task 03). `en` must have exactly `sl`'s keys.
const sl = {
    "workspace_notes_more": "Opombe ({count})",
    "workspace_notes_less": "Skrij opombe",
    "workspace_group_open": "Pokaži skupino: {title}",
} as const;

export const workspace = {
    sl,
    en: {
        "workspace_notes_more": "Notes ({count})",
        "workspace_notes_less": "Hide notes",
        "workspace_group_open": "Show group: {title}",
    } satisfies Record<keyof typeof sl, string>,
};
