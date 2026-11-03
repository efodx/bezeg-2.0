import React, {useId, useSyncExternalStore} from "react";
import {NumberInput} from "../../inputs/NumberInput";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {currentLanguage, renderMessage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {POLY_BOUNDS} from "../../analysis/schoolFunctions";
import {MAX_MULTIPLICITY} from "../../analysis/polynomial";
import {ZERO_GRID_DECIMALS, ZERO_GRID_STEP, ZeroEntry, ZeroListEvent, ZeroListIssue, zeroListDegree} from "../../analysis/zeroListModel";
import {zeroListIssueMessage} from "./zeroListMessages";

/*
 * The editing controls of a zero list (a numeric position field with arrow-key nudges of one grid step, a multiplicity choice and a
 * remove button for every zero, an add button that explains its disabled state) and the polite live text that announces a merge or
 * a refusal. Shared by the polynomial-zeros graph and the rational-function graph (one editor for the numerator, one for the
 * denominator); the rules live in `analysis/zeroListModel`, the words in `zeroListMessages` and the `zero_list_*` catalog keys.
 */

/** What the live text says: two zeros merged, or a rule refused an edit (with its reason). */
export type ZeroListNotice =
    | { readonly kind: 'merged'; readonly z: number; readonly m: number }
    | { readonly kind: 'refused'; readonly issue: ZeroListIssue };

export const noticeOfEvent = (event: ZeroListEvent): ZeroListNotice => ({kind: 'merged', z: event.z, m: event.m});

/** The current notice of a graph, readable by React (the notice is transient: it is not part of the model or the scene state). */
export class ZeroListNoticeStore {
    private current: ZeroListNotice | undefined;
    private readonly listeners = new Set<() => void>();

    get(): ZeroListNotice | undefined {
        return this.current;
    }

    set(notice: ZeroListNotice | undefined): void {
        if (notice === this.current) return;
        this.current = notice;
        this.listeners.forEach(listener => listener());
    }

    readonly subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
}

/** The sentence of a notice in the current language (the text of a refusal is the reason of the rule). */
export function zeroListNoticeText(notice: ZeroListNotice, t: ReturnType<typeof useT>): string {
    if (notice.kind === 'refused') return renderMessage(zeroListIssueMessage(notice.issue));
    const z = formatNumber(notice.z, currentLanguage(), ZERO_GRID_DECIMALS);
    return notice.m >= MAX_MULTIPLICITY ? t("zero_list_notice_merged_triple", {value0: z}) : t("zero_list_notice_merged_double", {value0: z});
}

/** The polite live region: always present, so assistive technology announces the text when it changes. */
export function ZeroListNoticeView(props: { store: ZeroListNoticeStore }) {
    const t = useT();
    const notice = useSyncExternalStore(props.store.subscribe, () => props.store.get());
    return <div className="inspector-group zero-list-notice" role="status" aria-live="polite" data-zero-list-notice={notice?.kind ?? "none"}>
        {notice && <p className="inspector-help">{zeroListNoticeText(notice, t)}</p>}
    </div>;
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
}

/** The controls of one zero list. */
export function ZeroListEditor(props: ZeroListEditorProps) {
    const t = useT();
    const reasonId = useId();
    const atCap = zeroListDegree(props.zeros) >= props.maxDegree;
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
            <button type="button" data-action="add-zero" disabled={atCap} aria-describedby={atCap ? reasonId : undefined} onClick={props.onAdd}>
                {`${prefix}${t("zero_list_add")}`}
            </button>
        </div>
        {atCap && <p id={reasonId} className="inspector-help" data-zero-list-cap>{t("zero_list_cap_reason", {value0: props.maxDegree})}</p>}
    </div>;
}
