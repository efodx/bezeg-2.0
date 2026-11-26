import type {Message, MessageNumber} from "../../../localization";
import type {ViewBox} from "../writes/viewAdapter";

/**
 * What a graph and a lesson frame declare for the board workspace (task 02; spec A1, A8, A9; ADR 0065). Presenters
 * (desktop cards and pucks, the phone presenter) render only what is declared; nothing is guessed from the page or
 * inferred from a frame's prose. The contract is frozen at the gate before task 08; tasks 04 to 07 may add fields.
 *
 * Rules:
 * - **Pure data.** A graph's declaration is a pure function of its scene state: no React, no JSXGraph, no functions
 *   in the result. Values a presenter shows are read through the graph's parameter arbiter (task 01), never stored here.
 * - **Text is the catalog's.** Every word is a {@link Message} (`message('key', {...})` from `src/localization`), so a
 *   string outside the `sl`/`en` catalogs is a type error. Numbers inside text are `messageNumber(...)` so the language
 *   formats them (decimal comma in Slovenian). TeX (`symbol`, `tex`, `valueTex`) is source without delimiters.
 * - **Ids are a per-graph union.** A graph names its ids in a {@link DeclarationIds} type; its declaration and the frame
 *   builder of each of its lesson files ({@link frameDeclarer}) are typed by it, so an unknown id fails the type check.
 *   `LessonFrame` stays non-generic and there is no central id map.
 * - **Parameters are the arbiter's keys.** A declared parameter's `key` is a key the graph binds in its arbiter (task 01:
 *   reader plus the graph's existing validated setter); the declaration adds only its presentation. Keys reuse
 *   `FUNCTION_PARAMETER_NAMES` (`src/learning/model.ts`) where a lesson name exists.
 */

/** A graph's id vocabulary, one string union per kind. Unused kinds are `never`. */
export interface DeclarationIds {
    readonly param: string;
    readonly row: string;
    readonly note: string;
    readonly legend: string;
    readonly section: string;
    readonly action: string;
}

/** Where a parameter or action is shown (decision 11; the conversion guide gives the placement rule per kind). */
export type Placement = "board" | "tools";

/** The Orodja tabs a control can render in (task 04: Uredi, Prikaz, Shrani). A control names its tab; `section` is only a free group name. */
export type ToolsTab = "edit" | "display" | "save";

interface ParameterBase<K extends string> {
    /** The arbiter key. */
    readonly key: K;
    readonly label: Message;
    /** TeX symbol shown with the label, e.g. `x_0`. */
    readonly symbol?: string;
    readonly help?: Message;
    readonly placement: Placement;
    /** The Orodja tab that holds it when `placement` is `tools` (a frame that uses it opens Orodja there, A9). */
    readonly tab?: ToolsTab;
    /** A free group name; for a control without `tab`, a tab name stands for the tab (older declarations). */
    readonly section?: string;
    /** Shown but not operable for a real reason of its own (a fixed example). A parameter that does not apply in this state is omitted, not locked. */
    readonly locked?: boolean;
}

/** A number in a range: a puck on the board, a `Slider` in Orodja. */
export interface RangeParameter<K extends string = string> extends ParameterBase<K> {
    readonly kind: "range";
    readonly min: number;
    readonly max: number;
    readonly step: number;
    /** Decimals shown; the language chooses the separator. */
    readonly maxDecimals?: number;
    readonly unit?: Message;
    /** The big step (Shift+Arrow, PageUp, PageDown) in value units, as the `Slider` prop; default ten steps. */
    readonly bigStep?: number;
    /** The graph can draw its main curves at another value of this parameter (task 06): needs the graph's `previewGeometry()`. */
    readonly previewable?: true;
    /**
     * How this parameter swings when the learner lets it move by itself (task 06 slice 5): half the swing in value units
     * (default a quarter of the range) and the period of one full swing in ms (default 4000). The swing is centred on the
     * value it starts from and kept inside the range.
     */
    readonly sweep?: {readonly halfWidth?: number; readonly period?: number};
    /** `false`: a lesson step sets this value at once instead of gliding it (values between two steps are not valid states, e.g. a bracket's ends). */
    readonly morph?: false;
}

