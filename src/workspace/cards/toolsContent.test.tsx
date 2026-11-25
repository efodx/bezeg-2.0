import {useState} from 'react';
import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, test} from 'vitest';
import {setLanguage} from '../../localization';
import type {ToolsSection} from '../presenter/cardHost';
import {ToolsBody, ToolsHeadActions} from './ToolsBody';
import {useToolsSectionsWithContent} from './toolsContent';

beforeEach(() => setLanguage('sl'));

function Harness({panels, declared = true}: {panels: Record<ToolsSection, React.ReactNode>; declared?: boolean}) {
    const [section, setSection] = useState<ToolsSection>('edit');
    const sections = useToolsSectionsWithContent(declared, section, setSection);
    return <>
        <ToolsHeadActions section={section} onChoose={setSection} sections={sections}/>
        <ToolsBody panels={panels} section={section} declared={declared}/>
    </>;
}

describe('Orodja tabs', () => {
    test('opens on the first tab with content and shows no button for an empty tab', () => {
        const panels = {
            edit: <div data-declared-panel=""><span>odcitek</span></div>,
            display: <label><input type="checkbox"/>prikaz</label>,
            save: <button type="button">shrani</button>,
        };
        const {container} = render(<Harness panels={panels}/>);
        const buttons = [...container.querySelectorAll<HTMLButtonElement>('.tools-head-button')];
        expect(buttons).toHaveLength(2);
        expect(buttons.map(button => button.getAttribute('aria-controls'))).toEqual(['inspector-display', 'inspector-save']);
        expect(screen.getByTestId('inspector-display').hidden).toBe(false);
        expect(screen.getByTestId('inspector-edit').hidden).toBe(true);
        expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    });

    test('an undeclared graph keeps a tab whose content is not declared-panel', () => {
        const panels = {edit: <div data-declared-panel="">x</div>, display: <span/>, save: <span/>};
        const {container} = render(<Harness panels={panels} declared={false}/>);
        expect(container.querySelectorAll('.tools-head-button')).toHaveLength(1);
    });
});
