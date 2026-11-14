import {Message, message, renderMessage, t, useT} from "../../localization";
import {useFigureExportState} from "./export/FigureExportOperation";
import {Preset, PresetService} from "./presets/Presets";
import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {UnavailableButton} from "../../inputs/UnavailableButton";
import {PresetLockContext} from "../context/react/PresetLockContext";
import {Button, Form, Modal} from "react-bootstrap";
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
        <>
            <span ref={trigger}><ToolTippedButton disabled={exporting} tooltip={t("generate_preset_figures")} onClick={handleShow}>{t("generate_preset_figures")}</ToolTippedButton></span>
            {failed === 'batch' && <small role="alert">{t("figure_export_failed_try_again")}</small>}

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

/** What a row is doing: `menu` shows its actions, `rename` edits the name in the row, `delete` asks for confirmation. */
type RowMode = "idle" | "menu" | "rename" | "delete";

/** A message for the user that the owner of the field shows beside it. */
function FieldMessage(props: { message?: Message, role?: "alert" | "status" }) {
    return props.message ? <p className="preset-field-message" role={props.role ?? "alert"}>{renderMessage(props.message)}</p> : null;
}

/**
 * One stored state: a button that selects it (marked with `aria-current`, so keyboard use stays Tab and Enter or Space), a menu
 * button, and below the row whichever of menu, rename or delete confirmation is open. The row's name is cut short with an
 * ellipsis; the whole name is its `title`.
 */
function StateRow(props: {
    preset: Preset, selected: boolean, names: string[], reason?: string,
    onSelect: () => void, onRename: (name: string) => void, onOverwrite: () => void, onDelete: () => void
}) {
    const t = useT();
    const {preset, reason} = props;
    const [mode, setMode] = useState<RowMode>("idle");
    const [draft, setDraft] = useState(preset.id);
    const [error, setError] = useState<Message | undefined>();
    const row = useRef<HTMLLIElement>(null);
    const focusNext = useRef<string | undefined>();
    useEffect(() => {
        if (focusNext.current) row.current?.querySelector<HTMLElement>(focusNext.current)?.focus();
        focusNext.current = undefined;
    }, [mode]);
    const go = (next: RowMode, focus: string) => {
        focusNext.current = focus;
        setError(undefined);
        setMode(next);
    };
    const close = () => {
        focusNext.current = ".preset-row-menu";
        setError(undefined);
        setMode("idle");
    };
    const escape = (event: React.KeyboardEvent) => {
        if (event.key === "Escape" && mode !== "idle") {
            event.preventDefault();
            event.stopPropagation();
            close();
        }
    };
    const submitRename = () => {
        const name = draft.trim();
        if (name === "") return setError(message("state_name_required"));
        if (name === preset.id) return close();
        if (props.names.includes(name)) return setError(message("state_name_taken"));
        props.onRename(name);
    };

    return <li ref={row} className="preset-row" data-preset-id={preset.id} data-selected={props.selected || undefined} onKeyDown={escape}>
        <div className="preset-row-main">
            <UnavailableButton className="preset-row-select" aria-current={props.selected ? "true" : undefined}
                               reason={reason} onPress={props.onSelect}>
                <span className="preset-row-name" title={preset.id}>{preset.id}</span>
                {props.selected && <span className="preset-row-badge">{t("selected_state")}</span>}
            </UnavailableButton>
            <UnavailableButton className="preset-row-menu" aria-label={t("state_menu", {value0: preset.id})} aria-expanded={mode === "menu"}
                               reason={reason} onPress={() => mode === "menu" ? close() : go("menu", ".preset-menu-item")}>
                <span aria-hidden="true">⋯</span>
            </UnavailableButton>
        </div>
        {mode === "menu" && <div className="preset-row-panel preset-menu">
            <UnavailableButton className="preset-menu-item" reason={reason} onPress={() => { setDraft(preset.id); go("rename", ".preset-rename-input"); }}>{t("rename")}</UnavailableButton>
            <UnavailableButton className="preset-menu-item" reason={reason} onPress={() => { props.onOverwrite(); close(); }}>{t("overwrite_with_current_state")}</UnavailableButton>
            <UnavailableButton className="preset-menu-item" reason={reason} onPress={() => go("delete", ".preset-confirm-cancel")}>{t("delete")}</UnavailableButton>
        </div>}
        {mode === "rename" && <div className="preset-row-panel">
            <input className="preset-rename-input" type="text" value={draft} aria-label={t("rename")} aria-invalid={error !== undefined}
                   onChange={event => { setDraft(event.target.value); setError(undefined); }}
                   onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); submitRename(); } }}/>
            <FieldMessage message={error}/>
            <div className="preset-button-pair">
                <button type="button" className="preset-action" onClick={submitRename}>{t("save")}</button>
                <button type="button" className="preset-action preset-action-quiet" onClick={close}>{t("cancel")}</button>
            </div>
        </div>}
        {mode === "delete" && <div className="preset-row-panel" role="group" aria-label={t("delete_state_question", {value0: preset.id})}>
            <p className="preset-confirm-text">{t("delete_state_question", {value0: preset.id})}</p>
            <div className="preset-button-pair">
                <button type="button" className="preset-action preset-action-danger" onClick={() => props.onDelete()}>{t("delete")}</button>
                <button type="button" className="preset-action preset-action-quiet preset-confirm-cancel" onClick={close}>{t("cancel")}</button>
            </div>
        </div>}
    </li>;
}

