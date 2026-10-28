import {Button} from "react-bootstrap";
import {formatNumber, type NumberLanguage} from "../../analysis/format";
import {ChoiceSelect} from "../../inputs/ChoiceSelect";
import {OnOffSwitch} from "../../inputs/OnOffSwitch";
import Slider from "../../inputs/Slider";
import {currentLanguage, useT} from "../../localization";
import {FunctionReadout} from "../functions/FunctionReadout";
import type {PatchDirection} from "../../bezeg/impl/patch/tensor-product-bezier-patch";
import type {PieceCorrespondence} from "./TensorSubdivisionScene";
import {SUBDIVISION_RANGE} from "./tensorSubdivision";

const tupleText = (values: readonly number[], language: NumberLanguage): string => {
    const parts = values.map(value => formatNumber(value, language, 3));
    return language === "sl" ? `(${parts.join("; ")})` : `(${parts.join(", ")})`;
};

/** The "Splitting" group of Uredi: the direction and the position `u0` or `v0` of the cut; says how to edit the original points. */
export function SubdivisionSplitControls({direction, value, showPieces, onDirection, onValue}: {
    direction: PatchDirection; value: number; showPieces: boolean;
    onDirection: (direction: PatchDirection) => void; onValue: (value: number) => void;
}) {
    const t = useT();
    const options = [{value: "u", text: t("patch_split_direction_u")}, {value: "v", text: t("patch_split_direction_v")}];
    return <div className="inspector-group patch-split-controls"><h3>{t("patch_split_heading")}</h3>
        <ChoiceSelect label={t("patch_split_direction")} value={direction} options={options}
                      onChange={next => onDirection(next === "v" ? "v" : "u")}/>
        <Slider customText={t(direction === "u" ? "patch_split_value_u" : "patch_split_value_v")} min={SUBDIVISION_RANGE.min} max={SUBDIVISION_RANGE.max}
                step={0.01} value={value} onChange={onValue}/>
        <p className="inspector-help">{t("patch_split_help")}</p>
        {showPieces && <p className="inspector-help patch-split-locked" role="note">{t("patch_pieces_locked")}</p>}
    </div>;
}

/** The "Degree elevation" group of Uredi: one button per direction, disabled with a stated reason at the maximum degree 4. */
export function SubdivisionElevateControls({canElevateU, canElevateV, onElevate}: {
    canElevateU: boolean; canElevateV: boolean; onElevate: (direction: PatchDirection) => void;
}) {
    const t = useT();
    const entries = [
        {direction: "u", enabled: canElevateU, label: t("patch_elevate_u")},
        {direction: "v", enabled: canElevateV, label: t("patch_elevate_v")},
    ] as const satisfies ReadonlyArray<{direction: PatchDirection; enabled: boolean; label: string}>;
    return <div className="inspector-group patch-elevate-controls"><h3>{t("patch_elevate_heading")}</h3>
        <div className="workspace-curve-picker">{entries.map(({direction, enabled, label}) =>
            <Button key={direction} data-elevate={direction} disabled={!enabled} onClick={() => onElevate(direction)}>{label}</Button>)}</div>
        <p className="inspector-help">{t("patch_elevate_help")}</p>
        {entries.filter(entry => !entry.enabled).map(({direction}) =>
            <p key={direction} className="inspector-help patch-elevate-reason" role="status" data-elevate-reason={direction}>
                {t("patch_elevate_maximum", {value0: direction})}</p>)}
    </div>;
}

/**
 * Where `S(u, v)` lies on the pieces: the piece, its local parameters, the point the piece evaluates and `S(u, v)`
 * itself (they are the same point because splitting does not change the surface).
 */
export function SubdivisionReadout({correspondence, point}: {correspondence: PieceCorrespondence; point: readonly [number, number, number]}) {
    const t = useT();
    const language = currentLanguage();
    const {location} = correspondence;
    const rows = [
        {id: "piece", label: t("patch_correspondence_piece"), value: t(location.piece === "left" ? "patch_correspondence_left" : "patch_correspondence_right")},
        {id: "local", label: t("patch_correspondence_local"), value: tupleText([location.u, location.v], language)},
        {id: "piece-point", label: t("patch_correspondence_piece_point"), value: tupleText(correspondence.point, language)},
        {id: "point", label: <var>S(u, v)</var>, value: tupleText(point, language)},
    ];
    return <FunctionReadout title={t("patch_correspondence_heading")} rows={rows} note={t("patch_correspondence_note")}/>;
}

/** The Prikaz switch of the pieces, shown at the end of the "Shown elements" group. */
export function SubdivisionVisibilityControls({showPieces, onChange}: {showPieces: boolean; onChange: (visible: boolean) => void}) {
    const t = useT();
    return <OnOffSwitch label={t("patch_show_pieces")} checked={showPieces} onChange={onChange}/>;
}
