import {Message, message, renderMessage, t, useLanguage, useT} from "../../localization";
import {Preset, PresetService} from "./presets/Presets";
import React, {useContext, useMemo, useRef, useState} from "react";
import {PresetLockContext} from "../context/react/PresetLockContext";
import {Button, ButtonGroup, Form, Modal} from "react-bootstrap";
import {ResetButton} from "./ResetButton";
import ToolTippedButton from "../../inputs/ToolTippedButton";
import {PresetImportDialog} from "./PresetImportDialog";


function exportToFile(data: string) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
    element.setAttribute('download', "presets.txt");

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function ImageGenerationModal(props: { onConfirm: (fileContents: string[]) => void | Promise<void>, presetService: PresetService }) {
    const {exporting} = useLanguage();
    const [show, setShow] = useState(false);
    // Read again each time the dialog opens, so Presets saved or deleted since the last opening are listed and selected.
    const [presetIds, setPresetIds] = useState<string[]>([]);
    const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
    const trigger = useRef<HTMLSpanElement>(null);
    const returnFocusAfterExport = useRef(false);
    const exportFinished = useRef(false);
    const modalExited = useRef(false);

    const restoreTriggerFocus = () => {
        if (!returnFocusAfterExport.current || !exportFinished.current || !modalExited.current) return;
        returnFocusAfterExport.current = false;
        window.requestAnimationFrame(() => trigger.current?.querySelector<HTMLButtonElement>("button")?.focus());
    };

    const handleClose = () => setShow(false);
    const handleConfirm = () => {
        if (exporting || selectedPresets.length === 0) return;
        returnFocusAfterExport.current = true;
        exportFinished.current = false;
        modalExited.current = false;
        let result: void | Promise<void>;
        try {
            result = props.onConfirm(selectedPresets);
        } catch {
            result = undefined;
        }
        setShow(false);
        void Promise.resolve(result).then(() => {
            exportFinished.current = true;
            restoreTriggerFocus();
        }, () => {
            exportFinished.current = true;
            restoreTriggerFocus();
        });
    };
    const handleShow = () => {
        const ids = props.presetService.loadPresets().data.map(preset => preset.id);
        setPresetIds(ids);
        setSelectedPresets(ids);
        setShow(true);
    };
    const nothingSelected = selectedPresets.length === 0;

    return (
        <>
            <span ref={trigger}><ToolTippedButton disabled={exporting} tooltip={t("generate_preset_figures")} onClick={handleShow}>{t("generate_preset_figures")}</ToolTippedButton></span>

            <Modal show={show} onHide={handleClose} onExited={() => {
                modalExited.current = true;
                restoreTriggerFocus();
            }}>
                <Modal.Header closeButton closeLabel={t("close")}>
                    <Modal.Title>{t("generate_figures")}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={e => {
                        e.preventDefault();
                        handleConfirm();
                    }}>
                        {presetIds.map(id => <Form.Check
                                type={'checkbox'}
                                key={id}
                                id={`default-checkbox` + id}
                                label={id}
                                checked={selectedPresets.includes(id)}
                                onChange={event => {
                                    if (event.target.checked) {
                                        setSelectedPresets(current => [...current, id]);
                                    } else {
                                        setSelectedPresets(current => current.filter(presetId => id !== presetId));
                                    }
                                }}
                            />
                        )}
                        {nothingSelected && <p id="figure-batch-empty" className="inspector-help" role="status">
                            {presetIds.length === 0 ? t("there_are_no_saved_presets_to_generate_figures_from") : t("select_at_least_one_preset_to_generate_figures")}
                        </p>}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>{t("close")}</Button>
                    <Button disabled={exporting || nothingSelected} aria-describedby={nothingSelected ? "figure-batch-empty" : undefined}
                            onClick={handleConfirm}>{t("generate")}</Button>
                </Modal.Footer>
            </Modal>
        </>
    );

}

function SaveModal(props: { onSave: (name: string) => void, initialValue: string, disabled?: boolean }) {
    const t = useT();
    const [show, setShow] = useState(false);
    const [presetName, setPresetName] = useState(props.initialValue);

    const handleClose = () => setShow(false);
    const handleSave = () => {
        props.onSave(presetName);
        setShow(false);
    };
    const handleShow = () => {
        setPresetName(props.initialValue);
        setShow(true);
    };

    return (
        <>
            <ToolTippedButton className="preset-save" disabled={props.disabled} onClick={handleShow} tooltip={t("save_preset")}>{t("save")}</ToolTippedButton>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton closeLabel={t("close")}>
                    <Modal.Title>{t("save_preset")}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={e => {
                        e.preventDefault();
                        handleSave();
                    }}>
                        <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
                            <Form.Label>{t("preset_name")}</Form.Label>
                            <Form.Control
                                onChange={event => setPresetName(event.target.value)}
                                type="text"
                                placeholder={t("mycurveexample")}
                                defaultValue={presetName}
                                autoFocus
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>{t("close")}</Button>
                    <Button onClick={handleSave}>{t("save")}</Button>
                </Modal.Footer>
            </Modal>
        </>
    );

}