/** The "save the current state" action: a button that opens a labelled name field in place (no dialog). */
function SaveCurrentState(props: { initialName: string, names: string[], reason?: string, onSave: (name: string) => void }) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [attempted, setAttempted] = useState(false);
    const box = useRef<HTMLDivElement>(null);
    const restoreFocus = useRef(false);
    const input = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (open) input.current?.focus();
        else if (restoreFocus.current) box.current?.querySelector<HTMLElement>("button.preset-save")?.focus();
        restoreFocus.current = false;
    }, [open]);
    const trimmed = name.trim();
    const close = () => { restoreFocus.current = true; setOpen(false); };
    const submit = () => {
        if (trimmed === "") return setAttempted(true);
        props.onSave(trimmed);
        close();
    };

    return <div ref={box} className="preset-save-box">
        {!open && <UnavailableButton className="preset-save preset-action preset-action-primary" reason={props.reason}
                                     onPress={() => { setName(props.initialName); setAttempted(false); setOpen(true); }}>{t("save_current_state")}</UnavailableButton>}
        {open && <div className="preset-save-form"
                      onKeyDown={event => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
            <label id="preset-save-label" htmlFor="preset-save-name" className="preset-field-label">{t("state_name")}</label>
            <input id="preset-save-name" ref={input} className="preset-name-input" type="text" value={name} autoComplete="off"
                   onChange={event => { setName(event.target.value); setAttempted(false); }}
                   onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); submit(); } }}/>
            {attempted && trimmed === "" && <FieldMessage message={message("state_name_required")}/>}
            {trimmed !== "" && props.names.includes(trimmed) && <p className="preset-field-message" role="status">{t("state_overwrite_notice", {value0: trimmed})}</p>}
            <div className="preset-button-pair">
                <UnavailableButton className="preset-action preset-action-primary" reason={trimmed === "" ? t("state_name_required") : undefined}
                                   onPress={submit} onBlockedPress={() => setAttempted(true)}>{t("save")}</UnavailableButton>
                <button type="button" className="preset-action preset-action-quiet" onClick={close}>{t("cancel")}</button>
            </div>
        </div>}
    </div>;
}

