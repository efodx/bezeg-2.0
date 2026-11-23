import {renderMessage} from '../../localization';
import {ChoiceSelect} from '../../inputs/ChoiceSelect';
import {CountSetter} from '../../inputs/CountSetter';
import {OnOffSwitch} from '../../inputs/OnOffSwitch';
import Slider from '../../inputs/Slider';
import type {ActionDeclaration, ParameterDeclaration, SectionBlock} from '../../graphs/base/declare/graphDeclaration';
import {Tex} from './Tex';
import './cards.css';

export interface SectionBodyProps {
    /** The declared parameters of this section (the presenter filters by `section`). */
    parameters?: readonly ParameterDeclaration[];
    actions?: readonly ActionDeclaration[];
    /** Read-only blocks of an explanatory section card, shown before the controls. */
    blocks?: readonly SectionBlock[];
    /** The arbiter's current value of a key; the graph binding stays outside. */
    read: (key: string) => unknown;
    write: (key: string, value: unknown) => void;
    perform: (actionId: string) => void;
}

function Control(props: {parameter: ParameterDeclaration; read: SectionBodyProps['read']; write: SectionBodyProps['write']}) {
    const {parameter, read, write} = props;
    const label = renderMessage(parameter.label);
    const help = parameter.help ? renderMessage(parameter.help) : undefined;
    const value = read(parameter.key);
    switch (parameter.kind) {
        case 'range':
            return <Slider min={parameter.min} max={parameter.max} step={parameter.step} value={Number(value)} customText={label} help={help}
                decimals={parameter.maxDecimals} disabled={parameter.locked} onChange={next => write(parameter.key, next)}/>;
        case 'count': {
            const n = Number(value);
            // A locked count is fixed: both buttons sit at a bound.
            const [min, max] = parameter.locked ? [n, n] : [parameter.min, parameter.max];
            return <CountSetter label={label} n={n} min={min} max={max} help={help}
                onPlus={() => write(parameter.key, n + 1)} onMinus={() => write(parameter.key, n - 1)} onSet={next => write(parameter.key, next)}/>;
        }
        case 'choice': {
            const current = String(value);
            return <ChoiceSelect label={label} value={current} help={help}
                options={parameter.options.map(option => ({value: option.value, text: renderMessage(option.label), disabled: parameter.locked && option.value !== current}))}
                onChange={next => write(parameter.key, next)}/>;
        }
        case 'toggle':
            return <OnOffSwitch label={label} help={help} checked={Boolean(value)} disabled={parameter.locked} onChange={next => write(parameter.key, next)}/>;
    }
}

/** The controls of one declared section: the catalogue control per parameter kind, and the declared actions as buttons. */
export function SectionBody(props: SectionBodyProps) {
    return <div className="ws-section">
        {props.blocks?.map((block, index) => block.kind === 'text'
            ? <p key={index} className="ws-section-text" data-card-row="">{renderMessage(block.text)}</p>
            : <div key={index} className="ws-section-math" data-card-row=""><Tex tex={block.tex} block/></div>)}
        {props.parameters?.map(parameter => <div key={parameter.key} className="ws-control" data-card-row="" data-param={parameter.key}>
            <Control parameter={parameter} read={props.read} write={props.write}/>
        </div>)}
        {props.actions && props.actions.length > 0 && <div className="ws-actions" role="group">
            {props.actions.map(action => <button key={action.id} type="button" className="btn btn-outline-secondary btn-sm" data-card-row="" data-action={action.id}
                disabled={!action.enabled} aria-pressed={action.pressed} title={action.help ? renderMessage(action.help) : undefined}
                onClick={() => props.perform(action.id)}>{renderMessage(action.label)}</button>)}
        </div>}
    </div>;
}