function TrashModal(props: { trash: () => void, disabled?: boolean }) {
    const t = useT();
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleConfirm = () => {
        props.trash();
        setShow(false);
    };
    const handleShow = () => setShow(true);

    return (
        <>
            <ToolTippedButton disabled={props.disabled} onClick={handleShow} tooltip={t("delete_preset")}>{t("delete")}</ToolTippedButton>
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton closeLabel={t("close")}>
                    <Modal.Title>{t("delete_preset_135")}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Button variant="secondary" onClick={handleConfirm}>{t("yes")}</Button>
                    <Button variant="primary" onClick={handleClose}>{t("no")}</Button>
                </Modal.Body>
            </Modal>
        </>
    );

}

export function PresetSelector(props: {
    presetService: PresetService,
    /** Id of the selected preset ("" for the default scene), owned by the graph controller. */
    selectedPresetId: string,
    /** Changes whenever the stored presets changed, so the list below is read again. */
    presetListVersion: number,
    /** Why the last save or delete did not happen, from the graph controller. */
    notice?: Message,
    onSelect: (id: string) => void,
    onReset: () => void,
    onSave: (name: string) => void,
    onDelete: () => void,
    onImported: () => void,
    /** Omitted by a graph with no figure export (the surface views): the image-batch dialog is then hidden. */
    batchExporter?: (presets: Preset[]) => void | Promise<void>
}) {
    const t = useT();
    const lessonActive = useContext(PresetLockContext);
    const {presetService, selectedPresetId, presetListVersion} = props;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const presets = useMemo(() => presetService.loadPresets(), [presetService, presetListVersion]);
    const selectedPreset = presets.data.find(preset => preset.id === selectedPresetId);
    const [backupNotice, setBackupNotice] = useState<Message | undefined>();
    // Every current reason at once: an unreadable collection must not hide the notice of the export that skipped it.
    const problems = [...new Map([props.notice, presets.problem, backupNotice].filter((problem): problem is Message => problem !== undefined).map(problem => [JSON.stringify(problem), problem])).values()];

    return <Form.Group>
        <p className="inspector-help">{t("stored_in_this_browser_export_a_file_to_back_up_your_presets_or_transfer_them_to_another_browser")}</p>
        {problems.map((problem, index) => <p key={index} className="inspector-help text-danger" role="alert">{renderMessage(problem)}</p>)}
        <Form.Label>{t("presets")}</Form.Label>
        <Form.Select onChange={(value) => props.onSelect(value.target.value)} aria-label={t("presets")} disabled={lessonActive}
                     value={selectedPreset ? selectedPreset.id : ""}
        >
            <option value={""}>{t("default")}</option>
            {presets.data.map(preset =>
                <option key={preset.id} value={preset.id}>{preset.id}</option>)}
        </Form.Select>
        <Form.Group className="my-1">
            <ButtonGroup vertical={true}>
                <ButtonGroup>
                    <ResetButton onReset={props.onReset} disabled={lessonActive}/>
                    <SaveModal onSave={props.onSave} initialValue={selectedPresetId} disabled={presets.problem !== undefined || lessonActive}></SaveModal>
                    <TrashModal disabled={selectedPreset === undefined || presets.problem !== undefined || lessonActive} trash={props.onDelete}></TrashModal>
                </ButtonGroup>
                <ButtonGroup>
                    <ToolTippedButton tooltip={t("export_presets")} onClick={() => {
                        const backup = presetService.exportAll();
                        setBackupNotice(backup.problem ?? (backup.skipped.length ? message("backup_skipped_unreadable_collections", {value0: backup.skipped.join(", ")}) : undefined));
                        if (!backup.problem) exportToFile(backup.contents);
                    }}>{t("export_presets")}</ToolTippedButton>
                    <PresetImportDialog onImported={props.onImported} disabled={lessonActive}/>
                    {props.batchExporter && <ImageGenerationModal onConfirm={selectedIds => {
                        const allPresets = presetService.loadPresets();
                        const selected = allPresets.data.filter(preset => selectedIds.includes(preset.id));
                        return props.batchExporter?.(selected);
                    }} presetService={presetService}/>}

                </ButtonGroup></ButtonGroup></Form.Group>

    </Form.Group>;

}