export function PresetSelector(props: {
    presetService: PresetService,
    /** Id of the selected preset ("" for the default scene), owned by the graph controller. */
    selectedPresetId: string,
    /** Changes whenever the stored presets changed, so the list below is read again. */
    presetListVersion: number,
    /** Why the last save, rename or delete did not happen, from the graph controller. */
    notice?: Message,
    onSelect: (id: string) => void,
    onReset: () => void,
    /** Stores the current scene under `name` (an existing name is overwritten) and selects it. */
    onSave: (name: string) => void,
    /** Deletes the stored preset `id`, which need not be the selected one. */
    onDelete: (id: string) => void,
    /** Renames the stored preset `id`; the graph controller keeps it selected when it was. */
    onRename: (id: string, name: string) => void,
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
    const list = useRef<HTMLUListElement>(null);
    const focusRow = useRef<string | undefined>();
    useEffect(() => {
        if (focusRow.current === undefined) return;
        const id = focusRow.current;
        focusRow.current = undefined;
        [...list.current?.querySelectorAll<HTMLElement>("li[data-preset-id]") ?? []].find(row => row.dataset.presetId === id)
            ?.querySelector<HTMLElement>("button.preset-row-select")?.focus();
    }, [presets]);
    // Every current reason at once: an unreadable collection must not hide the notice of the export that skipped it.
    const problems = [...new Map([props.notice, presets.problem, backupNotice].filter((problem): problem is Message => problem !== undefined).map(problem => [JSON.stringify(problem), problem])).values()];
    const names = presets.data.map(preset => preset.id);
    const lockReason = lessonActive ? t("presets_unavailable_during_lesson") : undefined;
    const writeReason = lockReason ?? (presets.problem !== undefined ? t("presets_unavailable_unreadable") : undefined);

    return <div className="preset-panel">
        {problems.map((problem, index) => <p key={index} className="inspector-help text-danger" role="alert">{renderMessage(problem)}</p>)}
        <h4 id="preset-states-heading" className="preset-subheading">{t("saved_states")}</h4>
        <ul ref={list} className="preset-list" aria-labelledby="preset-states-heading">
            <li className="preset-row" data-preset-id="" data-selected={selectedPreset === undefined || undefined}>
                <div className="preset-row-main">
                    <UnavailableButton className="preset-row-select" aria-current={selectedPreset === undefined ? "true" : undefined}
                                       reason={lockReason} onPress={() => { if (selectedPreset) props.onSelect(""); }}>
                        <span className="preset-row-name">{t("default_state")}</span>
                        {selectedPreset === undefined && <span className="preset-row-badge">{t("selected_state")}</span>}
                    </UnavailableButton>
                </div>
            </li>
            {presets.data.map(preset => <StateRow key={preset.id} preset={preset} selected={preset.id === selectedPreset?.id} names={names}
                reason={lockReason}
                onSelect={() => { if (preset.id !== selectedPreset?.id) props.onSelect(preset.id); }}
                onRename={name => { focusRow.current = name; props.onRename(preset.id, name); }}
                onOverwrite={() => props.onSave(preset.id)}
                onDelete={() => { focusRow.current = ""; props.onDelete(preset.id); }}/>)}
        </ul>
        <div className="preset-quiet-actions">
            <UnavailableButton className="preset-action-quiet-link" aria-label={t("reset_preset")} reason={lockReason} onPress={props.onReset}>{t("reset")}</UnavailableButton>
        </div>
        <SaveCurrentState initialName={selectedPreset?.id ?? ""} names={names} reason={writeReason} onSave={props.onSave}/>
        <section className="preset-backup" aria-labelledby="preset-backup-heading">
            <h4 id="preset-backup-heading" className="preset-subheading">{t("backup_heading")}</h4>
            <p className="inspector-help">{t("backup_help")}</p>
            <div className="preset-button-pair">
                <button type="button" className="preset-file-button" onClick={() => {
                    const backup = presetService.exportAll();
                    setBackupNotice(backup.problem ?? (backup.skipped.length ? message("backup_skipped_unreadable_collections", {value0: backup.skipped.join(", ")}) : undefined));
                    if (!backup.problem) exportToFile(backup.contents);
                }}>{t("export_presets")}</button>
                <PresetImportDialog onImported={props.onImported} unavailableReason={lockReason}/>
            </div>
            {props.batchExporter && <div className="preset-figures"><ImageGenerationModal onConfirm={selectedIds => {
                const allPresets = presetService.loadPresets();
                const selected = allPresets.data.filter(preset => selectedIds.includes(preset.id));
                return props.batchExporter?.(selected);
            }} presetService={presetService}/></div>}
        </section>
    </div>;
}
