import type {Message, MessageNumber} from "../../../localization";

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

interface ParameterBase<K extends string> {
    /** The arbiter key. */
    readonly key: K;
    readonly label: Message;
    /** TeX symbol shown with the label, e.g. `x_0`. */
    readonly symbol?: string;
    readonly help?: Message;
    readonly placement: Placement;
    /** The Orodja section that holds it when `placement` is `tools` (a frame that uses it opens Orodja there, A9). */
    readonly section?: string;
    /** Shown but not operable in this state (a lesson lock, a mode that does not use it). */
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
}

/** A whole-number count: a `CountSetter`. */
export interface CountParameter<K extends string = string> extends ParameterBase<K> {
    readonly kind: "count";
    readonly min: number;
    readonly max: number;
}

/** One of a few named options. */
export interface ChoiceParameter<K extends string = string> extends ParameterBase<K> {
    readonly kind: "choice";
    readonly options: readonly {readonly value: string; readonly label: Message}[];
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
    readonly section?: string;
    readonly enabled: boolean;
    /** A toggle-like action shows its state ("Pokaži oceno napake" pressed). */
    readonly pressed?: boolean;
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
 * frame against its scene) is checked by the contract test with {@link checkFrame} and the graph.
 */
export function checkDeclaration(declaration: GraphDeclaration): DeclarationProblem[] {
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
    for (const row of rows) {
        if (row.legend !== undefined && !legendIds.has(row.legend)) problems.push({where: `row ${row.id}`, problem: `links unknown legend entry "${row.legend}"`});
        if ("kind" in row.value && row.value.kind === "formatted" && WORD.test(row.value.text)) problems.push({where: `row ${row.id}`, problem: "formatted value contains words; words come from the catalog"});
    }
    for (const parameter of declaration.parameters ?? []) {
        const where = `parameter ${parameter.key}`;
        if (parameter.kind === "range" || parameter.kind === "count") {
            // A parameter fixed in this state (Taylor's flat example fixes the centre) is locked with min = max.
            const ordered = parameter.locked ? parameter.min <= parameter.max : parameter.min < parameter.max;
            if (!(Number.isFinite(parameter.min) && Number.isFinite(parameter.max) && ordered)) problems.push({where, problem: parameter.locked ? "needs finite min <= max" : "needs finite min < max (or locked)"});
        }
        if (parameter.kind === "range" && !(parameter.step > 0)) problems.push({where, problem: "needs a positive step"});
        if (parameter.kind === "count" && !(Number.isInteger(parameter.min) && Number.isInteger(parameter.max))) problems.push({where, problem: "needs whole bounds"});
        if (parameter.kind === "choice" && parameter.options.length < 2) problems.push({where, problem: "needs at least two options"});
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
