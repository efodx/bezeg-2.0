// Declaration text of the curve workspace (task 08 step 2): names of a curve's parts when a board holds several curves. `en` must have exactly `sl`'s keys.
const sl = {
    "curve_item_curve": "Krivulja {value0}",
    "curve_item_polygon": "Kontrolni poligon {value0}",
    "curve_item_hull": "Konveksna ovojnica {value0}",
    "curve_item_points": "Kontrolne točke {value0}",
    "curve_item_weights": "Uteži {value0}",
} as const;

export const curves = {
    sl,
    en: {
        "curve_item_curve": "Curve {value0}",
        "curve_item_polygon": "Control polygon {value0}",
        "curve_item_hull": "Convex hull {value0}",
        "curve_item_points": "Control points {value0}",
        "curve_item_weights": "Weights {value0}",
    } satisfies Record<keyof typeof sl, string>,
};
