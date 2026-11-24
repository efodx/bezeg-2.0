// Declared actions with `puck` as pucks (task 05 slice 6): a switch for a toggle, a segmented control for a group. They write through
// `performAction`, as the learner, the method their Orodja button calls; the strip re-renders them with the declaration.
import type BaseGraph from '../../graphs/base/BaseGraph';
import type {BaseGraphState} from '../../graphs/base/BaseGraph';
import type {ActionDeclaration} from '../../graphs/base/declare/graphDeclaration';
import {renderMessage} from '../../localization';
import {ChoicePuck} from './ChoicePuck';
import {TogglePuck} from './TogglePuck';

type Graph = BaseGraph<BaseGraphState>;

export function ToggleActionPuck({graph, action}: {graph: Graph; action: ActionDeclaration}) {
    return <div className="puck-host" data-puck-key={action.id}>
        <TogglePuck label={renderMessage(action.label)} help={action.help ? renderMessage(action.help) : undefined} pressed={action.pressed === true}
            onToggle={() => graph.performAction(action.id)}/>
    </div>;
}

/** The actions that share a `puck.group`: one choice, the pressed one is selected. */
export function GroupActionPuck({graph, group, actions}: {graph: Graph; group: {key: string; label: ActionDeclaration['label']; help?: ActionDeclaration['label']}; actions: readonly ActionDeclaration[]}) {
    const pressed = actions.find(action => action.pressed === true) ?? actions[0];
    return <div className="puck-host" data-puck-key={group.key}>
        <ChoicePuck label={renderMessage(group.label)} help={group.help ? renderMessage(group.help) : undefined} value={pressed.id}
            options={actions.map(action => ({value: action.id, label: renderMessage(action.label), text: action.puck && action.puck !== true ? renderMessage(action.puck.short) : undefined}))}
            onSelect={id => graph.performAction(id)}/>
    </div>;
}
