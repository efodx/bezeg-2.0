import {useState} from 'react';
import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {setLanguage} from '../../localization';
import type {ToolsSection} from '../presenter/cardHost';
import {ToolsBody, ToolsHeadActions} from './ToolsBody';
import {panelHasContent, useToolsSectionsWithContent} from './toolsContent';

beforeEach(() => setLanguage('sl'));

function Harness({panels, declared = true, keep}: {panels: Record<ToolsSection, React.ReactNode>; declared?: boolean; keep?: ToolsSection}) {
    const [section, setSection] = useState<ToolsSection>('edit');
    const sections = useToolsSectionsWithContent(declared, section, setSection, keep);
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

    test('the tab a lesson step sends the learner to stays, with its button, even when it is empty', () => {
        const panels = {edit: <span/>, display: <label><input type="checkbox"/>prikaz</label>, save: <button type="button">shrani</button>};
        const {container} = render(<Harness panels={panels} keep="edit"/>);
        expect(screen.getByTestId('inspector-edit').hidden).toBe(false);
        expect([...container.querySelectorAll('.tools-head-button')].map(button => button.getAttribute('aria-controls')))
            .toEqual(['inspector-edit', 'inspector-display', 'inspector-save']);
    });
});

describe('panelHasContent', () => {
    const panel = (html: string, hidden = false) => {
        const element = document.createElement('section');
        element.hidden = hidden;
        element.innerHTML = html;
        return element;
    };

    test('counts a control, a drawing or text, and nothing else', () => {
        expect(panelHasContent(null, true)).toBe(false);
        expect(panelHasContent(panel('<div>  \n </div><span></span>'), true)).toBe(false);
        expect(panelHasContent(panel('<div><p>besedilo</p></div>'), true)).toBe(true);
        expect(panelHasContent(panel('<div><svg></svg></div>'), true)).toBe(true);
        expect(panelHasContent(panel('<label><input type="checkbox"></label>'), true)).toBe(true);
    });

    test('ignores hidden parts and a declared graph\'s old panels, but not a panel that is itself hidden', () => {
        expect(panelHasContent(panel('<div hidden><button>x</button>besedilo</div>'), true)).toBe(false);
        expect(panelHasContent(panel('<div data-declared-panel=""><button>x</button>besedilo</div>'), true)).toBe(false);
        expect(panelHasContent(panel('<div data-declared-panel=""><button>x</button></div>'), false)).toBe(true);
        expect(panelHasContent(panel('<button>x</button>', true), true)).toBe(true);
    });

    test('reads the panel in place, without copying it (it runs after every commit)', () => {
        const element = panel('<div><button>x</button></div>');
        const copy = vi.spyOn(element, 'cloneNode');
        expect(panelHasContent(element, true)).toBe(true);
        expect(copy).not.toHaveBeenCalled();
    });
});
