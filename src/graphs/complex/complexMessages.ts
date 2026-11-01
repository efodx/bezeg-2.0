import {currentLanguage, message, Message} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ComplexEditIssue, ComplexIssue} from "../../analysis/complexModel";
import {ComplexReciprocalEditIssue, ComplexReciprocalIssue} from "../../analysis/complexReciprocalModel";
import {ComplexRootsEditIssue, ComplexRootsIssue} from "../../analysis/complexRootsModel";

/** A range bound as the file contract shows it (the same text in both languages). */
const bound = (value: number) => formatNumber(value, "en");

/*
 * The words for the rules of the three complex Demonstrations (multiplication, reciprocal, roots). The rules, with the ranges and
 * the examples they name, come from `analysis/complex*Model`; this only chooses the localized text. File messages ("correct the
 * value in the file") are for a stored Preset or imported file; edit messages are for the setters (number fields, lesson actions,
 * drags) and format numbers in the current language like the fields' own hints.
 */

type FileIssue = ComplexIssue | ComplexReciprocalIssue | ComplexRootsIssue;
type ExampleEditIssue = Extract<ComplexEditIssue | ComplexReciprocalEditIssue | ComplexRootsEditIssue, { kind: "example" }>;

/** The words for a rule a stored complex Preset or file broke. */
export function complexFileMessage(issue: FileIssue): Message {
    switch (issue.kind) {
        case "example": return message("invalid_complex_example", {value0: issue.allowed.join(", ")});
        case "coordinate": return message("invalid_complex_coordinate", {value0: issue.field, value1: bound(issue.min), value2: bound(issue.max)});
        case "visibility": return message("invalid_complex_visibility", {value0: issue.field});
        case "radius": return message("invalid_complex_inversion_radius", {value0: bound(issue.min), value1: bound(issue.max)});
        case "degree": return message("complex_roots_invalid_degree", {value0: bound(issue.min), value1: bound(issue.max)});
    }
}

const exampleEditMessage = (issue: ExampleEditIssue): Message => message("complex_example_rejected", {value0: issue.allowed.join(", ")});

/** The words for a rule an edit of the multiplication model would break. */
export function complexEditMessage(issue: ComplexEditIssue): Message {
    const language = currentLanguage();
    switch (issue.kind) {
        case "example": return exampleEditMessage(issue);
        case "coordinate": return message("complex_coordinate_rejected_hint");
        case "modulus-range":
        case "modulus-grid": return message("complex_modulus_rejected_hint", {value0: formatNumber(issue.max, language, 2)});
        case "argument-range":
        case "argument-grid": return message("complex_argument_rejected_hint", {
            value0: formatNumber(-issue.max, language, 2), value1: formatNumber(issue.max, language, 2),
        });
        case "argument-zero": return message("complex_argument_zero_rejected");
    }
}

/** The words for a rule an edit of the reciprocal model would break. */
export function complexReciprocalEditMessage(issue: ComplexReciprocalEditIssue): Message {
    switch (issue.kind) {
        case "example": return exampleEditMessage(issue);
        case "coordinate": return message("complex_coordinate_rejected_hint");
        case "radius": return message("complex_recip_radius_rejected_hint");
    }
}

/** The words for a rule an edit of the roots model would break. */
export function complexRootsEditMessage(issue: ComplexRootsEditIssue): Message {
    switch (issue.kind) {
        case "example": return exampleEditMessage(issue);
        case "coordinate": return message("complex_coordinate_rejected_hint");
        case "degree": return message("complex_roots_degree_rejected_hint");
    }
}
