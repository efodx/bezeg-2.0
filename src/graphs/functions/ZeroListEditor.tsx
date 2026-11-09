import React, {useSyncExternalStore} from "react";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {currentLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {POLY_BOUNDS} from "../../analysis/schoolFunctions";
import {MAX_MULTIPLICITY} from "../../analysis/polynomial";
import {ZERO_GRID_DECIMALS, ZERO_GRID_STEP, ZeroEntry, ZeroListEvent, zeroListDegree} from "../../analysis/zeroListModel";
import {FunctionStatus} from "./FunctionStatus";

/*
 * The editing controls of a zero list (a numeric position field with arrow-key nudges of one grid step, a multiplicity choice and a
 * remove button for every zero, an add button that explains why it is unavailable) and the status line that announces a merge. A
 * refusal is not shown here: the graph routes it through its one `RefusalChannel`. Shared by the polynomial-zeros graph and the rational-function graph (one editor for the numerator, one for the
 * denominator); the rules live in `analysis/zeroListModel`, the words in `zeroListMessages` and the `zero_list_*` catalog keys.
 */

/** What the status line says after an accepted edit: two zeros merged. */
export type ZeroListNotice = { readonly kind: 'merged'; readonly z: number; readonly m: number };

export const noticeOfEvent = (event: ZeroListEvent): ZeroListNotice => ({kind: 'merged', z: event.z, m: event.m});

/** The current notice of a graph, readable by React (the notice is transient: it is not part of the model or the scene state). */
export class ZeroListNoticeStore<N extends { readonly kind: string } = ZeroListNotice> {
    private current: N | undefined;
    private readonly listeners = new Set<() => void>();

    get(): N | undefined {
        return this.current;
    }

    set(notice: N | undefined): void {
        if (notice === this.current) return;
        this.current = notice;
        this.listeners.forEach(listener => listener());
    }

    readonly subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
}

/** The sentence of a notice in the current language. */
export function zeroListNoticeText(notice: ZeroListNotice, t: ReturnType<typeof useT>): string {
    const z = formatNumber(notice.z, currentLanguage(), ZERO_GRID_DECIMALS);
    return notice.m >= MAX_MULTIPLICITY ? t("zero_list_notice_merged_triple", {value0: z}) : t("zero_list_notice_merged_double", {value0: z});
}

/** The graph's status group for a notice (the shared `FunctionStatus`: one settled announcement; empty while there is no notice). `describe` words a notice (`zeroListNoticeText` for the zero list's own). */
export function ZeroListNoticeView<N extends { readonly kind: string }>(props: {
    store: ZeroListNoticeStore<N>; describe: (notice: N, t: ReturnType<typeof useT>) => string;
}) {
    const t = useT();
    const notice = useSyncExternalStore(props.store.subscribe, () => props.store.get());
    return <FunctionStatus className="zero-list-notice" dataAttribute="zero-list-notice"
                           lines={notice ? [{id: notice.kind, text: props.describe(notice, t)}] : []}/>;
}

interface ZeroListEditorProps {
    /** A heading and the prefix of the field names, for a second list on the same graph ("numerator"); omitted for a single list. */
    readonly scope?: string;
    readonly zeros: readonly ZeroEntry[];
    readonly maxDegree: number;
    /** Return false when the model refused the edit (the field then explains it). */
    readonly onMove: (index: number, x: number) => boolean;
    readonly onMultiplicity: (index: number, m: number) => void;
    readonly onAdd: () => void;
    readonly onRemove: (index: number) => void;
    /** Called with the reason when the unavailable add button is pressed; the graph shows it through its refusal channel. */
    readonly onBlocked: (reason: string) => void;
}

/** The controls of one zero list. */
export function ZeroListEditor(props: ZeroListEditorProps) {
    const t = useT();
    const atCap = zeroListDegree(props.zeros) >= props.maxDegree;
    const capReason = t("zero_list_cap_reason", {value0: props.maxDegree});
    const prefix = props.scope === undefined ? "" : `${props.scope}: `;
    const range = {value0: formatNumber(POLY_BOUNDS.z[0], currentLanguage()), value1: formatNumber(POLY_BOUNDS.z[1], currentLanguage())};
    const multiplicityName: Readonly<Record<number, string>> = {
        1: t("zero_list_multiplicity_1"), 2: t("zero_list_multiplicity_2"), 3: t("zero_list_multiplicity_3"),
    };
    return <div className="inspector-group zero-list-editor" data-zero-list={props.scope ?? "zeros"}>
        {props.scope !== undefined && <h3>{props.scope}</h3>}
        {props.zeros.map((zero, index) => <div key={index} className="zero-list-row" data-zero-row={index}>
            <NumberInput label={`${prefix}${t("zero_list_position_label", {value0: index + 1})}`} value={zero.z}
                         min={POLY_BOUNDS.z[0]} max={POLY_BOUNDS.z[1]} step={ZERO_GRID_STEP} decimals={ZERO_GRID_DECIMALS}
                         rejectedHint={t("zero_list_position_hint", range)} onChange={next => props.onMove(index, next)}/>
            <ChoiceSelect label={`${prefix}${t("zero_list_multiplicity_label", {value0: index + 1})}`} value={String(zero.m)}
                          options={[1, 2, 3].map(m => ({value: String(m), text: `${m} (${multiplicityName[m]})`}))}
                          onChange={next => props.onMultiplicity(index, Number(next))}/>
            <button type="button" data-action="remove-zero" onClick={() => props.onRemove(index)}>
                {`${prefix}${t("zero_list_remove", {value0: index + 1})}`}
            </button>
        </div>)}
        <div className="convexity-actions" role="group" aria-label={`${prefix}${t("zero_list_actions_label")}`}>
            <UnavailableButton data-action="add-zero" reason={atCap ? capReason : undefined} onPress={props.onAdd} onBlockedPress={props.onBlocked}>
                {`${prefix}${t("zero_list_add")}`}
            </UnavailableButton>
        </div>
        {atCap && <p className="inspector-help" data-zero-list-cap>{capReason}</p>}
    </div>;
}
