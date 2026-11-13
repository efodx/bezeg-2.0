import React from "react";
import BaseGraph, {BaseGraphState} from "../base/BaseGraph";
import {currentLanguage, onLanguageChange, t} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
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

/** The scene state: the stored counting fields. */
export interface CountingTreeGraphState extends BaseGraphState, CountingState {}

/** The fixed view box: the tree, the table, the letters and the bars all sit inside it, the captions are above and below. */
export const VIEW_BOX: [number, number, number, number] = [-0.5, 24.5, 24.5, -2.5];
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

/** Tree layout: the leaves share the width, the levels share the height. */
export const TREE_TOP = 21;
export const TREE_BOTTOM = 8;
export const TREE_LEFT = 0.6;
export const TREE_WIDTH = 23.2;
export const treeLeafX = (index: number, leaves: number): number => TREE_LEFT + ((index + 0.5) * TREE_WIDTH) / Math.max(1, leaves);
/** Row layout: bar j is C(n, j) with its weight. */
export const BAR_BASE = 9.5;
export const BAR_HEIGHT = 9;
export const barX = (index: number): number => 0.9 + 1.15 * index;
/** The text "k = 3" sits this far above the top of the chosen bar, so the choice is not carried by colour alone. */
export const MARKER_GAP = 0.3;
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
/** The note above the table (up to NOTE_LINES lines of NOTE_CHARS characters) and the title under it. */
const TABLE_NOTE_Y = 24.2;
const TABLE_TITLE_Y = 19.8;
const NOTE_LINES = 3;
const NOTE_CHARS = 38;
const TITLE_LINES = 2;
const TITLE_CHARS = 34;

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

const HELP_ID = "combinatorics-counting-input-help";
const numberText = (value: number): string => formatNumber(value, currentLanguage(), 2);

