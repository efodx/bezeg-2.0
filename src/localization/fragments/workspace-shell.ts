// Text of the board card shell (docs/tasks/ux-picks-app-wide/03-layout-and-board-cards.md, slice 2). `en` must have exactly `sl`'s keys.
const sl = {
    "shell_card_readouts": "Odčitki",
    "shell_card_legend": "Legenda",
    "shell_card_tools": "Orodja",
    "shell_grip": "Premakni kartico »{value0}«",
    "shell_reset": "Vrni kartico »{value0}« na privzeto mesto",
    "shell_more": "Več vsebine",
    "shell_picked": "Kartica »{value0}« je izbrana za premik. Puščice jo premikajo, s tipko Shift hitreje; Enter jo odloži, Esc prekliče.",
    "shell_dropped": "Kartica »{value0}« je odložena.",
    "shell_cancelled": "Premik kartice »{value0}« je preklican.",
    "shell_reset_done": "Kartica »{value0}« je spet na privzetem mestu.",
} as const;

export const workspaceShell = {
    sl,
    en: {
        "shell_card_readouts": "Readouts",
        "shell_card_legend": "Legend",
        "shell_card_tools": "Tools",
        "shell_grip": "Move card: {value0}",
        "shell_reset": "Reset card position: {value0}",
        "shell_more": "More content",
        "shell_picked": "{value0}: picked up. Arrow keys move, Shift for larger steps. Enter drops, Esc cancels.",
        "shell_dropped": "{value0}: dropped.",
        "shell_cancelled": "{value0}: move cancelled.",
        "shell_reset_done": "{value0}: returned to its default place.",
    } satisfies Record<keyof typeof sl, string>,
};