/** A whole-number count: a `CountSetter`. */
export interface CountParameter<K extends string = string> extends ParameterBase<K> {
    readonly kind: "count";
    readonly min: number;
    readonly max: number;
    /** As {@link RangeParameter.previewable}. */
    readonly previewable?: true;
}

/** The most options a choice puck shows; a longer choice stays in Orodja. */
export const MAX_CHOICE_PUCK_OPTIONS = 4;

/** One of a few named options. */
export interface ChoiceParameter<K extends string = string> extends ParameterBase<K> {
    readonly kind: "choice";
    /** `short` is the text of the option's segment on a choice puck (the `label` stays its accessible name); default the label. */
    readonly options: readonly {readonly value: string; readonly label: Message; readonly short?: Message}[];
    /**
     * A segmented puck on the board (task 05 slice 6) instead of a control in Orodja, for a choice the learner switches to
     * compare states (at most {@link MAX_CHOICE_PUCK_OPTIONS} options). Unset: the choice stays in Orodja.
     */
    readonly puck?: true;
}

/** On or off. */
export interface ToggleParameter<K extends string = string> extends ParameterBase<K> {
    readonly kind: "toggle";
}

export type ParameterDeclaration<K extends string = string> = RangeParameter<K> | CountParameter<K> | ChoiceParameter<K> | ToggleParameter<K>;

/** The headline formula of the current state, with what it is ("Funkcija", "Taylorjev polinom"). */
export interface FormulaDeclaration {
    readonly label: Message;
    readonly tex: string;
}

/** One read-off value: "napaka |f(x) − Tₙ(x)|  0,7183". */
export interface ReadoutRow<Ids extends DeclarationIds = DeclarationIds> {
    readonly id: Ids["row"];
    readonly name?: Message;
    readonly symbol?: string;
    /**
     * A number the language formats, a formatted message (a point "(2; 4)", a word), or a number the graph formatted
     * itself with the language's separator (significant digits, an interval) as {@link FormattedValue}.
     */
    readonly value: MessageNumber | Message | FormattedValue;
    /** TeX shown instead of `value` when the value is a formula; `value` stays its plain-text form. */
    readonly valueTex?: string;
    readonly unit?: Message;
    /** The legend entry this value belongs to: the row shows its swatch and the legend card drops the entry. */
    readonly legend?: Ids["legend"];
    readonly muted?: boolean;
}

/**
 * Numeric text the graph already formatted for the current language (`formatNumber` and the like). It may hold only
 * digits, signs, separators, spaces, brackets and math symbols, never words: {@link checkDeclaration} rejects letters,
 * so words always come from the catalog.
 */
export interface FormattedValue {
    readonly kind: "formatted";
    readonly text: string;
}

/** Letters are words; the minus sign, ∞ and π are allowed. */
const WORD = /[A-Za-zÀ-ž]/;

export interface ReadoutGroup<Ids extends DeclarationIds = DeclarationIds> {
    readonly id: string;
    /** Omitted for a single unnamed group. */
    readonly title?: Message;
    readonly rows: readonly ReadoutRow<Ids>[];
}

/** A state sentence under the readouts ("Ocena napake je skrita."); a frame can highlight it like a row. */
export interface ReadoutNote<Ids extends DeclarationIds = DeclarationIds> {
    readonly id: Ids["note"];
    readonly text: Message;
    readonly tone?: "muted" | "warning";
}

/** The drawn style a swatch reproduces. `ring` and `cross` are point markers the prototype lacked. */
export type LegendKind = "line" | "dashed" | "area" | "point" | "ring" | "cross";

/**
 * Names a drawn object. Colour and visibility are not declared: the presenter takes them from the object the graph drew
 * under `object` (`BaseGraph.drawnObject`, task 02 slice 8), so a legend never disagrees with the board.
 */
export interface LegendEntry<Ids extends DeclarationIds = DeclarationIds> {
    readonly id: Ids["legend"];
    readonly label: Message;
    readonly kind: LegendKind;
    /** The graph's id for the drawn object. */
    readonly object: string;
}

/** A block of a section card: a paragraph or displayed math. */
export type SectionBlock = { readonly kind: "text"; readonly text: Message } | { readonly kind: "math"; readonly tex: string };

