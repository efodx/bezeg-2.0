// Text of the board workspace's card bodies (task 03). `en` must have exactly `sl`'s keys.
const sl = {
    "workspace_notes_more": "Opombe ({count})",
    "workspace_notes_less": "Skrij opombe",
    "workspace_group_open": "Pokaži skupino: {title}",
    "guided_lesson_restore": "Povrni",
    "guided_lesson_restore_title": "Povrni graf v stanje tega okvira",
} as const;

export const workspace = {
    sl,
    en: {
        "workspace_notes_more": "Notes ({count})",
        "workspace_notes_less": "Hide notes",
        "workspace_group_open": "Show group: {title}",
        "guided_lesson_restore": "Restore",
        "guided_lesson_restore_title": "Restore the graph to this frame's state",
    } satisfies Record<keyof typeof sl, string>,
};
