// Orodja for a host that supplies no card layer (a bare workspace in a test or an embed): the same card, placed in the board's
// corner without layout, fold and measure. GraphHost always supplies the layer, so the real app never shows this one.
import {useState} from 'react';
import {message, useT} from '../../localization';
import {CardShell} from '../cards/CardShell';
import {ToolsBody, ToolsHeadActions} from '../cards/ToolsBody';
import type {WorkspaceCardHost} from './cardHost';

const noop = () => undefined;
const TITLE = message('shell_card_tools');

export function StaticToolsCard({host}: {host: WorkspaceCardHost}) {
    const t = useT();
    const [folded, setFolded] = useState(false);
    const shownFolded = host.toolsFolded ?? folded;
    const fold = (next: boolean) => { if (host.toolsFolded !== undefined) host.setToolsFolded(next); else setFolded(next); };
    return <div className="workspace-static-tools">
        <CardShell id="tools" title={TITLE} keepMounted role="complementary" label={t('demonstration_tools')} folded={shownFolded} onFold={fold} onReset={noop} onDragMove={noop} onDrop={noop} onDragCancel={noop}
            headActions={<ToolsHeadActions section={host.tools.section} onChoose={section => { host.tools.setSection(section); fold(false); }}/>}>
            <ToolsBody panels={host.tools.panels} section={host.tools.section} declared={false} locked={host.tools.locked}/>
        </CardShell>
    </div>;
}