/** A read-only explanatory card (transformations' "Vrstni red operacij"). */
export interface SectionCard<Ids extends DeclarationIds = DeclarationIds> {
    readonly id: Ids["section"];
    readonly title: Message;
    readonly body: readonly SectionBlock[];
}

/** A button the graph offers ("Pokaži oceno napake", "Naslednji korak"); the graph runs it as the learner. */
export interface ActionDeclaration<Ids extends DeclarationIds = DeclarationIds> {
    readonly id: Ids["action"];
    readonly label: Message;
    readonly help?: Message;
    readonly placement: Placement;
    /** The Orodja tab that holds it when `placement` is `tools` (see {@link ParameterBase.tab}). */
    readonly tab?: ToolsTab;
    readonly section?: string;
    readonly enabled: boolean;
    /** A toggle-like action shows its state ("Pokaži oceno napake" pressed). */
    readonly pressed?: boolean;
    /**
     * A puck on the board instead of a control in Orodja (task 05 slice 6); needs `pressed`. `true`: a switch puck named by `label`.
     * `{group, short}`: one segment of the choice puck that the actions sharing `group.key` form (2 to
     * {@link MAX_CHOICE_PUCK_OPTIONS}); exactly one of them is pressed, `short` is the segment's text, `label` its accessible name.
     */
    readonly puck?: true | {readonly group: {readonly key: string; readonly label: Message; readonly help?: Message}; readonly short: Message};
}

/** A line of status under the board ("Iteracija se je ustavila."). */
export interface StatusLine {
    readonly id: string;
    readonly text: Message;
    readonly tone?: "muted" | "warning" | "success";
}

