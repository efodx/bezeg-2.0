// Text of the board's parameter pucks (docs/tasks/ux-picks-app-wide/05-pucks.md). `en` must have exactly `sl`'s keys.
const sl = {
    "puck_undo": "Razveljavi",
    "puck_undo_label": "Razveljavi skok: {value0}",
    "puck_help_open": "Pomoč: {value0}",
    "puck_help_close": "Zapri pomoč",
    "puck_entry_label": "Vnesi vrednost: {value0}",
    "puck_decrease": "Zmanjšaj: {value0}",
    "puck_increase": "Povečaj: {value0}",
    "puck_refuse_range": "Vrednost mora biti med {value0} in {value1}.",
    "puck_refuse_number": "Vnesi število, na primer {value0}.",
    "puck_refuse_whole": "Vnesi celo število med {value0} in {value1}.",
    "puck_snapped": "Zaokroženo na {value0}.",
    "puck_locked": "Zaklenjeno v tem koraku razlage.",
    "puck_fine_quarter": "fino ×¼",
    "puck_fine_sixteenth": "zelo fino ×¹⁄₁₆",
} as const;

export const workspacePucks = {
    sl,
    en: {
        "puck_undo": "Undo",
        "puck_undo_label": "Undo the jump: {value0}",
        "puck_help_open": "Help: {value0}",
        "puck_help_close": "Close help",
        "puck_entry_label": "Enter a value: {value0}",
        "puck_decrease": "Decrease: {value0}",
        "puck_increase": "Increase: {value0}",
        "puck_refuse_range": "The value must be between {value0} and {value1}.",
        "puck_refuse_number": "Enter a number, for example {value0}.",
        "puck_refuse_whole": "Enter a whole number between {value0} and {value1}.",
        "puck_snapped": "Rounded to {value0}.",
        "puck_locked": "Locked in this step of the explanation.",
        "puck_fine_quarter": "fine ×¼",
        "puck_fine_sixteenth": "very fine ×¹⁄₁₆",
    } satisfies Record<keyof typeof sl, string>,
};
