/**
 * Explicit graph declarations for the UX picks (owner, 2026-11-22: "We don't really want automatic designations for
 * readouts or text, the graphs themselves can decide that"; "the pucks etc should be selected by the graph and not
 * guessed"). A graph says what goes on the board cards and which parameters become pucks; the pick layer only renders
 * what is declared. A graph that declares nothing keeps its original UI (no cards, no pucks).
 *
 * How a graph declares: override `protected workspaceUx(): GraphUx | undefined` in its BaseGraph subclass. It is read
 * with the other workspace panels on every render (`getWorkspacePanels().ux`), so values are current with the state.
 * A graph whose formula or readouts move into a card stops drawing them on the board itself while pick `boardText` is on
 * (`pickOn('boardText')`): the graph decides, nothing is hidden from outside.
 *
 * How a lesson frame declares: `LessonFrame.ux` (src/learning/model.ts) names the cards the frame opens and the readout
 * rows it highlights. Nothing is inferred from the frame's prose.
 *
 * Text: `name`, `title`, `text`, `help` are display strings (catalog `t()` text where it exists; prototype-only text is
 * inline Slovenian). `symbol` and `tex` are TeX source without delimiters, typeset in the card. `value` is plain text
 * already formatted by the graph's own number formatting (decimal comma, units), never TeX.
 */
import type React from 'react';
import type {FocusShape} from './focusShapes';

/** One read-off value: "Napaka |f(x) − Tₙ(x)|  0,7183". */
export interface ReadoutRow {
    /** Stable id, used by lesson frames to highlight the row. */
    readonly id: string;
    /** Words, e.g. "napaka". Optional when the symbol says it all. */
    readonly name?: string;
    /** TeX, e.g. "|f(x)-T_n(x)|". */
    readonly symbol?: string;
    /** Formatted plain text, e.g. "0,7183" or "(2; 4)". */
    readonly value: string;
    readonly unit?: string;
    /** TeX shown instead of `value` (which stays the plain-text form), for values that are formulas, e.g. `x^{2}`. */
    readonly valueTex?: string;
    /** Id of a `legend` entry this row's value belongs to: the row shows that entry's swatch and the legend card drops the entry. */
    readonly legend?: string;
    /**
     * Quiet role of the value: only `muted` changes anything (muted text). A tone colours nothing; the colour of a row
     * comes from the legend entry it links with `legend`.
     */
    readonly tone?: 'primary' | 'comparison' | 'error' | 'accent' | 'muted';
}

export interface ReadoutGroup {
    readonly id: string;
    /** A short heading, e.g. "Točka" or "Vrednosti v x"; omitted for a single unnamed group. */
    readonly title?: string;
    readonly rows: readonly ReadoutRow[];
}

/** A state sentence under the readouts, e.g. "Ocena napake je skrita." */
export interface ReadoutNote {
    readonly id: string;
    readonly text: string;
    readonly tone?: 'muted' | 'warning';
}

export interface LegendEntry {
    readonly id: string;
    readonly label: string;
    /** Swatch: the drawn style of the object it names. */
    readonly kind: 'line' | 'dashed' | 'area' | 'point';
    readonly color: string;
}

/** A read-only explanatory group shown as its own card (e.g. transformations' "Vrstni red operacij"). */
export interface BoardSectionDecl {
    readonly id: string;
    readonly title: string;
    readonly body: React.ReactNode;
}

/** A parameter the graph puts on the board as a puck, in this order. */
export interface PuckDecl {
    /** The key the parameter's Slider/CountSetter publishes in the param registry (src/uxPicks/a1/paramRegistry.ts). */
    readonly param: string;
    /** The puck's help card text (replaces reading the control's help and its group's paragraphs from the page). */
    readonly help?: string;
    /** The puck's label instead of the control's, when the board and the readouts use the control's symbol for something else
     *  (bisection: the pucks set the starting a₀, b₀; the board's a, b are the current bracket). Plain text, "name symbol". */
    readonly label?: string;
}

/** What the view fit keeps in view: `must` shapes stay visible and clear of cards, `nice` shapes when room allows. */
export interface FocusSet {
    readonly must: readonly FocusShape[];
    readonly nice?: readonly FocusShape[];
}

/**
 * What a graph keeps in view (docs/reviews/ux-picks/view-fit.md). `at` is a PURE function of the parameter values (keys of the
 * param registry, current values), so the layer can also evaluate it at nearby values to see where the picture may go.
 */
export interface FocusDecl {
    at(values: Readonly<Record<string, number>>): FocusSet;
    /**
     * Parameter values to predict at, per param key, instead of the default (a slider: +-25 % of its range around the value,
     * clamped; a count: +-2 steps). Taylor: `{n: [5, 6]}`.
     */
    readonly reach?: Readonly<Record<string, readonly number[]>>;
    /** How far the fit may zoom out (>= 1, 1.6 = to 1/1.6 of the default scale) and in (>= 1, 'fill' mode only). */
    readonly limits: {readonly maxOut: number; readonly maxIn: number};
}

export interface GraphUx {
    /** The headline formula of the current state, TeX. */
    readonly formula?: string;
    readonly readouts?: readonly ReadoutGroup[];
    readonly notes?: readonly ReadoutNote[];
    /** Help behind the readout card's "?". */
    readonly readoutHelp?: React.ReactNode;
    readonly legend?: readonly LegendEntry[];
    readonly sections?: readonly BoardSectionDecl[];
    /** Absent: no pucks. Present (even empty): exactly these, in this order. */
    readonly pucks?: readonly PuckDecl[];
    /** Absent: the view is never fitted (the graph's own view logic stays). */
    readonly focus?: FocusDecl;
    /** The card that takes the first open slot of the card budget; default is Odčitki. Set `'tools'` when the graph's main action (Naslednji korak) lives in Orodja. */
    readonly firstCard?: 'tools';
}

/** Card ids a lesson frame can open: the readout card, the legend card, or a declared section. */
export type CardRef = 'readouts' | 'legend' | `section:${string}`;

/** Declared on a lesson frame (`LessonFrame.ux`). */
export interface FrameUx {
    /** Cards this frame opens (others keep the learner's choice). */
    readonly open?: readonly CardRef[];
    /** Readout row ids this frame talks about; the card marks them. */
    readonly highlight?: readonly string[];
}
