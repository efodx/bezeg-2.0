import React from 'react';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {setLanguage} from '../../localization';
import {DemonstrationWorkspace} from './DemonstrationWorkspace';

test('a guided lesson entered from a prepared activity owns one chapter instruction surface', async () => {
    setLanguage('en');
    let graphValue = 'ordinary';
    const lifecycle: string[] = [];
    const capabilities = {
        captureState: () => { lifecycle.push(`capture:${graphValue}`); return {version: 1 as const, value: graphValue}; },
        restoreState: (checkpoint: {version: 1; value: string}) => { lifecycle.push(`restore:${checkpoint.value}`); graphValue = checkpoint.value; },
        apply: (action: {kind: string; sceneId?: string; target?: string; visible?: boolean}) => {
            lifecycle.push(`apply:${action.kind}:${action.sceneId ?? action.target ?? ''}`);
            graphValue = action.sceneId ?? `${action.target}:${action.visible}`;
        },
    };
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control&learn=1']}>
        <DemonstrationWorkspace title="Bézier" description="Explore" edit={null} display={null} save={null} navigate={vi.fn()}
            lessonCapabilities={capabilities}/>
    </MemoryRouter>);

    await waitFor(() => expect(document.querySelector('.guided-lesson')).not.toBeNull());
    expect(document.querySelector('.chapter-activity-context')).not.toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Return to chapter/})).toHaveAttribute('href', '/bezeg-2.0/learn/bezier-curves#control-points');
    expect(lifecycle.some(entry => entry === 'apply:curve-visibility:control-polygon')).toBe(false);
    expect(lifecycle.some(entry => entry.startsWith('capture:'))).toBe(true);
    expect(lifecycle.findIndex(entry => entry.startsWith('capture:'))).toBeLessThan(lifecycle.findIndex(entry => entry.startsWith('apply:')));
    fireEvent.click(document.querySelector('.guided-lesson-owner a')!);
    await waitFor(() => expect(lifecycle).toContain('restore:ordinary'));
});

test('launching guided instruction from an active prepared activity captures it before the lesson scene', async () => {
    setLanguage('en');
    let graphValue = 'ordinary';
    const lifecycle: string[] = [];
    const capabilities = {
        captureState: () => { lifecycle.push(`capture:${graphValue}`); return {version: 1 as const, value: graphValue}; },
        restoreState: (checkpoint: {version: 1; value: string}) => { lifecycle.push(`restore:${checkpoint.value}`); graphValue = checkpoint.value; },
        apply: (action: {kind: string; sceneId?: string; target?: string; visible?: boolean}) => {
            lifecycle.push(`apply:${action.kind}:${action.sceneId ?? action.target ?? ''}`);
            graphValue = action.sceneId ?? `${action.target}:${action.visible}`;
        },
    };
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control']}>
        <DemonstrationWorkspace title="Bézier" description="Explore" edit={null} display={null} save={null} navigate={vi.fn()}
            lessonCapabilities={capabilities}/>
    </MemoryRouter>);

    expect(await screen.findByText(/Drag an interior control/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Learn this demonstration'}));
    await waitFor(() => expect(document.querySelector('.guided-lesson')).not.toBeNull());
    expect(document.querySelector('.chapter-activity-context')).not.toBeInTheDocument();

    const preparedControl = lifecycle.indexOf('apply:curve-visibility:control-polygon');
    const preparedCheckpoint = lifecycle.lastIndexOf('capture:convex-hull:false');
    const lessonScene = lifecycle.lastIndexOf('apply:prepared-scene:bezier-symmetric-cubic');
    expect(preparedControl).toBeGreaterThan(-1);
    expect(preparedCheckpoint).toBeGreaterThan(preparedControl);
    expect(lessonScene).toBeGreaterThan(preparedCheckpoint);

    fireEvent.click(document.querySelector('.guided-lesson-owner a')!);
    await waitFor(() => expect(lifecycle).toContain('restore:convex-hull:false'));
});
