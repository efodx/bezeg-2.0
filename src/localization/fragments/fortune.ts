// Declaration text of the Fortune graph (ADR 0066). `en` must have exactly `sl`'s keys.
const sl = {
    "fortune_list_join": "{value0}; {value1}",
    "fortune_height_name": "Višina pometalne premice",
    "fortune_current_note": "Pravkar obdelani dogodek: {value0}",
    "fortune_queue_note": "Vrsta dogodkov: {value0}",
    "fortune_cancelled_note": "Preklicani krožni dogodki (lažni alarmi): {value0}",
    "fortune_legend_beach": "Obalna črta",
    "fortune_legend_vertices": "Najdena oglišča",
    "fortune_legend_false_alarm": "Preklican krožni dogodek",
} as const;

export const fortune = {
    sl,
    en: {
        "fortune_list_join": "{value0}; {value1}",
        "fortune_height_name": "Sweep line height",
        "fortune_current_note": "Event just processed: {value0}",
        "fortune_queue_note": "Event queue: {value0}",
        "fortune_cancelled_note": "Cancelled circle events (false alarms): {value0}",
        "fortune_legend_beach": "Beach line",
        "fortune_legend_vertices": "Vertices found",
        "fortune_legend_false_alarm": "Cancelled circle event",
    } satisfies Record<keyof typeof sl, string>,
};
