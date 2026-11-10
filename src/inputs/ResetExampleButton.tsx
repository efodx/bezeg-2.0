import {CONTROL_ROW_FILL} from "./controlRow";
import {useState} from "react";
import {useT} from "../localization";
import {UnavailableButton} from "./UnavailableButton";

interface ResetExampleButtonProps {
    /** Restores the chosen example (or the imported scene the graph treats as its example). */
    onReset: () => void;
    /** True while the scene already equals that example: the button is then unavailable and says why (decision 62). */
    atExample: boolean;
    /** Value of `data-action`, so lesson clips and tests can find the button. */
    action?: string;
}

/** The one "Reset example" button (C9, decision 62), placed beside the example chooser. A press while unavailable shows the reason in a status line. */
export function ResetExampleButton({onReset, atExample, action = "reset-example"}: ResetExampleButtonProps) {
    const t = useT();
    const [blocked, setBlocked] = useState(0);
    const reason = atExample ? t("reset_example_already") : undefined;
    return <div className="reset-example">
        <div className={CONTROL_ROW_FILL}>
            <UnavailableButton data-action={action} reason={reason} onPress={() => { setBlocked(0); onReset(); }}
                               onBlockedPress={() => setBlocked(count => count + 1)}>{t("reset_example")}</UnavailableButton>
        </div>
        <div role="status" aria-live="polite">{atExample && blocked > 0 && <p key={blocked} className="inspector-help" data-reset-example-reason>{reason}</p>}</div>
    </div>;
}
