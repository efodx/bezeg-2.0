import React, {useState} from "react";
import {useLanguage, useT} from "../../localization";
import {formatNumber} from "../../analysis/format";
import {GridPoint} from "../../compgeo/grid";
import {
    CircleSpec, INVERSION_COORDINATE_MAX, INVERSION_EXAMPLES, INVERSION_RADIUS_MAX, InversionExampleId, InversionSource,
} from "../../compgeo/inversionModel";
import {normaliseDegrees} from "../../compgeo/inscribedAngleModel";
import {INVERSION_FOCI, InversionFocus, isInversionFocus} from "./inversionPresetCollection";
import {inversionTexts} from "./inversionText";
import {InversionPlaceId, InversionView} from "./inversionView";

export interface InversionFields {
    readonly hasCentre: boolean;
    readonly focus: InversionFocus;
    readonly radius: number;
    readonly x: GridPoint;
    readonly source: InversionSource;
    readonly power: {readonly circle: CircleSpec; readonly thetaDeg: number};
    readonly angle: {readonly first: CircleSpec; readonly second: CircleSpec; readonly which: 0 | 1};
}

export interface InversionPanelActions {
    onExample(id: InversionExampleId): void;
    onFocus(focus: InversionFocus): void;
    onRadius(radius: number): void;
    onX(point: GridPoint): void;
    onSourceKind(kind: InversionSource["kind"]): void;
    onSource(source: InversionSource): void;
    onPowerCircle(circle: CircleSpec): void;
    onTheta(degrees: number): void;
    onThetaStep(deltaDeg: number): void;
    onAngleCircle(which: 0 | 1, circle: CircleSpec): void;
    onWhich(which: 0 | 1): void;
}

export interface InversionPanelProps extends InversionPanelActions {
    fields: InversionFields;
    exampleId: InversionExampleId | undefined;
    view: InversionView;
    /** The drawn places not visible in the current board view. */
    outside: ReadonlySet<InversionPlaceId>;
}

/**
 * The readouts and controls of the inversion graph: example and focus choice, the inversion radius, the fields of the current
 * focus (X; the source circle or line; the power circle and the direction; the two circles and the intersection), then the
 * status chip and the readouts as words. The status paragraph keeps its element mounted (live region); state is words, never
 * colour alone.
 */
