import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {currentLanguage, message, messageNumber, onLanguageChange, renderMessage, t, type Message} from "../../localization";
import type {ParameterBinding} from "../base/writes/parameterArbiter";
import {runAs} from "../base/writes/writeSource";
import {PuckOwned} from "../base/controls/PuckOwnership";
import type {ActionDeclaration, GraphDeclaration, ParameterDeclaration, ReadoutRow} from "../base/declare/graphDeclaration";
import {DomainError} from "../functions/BaseFunctionGraph";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import Slider from "../../inputs/Slider";
import {CountSetter} from "../../inputs/CountSetter";
import {BooleanField} from "../../inputs/BooleanField";
import {ReadoutHeading, ReadoutList, ReadoutListRow} from "../base/controls/ReadoutParts";
import {LiveReadout, SettledReadout} from "../base/controls/LiveReadout";
import {GraphSession} from "../base/GraphSession";
import type {LessonAction} from "../../learning/model";
import type {LessonActionRegistry} from "../base/lesson/LessonActionRegistry";
import {AxisSelect} from "../base/DisplaySettings";
import {GraphPalette} from "../styles/GraphPalette";
import {
    COUNT_K_RANGE, COUNT_N_RANGE, CountingDerived, CountingKind, CountingState, CountingView, COUNTING_VIEWS, DEFAULT_COUNTING_STATE, deriveCounting,
    deriveMultiset, deriveRow, keepKValid, MULTISET_COUNT_RANGE, MultisetDerived, OrderingGroup, orderingGroups, parseCountingState, ROW_N_RANGE, RowDerived,
    serializeCountingState, snapInput, T_DENOMINATOR, T_RANGE, treeLeaves, TREE_LEAF_LIMIT,
} from "../../combinatorics/combinatoricsModel";
import {PresetCollection} from "../base/presets/PresetCollection";
import {Preset} from "../base/presets/Presets";
import {countingTreePresetCollection} from "./combinatoricsPresetCollection";
import {addPolyline, binomText, countText, emptyPoly, Poly, SceneObjects, smallText, superscript} from "./combinatoricsText";

/**
 * The ids the declaration, the frames and the actions use. `n`, `k` and the weight `t` are pucks (the lessons ask the learner to set them), the two switches of the
 * choices are switch pucks; the view, the example and the letter counts stay in Orodja without a key. `legend` and `section` are never used: the board captions
 * name what is drawn.
 */
export type CountingTreeIds = {
    param: "counting-n" | "counting-k" | "counting-t";
    row: "kind" | "count" | "leaves" | "product" | "orderings" | "division" | "orderings-list" | "letters" | "arrangements" | "all-different"
        | "row-sum" | "alternating" | "hockey" | "weight" | "weight-sum";
    note: "status";
    legend: never;
    section: never;
    action: "ordered" | "repetition";
};
type CountingRow = ReadoutRow<CountingTreeIds>;

/** The scene state: the stored counting fields. */
export interface CountingTreeGraphState extends BaseGraphState, CountingState {}

/** The fixed view box: the tree, the table, the letters and the bars all sit inside it, the captions are above and below. */
/** The pitch of two stacked 15 px caption rows: the text height and 4 px between them. */
const CAPTION_ROW_PX = 24;
const CAPTION_FONT_PX = 15;
const CAPTION_MARGIN_PX = 6;
const ROOT_DOT_PX = 6;
export const VIEW_BOX: [number, number, number, number] = [-0.5, 24.5, 24.5, -2.5];
/** Row view: the indices sit at 4.6; the frame ends just under them. */
export const ROW_VIEW_BOTTOM = 3.5;
export const STEP = 1;
export const BIG_STEP = 5;
export const COUNT_BIG_STEP = 3;
export const T_STEP = 1 / T_DENOMINATOR;
export const T_BIG_STEP = 5 / T_DENOMINATOR;
/** The orderings of one combination are listed while there are at most 4! = 24 of them. */
export const ORDERINGS_LIST_MAX_K = 4;
/** The most letters on the board: four kinds with at most MULTISET_COUNT_RANGE.max letters each. */
export const LETTER_POOL = 4 * MULTISET_COUNT_RANGE.max;
export const LETTERS = ["M", "I", "S", "P"] as const;
const LETTER_COLORS = [GraphPalette.primaryCurve, GraphPalette.comparisonCurve, GraphPalette.constructionAccent, GraphPalette.controlPoint];
const ROW_POOL = ROW_N_RANGE.max + 1;

/** Leaf labels: the most rows they stagger over, and the air between two labels of a row (px). */
const LEAF_ROWS_MAX = 3;
const LEAF_GAP_PX = 3;

/** Tree layout: the leaves share the width, the levels share the height. */
export const TREE_TOP = 21;
export const TREE_BOTTOM = 8;
export const TREE_LEFT = 0.6;
export const TREE_WIDTH = 23.2;
export const treeLeafX = (index: number, leaves: number): number => TREE_LEFT + ((index + 0.5) * TREE_WIDTH) / Math.max(1, leaves);
/** Row layout: bar j is C(n, j) with its weight. */
export const BAR_BASE = 9.5;
/** 8 units: the tallest bar, its cap and its "k = ..." text (about 27 px) stay under the caption row "selected" on a 295 px high board (the phone board). */
export const BAR_HEIGHT = 8;
/** The bars of row n share the width from ROW_LEFT to ROW_RIGHT; a short row is not stretched past ROW_STEP_MAX (a row of 1 or 2 bars would look absurd), n = 20 keeps about the old 1.15. */
export const ROW_LEFT = 0.9;
export const ROW_RIGHT = 23.5;
export const ROW_STEP_MAX = 6;
export const rowStep = (n: number, left = ROW_LEFT, right = ROW_RIGHT): number => Math.min(ROW_STEP_MAX, (right - left) / Math.max(n, 1));
export const barX = (index: number, n: number, left = ROW_LEFT, right = ROW_RIGHT): number => left + rowStep(n, left, right) * index;
/** Pixels from the top of the chosen bar to the top of its round cap (half the 14 px stroke), and the margin between that cap and the bottom of its "k = ..." text. */
export const BAR_CAP_PX = 7;
export const BAR_LABEL_MARGIN_PX = 4;
/** Grouping panel of the table (unordered choices without repetition, k from 2 to 4): up to GROUP_LIMIT combinations in three columns. */
export const GROUP_LIMIT = 3;
export const GROUP_X = [0.2, 8.4, 16.6] as const;
export const GROUP_LABEL_Y = 4.5;
export const GROUP_ROW_Y = 3.7;
export const GROUP_ROW_STEP = 0.62;
const GROUP_COLUMN_STEP = 2;
const GROUP_ENTRY_POOL = 24;

/** The table rows: the first row's line and the distance between rows (each row has the name and, one unit below, the formula with the count). */
export const TABLE_FIRST_ROW_Y = 16.6;
export const TABLE_ROW_STEP = 3;
/** The note above the table (up to NOTE_LINES lines of NOTE_CHARS characters). */
const TABLE_NOTE_Y = 24.2;
const NOTE_LINES = 3;
const NOTE_CHARS = 38;

