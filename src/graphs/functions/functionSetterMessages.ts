import {message, Message, messageNumber} from "../../localization";

/** The labels (keys without placeholders) that name a field in a refusal: the same terms the inspector shows. */
type FieldLabel =
    | "exponential_base_label" | "trig_function_label" | "trig_amplitude_label" | "trig_omega_label" | "trig_midline_label"
    | "continuity_param_label" | "derivative_function_label" | "derivative_x0_label" | "integral_function_label" | "integral_method_label"
    | "integral_a_label" | "integral_b_label" | "integral_n_label" | "area_mode_label" | "area_a_label" | "area_b_label"
    | "arc_a_label" | "arc_b_label" | "arc_n_label" | "prob_density_example_label";

const shown = (value: number) => messageNumber(value);

/**
 * The words a function graph's setter gives a `DomainError` when a lesson action or file value is refused, so the text a learner can
 * see is localized. The field is named by its own label key (the same term the inspector shows).
 */
export function numberRangeRejected(label: FieldLabel, min: number, max: number): Message {
    return message("function_number_range_rejected", {value0: message(label), value1: shown(min), value2: shown(max)});
}

/** The same for a whole number from `min` to `max`. */
export function integerRangeRejected(label: FieldLabel, min: number, max: number): Message {
    return message("function_integer_range_rejected", {value0: message(label), value1: shown(min), value2: shown(max)});
}

/** A choice that is none of `allowed` (the ids a file or scene may use). */
export function choiceRejected(label: FieldLabel, allowed: readonly string[]): Message {
    return message("function_choice_rejected", {value0: message(label), value1: allowed.join(", ")});
}
