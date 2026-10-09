import {t, useLanguage, beginFigureExport, reportFigureExportFailure} from "../../localization";
import {Preset, Presets, PresetService} from "./presets/Presets";
import React, {useContext, useState} from "react";
import {SiteContext} from "../context/react/SiteContext";
import {Button, ButtonGroup, Form, Modal} from "react-bootstrap";
import {wait} from "@testing-library/user-event/dist/utils";
import {RefreshContext} from "../context/react/RefreshContext";
import {ResetButton} from "./ResetButton";
import ToolTippedButton from "../../inputs/ToolTippedButton";
import {ImageStore} from "./ImageStore";
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

function ImageGenerationModal(props: { onConfirm: (fileContents: string[]) => void, presetService: PresetService }) {
    const {exporting} = useLanguage();
    const [show, setShow] = useState(false);
    const allPresets = props.presetService.loadPresets();
    const [selectedPresets, setSelectedPresets] = useState<string[]>(() => allPresets.data.map(preset => preset.id));

    const handleClose = () => setShow(false);
    const handleConfirm = () => {
        if (exporting) return;
        props.onConfirm(selectedPresets);
        setShow(false);
    };
    const handleShow = () => setShow(true);

    return (
        <>
            <ToolTippedButton disabled={exporting} tooltip={t("generate_preset_figures")} onClick={handleShow}>{t("generate_preset_figures")}</ToolTippedButton>

            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton closeLabel={t("close")}>
                    <Modal.Title>{t("generate_figures")}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={e => {
                        e.preventDefault();
                        handleConfirm();
                    }}>
                        {allPresets.data.map(preset => <Form.Check
                                type={'checkbox'}
                                id={`default-checkbox` + preset.id}
                                label={preset.id}
                                checked={selectedPresets.includes(preset.id)}
                                onChange={event => {
                                    if (event.target.checked) {
                                        setSelectedPresets(current => [...current, preset.id]);
                                    } else {
                                        setSelectedPresets(current => current.filter(presetId => preset.id !== presetId));
                                    }
                                }}
                            />
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>{t("close")}</Button>
                    <Button disabled={exporting} onClick={handleConfirm}>{t("generate")}</Button>
                </Modal.Footer>
            </Modal>
        </>
    );

}

function SaveModal(props: { onSave: (name: string) => void, initialValue: string }) {
    useLanguage();
    const [show, setShow] = useState(false);
    const [presetName, setPresetName] = useState(props.initialValue);

    const handleClose = () => setShow(false);
    const handleSave = () => {
        props.onSave(presetName);
        setShow(false);
    };
    const handleShow = () => setShow(true);

    return (
        <>
            <ToolTippedButton className="preset-save" onClick={handleShow} tooltip={t("save_preset")}>{t("save")}</ToolTippedButton>

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
    useLanguage();
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
    presetProvider: () => Preset,
    exporter?: any
}) {
    useLanguage();
    const siteContext = useContext(SiteContext);
    const presetContext = siteContext.preset;
    const refreshContext = useContext(RefreshContext);

    const [presets, setPresets] = useState({
        presets: props.presetService.loadPresets(),
        selectedPreset: props.presetService.getPreset(presetContext.selected)
    });

    async function exportPresets(allPresets: Presets) {
        const finish = beginFigureExport();
        ImageStore.clear();
        try {
            for (const preset of allPresets.data) {
                presetContext.setSelected(preset.id);
                // Allow the existing preset-remount path to settle before capturing the DOM.
                await wait(100);
                await props.exporter(preset.id);
            }
            await ImageStore.createZip();
        } catch { reportFigureExportFailure(); }
        finally { ImageStore.clear(); finish(); }
    }

    return <Form.Group>
        <p className="inspector-help">{t("stored_in_this_browser_export_a_file_to_back_up_your_presets_or_transfer_them_to_another_browser")}</p>
        <Form.Label>{t("presets")}</Form.Label>
        <Form.Select onChange={(value) => {
            const preset = props.presetService.getPreset(value.target.value);
            console.debug("Preset:", preset);
            if (preset !== undefined) {
                setPresets({
                    presets: presets.presets,
                    selectedPreset: preset
                });
                presetContext.setSelected(preset.id);
            } else {
                setPresets({
                    presets: presets.presets,
                    selectedPreset: preset
                });
                presetContext.setSelected("");
            }
        }} aria-label={t("presets")}
                     defaultValue={presetContext.selected}
        >
            <option value={""}>{t("default")}</option>
            {presets.presets.data.map(preset =>
                <option key={preset.id} value={preset.id}>{preset.id}</option>)}
        </Form.Select>
        <Form.Group className="my-1">
            <ButtonGroup vertical={true}>
                <ButtonGroup>
                    <ResetButton/>
                    <SaveModal onSave={(name) => {
                        if (name === null || name === "") {
                            name = "preset-" + Math.random();
                        }
                        const newPresets = props.presetService.savePreset({
                            ...props.presetProvider(),
                            id: name
                        });
                        setPresets({
                            presets: newPresets,
                            selectedPreset: newPresets.data[newPresets.data.length - 1]
                        });
                        presetContext.setSelected(name);
                    }} initialValue={presetContext.selected}></SaveModal>
                    <TrashModal disabled={presets.selectedPreset === undefined} trash={() => {
                        const newPresets = props.presetService.removePreset(presets.selectedPreset.id);
                        setPresets({
                            presets: newPresets,
                            selectedPreset: newPresets.data[0]
                        });
                        presetContext.setSelected(newPresets.data[0]?.id ?? "");
                    }}></TrashModal>
                </ButtonGroup>
                <ButtonGroup>
                    <ToolTippedButton tooltip={t("export_presets")} onClick={() => {
                        exportToFile(props.presetService.exportAllPresetsToString());
                    }}>{t("export_presets")}</ToolTippedButton>
                    <PresetImportDialog onImported={refreshContext}/>
                    <ImageGenerationModal onConfirm={presets => {
                        const allPresets = props.presetService.loadPresets();
                        exportPresets({data: allPresets.data.filter(preset => presets.includes(preset.id))});
                    }} presetService={props.presetService}/>

                </ButtonGroup></ButtonGroup></Form.Group>

    </Form.Group>;

}
