import React from "react";
import {useLanguage, useT} from "../../localization";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {NumberInput} from "../../inputs/NumberInput";
import AngleSlider from "../../inputs/AngleSlider";
import {GridPoint} from "../../compgeo/grid";
import {
    CircleSpec, INVERSION_COORDINATE_MAX, INVERSION_EXAMPLES, INVERSION_RADIUS_MAX, InversionExampleId, InversionSource,
} from "../../compgeo/inversionModel";
import {LiveReadout} from "../base/controls/LiveReadout";
import {useStatusReadout} from "../base/controls/useStatusReadout";
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
    // The one announcement of the graph: the state sentence the chip shows (decision 63); a drag settles before it is read.
    const liveReadout = useStatusReadout(texts.chip, true);
    return <div className="inspector-group inversion-panel" data-inversion-state={texts.state} data-inversion-focus-now={fields.focus}>
        <ExampleAndFocus {...props}/>
        <p className="inspector-help pointset-status" data-inversion-chip>{texts.chip}</p>
        {fields.hasCentre && <>
            {fields.focus !== "power" && <IntField label={t("inversion_radius_label")} field="radius" value={fields.radius} min={1} max={INVERSION_RADIUS_MAX}
                                                   onValue={props.onRadius}/>}
            <FocusFields {...props}/>
            <ul className="pointset-list inversion-readouts">
                {texts.rows.map(row => <li key={row.id} data-inversion-readout={row.id} data-outside-view={row.outsideView}>{row.text}</li>)}
            </ul>
        </>}
        <LiveReadout readout={liveReadout} dataAttribute="inversion-live"/>
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
        <div data-inversion-example>
            <ChoiceSelect label={t("inversion_example_label")} value={props.exampleId ?? "custom"}
                          options={[...INVERSION_EXAMPLES.map(example => ({value: example.id, text: names[example.id]})),
                              ...(props.exampleId === undefined ? [{value: "custom", text: t("notable_example_custom")}] : [])]}
                          onChange={id => {
                              const found = INVERSION_EXAMPLES.find(example => example.id === id);
                              if (found) props.onExample(found.id);
                          }}/>
        </div>
        <div data-inversion-focus>
            <ChoiceSelect label={t("inversion_focus_label")} value={props.fields.focus}
                          options={INVERSION_FOCI.map(focus => ({value: focus, text: focusNames[focus]}))}
                          onChange={focus => { if (isInversionFocus(focus)) props.onFocus(focus); }}/>
        </div>
    </>;
}

function FocusFields(props: InversionPanelProps) {
    const t = useT();
    const {fields} = props;
    if (fields.focus === "point") return <PointFields name="X" point={fields.x} field="x" onPoint={props.onX}/>;
    if (fields.focus === "source") {
        const source = fields.source;
        return <>
            <div data-inversion-source-kind>
                <ChoiceSelect label={t("inversion_source_kind_label")} value={source.kind}
                              options={[{value: "circle", text: t("inversion_source_circle")}, {value: "line", text: t("inversion_source_line")}]}
                              onChange={kind => { if (kind === "circle" || kind === "line") props.onSourceKind(kind); }}/>
            </div>
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
            <ThetaFields degrees={fields.power.thetaDeg} onTheta={props.onTheta}/>
        </>;
    }
    return <>
        <CircleFields name="O₁" radiusName="r₁" field="first" circle={fields.angle.first} onCircle={circle => props.onAngleCircle(0, circle)}/>
        <CircleFields name="O₂" radiusName="r₂" field="second" circle={fields.angle.second} onCircle={circle => props.onAngleCircle(1, circle)}/>
        <div data-inversion-which>
            <ChoiceSelect label={t("inversion_which_label")} value={String(fields.angle.which)}
                          options={[{value: "0", text: t("inversion_which_first")}, {value: "1", text: t("inversion_which_second")}]}
                          onChange={which => { if (which === "0" || which === "1") props.onWhich(which === "0" ? 0 : 1); }}/>
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

/** An integer field within [min, max]; a typed value outside the range is refused with the stated range, never written. */
function IntField(props: {label: string; field: string; value: number; min: number; max: number; onValue(value: number): void}) {
    return <div data-inversion-field={props.field}>
        <NumberInput label={props.label} value={props.value} min={props.min} max={props.max} step={1} integer onChange={props.onValue}/>
    </div>;
}

function ThetaFields(props: {degrees: number; onTheta(degrees: number): void}) {
    const t = useT();
    return <div className="inversion-theta" data-inversion-theta>
        <AngleSlider customText={t("inversion_theta_label")} value={props.degrees} onChange={degrees => props.onTheta(degrees)}/>
    </div>;
}