/** A shape in board coordinates the view keeps visible (task 07 consumes and may extend these). */
export type ViewMark =
    | { readonly kind: "point"; readonly x: number; readonly y: number }
    | { readonly kind: "box"; readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
    | { readonly kind: "polyline"; readonly points: readonly (readonly [number, number])[] };

export interface ViewMarks {
    /** Must stay visible and clear of cards. */
    readonly must: readonly ViewMark[];
    /** Kept visible when there is room. */
    readonly nice?: readonly ViewMark[];
}

/** Everything a graph declares for its current state. Absent fields show nothing; an empty `parameters` shows no pucks. */
export interface GraphDeclaration<Ids extends DeclarationIds = DeclarationIds> {
    readonly parameters?: readonly ParameterDeclaration<Ids["param"]>[];
    readonly formula?: FormulaDeclaration;
    readonly readouts?: readonly ReadoutGroup<Ids>[];
    readonly notes?: readonly ReadoutNote<Ids>[];
    readonly readoutHelp?: Message;
    readonly legend?: readonly LegendEntry<Ids>[];
    readonly sections?: readonly SectionCard<Ids>[];
    readonly actions?: readonly ActionDeclaration<Ids>[];
    readonly status?: readonly StatusLine[];
    /** Absent: the graph keeps its own view logic and nothing is fitted (task 07). */
    readonly marks?: ViewMarks;
    /**
     * The box the view should frame for the present state, `[left, top, right, bottom]` (task 07 slice 4; bisection: the bracket).
     * Computed from state like `marks`. The view director fits from it instead of the stored intent and glides when it changes;
     * it never writes the intent. Absent: the stored intent is the base.
     */
    readonly followView?: ViewBox;
}

/** Cards a lesson frame can open. `tools` is Orodja (A9: a frame opens it at the section of a control it uses). */
export type CardRef<Ids extends DeclarationIds = DeclarationIds> = "readouts" | "legend" | "tools" | `section:${Ids["section"]}`;

/** What a lesson frame declares, next to its scene actions. */
export interface FrameDeclaration<Ids extends DeclarationIds = DeclarationIds> {
    /** Cards this frame opens; others keep the learner's choice. */
    readonly open?: readonly CardRef<Ids>[];
    /** Readout rows and notes this frame talks about; at most three. */
    readonly highlight?: readonly (Ids["row"] | Ids["note"])[];
    /** Controls and actions the frame's text asks the learner to use (A9): each must be in reach when the frame opens. */
    readonly uses?: readonly (Ids["param"] | Ids["action"])[];
}

/** At most this many rows and notes highlighted per frame. */
export const MAX_FRAME_HIGHLIGHTS = 3;

/**
 * The frame builder a lesson content file uses: typed by its graph's ids, it returns the erased form `LessonFrame` stores.
 * `const frame = frameDeclarer<TaylorIds>(); ... declare: frame({highlight: ['error']})`.
 */
export function frameDeclarer<Ids extends DeclarationIds>(): (declaration: FrameDeclaration<Ids>) => FrameDeclaration {
    return declaration => declaration as FrameDeclaration;
}

/** One reason a declaration or a frame is inconsistent. */
export interface DeclarationProblem {
    readonly where: string;
    readonly problem: string;
}

/**
 * Checks a declaration on its own: unique ids per kind, legend links that exist, range parameters with `min < max` and a
 * positive step, counts with whole bounds, choices with options. What needs the graph (bound keys, drawn objects, a
 * frame against its scene) is checked by the contract test with {@link checkFrame} and the graph. `hasPreviewGeometry` is
 * whether the graph has a `previewGeometry()`: `false` rejects a `previewable` mark; left out, the mark is not checked.
 */
export function checkDeclaration(declaration: GraphDeclaration, hasPreviewGeometry?: boolean): DeclarationProblem[] {
    const problems: DeclarationProblem[] = [];
    const unique = (kind: string, ids: readonly string[]) => {
        const seen = new Set<string>();
        for (const id of ids) {
            if (seen.has(id)) problems.push({where: `${kind} ${id}`, problem: "duplicate id"});
            seen.add(id);
        }
    };
    const rows = (declaration.readouts ?? []).flatMap(group => group.rows);
    const legendIds = new Set((declaration.legend ?? []).map(entry => entry.id));
    unique("parameter", (declaration.parameters ?? []).map(parameter => parameter.key));
    unique("row", rows.map(row => row.id));
    unique("note", (declaration.notes ?? []).map(note => note.id));
    unique("legend", (declaration.legend ?? []).map(entry => entry.id));
    unique("section", (declaration.sections ?? []).map(section => section.id));
    unique("action", (declaration.actions ?? []).map(action => action.id));
    const follow = declaration.followView;
    if (follow && !(follow.every(Number.isFinite) && follow[0] < follow[2] && follow[1] > follow[3])) problems.push({where: "followView", problem: "needs a finite box with left < right and top > bottom"});
    const groups = new Map<string, number>();
    for (const action of declaration.actions ?? []) {
        if (!action.puck) continue;
        const where = `action ${action.id}`;
        if (action.pressed === undefined) problems.push({where, problem: "a puck action reports its state (pressed)"});
        if (action.placement !== "board") problems.push({where, problem: "a puck is placed on the board"});
        if (action.puck !== true) groups.set(action.puck.group.key, (groups.get(action.puck.group.key) ?? 0) + 1);
    }
    for (const [key, size] of groups) if (size < 2 || size > MAX_CHOICE_PUCK_OPTIONS) problems.push({where: `puck group ${key}`, problem: `a choice puck has 2 to ${MAX_CHOICE_PUCK_OPTIONS} options`});
    for (const row of rows) {
        if (row.legend !== undefined && !legendIds.has(row.legend)) problems.push({where: `row ${row.id}`, problem: `links unknown legend entry "${row.legend}"`});
        if ("kind" in row.value && row.value.kind === "formatted" && WORD.test(row.value.text)) problems.push({where: `row ${row.id}`, problem: "formatted value contains words; words come from the catalog"});
    }
    for (const parameter of declaration.parameters ?? []) {
        const where = `parameter ${parameter.key}`;
        if ((parameter.kind === "range" || parameter.kind === "count") && parameter.previewable && hasPreviewGeometry === false) problems.push({where, problem: "previewable needs the graph's previewGeometry()"});
        if (parameter.kind === "range" || parameter.kind === "count") {
            // A parameter fixed in this state (Taylor's flat example fixes the centre) is locked with min = max.
            const ordered = parameter.locked ? parameter.min <= parameter.max : parameter.min < parameter.max;
            if (!(Number.isFinite(parameter.min) && Number.isFinite(parameter.max) && ordered)) problems.push({where, problem: parameter.locked ? "needs finite min <= max" : "needs finite min < max (or locked)"});
        }
        if (parameter.kind === "range" && !(parameter.step > 0)) problems.push({where, problem: "needs a positive step"});
        if (parameter.kind === "range" && parameter.sweep) {
            const {halfWidth, period} = parameter.sweep;
            const bad = (value: number | undefined) => value !== undefined && !(Number.isFinite(value) && value > 0);
            if (bad(halfWidth) || bad(period)) problems.push({where, problem: "a sweep needs a finite positive halfWidth and period"});
        }
        if (parameter.kind === "range" && parameter.morph !== undefined && parameter.morph !== false) problems.push({where, problem: "morph is only ever false (omit it to morph)"});
        if (parameter.kind === "count" && !(Number.isInteger(parameter.min) && Number.isInteger(parameter.max))) problems.push({where, problem: "needs whole bounds"});
        if (parameter.kind === "choice" && parameter.options.length < 2) problems.push({where, problem: "needs at least two options"});
        if (parameter.kind === "choice" && parameter.puck && parameter.options.length > MAX_CHOICE_PUCK_OPTIONS) problems.push({where, problem: `a choice puck has at most ${MAX_CHOICE_PUCK_OPTIONS} options`});
        if (parameter.kind === "choice" && parameter.puck && parameter.placement !== "board") problems.push({where, problem: "a puck is placed on the board"});
        if (parameter.placement === "board" && parameter.section !== undefined) problems.push({where, problem: "a board control has no Orodja section"});
    }
    return problems;
}

/**
 * Checks a lesson frame against the declaration of the scene it shows: every id exists, at most
 * {@link MAX_FRAME_HIGHLIGHTS} highlights, a used control exists and is not locked, an opened section exists, and a used
 * Orodja control's frame opens `tools` (A9: in reach without the learner opening anything).
 */
export function checkFrame(frame: FrameDeclaration, declaration: GraphDeclaration): DeclarationProblem[] {
    const problems: DeclarationProblem[] = [];
    const rows = new Set((declaration.readouts ?? []).flatMap(group => group.rows).map(row => row.id as string));
    const notes = new Set((declaration.notes ?? []).map(note => note.id as string));
    const sections = new Set((declaration.sections ?? []).map(section => section.id as string));
    const parameters = new Map((declaration.parameters ?? []).map(parameter => [parameter.key as string, parameter]));
    const actions = new Map((declaration.actions ?? []).map(action => [action.id as string, action]));
    const highlight = frame.highlight ?? [];
    if (highlight.length > MAX_FRAME_HIGHLIGHTS) problems.push({where: "highlight", problem: `${highlight.length} highlights, at most ${MAX_FRAME_HIGHLIGHTS}`});
    for (const id of highlight) if (!rows.has(id) && !notes.has(id)) problems.push({where: `highlight ${id}`, problem: "no such row or note in this scene"});
    for (const card of frame.open ?? []) {
        if (card === "readouts" && rows.size === 0 && notes.size === 0) problems.push({where: `open ${card}`, problem: "no readouts in this scene"});
        if (card === "legend" && (declaration.legend ?? []).length === 0) problems.push({where: `open ${card}`, problem: "no legend in this scene"});
        if (card.startsWith("section:") && !sections.has(card.slice("section:".length))) problems.push({where: `open ${card}`, problem: "no such section in this scene"});
    }
    const opensTools = (frame.open ?? []).includes("tools");
    for (const id of frame.uses ?? []) {
        const used = parameters.get(id) ?? actions.get(id);
        if (!used) {
            problems.push({where: `uses ${id}`, problem: "no such control or action in this scene"});
            continue;
        }
        const locked = "kind" in used ? used.locked === true : !used.enabled;
        if (locked) problems.push({where: `uses ${id}`, problem: "locked in this scene"});
        if (used.placement === "tools" && !opensTools) problems.push({where: `uses ${id}`, problem: "an Orodja control the frame does not open (open \"tools\")"});
    }
    return problems;
}
