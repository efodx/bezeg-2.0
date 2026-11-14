import {t} from "../../localization";
import {useFigureExportState} from "./export/FigureExportOperation";
import {PresetService} from "./presets/Presets";
import React, {useRef, useState} from "react";
import {Button, Form, Modal} from "react-bootstrap";
import ToolTippedButton from "../../inputs/ToolTippedButton";

/** The figure-batch trigger (with its failure alert) and dialog, shown in the export group of the Shrani tab. */
export function PresetFigureBatchDialog(props: { onConfirm: (fileContents: string[]) => void | Promise<void>, presetService: PresetService }) {
    const {exporting, failed} = useFigureExportState();
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
        <div className="figure-batch">
            <span ref={trigger}><ToolTippedButton disabled={exporting} tooltip={t("generate_preset_figures")} onClick={handleShow}>{t("generate_preset_figures")}</ToolTippedButton></span>
            {failed === 'batch' && <small role="alert">{t("figure_export_failed_try_again")}</small>}

            <Modal className="bezeg-dialog" show={show} onHide={handleClose} onExited={() => {
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
                    <Button variant="outline-secondary" onClick={handleClose}>{t("cancel")}</Button>
                    <Button disabled={exporting || nothingSelected} aria-describedby={nothingSelected ? "figure-batch-empty" : undefined}
                            onClick={handleConfirm}>{t("generate")}</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );

}