/** Breaks a sentence at spaces into lines of at most `maxChars` characters (a longer single word keeps its own line). */
function wrapWords(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    for (const word of text.split(" ")) {
        const last = lines[lines.length - 1];
        if (last !== undefined && last.length + 1 + word.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
        else lines.push(word);
    }
    return lines;
}

const ROW_CAPTION_POOL = 5;
interface RowLayout {
    numberFont: number; level: number[]; levelStep: number; indexShown: boolean[]; omitted: boolean;
    captionFont: number; lines: string[][]; ys: number[][];
}

const KINDS: readonly CountingKind[] = ["variations", "variationsRepetition", "combinations", "combinationsRepetition"];
const KIND_FLAGS: Readonly<Record<CountingKind, readonly [boolean, boolean]>> = {
    variations: [true, false], variationsRepetition: [true, true], combinations: [false, false], combinationsRepetition: [false, true],
};
/** Language-neutral formulas of the four kinds. */
const KIND_FORMULAS: Readonly<Record<CountingKind, string>> = {
    variations: "n! / (n − k)!", variationsRepetition: "nᵏ", combinations: "n! / (k! (n − k)!)", combinationsRepetition: "(n + k − 1)! / (k! (n − 1)!)",
};

type ExampleId = "books" | "variations" | "variations_repetition" | "combinations" | "mississippi" | "row10" | "hockey";
interface Example {
    readonly id: ExampleId;
    readonly view: CountingView;
    readonly patch: Partial<CountingState>;
}
export const EXAMPLES: readonly Example[] = [
    {id: "books", view: "choices", patch: {n: 5, k: 5, ordered: true, repetition: false}},
    {id: "variations", view: "choices", patch: {n: 6, k: 3, ordered: true, repetition: false}},
    {id: "variations_repetition", view: "choices", patch: {n: 6, k: 3, ordered: true, repetition: true}},
    {id: "combinations", view: "choices", patch: {n: 6, k: 3, ordered: false, repetition: false}},
    {id: "mississippi", view: "multiset", patch: {counts: [1, 4, 4, 2]}},
    {id: "row10", view: "row", patch: {n: 10, k: 5}},
    {id: "hockey", view: "row", patch: {n: 7, k: 3}},
];

const numberText = (value: number): string => formatNumber(value, currentLanguage(), 2);

interface TreeData {
    readonly leaves: readonly number[][];
    readonly edges: Poly;
}

interface TableRow {
    readonly kind: CountingKind;
    readonly count: bigint;
}

/** Everything the board draws is computed from the scene state by the `src/combinatorics` kernel; the board has no handles, the values are typed. */
export class CountingTreeGraph extends BaseGraph<CountingTreeGraphState, CountingState> {
    private readonly scene = new SceneObjects();
    private builtKey?: string;
    private cache?: {
        state: CountingTreeGraphState; counting?: CountingDerived; tree?: TreeData; table?: TableRow[]; multiset?: MultisetDerived; row?: RowDerived;
        groups?: OrderingGroup[];
    };
    private readonly status = new SettledReadout();
    /** A clause for the status text, valid only for the state it was made for: a later state change makes it stale by itself. */
    private notice?: {readonly state: CountingTreeGraphState; readonly text: Message};

    constructor() {
        super();
        // None of the scenes is a coordinate plane: the axes and grid would run through the table, the tree and the bars.
        this.displaySettings.setAxisSelect(AxisSelect.NONE);
    }

    override getInitialState(): CountingTreeGraphState {
        return {initialized: false, ...DEFAULT_COUNTING_STATE, counts: [...DEFAULT_COUNTING_STATE.counts]};
    }

    protected override lessonDefaultState(): CountingTreeGraphState {
        return {...this.getInitialState(), initialized: true};
    }

    // ---- Presets -------------------------------------------------------------------------------------------------
    // A Preset carries the stored fields once, as `data`; its `graphState` keeps only `initialized`.

    override defaultPreset(): CountingState {
        return serializeCountingState(DEFAULT_COUNTING_STATE);
    }

    override presetCollection(): PresetCollection<CountingState> {
        return countingTreePresetCollection();
    }

    override exportPreset(): Preset<CountingState> {
        const preset = super.exportPreset();
        const {view: _view, n: _n, k: _k, ordered: _ordered, repetition: _repetition, counts: _counts, t: _t, ...graphState} = preset.graphState as CountingTreeGraphState;
        return {...preset, graphState};
    }

    override exportPresetData(): CountingState {
        return serializeCountingState(this.state);
    }

    override importPresetData(data: CountingState): void {
        this.setState(serializeCountingState(data));
    }

    protected override figurePresetGraphState(graphState: BaseGraphState | undefined, data?: unknown): CountingTreeGraphState {
        const parsed = parseCountingState(data);
        return {...super.figurePresetGraphState(graphState), ...(parsed.ok ? parsed.value : {})};
    }

    protected override initialView(): [number, number, number, number] {
        return [...VIEW_BOX];
    }

    // ---- Derived numbers: caches keyed by the state object, so a new state recomputes and the same state never does ----------

    private slot(): NonNullable<CountingTreeGraph["cache"]> {
        if (!this.cache || this.cache.state !== this.state) this.cache = {state: this.state};
        return this.cache;
    }

    counting(): CountingDerived {
        const slot = this.slot();
        return slot.counting ??= deriveCounting(this.state);
    }

    multiset(): MultisetDerived {
        const slot = this.slot();
        return slot.multiset ??= deriveMultiset(this.state);
    }

    /** The place k in the row is never past the end of the row. */
    rowPlace(): number {
        return Math.min(this.state.k, this.state.n);
    }

    row(): RowDerived {
        const slot = this.slot();
        return slot.row ??= deriveRow({...this.state, k: this.rowPlace()});
    }

    /** The counts of the four kinds for the current n and k (0 where k distinct items cannot be chosen from fewer). */
    table(): readonly TableRow[] {
        const slot = this.slot();
        slot.table ??= KINDS.map(kind => {
            const [ordered, repetition] = KIND_FLAGS[kind];
            const impossible = !repetition && this.state.k > this.state.n;
            return {kind, count: impossible ? 0n : deriveCounting({...this.state, ordered, repetition}).count};
        });
        return slot.table;
    }

    /** The first combinations with all their orderings, only for unordered choices without repetition and k from 2 to 4. */
    groups(): readonly OrderingGroup[] {
        const slot = this.slot();
        return slot.groups ??= this.counting().kind === "combinations" ? orderingGroups(this.state.n, this.state.k, GROUP_LIMIT) : [];
    }

    private joinItems(items: readonly number[]): string {
        return items.map(smallText).join(this.state.n > 9 ? "," : "");
    }

    /** The tree of ordered choices: the leaves in order and all edges from the root, built only while the tree is shown. */
    tree(): TreeData {
        const slot = this.slot();
        if (!slot.tree) {
            const {n, k, repetition} = this.state;
            const leaves = this.counting().treeShown ? treeLeaves(n, k, repetition) : [];
            slot.tree = {leaves, edges: this.treeEdges(leaves, k)};
        }
        return slot.tree;
    }

    private treeEdges(leaves: readonly number[][], depth: number): Poly {
        const poly = emptyPoly();
        if (leaves.length === 0) return poly;
        const levelY = (level: number) => (depth === 0 ? TREE_TOP : TREE_TOP - (level * (TREE_TOP - TREE_BOTTOM)) / depth);
        const groupsAt = (level: number) => {
            const groups: {start: number; end: number}[] = [];
            for (let i = 0; i < leaves.length; i++) {
                const same = i > 0 && leaves[i].slice(0, level).every((item, p) => item === leaves[i - 1][p]);
                if (same) groups[groups.length - 1].end = i;
                else groups.push({start: i, end: i});
            }
            return groups;
        };
        const centre = (group: {start: number; end: number}) => (treeLeafX(group.start, leaves.length) + treeLeafX(group.end, leaves.length)) / 2;
        let parents = groupsAt(0);
        for (let level = 1; level <= depth; level++) {
            const children = groupsAt(level);
            let parent = 0;
            for (const child of children) {
                while (parents[parent].end < child.start) parent++;
                addPolyline(poly, [[centre(parents[parent]), levelY(level - 1)], [centre(child), levelY(level)]]);
            }
            parents = children;
        }
        return poly;
    }

    /** Diagnostics for tests: how many board objects and listeners the graph owns, and what is drawn. */
    ownedObjectCount(): number { return this.scene.objectCount(); }
    ownedListenerCount(): number { return this.scene.listenerCount(); }
    drawnKey(): string | undefined { return this.builtKey; }

    private sceneKey(): string {
        const {view} = this.state;
        return view === "choices" ? (this.counting().treeShown ? "choices-tree" : "choices-table") : view;
    }

    // ---- Board ------------------------------------------------------------------------------------------------------

    protected override createMainView(session: GraphSession, container: HTMLElement): void {
        super.createMainView(session, container);
        const previous = container.getAttribute("aria-label");
        const label = () => container.setAttribute("aria-label", t("combinatorics_counting_board_label"));
        label();
        session.registerCleanup(onLanguageChange(label));
        session.registerCleanup(() => {
            if (previous === null) container.removeAttribute("aria-label");
            else container.setAttribute("aria-label", previous);
        });
    }

    initialize(): void {
        this.buildScene();
        const session = this.graphSession;
        if (session) {
            session.registerCleanup(() => this.disposeScene());
            session.registerCleanup(() => this.status.cancel());
            session.registerCleanup(onLanguageChange(() => {
                this.status.replace(this.statusText());
                if (this.hasBoard && session.isAlive) this.board.update();
            }));
        }
        this.status.replace(this.statusText());
    }

    protected override onStateChange(_previous: Readonly<CountingTreeGraphState>): void {
        this.syncBoard();
    }

    protected override syncReplacedScene(): void {
        super.syncReplacedScene();
        this.syncBoard();
    }

    protected override disposeFigureScene(): void {
        this.disposeScene();
    }

    /** Rebuilds the scene when the drawn kind of scene changed, redraws and reports the status. Idempotent. */
    private syncBoard(): void {
        if (!this.hasBoard || !this.graphSession?.isAlive) return;
        if (this.builtKey !== this.sceneKey()) this.buildScene();
        this.board.update();
        this.status.report(this.statusText());
    }

    private rowLayoutCache: {key: string; layout: RowLayout} | undefined;

    private buildScene(): void {
        this.disposeScene();
        this.builtKey = this.sceneKey();
        switch (this.builtKey) {
            case "choices-tree": this.buildTree(); break;
            case "choices-table": this.buildTable(); break;
            case "multiset": this.buildMultiset(); break;
            default: this.buildRow(); break;
        }
    }

    private disposeScene(): void {
        this.scene.dispose(this.hasBoard ? this.board : undefined);
        this.builtKey = undefined;
    }

    private caption(text: string | (() => string), x: number | (() => number), y: number | (() => number), color: string,
                    visible: boolean | (() => boolean) = true, options: {anchorX?: "left" | "middle" | "right"; anchorY?: "top" | "middle" | "bottom"; fontSize?: number | (() => number)} = {}): JXG.Text {
        return this.scene.own(this.board.create("text", [x, y, text], {
            strokeColor: color, fontSize: options.fontSize ?? 15, anchorX: options.anchorX ?? "left", anchorY: options.anchorY ?? "middle", fixed: true,
            highlight: false, withLabel: false, visible,
        }));
    }

    private curve(data: () => Poly, color: string, width: number, dash: number, visible: boolean | (() => boolean) = true): JXG.Curve {
        const curve = this.scene.own(this.board.create("curve", [[], []], {
            highlight: false, fixed: true, withLabel: false, strokeColor: color, strokeWidth: width, dash, visible,
        }));
        curve.updateDataArray = () => {
            const {x, y} = data();
            curve.dataX = x;
            curve.dataY = y;
        };
        return curve;
    }

    private buildTree(): void {
        this.curve(() => this.tree().edges, GraphPalette.primaryCurve, 2, 0);
        this.scene.own(this.board.create("point", [TREE_LEFT + TREE_WIDTH / 2, TREE_TOP], {
            fixed: true, highlight: false, withLabel: false, name: "", face: "o", size: 5, fillColor: GraphPalette.label, strokeColor: GraphPalette.pointOutline,
        }));
        // The leaf labels never overlap: they stagger over up to three rows and, where even that is too narrow for the board's pixels, only every m-th leaf is named
        // (every leaf is still an edge of the tree and counted in the row "leaves").
        for (let i = 0; i < TREE_LEAF_LIMIT; i++) {
            this.caption(() => this.leafText(i), () => treeLeafX(i, this.tree().leaves.length), () => TREE_BOTTOM - 0.5 - this.leafRowGap() * (Math.floor(i / this.leafLayout().step) % this.leafLayout().rows),
                GraphPalette.label, () => i < this.tree().leaves.length && i % this.leafLayout().step === 0, {anchorX: "middle", anchorY: "top", fontSize: () => this.leafLayout().font});
        }
        // The two caption rows stand in pixels from the top edge, above the root dot, when the board has room there (the first caption row, the title one caption row
        // (15 px text and at least 4 px between the rows) under it); on a short board the root dot is too near the top and the rows stand under the leaf numbers instead.
        const rowY = (row: number) => () => {
            const unit = this.board.unitY > 0 ? this.board.unitY : 1;
            const [, top, , bottom] = this.board.getBoundingBox();
            const centre = CAPTION_MARGIN_PX + (CAPTION_FONT_PX * 1.25) / 2 + row * CAPTION_ROW_PX;
            return this.captionsAtTop() ? top - centre / unit : Math.max(bottom, VIEW_BOX[3]) + (CAPTION_MARGIN_PX + (CAPTION_FONT_PX * 1.25) / 2 + (1 - row) * CAPTION_ROW_PX) / unit;
        };
        // The kind, n and k are the kind row and the two count setters, so no title caption repeats them.
        this.caption(() => t("combinatorics_counting_cap_tree"), -0.3, rowY(0), GraphPalette.label);
    }

    /** Whether the two caption rows (and the root dot's radius under them) fit between the top edge and the root dot. */
    private captionsAtTop(): boolean {
        const unit = this.board.unitY > 0 ? this.board.unitY : 1;
        return (this.board.getBoundingBox()[1] - TREE_TOP) * unit >= CAPTION_MARGIN_PX + CAPTION_ROW_PX + CAPTION_FONT_PX * 1.25 + ROOT_DOT_PX;
    }

    /**
     * How the leaf labels share the width: the font, the rows they stagger over and the step between named leaves. A label is about 0.6 font sizes per character wide and
     * needs LEAF_GAP_PX of air; the leaves are `pitch` px apart on the board, so `rows` rows hold a label when rows x pitch is wide enough, else every `step`-th leaf is named.
     */
    private leafLayout(): {font: number; rows: number; step: number} {
        const leaves = this.tree().leaves;
        const font = leaves.length > 32 ? 11 : 14;
        const unit = this.board.unitX > 0 ? this.board.unitX : 1;
        const pitch = (TREE_WIDTH * unit) / Math.max(1, leaves.length);
        const width = (leaves[0] ? this.leafText(0).length : 1) * font * 0.6 + LEAF_GAP_PX;
        const needed = Math.max(1, Math.ceil(width / pitch));
        const rows = Math.min(LEAF_ROWS_MAX, needed);
        return {font, rows, step: Math.max(1, Math.ceil(needed / rows))};
    }

    /** The distance between two staggered label rows in user units: the font's height and 3 px of air, whatever the board's vertical scale. */
    private leafRowGap(): number {
        const unit = this.board.unitY > 0 ? this.board.unitY : 1;
        return (this.leafLayout().font + 3) / unit;
    }

    private leafText(index: number): string {
        const leaf = this.tree().leaves[index];
        if (!leaf) return "";
        return leaf.map(smallText).join(this.state.n > 9 ? "," : "");
    }

    private buildTable(): void {
        // Each row is two lines, the name of the kind and "formula = count": a line is one text, so no label can run into another
        // column whatever the language or the width of the board.
        const rowY = (index: number) => TABLE_FIRST_ROW_Y - TABLE_ROW_STEP * index;
        KINDS.forEach((kind, index) => {
            this.caption("▶", -0.2, rowY(index), GraphPalette.constructionAccent, () => this.counting().kind === kind);
            this.caption(() => this.kindName(kind), 0.9, rowY(index), GraphPalette.label, true, {fontSize: 13});
            this.caption(() => `${KIND_FORMULAS[kind]} = ${countText(this.table()[index].count)}`, 0.9, rowY(index) - 1.4, GraphPalette.axis, true, {fontSize: 12});
        });
        this.caption(() => t("combinatorics_counting_cap_current"), -0.2, () => (this.groups().length > 0 ? -2 : 4), GraphPalette.constructionAccent, true, {fontSize: 12});
        this.buildGroups();
        // The long sentences wrap into lines of at most NOTE_CHARS characters, which fit the narrowest board (390 px wide).
        const note = () => wrapWords(t("combinatorics_counting_table_note", {value0: smallText(TREE_LEAF_LIMIT)}), NOTE_CHARS);
        for (let line = 0; line < NOTE_LINES; line++) {
            this.caption(() => note()[line] ?? "", -0.3, TABLE_NOTE_Y - 1.5 * line, GraphPalette.warningText, () => this.counting().ordered > BigInt(TREE_LEAF_LIMIT), {fontSize: 12});
        }
    }

    /** Below the table: each of the first combinations as a labelled group of its k! orderings, then "x C(n, k) groups = V(n, k) / k!" with the numbers. */
    private buildGroups(): void {
        const columns = () => (this.state.k === 4 ? 4 : 3);
        for (let g = 0; g < GROUP_LIMIT; g++) {
            this.caption(() => {
                const group = this.groups()[g];
                return group ? t("combinatorics_counting_cap_group", {value0: this.joinItems(group.combination)}) : "";
            }, GROUP_X[g], GROUP_LABEL_Y, GraphPalette.primaryCurve, () => this.groups()[g] !== undefined, {fontSize: 13});
            for (let i = 0; i < GROUP_ENTRY_POOL; i++) {
                this.caption(() => {
                    const order = this.groups()[g]?.orderings[i];
                    return order ? this.joinItems(order) : "";
                }, () => GROUP_X[g] + GROUP_COLUMN_STEP * (i % columns()), () => GROUP_ROW_Y - GROUP_ROW_STEP * Math.floor(i / columns()),
                GraphPalette.label, () => this.groups()[g]?.orderings[i] !== undefined, {fontSize: 12});
            }
        }
        this.caption(() => {
            const d = this.counting();
            return t("combinatorics_counting_cap_groups", {value0: countText(d.count), value1: countText(d.ordered), value2: countText(d.orderings)});
        }, -0.2, -0.7, GraphPalette.constructionAccent, () => this.groups().length > 0, {fontSize: 14});
        this.caption(() => t("combinatorics_counting_cap_groups_range"), -0.2, 2.2, GraphPalette.warningText,
            () => this.counting().kind === "combinations" && this.groups().length === 0, {fontSize: 14});
    }

    private buildMultiset(): void {
        const kindOf = (index: number): number => {
            let rest = index;
            for (let kind = 0; kind < LETTERS.length; kind++) {
                if (rest < this.state.counts[kind]) return kind;
                rest -= this.state.counts[kind];
            }
            return -1;
        };
        for (let i = 0; i < LETTER_POOL; i++) {
            this.caption(() => (kindOf(i) >= 0 ? LETTERS[kindOf(i)] : ""), 0.45 + 0.48 * i, 14, GraphPalette.label, () => kindOf(i) >= 0, {anchorX: "middle", fontSize: 16});
        }
        // The colour of each kind is a bar under its letters.
        LETTERS.forEach((_, kind) => {
            this.curve(() => {
                const poly = emptyPoly();
                const first = this.state.counts.slice(0, kind).reduce((sum, value) => sum + value, 0);
                if (this.state.counts[kind] > 0) addPolyline(poly, [[0.45 + 0.48 * first - 0.2, 13], [0.45 + 0.48 * (first + this.state.counts[kind] - 1) + 0.2, 13]]);
                return poly;
            }, LETTER_COLORS[kind], 4, 0);
        });
        this.caption(() => t("combinatorics_counting_cap_multiset"), -0.3, 23.4, GraphPalette.label);
    }

    private multisetFormula(): string {
        const {total, count} = this.multiset();
        const parts = this.state.counts.map(value => `${smallText(value)}!`).join(" · ");
        return `${smallText(total)}! / (${parts}) = ${countText(count)}`;
    }

    private buildRow(): void {
        const x = (j: number) => () => this.barAt(j);
        this.curve(() => {
            const poly = emptyPoly();
            addPolyline(poly, [[0.2, BAR_BASE], [Math.min(this.rowSpan().right + 0.5, this.barAt(this.state.n) + 0.7), BAR_BASE]]);
            return poly;
        }, GraphPalette.axis, 1, 0);
        this.curve(() => this.barData(false), GraphPalette.primaryCurve, 14, 0);
        this.curve(() => this.barData(true), GraphPalette.constructionAccent, 14, 0);
        for (let j = 0; j < ROW_POOL; j++) {
            this.caption(() => (this.rowShown(j) ? countText(this.row().row[j]) : ""), x(j), () => BAR_BASE - 1 - Math.max(0, this.rowLayout().level[j]) * this.rowLayout().levelStep, GraphPalette.label,
                () => this.rowShown(j), {anchorX: "middle", anchorY: "top", fontSize: () => this.rowLayout().numberFont});
            this.caption(() => (j <= this.state.n && this.rowLayout().indexShown[j] ? smallText(j) : ""), x(j), 4.6, GraphPalette.axis, () => j <= this.state.n && this.rowLayout().indexShown[j],
                {anchorX: "middle", fontSize: 12});
        }
        // The chosen bar is also named in text above its top: the accent colour alone does not carry the choice.
        this.caption(() => t("combinatorics_counting_cap_bar_k", {value0: smallText(this.rowPlace())}), () => this.barAt(this.rowPlace()),
            () => this.barLabelY(), GraphPalette.constructionAccent, true, {anchorX: "middle", anchorY: "bottom", fontSize: 13});
        const colors = [GraphPalette.label, GraphPalette.label, GraphPalette.constructionAccent, GraphPalette.axis];
        // Rows 0 to 2 of `lines` are the captions at the top; row 3 is the note under the place indices, when numbers are left out.
        for (let c = 0; c < colors.length; c++) for (let line = 0; line < ROW_CAPTION_POOL; line++) {
            this.caption(() => this.rowLayout().lines[c]?.[line] ?? "", () => this.rowSpan().edge + 0.2, () => this.rowLayout().ys[c]?.[line] ?? 0, colors[c],
                () => this.rowLayout().lines[c]?.[line] !== undefined, {fontSize: () => this.rowLayout().captionFont});
        }
    }

    private unitY(): number {
        return this.board.unitY > 0 ? this.board.unitY : 1;
    }

    /** Where the bars and captions go. Fixed at the VIEW_BOX layout: the guided-example capture reframes the board and requires the curves not to move with it (see the note "Row view labels"). */
    private rowSpan(): {edge: number; left: number; right: number} {
        return {edge: VIEW_BOX[0], left: ROW_LEFT, right: ROW_RIGHT};
    }

    private barAt(j: number): number {
        return barX(j, this.state.n);
    }

    private rowShown(j: number): boolean {
        return j <= this.state.n && this.rowLayout().level[j] >= 0;
    }

    /** The "k = ..." text sits above the chosen cap and above every bar its (estimated) width and the cap width reach. */
    private barLabelY(): number {
        const unitX = this.board.unitX > 0 ? this.board.unitX : 24;
        const k = this.rowPlace();
        const half = (smallText(k).length + 4) * 13 * 0.55 / 2 + BAR_CAP_PX;
        let top = 0;
        for (let j = 0; j <= this.state.n; j++) if (Math.abs(this.barAt(j) - this.barAt(k)) * unitX < half + (j === k ? 0 : BAR_CAP_PX)) top = Math.max(top, this.barHeight(j));
        return BAR_BASE + top + (BAR_CAP_PX + BAR_LABEL_MARGIN_PX) / this.unitY();
    }

    /**
     * The measured row layout (text width estimated at 0.55 of the font size per character), cached per state and board size:
     * the row numbers take the largest font from 13 down to 10 px at which they fit on the staggered levels there is room for;
     * at 10 px the ones that still do not fit are left out (the chosen k's number is placed first and always shown) and a caption says so.
     * The captions at the top wrap to the board width and stack by their line count; the bars keep their height (the guided-example capture reframes the board and needs the curves fixed), so the captions give way: a shorter weights line, a smaller font, at last no weights line.
     */
    private rowLayout(): RowLayout {
        const unitX = this.board.unitX > 0 ? this.board.unitX : 24;
        const unitY = this.unitY();
        const [, top, right] = this.board.getBoundingBox();
        const {n} = this.state, k = this.rowPlace(), tNow = numberText(this.state.t / T_DENOMINATOR);
        const span = this.rowSpan();
        const key = `${span.edge}|${span.right}|${n}|${k}|${tNow}|${unitX}|${unitY}|${top}|${right}|${t("combinatorics_counting_cap_row", {value0: "0"})}`;
        if (this.rowLayoutCache?.key === key) return this.rowLayoutCache.layout;
        const widths = this.row().row.slice(0, n + 1).map(value => countText(value).length * 0.55);
        const order = [k, ...Array.from({length: n + 1}, (_, j) => j).filter(j => j !== k)];
        const stepPx = rowStep(n, this.rowSpan().left, this.rowSpan().right) * unitX;
        const room = (BAR_BASE - 1 - 4.6) * unitY - 9.5;
        let numberFont = 10, level: number[] = [], levelStep = 0, omitted = false;
        for (const font of [13, 12, 11, 10]) {
            const lineH = Math.ceil(font * 1.25) + 1;
            const levels = Math.max(1, Math.floor(room / lineH));
            const taken: Array<Array<[number, number]>> = Array.from({length: levels}, () => []);
            const placed = new Array<number>(n + 1).fill(-1);
            for (const j of order) {
                const lo = j * stepPx - widths[j] * font / 2 - 2, hi = j * stepPx + widths[j] * font / 2 + 2;
                const at = taken.findIndex(row => row.every(([a, b]) => hi <= a || lo >= b));
                if (at >= 0) { taken[at].push([lo, hi]); placed[j] = at; }
            }
            numberFont = font; level = placed; levelStep = lineH / unitY; omitted = placed.some(l => l < 0);
            if (!omitted) break;
        }
        const indexTaken: Array<[number, number]> = [];
        const indexShown = new Array<boolean>(n + 1).fill(false);
        for (const j of order) {
            const half = smallText(j).length * 12 * 0.55 / 2 + 2;
            const lo = j * stepPx - half, hi = j * stepPx + half;
            if (indexTaken.every(([a, b]) => hi <= a || lo >= b)) { indexTaken.push([lo, hi]); indexShown[j] = true; }
        }
        const labelPx = BAR_CAP_PX + BAR_LABEL_MARGIN_PX + 13 * 1.25;
        const variants = [{font: 13, weights: "full"}, {font: 13, weights: "short"}, {font: 11, weights: "short"}, {font: 11, weights: "none"}];
        let result: RowLayout | undefined;
        for (let v = 0; v < variants.length; v++) {
            const {font, weights} = variants[v];
            const maxChars = Math.max(10, Math.floor(((Math.min(Math.max(right, span.right + 1), VIEW_BOX[2]) - span.edge - 0.2) * unitX - 8) / (font * 0.55)));
            const texts = [
                t("combinatorics_counting_cap_row", {value0: smallText(n)}),
                weights === "none" ? "" : weights === "short" ? t("combinatorics_counting_cap_weights_short", {value0: tNow}) : t("combinatorics_counting_cap_weights", {value0: tNow}),
                t("combinatorics_counting_cap_selected", {value0: smallText(k), value1: this.selectedText()}),
            ];
            const lines = texts.map(text => (text === "" ? [] : wrapWords(text, maxChars).slice(0, ROW_CAPTION_POOL)));
            const lineH = Math.ceil(font * 1.25) + 3;
            const count = lines.reduce((sum, l) => sum + l.length, 0);
            const note = omitted ? wrapWords(t("combinatorics_counting_cap_numbers_omitted"), maxChars).slice(0, ROW_CAPTION_POOL) : [];
            const free = top * unitY - 4 - count * lineH - labelPx - (BAR_BASE + BAR_HEIGHT) * unitY;
            if (free >= 0 || v === variants.length - 1) {
                let s = 0;
                const ys = lines.map(l => l.map(() => top - (4 + (s++ + 0.5) * lineH) / unitY));
                lines.push(note);
                ys.push(note.map((_, i) => 4.6 - (7.5 + 3 + lineH / 2 + i * lineH) / unitY)); // under the place indices (12 px font, centred on 4.6)
                result = {numberFont, level, levelStep, indexShown, omitted, captionFont: font, lines, ys};
                break;
            }
        }
        this.rowLayoutCache = {key, layout: result!};
        return result!;
    }

    private selectedText(): string {
        const k = this.rowPlace();
        return `${binomText(this.state.n, k)} = ${countText(this.row().row[k])}`;
    }

    /** Bar heights are the weights over the largest weight: drawing only; the readouts carry the numbers. */
    private barData(selectedOnly: boolean): Poly {
        const poly = emptyPoly();
        this.row().weights.forEach((_, j) => {
            if (selectedOnly && j !== this.rowPlace()) return;
            if (!selectedOnly && j === this.rowPlace()) return;
            addPolyline(poly, [[this.barAt(j), BAR_BASE], [this.barAt(j), BAR_BASE + this.barHeight(j)]]);
        });
        return poly;
    }

    private barHeight(j: number): number {
        const {weights} = this.row();
        const largest = Math.max(...weights);
        return largest > 0 ? (weights[j] / largest) * BAR_HEIGHT : 0;
    }

    // ---- Editing from the panel: typed values are refused when out of range or not whole, never clamped (there is no drag here) ----

    /** Range-checks a typed value through snapInput; a value that snapping would change (non-integer or outside the range) is refused. */
    private typed(value: number, range: {min: number; max: number}, field: string): number | undefined {
        const snapped = snapInput(value, range, field);
        return snapped.ok && !snapped.value.adjusted ? snapped.value.value : undefined;
    }

    /** Tells that k was lowered, in the status text and so in the live region. Called after the state was written. */
    private announceLoweredK(before: number): void {
        const k = this.state.k;
        if (k < before) this.notice = {state: this.state, text: message("combinatorics_counting_notice_k", {value0: smallText(k)})};
    }

    private editN(value: number): boolean {
        const n = this.typed(value, this.state.view === "row" ? ROW_N_RANGE : COUNT_N_RANGE, "n");
        if (n === undefined) return false;
        const before = this.state.k;
        const next = this.state.view === "row" ? {...this.state, n, k: Math.min(this.state.k, n)} : keepKValid({...this.state, n});
        this.setState({n: next.n, k: next.k});
        this.announceLoweredK(before);
        this.requestRender();
        return true;
    }

    private kRange() {
        const {view, repetition, n} = this.state;
        return view === "row" || !repetition ? {min: COUNT_K_RANGE.min, max: Math.min(n, COUNT_K_RANGE.max)} : COUNT_K_RANGE;
    }

    private editK(value: number): boolean {
        const k = this.typed(value, this.kRange(), "k");
        if (k === undefined) return false;
        this.setState({k});
        this.requestRender();
        return true;
    }

    private editCount(kind: number, value: number): boolean {
        const count = this.typed(value, MULTISET_COUNT_RANGE, `counts[${kind}]`);
        if (count === undefined) return false;
        const counts: [number, number, number, number] = [this.state.counts[0], this.state.counts[1], this.state.counts[2], this.state.counts[3]];
        counts[kind] = count;
        this.setState({counts});
        this.requestRender();
        return true;
    }

    private editT(value: number): boolean {
        const snapped = snapInput(value * T_DENOMINATOR, T_RANGE, "t");
        if (!snapped.ok) return false;
        this.setState({t: snapped.value.value});
        this.requestRender();
        return true;
    }

    private setFlag(patch: {ordered: boolean} | {repetition: boolean}): void {
        const before = this.state.k;
        const next = keepKValid({...this.state, ...patch});
        this.setState({...patch, k: next.k});
        this.announceLoweredK(before);
    }

    /** Entering the row view stores k within 0..n, so a preset never carries a k the field does not show. */
    private changeView(view: CountingView): void {
        if (view === this.state.view) return;
        const before = this.state.k;
        this.setState({view, k: view === "row" ? this.rowPlace() : this.state.k});
        this.announceLoweredK(before);
    }

    /**
     * Lesson actions (`combinatorics`, counting part): `set-counting-mode` sets the view `choices` with n, k and the two switches (order, repetition), or the
     * view `multiset` with the four letter counts. The whole new state goes through the model's parser before the first write (so k above n without
     * repetition, a count out of range or a non-integer throws); nothing is snapped or lowered. `set-row` sets the view `row` with n, optionally k (else the
     * current k lowered to n, as the controls do) and the weight `t` (the slider value, an exact multiple of T_STEP; else unchanged). `setState` writes the store synchronously.
     */
    applyCombinatoricsAction(action: Extract<LessonAction, {kind: "combinatorics"}>): void {
        switch (action.operation) {
            case "set-counting-mode": {
                const base = serializeCountingState(this.state);
                const next = action.view === "choices"
                    ? {...base, view: action.view, n: action.n, k: action.k, ordered: action.ordered, repetition: action.repetition}
                    : {...base, view: action.view, counts: [...action.counts]};
                const parsed = parseCountingState(next);
                if (!parsed.ok) throw new Error(`combinatorics set-counting-mode: ${parsed.error.message}`);
                this.setState(serializeCountingState(parsed.value));
                return;
            }
            case "set-row": {
                const fail = (message: string): never => { throw new Error(`combinatorics set-row: ${message}`); };
                if (!Number.isInteger(action.n) || action.n < ROW_N_RANGE.min || action.n > ROW_N_RANGE.max) fail(`n must be a whole number from ${ROW_N_RANGE.min} to ${ROW_N_RANGE.max}.`);
                // Without k the row keeps the place the view select would keep (k, lowered to n), as the n field does.
                const k = action.k === undefined ? Math.min(this.state.k, action.n) : action.k;
                if (!Number.isInteger(k) || k < 0 || k > action.n) fail(`k must be a whole number from 0 to n (${action.n}).`);
                let t = this.state.t;
                if (action.t !== undefined) {
                    const steps = action.t * T_DENOMINATOR;
                    t = Math.round(steps);
                    if (!Number.isFinite(steps) || Math.abs(steps - t) > 1e-9 || t < T_RANGE.min || t > T_RANGE.max) {
                        fail(`t must be a multiple of ${T_STEP} from ${T_RANGE.min / T_DENOMINATOR} to ${T_RANGE.max / T_DENOMINATOR}.`);
                    }
                }
                const parsed = parseCountingState({...serializeCountingState(this.state), view: "row", n: action.n, k, t});
                if (!parsed.ok) throw new Error(`combinatorics set-row: ${parsed.error.message}`);
                this.setState(serializeCountingState(parsed.value));
                return;
            }
            case "set-target":
            case "set-lattice-display":
            case "set-expansion":
                throw new Error(`combinatorics: the counting graph has no ${action.operation}; it belongs to the lattice graph.`);
            default: {
                const unsupported: never = action;
                throw new Error(`combinatorics: the counting graph has no operation in ${JSON.stringify(unsupported)}.`);
            }
        }
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on("combinatorics", action => this.applyCombinatoricsAction(action));
    }

    // ---- Text ---------------------------------------------------------------------------------------------------------

    private viewName(view: CountingView): string {
        switch (view) {
            case "choices": return t("combinatorics_counting_view_choices");
            case "multiset": return t("combinatorics_counting_view_multiset");
            case "row": return t("combinatorics_counting_view_row");
        }
    }

    kindName(kind: CountingKind): string {
        switch (kind) {
            case "variations": return t("combinatorics_counting_kind_variations");
            case "variationsRepetition": return t("combinatorics_counting_kind_variations_repetition");
            case "combinations": return t("combinatorics_counting_kind_combinations");
            case "combinationsRepetition": return t("combinatorics_counting_kind_combinations_repetition");
        }
    }

    private exampleName(id: ExampleId): string {
        switch (id) {
            case "books": return t("combinatorics_counting_example_books");
            case "variations": return t("combinatorics_counting_example_variations");
            case "variations_repetition": return t("combinatorics_counting_example_variations_repetition");
            case "combinations": return t("combinatorics_counting_example_combinations");
            case "mississippi": return t("combinatorics_counting_example_mississippi");
            case "row10": return t("combinatorics_counting_example_row10");
            case "hockey": return t("combinatorics_counting_example_hockey");
        }
    }

    /** The status as a message, with the clause of the last edit that changed a value by itself (k lowered) while that state is current. */
    statusMessage(): Message {
        const base = this.baseStatusMessage();
        return this.notice && this.notice.state === this.state ? message("counting_status_join", {value0: base, value1: this.notice.text}) : base;
    }

    /** The status as text in the current language. */
    statusText(): string {
        return renderMessage(this.statusMessage());
    }

    /** A weight rounded to 6 decimals; a nonzero weight that rounds to 0 is shown as "< 0,000001" instead of a false 0. */
    private weightMessage(value: number): Message {
        const language = currentLanguage();
        const tiny = value > 0 && Number(value.toFixed(6)) === 0;
        return message("combinatorics_computed", {
            value0: tiny ? message("combinatorics_counting_weight_tiny", {value0: formatNumber(0.000001, language, 6)}) : formatNumber(value, language, 6),
        });
    }

    private kindMessage(kind: CountingKind): Message {
        switch (kind) {
            case "variations": return message("combinatorics_counting_kind_variations");
            case "variationsRepetition": return message("combinatorics_counting_kind_variations_repetition");
            case "combinations": return message("combinatorics_counting_kind_combinations");
            case "combinationsRepetition": return message("combinatorics_counting_kind_combinations_repetition");
        }
    }

    private baseStatusMessage(): Message {
        const {n, k} = this.state;
        switch (this.state.view) {
            case "choices": {
                const d = this.counting();
                return message("combinatorics_counting_status", {value0: this.kindMessage(d.kind), value1: smallText(n), value2: smallText(k), value3: countText(d.count)});
            }
            case "multiset": {
                const d = this.multiset();
                return message("combinatorics_counting_status_multiset", {value0: smallText(d.total), value1: countText(d.count)});
            }
            case "row": {
                const d = this.row();
                return message("combinatorics_counting_status_row", {value0: smallText(n), value1: countText(d.sum), value2: countText(d.alternatingSum)});
            }
        }
    }

    private productText(d: CountingDerived): string {
        const {n, k, repetition} = this.state;
        const factors = Array.from({length: k}, (_, i) => smallText(repetition ? n : n - i));
        return `${factors.length ? factors.join(" · ") : "1"} = ${countText(d.ordered)}`;
    }

    private binomMessage(n: number, k: number): Message {
        return message("combinatorics_binom_format", {value0: smallText(n), value1: smallText(k)});
    }

    /** The diagonal sum "(k nad k) + ... = total = (n + 1 nad k + 1)" as a message (the binomial symbols carry words). */
    private hockeyMessage(): Message {
        const n = this.state.n;
        const k = this.rowPlace();
        const terms = Array.from({length: n - k + 1}, (_, i) => this.binomMessage(k + i, k));
        const shown = terms.length <= 5
            ? terms.reduce((all, term) => message("counting_sum_join", {value0: all, value1: term}))
            : message("counting_sum_gap", {value0: terms[0], value1: terms[1], value2: terms[terms.length - 1]});
        return message("counting_hockey_value", {value0: shown, value1: countText(this.row().hockeyStick), value2: this.binomMessage(n + 1, k + 1)});
    }

    private formatted(text: string): {readonly kind: "formatted"; readonly text: string} {
        return {kind: "formatted", text};
    }

    /** The rows of the readout as declared values: the declaration's rows and what the panel lists. */
    private rowSpecs(): CountingRow[] {
        const {n} = this.state;
        switch (this.state.view) {
            case "choices": {
                const d = this.counting();
                const rows: CountingRow[] = [
                    {id: "kind", name: message("combinatorics_counting_readout_kind"), value: this.kindMessage(d.kind)},
                    {id: "count", name: message("combinatorics_counting_readout_count"), value: this.formatted(countText(d.count))},
                    {id: "leaves", name: message("combinatorics_counting_readout_leaves"), value: this.formatted(countText(d.ordered))},
                ];
                if (d.kind !== "combinationsRepetition") {
                    rows.push({id: "product", name: message("combinatorics_counting_readout_product"), value: this.formatted(this.productText(d))});
                }
                if (d.kind === "combinations") {
                    const k = this.state.k;
                    rows.push(
                        {id: "orderings", name: message("combinatorics_counting_readout_orderings"), value: this.formatted(`${smallText(k)}! = ${countText(d.orderings)}`)},
                        {id: "division", name: message("combinatorics_counting_readout_division"),
                         value: this.formatted(`${countText(d.ordered)} / ${countText(d.orderings)} = ${countText(d.count)}`)},
                    );
                    if (k >= 1 && k <= ORDERINGS_LIST_MAX_K) {
                        rows.push({id: "orderings-list", name: message("combinatorics_counting_readout_orderings_list"),
                                   value: this.formatted(treeLeaves(k, k, false).map(order => order.join("")).join(", "))});
                    }
                }
                return rows;
            }
            case "multiset": {
                const d = this.multiset();
                return [
                    {id: "letters", name: message("combinatorics_counting_readout_letters"), value: this.formatted(smallText(d.total))},
                    {id: "arrangements", name: message("combinatorics_counting_readout_arrangements"), value: this.formatted(this.multisetFormula())},
                    {id: "all-different", name: message("combinatorics_counting_readout_all_different"), value: this.formatted(`${smallText(d.total)}! = ${countText(d.allDifferent)}`)},
                ];
            }
            case "row": {
                const d = this.row();
                const k = this.rowPlace();
                return [
                    {id: "row-sum", name: message("combinatorics_counting_readout_row_sum"), value: this.formatted(`${countText(d.sum)} = 2${superscript(n)}`)},
                    {id: "alternating", name: message("combinatorics_counting_readout_alternating"), value: this.formatted(countText(d.alternatingSum))},
                    {id: "hockey", name: message("combinatorics_counting_readout_hockey"), value: this.hockeyMessage()},
                    {id: "weight", name: message("combinatorics_counting_readout_weight"), value: this.weightMessage(d.weights[k])},
                    {id: "weight-sum", name: message("combinatorics_counting_readout_weight_sum"), value: this.weightMessage(d.weightSum)},
                ];
            }
        }
    }

    /** The panel's text of the rows. */
    private readoutRows(): ReadoutListRow[] {
        return this.rowSpecs().map(({id, name, value}): ReadoutListRow => ({
            id, label: name ? renderMessage(name) : id, value: "kind" in value && value.kind === "formatted" ? value.text : renderMessage(value as Message),
        }));
    }

    // ---- Declaration ----------------------------------------------------------------------------------------------------

    /**
     * Parameter writes (ADR 0064). Keys `counting-n` and `counting-k` (the typed setters of the two counts, in the choices and in the row view; a value that is not
     * whole or outside the range is refused with the control's own message, never rounded) and `counting-t` (the weight, 0 to 1 in steps of 0,01; a typed weight is
     * snapped to the grid, as the slider does). The view, the example and the letter counts have no key: they stay in Orodja.
     */
    protected override parameterBindings(): Readonly<Record<string, ParameterBinding>> {
        const refuseCount = (range: {min: number; max: number}): never => {
            throw new DomainError(message("counting_value_rejected", {value0: messageNumber(range.min, 0), value1: messageNumber(range.max, 0)}));
        };
        return {
            "counting-n": {
                read: () => this.state.n,
                apply: (value: unknown) => {
                    const range = this.state.view === "row" ? ROW_N_RANGE : COUNT_N_RANGE;
                    if (typeof value !== "number" || !this.editN(value)) refuseCount(range);
                },
            },
            "counting-k": {
                read: () => this.state.view === "row" ? this.rowPlace() : this.state.k,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !this.editK(value)) refuseCount(this.kRange());
                },
            },
            "counting-t": {
                read: () => this.state.t / T_DENOMINATOR,
                apply: (value: unknown) => {
                    if (typeof value !== "number" || !this.editT(value)) {
                        throw new DomainError(message("counting_weight_rejected", {value0: messageNumber(T_RANGE.min / T_DENOMINATOR, 0), value1: messageNumber(T_RANGE.max / T_DENOMINATOR, 0)}));
                    }
                },
            },
        };
    }

    /**
     * Pure data from the state. Pucks (lessons CB2 and CB5 ask the learner to set them while watching the count): n and k in the choices and in the row view, the two
     * switches of the choices (order and repetition, flipped to compare), the weight t of the row view. The view and the example are setup and the letter counts of
     * the multiset are never asked for: they stay in Orodja. The status sentence is the note, the rows are the readouts; the board captions stay on the board.
     */
    protected override declaration(): GraphDeclaration<CountingTreeIds> {
        const {view, ordered, repetition} = this.state;
        const parameters: ParameterDeclaration<CountingTreeIds["param"]>[] = [];
        const actions: ActionDeclaration<CountingTreeIds>[] = [];
        if (view !== "multiset") {
            const nRange = view === "row" ? ROW_N_RANGE : COUNT_N_RANGE;
            const kRange = this.kRange();
            parameters.push(
                {key: "counting-n", kind: "count", label: message(view === "row" ? "counting_row_n_name" : "counting_n_name"), symbol: "n", placement: "board", min: nRange.min, max: nRange.max,
                 help: message(view === "row" ? "counting_row_n_help" : "counting_n_help")},
                {key: "counting-k", kind: "count", label: message(view === "row" ? "counting_row_k_name" : "counting_k_name"), symbol: "k", placement: "board", min: kRange.min, max: kRange.max,
                 help: message(view === "row" ? "counting_row_k_help" : "counting_k_help")},
            );
        }
        if (view === "row") {
            parameters.push({key: "counting-t", kind: "range", label: message("counting_t_name"), symbol: "t", placement: "board", min: T_RANGE.min / T_DENOMINATOR, max: T_RANGE.max / T_DENOMINATOR,
                             step: T_STEP, bigStep: T_BIG_STEP, maxDecimals: 2, help: message("counting_t_help")});
        }
        if (view === "choices") {
            actions.push(
                {id: "ordered", label: message("combinatorics_counting_ordered"), placement: "board", enabled: true, pressed: ordered, puck: true},
                {id: "repetition", label: message("counting_repetition_name"), placement: "board", enabled: true, pressed: repetition, puck: true},
            );
        }
        return {
            parameters,
            readouts: [{id: "values", title: message("combinatorics_readout_title"), rows: this.rowSpecs()}],
            notes: [{id: "status", text: this.statusMessage()}],
            actions,
            // The row view reads the bars with their numbers and indices and the captions above them (wrapped inside the width of VIEW_BOX): the frame is that part of VIEW_BOX, not the empty space under the indices.
            marks: {must: [{kind: "box", left: VIEW_BOX[0], top: VIEW_BOX[1], right: VIEW_BOX[2], bottom: view === "row" ? ROW_VIEW_BOTTOM : VIEW_BOX[3]}]},
            ...(view === "row" ? {followView: [VIEW_BOX[0], VIEW_BOX[1], VIEW_BOX[2], ROW_VIEW_BOTTOM] as [number, number, number, number]} : {}),
        };
    }

    override performAction(id: string): void {
        switch (id) {
            case "ordered": runAs("learner", () => this.setFlag({ordered: !this.state.ordered})); return;
            case "repetition": runAs("learner", () => this.setFlag({repetition: !this.state.repetition})); return;
            default: throw new Error("Unknown action");
        }
    }

    // ---- Controls -----------------------------------------------------------------------------------------------------

    private exampleValue(): string {
        const state = this.state;
        const match = EXAMPLES.find(example => example.view === state.view && (Object.keys(example.patch) as (keyof CountingState)[]).every(key => {
            const wanted = example.patch[key];
            const have = state[key];
            return Array.isArray(wanted) && Array.isArray(have) ? wanted.every((value, i) => value === have[i]) : wanted === have;
        }));
        return match ? match.id : "custom";
    }

    private chooseExample(id: string): void {
        const example = EXAMPLES.find(candidate => candidate.view === this.state.view && candidate.id === id);
        if (!example) return;
        const counts = example.patch.counts;
        this.setState({...example.patch, ...(counts ? {counts: [counts[0], counts[1], counts[2], counts[3]] as [number, number, number, number]} : {})});
        this.requestRender();
    }

    override getGraphCommands(): JSX.Element[] {
        const state = this.state;
        const view = state.view;
        const current = this.exampleValue();
        const exampleOptions = EXAMPLES.filter(example => example.view === view).map(example => ({value: example.id, text: this.exampleName(example.id)}));
        // The view chooser stays first in every view so it never moves; the letter counts follow it, the example chooser last. The counts n and k, the two
        // switches and the weight are pucks on the board; their controls here render only while no puck owns them.
        const selectors: JSX.Element[] = [
            <ChoiceSelect key="view" label={t("combinatorics_view_label")} value={view}
                          options={COUNTING_VIEWS.map(name => ({value: name, text: this.viewName(name)}))}
                          onChange={value => {
                              const next = COUNTING_VIEWS.find(candidate => candidate === value);
                              if (next) this.changeView(next);
                          }}/>,
            <ChoiceSelect key="example" label={t("combinatorics_example_label")} value={current}
                          options={current === "custom" ? [{value: "custom", text: t("combinatorics_example_custom")}, ...exampleOptions] : exampleOptions}
                          onChange={value => this.chooseExample(value)}/>,
        ];
        const commands: JSX.Element[] = [];
        if (view === "multiset") {
            LETTERS.forEach((letter, kind) => commands.push(
                <CountSetter key={`count-${letter}`} label={t("combinatorics_counting_letter_count", {value0: letter})} n={state.counts[kind]}
                             min={MULTISET_COUNT_RANGE.min} max={MULTISET_COUNT_RANGE.max} bigStep={COUNT_BIG_STEP}
                             onPlus={() => this.editCount(kind, state.counts[kind] + 1)} onMinus={() => this.editCount(kind, state.counts[kind] - 1)}
                             onSet={value => this.editCount(kind, value)}/>,
            ));
        } else {
            const nRange = view === "row" ? ROW_N_RANGE : COUNT_N_RANGE;
            const k = view === "row" ? this.rowPlace() : state.k;
            commands.push(
                <PuckOwned key="n" param="counting-n">
                    <CountSetter label={t(view === "row" ? "combinatorics_counting_row_n_label" : "combinatorics_counting_n_label")} n={state.n}
                                 min={nRange.min} max={nRange.max} bigStep={BIG_STEP}
                                 onPlus={() => this.editN(state.n + 1)} onMinus={() => this.editN(state.n - 1)} onSet={value => this.editN(value)}/>
                </PuckOwned>,
                <PuckOwned key="k" param="counting-k">
                    <CountSetter label={t(view === "row" ? "combinatorics_counting_row_k_label" : "combinatorics_counting_k_label")} n={k}
                                 min={() => this.kRange().min} max={() => this.kRange().max} bigStep={BIG_STEP}
                                 onPlus={() => this.editK(k + 1)} onMinus={() => this.editK(k - 1)} onSet={value => this.editK(value)}/>
                </PuckOwned>,
            );
        }
        if (view === "choices") {
            commands.push(
                <PuckOwned key="ordered" param="ordered">
                    <BooleanField variant="switch" label={t("combinatorics_counting_ordered")} checked={state.ordered}
                                  onChange={checked => this.setFlag({ordered: checked})}/>
                </PuckOwned>,
                <PuckOwned key="repetition" param="repetition">
                    <BooleanField variant="switch" label={t("combinatorics_counting_repetition")} checked={state.repetition}
                                  onChange={checked => this.setFlag({repetition: checked})}/>
                </PuckOwned>,
            );
        }
        if (view === "row") {
            commands.push(
                <PuckOwned key="t" param="counting-t">
                    <Slider customText={t("combinatorics_counting_t_label")} value={state.t / T_DENOMINATOR} step={T_STEP} bigStep={T_BIG_STEP}
                            min={T_RANGE.min / T_DENOMINATOR} max={T_RANGE.max / T_DENOMINATOR} grid={T_STEP} decimals={2}
                            onChange={value => this.editT(value)}/>
                </PuckOwned>,
            );
        }
        return [selectors[0], ...commands, selectors[1]];
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group" data-declared-panel="">
                <ReadoutHeading>{t("combinatorics_readout_title")}</ReadoutHeading>
                <p data-combinatorics-status="" data-readout-note="">{this.statusText()}</p>
                <ReadoutList label={t("combinatorics_readout_title")} rows={this.readoutRows()}/>
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
