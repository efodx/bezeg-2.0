import {LocalizedError, useT} from "../../localization";
import React, {useRef, useState} from "react";
import {Alert, Button, Form, Modal} from "react-bootstrap";
import {commitPresetImport, preflightPresetImport, PresetImportPlan} from "./presets/PresetImport";
import {appStorage} from "../../storage/appStorage";

export function PresetImportDialog({onImported, disabled}: {onImported: () => void, disabled?: boolean}) {
    const t = useT();
    const [show, setShow] = useState(false);
    const [error, setError] = useState<Error | string>("");
    const [plan, setPlan] = useState<PresetImportPlan>();
    const [reading, setReading] = useState(false);
    const readVersion = useRef(0);
    const close = () => {readVersion.current++; setShow(false); setPlan(undefined); setError(""); setReading(false);};
    return <>
        <Button disabled={disabled} onClick={() => setShow(true)}>{t("import_presets")}</Button>
        <Modal show={show} onHide={close}>
            <Modal.Header closeButton closeLabel={t("close")}><Modal.Title>{t("import_presets")}</Modal.Title></Modal.Header>
            <Modal.Body>
                <p>{t("choose_a_presetstxt_file_exported_from_bezeg_data_is_stored_only_in_this_browser")}</p>
                <Form.Group controlId="preset-import-file"><Form.Label>{t("preset_file")}</Form.Label>
                    <Form.Control type="file" accept=".txt,.json,application/json,text/plain" onChange={async event => {
                        const version = ++readVersion.current;
                        setError(""); setPlan(undefined); setReading(true);
                        const file = (event.target as HTMLInputElement).files?.[0];
                        try {
                            if (file) {
                                const contents = await file.text();
                                if (version === readVersion.current) { setPlan(preflightPresetImport(contents, appStorage)); }
                            }
                        } catch (failure) {
                            if (version === readVersion.current) { setError(failure instanceof LocalizedError ? failure : new LocalizedError({key: "cannot_read_the_file_choose_another_file", params: {}})); }
                        } finally { if (version === readVersion.current) { setReading(false); } }
                    }}/></Form.Group>
                {reading && <p role="status">{t("checking_file")}</p>}
                {error && <Alert variant="danger" role="alert">{error instanceof Error ? error.message : error}</Alert>}
                {plan && <div><p role="status">{t("file_is_valid_collections")}{Object.keys(plan.collections).length}.</p>
                    {plan.replacements.length > 0 && <Alert variant="warning">
                        <p>{t("these_collections_in_this_browser_will_be_replaced_completely")}</p>
                        <ul>{plan.replacements.map(key => <li key={key}>{key.slice("preset-".length)}</li>)}</ul>
                        <p>{t("export_your_current_presets_as_a_backup_before_importing")}</p>
                    </Alert>}</div>}
            </Modal.Body>
            <Modal.Footer><Button variant="secondary" onClick={close}>{t("cancel")}</Button>
                <Button disabled={!plan || reading} onClick={() => {
                    try { if (plan) { commitPresetImport(plan, appStorage); close(); onImported(); } }
                    catch (failure) { setError(failure instanceof LocalizedError ? failure : new LocalizedError({key: "cannot_save_presets_free_browser_storage_space_and_try_again", params: {}})); }
                }}>{plan?.replacements.length ? t("replace_collections_and_import") : t("import")}</Button></Modal.Footer>
        </Modal>
    </>;
}