interface TreeData {
    readonly leaves: readonly number[][];
    readonly edges: Poly;
    readonly rows: number;
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
    private notice?: {readonly state: CountingTreeGraphState; readonly text: () => string};

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
            slot.tree = {leaves, edges: this.treeEdges(leaves, k), rows: leaves.length > 32 ? 3 : leaves.length > 16 ? 2 : 1};
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
                    visible: boolean | (() => boolean) = true, options: {anchorX?: "left" | "middle" | "right"; anchorY?: "top" | "middle" | "bottom"; fontSize?: number} = {}): JXG.Text {
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
        for (let i = 0; i < TREE_LEAF_LIMIT; i++) {
            this.caption(() => this.leafText(i), () => treeLeafX(i, this.tree().leaves.length), () => TREE_BOTTOM - 0.5 - 1.1 * (i % this.tree().rows),
                GraphPalette.label, () => i < this.tree().leaves.length, {anchorX: "middle", anchorY: "top", fontSize: this.tree().leaves.length > 32 ? 11 : 14});
        }
        this.caption(() => t("combinatorics_counting_cap_tree"), -0.3, 23.4, GraphPalette.label);
        this.caption(() => this.treeTitle(), -0.3, 22.4, GraphPalette.primaryCurve);
    }

    private treeTitle(): string {
        const {n, k} = this.state;
        return `${this.kindName(this.counting().kind)}: n = ${smallText(n)}, k = ${smallText(k)}`;
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
        // The long sentences wrap into lines of at most NOTE_CHARS / TITLE_CHARS characters, which fit the narrowest board (390 px wide).
        const note = () => wrapWords(t("combinatorics_counting_table_note", {value0: smallText(TREE_LEAF_LIMIT)}), NOTE_CHARS);
        for (let line = 0; line < NOTE_LINES; line++) {
            this.caption(() => note()[line] ?? "", -0.3, TABLE_NOTE_Y - 1.5 * line, GraphPalette.warningText, () => this.counting().ordered > BigInt(TREE_LEAF_LIMIT), {fontSize: 12});
        }
        const title = () => wrapWords(this.treeTitle(), TITLE_CHARS);
        for (let line = 0; line < TITLE_LINES; line++) this.caption(() => title()[line] ?? "", -0.3, TABLE_TITLE_Y - 1.55 * line, GraphPalette.primaryCurve, true, {fontSize: 13});
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
        this.caption(() => this.multisetFormula(), -0.3, 19.5, GraphPalette.primaryCurve, true, {fontSize: 18});
        this.caption(() => `${smallText(this.multiset().total)}! = ${countText(this.multiset().allDifferent)}`, -0.3, 17.2, GraphPalette.label);
    }

    private multisetFormula(): string {
        const {total, count} = this.multiset();
        const parts = this.state.counts.map(value => `${smallText(value)}!`).join(" · ");
        return `${smallText(total)}! / (${parts}) = ${countText(count)}`;
    }

    private buildRow(): void {
        const showing = (j: number) => () => j <= this.state.n;
        this.curve(() => {
            const poly = emptyPoly();
            addPolyline(poly, [[0.2, BAR_BASE], [24, BAR_BASE]]);
            return poly;
        }, GraphPalette.axis, 1, 0);
        this.curve(() => this.barData(false), GraphPalette.primaryCurve, 14, 0);
        this.curve(() => this.barData(true), GraphPalette.constructionAccent, 14, 0);
        for (let j = 0; j < ROW_POOL; j++) {
            this.caption(() => (j <= this.state.n ? countText(this.row().row[j]) : ""), barX(j), BAR_BASE - 1 - 1.2 * (j % 2), GraphPalette.label, showing(j),
                {anchorX: "middle", anchorY: "top", fontSize: 13});
            this.caption(() => (j <= this.state.n ? smallText(j) : ""), barX(j), 4.6, GraphPalette.axis, showing(j), {anchorX: "middle", fontSize: 12});
        }
        // The chosen bar is also named in text above its top: the accent colour alone does not carry the choice.
        this.caption(() => t("combinatorics_counting_cap_bar_k", {value0: smallText(this.rowPlace())}), () => barX(this.rowPlace()),
            () => BAR_BASE + this.barHeight(this.rowPlace()) + MARKER_GAP, GraphPalette.constructionAccent, true, {anchorX: "middle", anchorY: "bottom", fontSize: 13});
        this.caption(() => t("combinatorics_counting_cap_row", {value0: smallText(this.state.n)}), -0.3, 23.4, GraphPalette.label);
        this.caption(() => t("combinatorics_counting_cap_weights", {value0: numberText(this.state.t / T_DENOMINATOR)}), -0.3, 22.2, GraphPalette.label);
        this.caption(() => t("combinatorics_counting_cap_selected", {value0: smallText(this.rowPlace()), value1: this.selectedText()}), -0.3, 21, GraphPalette.constructionAccent);
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
            addPolyline(poly, [[barX(j), BAR_BASE], [barX(j), BAR_BASE + this.barHeight(j)]]);
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
        if (k < before) this.notice = {state: this.state, text: () => t("combinatorics_counting_notice_k", {value0: smallText(k)})};
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
     * repetition, a count out of range or a non-integer throws); nothing is snapped or lowered. `setState` writes the store synchronously.
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

    /** The status, with the clause of the last edit that changed a value by itself (k lowered) while that state is current. */
    statusText(): string {
        const base = this.baseStatusText();
        return this.notice && this.notice.state === this.state ? `${base} ${this.notice.text()}` : base;
    }

    /** A weight rounded to 6 decimals; a nonzero weight that rounds to 0 is shown as "< 0,000001" instead of a false 0. */
    private weightText(value: number): string {
        const language = currentLanguage();
        const tiny = value > 0 && Number(value.toFixed(6)) === 0;
        return t("combinatorics_computed", {
            value0: tiny ? t("combinatorics_counting_weight_tiny", {value0: formatNumber(0.000001, language, 6)}) : formatNumber(value, language, 6),
        });
    }

    private baseStatusText(): string {
        const {n, k} = this.state;
        switch (this.state.view) {
            case "choices": {
                const d = this.counting();
                return t("combinatorics_counting_status", {value0: this.kindName(d.kind), value1: smallText(n), value2: smallText(k), value3: countText(d.count)});
            }
            case "multiset": {
                const d = this.multiset();
                return t("combinatorics_counting_status_multiset", {value0: smallText(d.total), value1: countText(d.count)});
            }
            case "row": {
                const d = this.row();
                return t("combinatorics_counting_status_row", {value0: smallText(n), value1: countText(d.sum), value2: countText(d.alternatingSum)});
            }
        }
    }

    private productText(d: CountingDerived): string {
        const {n, k, repetition} = this.state;
        const factors = Array.from({length: k}, (_, i) => smallText(repetition ? n : n - i));
        return `${factors.length ? factors.join(" · ") : "1"} = ${countText(d.ordered)}`;
    }

    private hockeyText(): string {
        const n = this.state.n;
        const k = this.rowPlace();
        const terms = Array.from({length: n - k + 1}, (_, i) => binomText(k + i, k));
        const shown = terms.length <= 5 ? terms.join(" + ") : `${terms[0]} + ${terms[1]} + … + ${terms[terms.length - 1]}`;
        return `${shown} = ${countText(this.row().hockeyStick)} = ${binomText(n + 1, k + 1)}`;
    }

    private readoutRows(): ReadoutListRow[] {
        const {n} = this.state;
        switch (this.state.view) {
            case "choices": {
                const d = this.counting();
                const rows: ReadoutListRow[] = [
                    {id: "kind", label: t("combinatorics_counting_readout_kind"), value: this.kindName(d.kind)},
                    {id: "count", label: t("combinatorics_counting_readout_count"), value: countText(d.count)},
                    {id: "leaves", label: t("combinatorics_counting_readout_leaves"), value: countText(d.ordered)},
                ];
                if (d.kind !== "combinationsRepetition") {
                    rows.push({id: "product", label: t("combinatorics_counting_readout_product"), value: this.productText(d)});
                }
                if (d.kind === "combinations") {
                    const k = this.state.k;
                    rows.push(
                        {id: "orderings", label: t("combinatorics_counting_readout_orderings"), value: `${smallText(k)}! = ${countText(d.orderings)}`},
                        {id: "division", label: t("combinatorics_counting_readout_division"),
                         value: `${countText(d.ordered)} / ${countText(d.orderings)} = ${countText(d.count)}`},
                    );
                    if (k >= 1 && k <= ORDERINGS_LIST_MAX_K) {
                        rows.push({id: "orderings-list", label: t("combinatorics_counting_readout_orderings_list"),
                                   value: treeLeaves(k, k, false).map(order => order.join("")).join(", ")});
                    }
                }
                return rows;
            }
            case "multiset": {
                const d = this.multiset();
                return [
                    {id: "letters", label: t("combinatorics_counting_readout_letters"), value: smallText(d.total)},
                    {id: "arrangements", label: t("combinatorics_counting_readout_arrangements"), value: this.multisetFormula()},
                    {id: "all-different", label: t("combinatorics_counting_readout_all_different"), value: `${smallText(d.total)}! = ${countText(d.allDifferent)}`},
                ];
            }
            case "row": {
                const d = this.row();
                const k = this.rowPlace();
                return [
                    {id: "row-sum", label: t("combinatorics_counting_readout_row_sum"), value: `${countText(d.sum)} = 2${superscript(n)}`},
                    {id: "alternating", label: t("combinatorics_counting_readout_alternating"), value: countText(d.alternatingSum)},
                    {id: "hockey", label: t("combinatorics_counting_readout_hockey"), value: this.hockeyText()},
                    {id: "weight", label: t("combinatorics_counting_readout_weight"),
                     value: this.weightText(d.weights[k])},
                    {id: "weight-sum", label: t("combinatorics_counting_readout_weight_sum"), value: this.weightText(d.weightSum)},
                ];
            }
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
        const commands: JSX.Element[] = [
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
        if (view === "multiset") {
            LETTERS.forEach((letter, kind) => commands.push(
                <NumberInput key={`count-${letter}`} label={t("combinatorics_counting_letter_count", {value0: letter})} value={state.counts[kind]} step={STEP}
                             bigStep={COUNT_BIG_STEP} min={MULTISET_COUNT_RANGE.min} max={MULTISET_COUNT_RANGE.max} grid={1} decimals={0} describedBy={HELP_ID}
                             onChange={value => this.editCount(kind, value)}/>,
            ));
        } else {
            const kRange = this.kRange();
            commands.push(
                <NumberInput key="n" label={t(view === "row" ? "combinatorics_counting_row_n_label" : "combinatorics_counting_n_label")} value={state.n}
                             step={STEP} bigStep={BIG_STEP} min={(view === "row" ? ROW_N_RANGE : COUNT_N_RANGE).min}
                             max={(view === "row" ? ROW_N_RANGE : COUNT_N_RANGE).max} grid={1} decimals={0} describedBy={HELP_ID} onChange={value => this.editN(value)}/>,
                <NumberInput key="k" label={t(view === "row" ? "combinatorics_counting_row_k_label" : "combinatorics_counting_k_label")}
                             value={view === "row" ? this.rowPlace() : state.k} step={STEP} bigStep={BIG_STEP} min={kRange.min} max={kRange.max} grid={1} decimals={0}
                             describedBy={HELP_ID} onChange={value => this.editK(value)}/>,
            );
        }
        if (view === "choices") {
            commands.push(
                <BooleanField key="ordered" variant="switch" label={t("combinatorics_counting_ordered")} checked={state.ordered} describedBy={HELP_ID}
                              onChange={checked => this.setFlag({ordered: checked})}/>,
                <BooleanField key="repetition" variant="switch" label={t("combinatorics_counting_repetition")} checked={state.repetition} describedBy={HELP_ID}
                              onChange={checked => this.setFlag({repetition: checked})}/>,
            );
        }
        if (view === "row") {
            commands.push(
                <NumberInput key="t" label={t("combinatorics_counting_t_label")} value={state.t / T_DENOMINATOR} step={T_STEP} bigStep={T_BIG_STEP}
                             min={T_RANGE.min / T_DENOMINATOR} max={T_RANGE.max / T_DENOMINATOR} grid={T_STEP} decimals={2} describedBy={HELP_ID}
                             onChange={value => this.editT(value)}/>,
            );
        }
        commands.push(<p key="help" id={HELP_ID} className="form-text">{t("combinatorics_counting_input_help", {
            value0: smallText(COUNT_N_RANGE.min), value1: smallText(COUNT_N_RANGE.max), value2: smallText(MULTISET_COUNT_RANGE.min),
            value3: smallText(MULTISET_COUNT_RANGE.max), value4: numberText(T_RANGE.min / T_DENOMINATOR), value5: numberText(T_RANGE.max / T_DENOMINATOR),
            value6: numberText(T_STEP), value7: numberText(T_BIG_STEP),
        })}</p>);
        return commands;
    }

    protected override workspaceEdit(): React.ReactNode {
        return <>
            {this.getGraphCommandsArea()}
            <div className="inspector-group">
                <ReadoutHeading>{t("combinatorics_readout_title")}</ReadoutHeading>
                <p data-combinatorics-status="">{this.statusText()}</p>
                <ReadoutList label={t("combinatorics_readout_title")} rows={this.readoutRows()}/>
                <LiveReadout readout={this.status}/>
            </div>
        </>;
    }
}