export function InversionPanel(props: InversionPanelProps) {
    const t = useT();
    const {language} = useLanguage();
    const {fields} = props;
    const texts = inversionTexts(props.view, t, language, props.outside, fields.radius);
    return <div className="inspector-group inversion-panel" data-inversion-state={texts.state} data-inversion-focus-now={fields.focus}>
        <ExampleAndFocus {...props}/>
        <p className="inspector-help pointset-status" role="status" data-inversion-chip>{texts.chip}</p>
        {fields.hasCentre && <>
            {fields.focus !== "power" && <IntField label={t("inversion_radius_label")} field="radius" value={fields.radius} min={1} max={INVERSION_RADIUS_MAX}
                                                   onValue={props.onRadius}/>}
            <FocusFields {...props}/>
            <ul className="pointset-list inversion-readouts">
                {texts.rows.map(row => <li key={row.id} data-inversion-readout={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
            </ul>
        </>}
    </div>;
}

function ExampleAndFocus(props: InversionPanelProps) {
    const t = useT();
    const names: Readonly<Record<InversionExampleId, string>> = {
        point: t("inversion_example_point"), "through-centre": t("inversion_example_through_centre"),
        "not-through-centre": t("inversion_example_not_through_centre"), power: t("inversion_example_power"),
        orthogonal: t("inversion_example_orthogonal"), angle: t("inversion_example_angle"),
        "line-through-centre": t("inversion_example_line_through_centre"),
    };
    const focusNames: Readonly<Record<InversionFocus, string>> = {
        point: t("inversion_focus_point"), source: t("inversion_focus_source"), power: t("inversion_focus_power"), angle: t("inversion_focus_angle"),
    };
    return <>
        <label className="pointset-check">{t("inversion_example_label")}{" "}
            <select value={props.exampleId ?? "custom"} data-inversion-example
                    onChange={event => {
                        const found = INVERSION_EXAMPLES.find(example => example.id === event.target.value);
                        if (found) props.onExample(found.id);
                    }}>
                {INVERSION_EXAMPLES.map(example => <option key={example.id} value={example.id}>{names[example.id]}</option>)}
                {props.exampleId === undefined && <option value="custom">{t("notable_example_custom")}</option>}
            </select>
        </label>
        <label className="pointset-check">{t("inversion_focus_label")}{" "}
            <select value={props.fields.focus} data-inversion-focus
                    onChange={event => { if (isInversionFocus(event.target.value)) props.onFocus(event.target.value); }}>
                {INVERSION_FOCI.map(focus => <option key={focus} value={focus}>{focusNames[focus]}</option>)}
            </select>
        </label>
    </>;
}

function FocusFields(props: InversionPanelProps) {
    const t = useT();
    const {fields} = props;
    if (fields.focus === "point") return <PointFields name="X" point={fields.x} field="x" onPoint={props.onX}/>;
    if (fields.focus === "source") {
        const source = fields.source;
        return <>
            <label className="pointset-check">{t("inversion_source_kind_label")}{" "}
                <select value={source.kind} data-inversion-source-kind
                        onChange={event => { if (event.target.value === "circle" || event.target.value === "line") props.onSourceKind(event.target.value); }}>
                    <option value="circle">{t("inversion_source_circle")}</option>
                    <option value="line">{t("inversion_source_line")}</option>
                </select>
            </label>
            {source.kind === "circle"
                ? <CircleFields name="S" radiusName="r₀" field="source" circle={source} onCircle={circle => props.onSource({kind: "circle", ...circle})}/>
                : <>
                    <PointFields name="S₁" point={source.p} field="source-p" onPoint={p => props.onSource({kind: "line", p, q: source.q})}/>
                    <PointFields name="S₂" point={source.q} field="source-q" onPoint={q => props.onSource({kind: "line", p: source.p, q})}/>
                </>}
        </>;
    }
    if (fields.focus === "power") {
        return <>
            <CircleFields name="O" radiusName="r₀" field="power" circle={fields.power.circle} onCircle={props.onPowerCircle}/>
            <ThetaFields degrees={fields.power.thetaDeg} onTheta={props.onTheta} onStep={props.onThetaStep}/>
        </>;
    }
    return <>
        <CircleFields name="O₁" radiusName="r₁" field="first" circle={fields.angle.first} onCircle={circle => props.onAngleCircle(0, circle)}/>
        <CircleFields name="O₂" radiusName="r₂" field="second" circle={fields.angle.second} onCircle={circle => props.onAngleCircle(1, circle)}/>
        <div className="pointset-check" role="group" aria-label={t("inversion_which_label")}>
            {t("inversion_which_label")}{" "}
            {([0, 1] as const).map(which =>
                <button key={which} type="button" data-inversion-which={which} aria-pressed={fields.angle.which === which}
                        onClick={() => props.onWhich(which)}>
                    {t(which === 0 ? "inversion_which_first" : "inversion_which_second")}
                </button>)}
        </div>
    </>;
}

function PointFields(props: {name: string; field: string; point: GridPoint; onPoint(point: GridPoint): void}) {
    const t = useT();
    const limit = INVERSION_COORDINATE_MAX;
    return <>
        <IntField label={t("inversion_field", {value0: props.name, value1: "x"})} field={`${props.field}-x`} value={props.point.x} min={-limit} max={limit}
                  onValue={x => props.onPoint({x, y: props.point.y})}/>
        <IntField label={t("inversion_field", {value0: props.name, value1: "y"})} field={`${props.field}-y`} value={props.point.y} min={-limit} max={limit}
                  onValue={y => props.onPoint({x: props.point.x, y})}/>
    </>;
}

function CircleFields(props: {name: string; radiusName: string; field: string; circle: CircleSpec; onCircle(circle: CircleSpec): void}) {
    const t = useT();
    return <>
        <PointFields name={props.name} field={props.field} point={props.circle.centre} onPoint={centre => props.onCircle({centre, radius: props.circle.radius})}/>
        <IntField label={t("inversion_field_radius", {value0: props.radiusName})} field={`${props.field}-r`} value={props.circle.radius} min={1}
                  max={INVERSION_RADIUS_MAX} onValue={radius => props.onCircle({centre: props.circle.centre, radius})}/>
    </>;
}

/** An integer field within [min, max]; text that is not such a number is kept while typing and never written. */
function IntField(props: {label: string; field: string; value: number; min: number; max: number; onValue(value: number): void}) {
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const draftValue = draft === undefined || draft.trim() === "" ? NaN : Number(draft);
    const keepDraft = draft !== undefined && draftValue !== props.value;
    return <label className="pointset-check">{props.label}{" "}
        <input type="number" step={1} min={props.min} max={props.max} value={keepDraft ? draft : String(props.value)} data-inversion-field={props.field}
               onChange={event => {
                   setDraft(event.target.value);
                   const value = event.target.valueAsNumber;
                   if (Number.isInteger(value) && value >= props.min && value <= props.max) props.onValue(value);
               }}
               onKeyDown={event => {
                   // Plain arrows step 1 natively; Shift steps 10, clamped to the range.
                   if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
                   const sign = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
                   if (sign === 0) return;
                   event.preventDefault();
                   setDraft(undefined);
                   const next = Math.min(Math.max(props.value + sign * 10, props.min), props.max);
                   if (next !== props.value) props.onValue(next);
               }}
               onBlur={() => setDraft(undefined)}/>
    </label>;
}

function ThetaFields(props: {degrees: number; onTheta(degrees: number): void; onStep(deltaDeg: number): void}) {
    const t = useT();
    const {language} = useLanguage();
    const [draft, setDraft] = useState<string | undefined>(undefined);
    const shown = formatNumber(props.degrees, "en", 2);
    const draftValue = draft === undefined || draft.trim() === "" ? NaN : Number(draft);
    const keepDraft = draft !== undefined && (!Number.isFinite(draftValue) || Math.abs(normaliseDegrees(draftValue) - props.degrees) < 1e-9);
    const valueText = t("inversion_theta_value", {value0: formatNumber(props.degrees, language, 1)});
    return <div className="inversion-theta">
        <label className="pointset-check">{t("inversion_theta_label")}{" "}
            <input type="number" step={1} value={keepDraft ? draft : shown} data-inversion-theta
                   onChange={event => {
                       setDraft(event.target.value);
                       const value = event.target.valueAsNumber;
                       if (Number.isFinite(value)) props.onTheta(value);
                   }}
                   onKeyDown={event => {
                       if (!event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
                       const sign = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
                       if (sign === 0) return;
                       event.preventDefault();
                       setDraft(undefined);
                       props.onStep(sign * 10);
                   }}
                   onBlur={() => setDraft(undefined)}/>
        </label>
        <label className="pointset-check">
            <input type="range" min={0} max={360} step="any" value={props.degrees} data-inversion-theta-slider
                   aria-label={t("inversion_theta_slider")} aria-valuenow={Math.round(props.degrees * 10) / 10} aria-valuetext={valueText}
                   onChange={event => {
                       const value = event.target.valueAsNumber;
                       if (Number.isFinite(value)) props.onTheta(value);
                   }}
                   onKeyDown={event => {
                       if (event.altKey || event.ctrlKey || event.metaKey) return;
                       const sign = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1 : 0;
                       if (sign === 0) return;
                       event.preventDefault();
                       setDraft(undefined);
                       props.onStep(sign * (event.shiftKey ? 10 : 1));
                   }}/>
            <span aria-hidden="true">{valueText}</span>
        </label>
    </div>;
}
