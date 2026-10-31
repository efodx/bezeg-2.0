import React from "react";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter, useLocation} from "react-router-dom";
import {afterEach} from 'vitest';
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
import {SiteContext} from "../context/react/SiteContext";
import {setLanguage} from '../../localization';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import {resolveGuidedExample} from '../../learning/chapter/guidedExamples';
import type {MockedFunction} from 'vitest';
import type {LessonDefinition} from '../../learning/model';

// Every active route now has a reviewed lesson, so the "no lesson" branch is exercised by letting the allowlist
// seam report an unavailable route for one test.
vi.mock('../../learning/runtime/lessonCatalog', async () => {
    const actual = await vi.importActual<typeof import('../../learning/runtime/lessonCatalog')>('../../learning/runtime/lessonCatalog');
    return {...actual, getLessonForDemonstration: vi.fn(actual.getLessonForDemonstration)};
});
// A fixture surface demonstration for one path; the catalog has no surface entry yet.
const surfaceFixture = vi.hoisted(() => ({path: '/bezeg-2.0/fixture-surface'}));
vi.mock('../../demonstrations', async () => {
    const actual = await vi.importActual<typeof import('../../demonstrations')>('../../demonstrations');
    return {
        ...actual,
        findDemonstration: (pathname: string) => pathname === surfaceFixture.path
            ? actual.resolveDemonstrationDefinition({id: 'bezier', path: surfaceFixture.path, family: '/bezeg-2.0/bezier', title: 'bezier_curve',
                prompts: ['prompt_control_points', 'prompt_compare'], view: 'surface'})
            : actual.findDemonstration(pathname),
    };
});
const actualLessonLookup = (await vi.importActual<typeof import('../../learning/runtime/lessonCatalog')>('../../learning/runtime/lessonCatalog')).getLessonForDemonstration;
const lessonLookup = getLessonForDemonstration as MockedFunction<typeof getLessonForDemonstration>;
function LocationReadout() {
    const location = useLocation();
    return <output data-testid="location">{location.pathname}{location.search}{location.hash}</output>;
}

// Reinstall the real lookup before every test so one test's unavailable-route override cannot leak into the next.
beforeEach(() => {
    setLanguage('sl');
    lessonLookup.mockImplementation(actualLessonLookup);
});

afterEach(() => vi.unstubAllGlobals());

function preferReducedMotion() {
    vi.stubGlobal('matchMedia', vi.fn(() => ({matches: true, media: '(prefers-reduced-motion: reduce)', onchange: null,
        addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn()})));
}

test("inspector sections remain mounted and retain values when switched or collapsed", () => {
    render(<MemoryRouter><DemonstrationWorkspace description="Raziskuj" edit={<input aria-label="Parameter" defaultValue=".5"/>}
        display={<p>Koordinatni sistem</p>} save={<p>Prednastavitve</p>} navigate={vi.fn()}/></MemoryRouter>);
    const parameter = screen.getByLabelText("Parameter");
    fireEvent.change(parameter, {target: {value: ".7"}});
    fireEvent.click(screen.getByRole("button", {name: "Prikaz"}));
    expect(screen.getByText("Koordinatni sistem")).toBeVisible();
    expect(parameter).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "Uredi"}));
    expect(parameter).toHaveValue(".7");
    fireEvent.click(screen.getByRole("button", {name: "Strni"}));
    expect(parameter).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "Odpri"}));
    expect(parameter).toBeVisible();
});

test('the inspector heading has no introductory paragraph and tab hints stay available to assistive technology', () => {
    setLanguage('sl');
    render(<MemoryRouter><DemonstrationWorkspace description="Raziskuj" edit={<p>Urejanje</p>}
        display={<p>Pogled</p>} save={<p>Shrani</p>} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.queryByText('Vsa dejanja na enem mestu. Najprej izberi, kaj želiš opazovati.')).not.toBeInTheDocument();
    const display = screen.getByRole('button', {name: 'Prikaz'});
    expect(display).toHaveAccessibleDescription('pogled');
    expect(display).toHaveAttribute('title', 'pogled');
    expect(screen.getByRole('button', {name: 'Uredi'})).toHaveAccessibleDescription('krivulja');
    expect(screen.getByRole('button', {name: 'Shrani'})).toHaveAccessibleDescription('primer');
});

test('switching tabs resets the inspector content scroll owner and keeps hidden sections mounted', () => {
    setLanguage('sl');
    render(<MemoryRouter><DemonstrationWorkspace description="Raziskuj" edit={<input aria-label="Parameter" defaultValue=".5"/>}
        display={<p>Koordinatni sistem</p>} save={null} navigate={vi.fn()}/></MemoryRouter>);
    const content = document.getElementById('inspector-content')!;
    Object.defineProperty(content, 'scrollTop', {value: 120, writable: true, configurable: true});
    fireEvent.click(screen.getByRole('button', {name: 'Prikaz'}));
    expect(content.scrollTop).toBe(0);
    fireEvent.click(screen.getByRole('button', {name: 'Strni'}));
    expect(content).toHaveAttribute('hidden');
    expect(screen.getByRole('button', {name: 'Odpri'})).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('Koordinatni sistem')).toBeInTheDocument();
    expect(screen.getByLabelText('Parameter')).toBeInTheDocument();
});

test('the heading is the route Demonstration title and follows the language, without any title from the host', () => {
    setLanguage('en');
    const view = render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace description="Explore"
        edit={null} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    const enTitle = screen.getByRole('heading', {level: 1}).textContent;
    expect(enTitle).toBeTruthy();
    act(() => setLanguage('sl'));
    expect(screen.getByRole('heading', {level: 1}).textContent).not.toBe(enTitle);
    view.unmount();
    render(<MemoryRouter initialEntries={['/not-a-demonstration']}><DemonstrationWorkspace description="Explore"
        edit={null} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Bezeg');
});

test('learning prompts switch without remounting controls and fit delegates to the board', () => {
    setLanguage('sl');
    const navigate = vi.fn();
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace description="Raziskuj"
        edit={<input aria-label="Parameter" defaultValue=".5"/>} display={null} save={null} navigate={navigate}/></MemoryRouter>);
    const parameter = screen.getByLabelText('Parameter');
    fireEvent.change(parameter, {target: {value: '.8'}});
    fireEvent.click(screen.getByRole('button', {name: 'Naslednji namig'}));
    expect(screen.getByText(/V Prikazu vključi kontrolni poligon/)).toBeVisible();
    expect(parameter).toHaveValue('.8');
    fireEvent.click(screen.getByRole('button', {name: 'Prilagodi točkam'}));
    expect(navigate).toHaveBeenCalledWith('fit');
});

test('does not lock a deep-linked workspace before graph capabilities are ready', () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve?learn=1']}><DemonstrationWorkspace description="Raziskuj"
        edit={<p>Urejanje</p>} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);

    expect(document.querySelector('.guided-lesson')).toBeNull();
    expect(screen.getByRole('region', {name: 'Interaktivni graf'})).not.toHaveAttribute('data-lesson-locked');
});

test('ignores lesson query parameters on demonstrations without reviewed lessons', () => {
    lessonLookup.mockImplementation(() => undefined);
    render(<MemoryRouter initialEntries={['/bezeg-2.0/spline/spline?learn=1']}><DemonstrationWorkspace description="Raziskuj"
        edit={<p>Urejanje</p>} display={null} save={null} navigate={vi.fn()}
        lessonCapabilities={{captureState: () => ({version: 1, value: null}), restoreState: vi.fn(), apply: vi.fn()}}/></MemoryRouter>);

    expect(lessonLookup).toHaveBeenCalledWith('spline-cn');
    expect(document.querySelector('.guided-lesson')).toBeNull();
    expect(screen.getByRole('region', {name: 'Interaktivni graf'})).not.toHaveAttribute('data-lesson-locked');
});

test('valid family investigation URLs resolve into the chapter-owned guided example', () => {
    setLanguage('en');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein?school=west&explore=foundations.why-weights.bernstein#figure']}>
        <DemonstrationWorkspace description="Explore" edit={null} display={null} save={null} navigate={vi.fn()}
            lessonCapabilities={{captureState: () => ({version: 1, value: null}), restoreState: vi.fn(), apply: vi.fn()}}/>
    </MemoryRouter>);

    expect(document.querySelector('.guided-lesson')).toBeInTheDocument();
    expect(screen.queryByRole('region', {name: 'Investigation instructions'})).not.toBeInTheDocument();
    const resolved = resolveGuidedExample('?explore=foundations.why-weights.bernstein', 'bernstein');
    const retainedPrompt = resolved?.lesson.steps.flatMap(step => step.frames ?? [])
        .find(frame => frame.prompt?.en.includes('Change the degree with its selector'));
    expect(resolved?.owner).toEqual({chapterId: 'foundations', sectionId: 'reading-bernstein'});
    expect(retainedPrompt?.kind).toBe('observation');
    expect(screen.getByRole('link', {name: 'Return to chapter'})).toHaveAttribute('href', '/bezeg-2.0/learn/foundations#reading-bernstein');
});

test('invalid family context is removed while unrelated query values and the hash survive', async () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein?school=west&explore=foundations.why-weights.bernstein&explore=duplicate&learn=1#figure']}>
        <DemonstrationWorkspace description="Explore" edit={null} display={null} save={null} navigate={vi.fn()}/>
        <LocationReadout/>
    </MemoryRouter>);

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/bezeg-2.0/bernstein?school=west&learn=1&learnChapter=foundations&learnSection=reading-bernstein#figure'));
    expect(screen.queryByRole('region', {name: 'Investigation instructions'})).not.toBeInTheDocument();
});

test('opens the reviewed lesson on a lesson-enabled spline route', async () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/spline/spline?learn=1']}><DemonstrationWorkspace description="Raziskuj"
        edit={<p>Urejanje</p>} display={null} save={null} navigate={vi.fn()}
        lessonCapabilities={{captureState: () => ({version: 1, value: null}), restoreState: vi.fn(), apply: vi.fn()}}/></MemoryRouter>);

    expect(await screen.findByRole('heading', {level: 2, name: 'Enostranski Cⁿ zlepek'})).toBeVisible();
    await waitFor(() => expect(screen.getByRole('region', {name: 'Interaktivni graf'})).toHaveAttribute('data-lesson-locked', 'true'));
});

test('direct guided family context preserves its frame through hide and returns to the retained chapter home', async () => {
    setLanguage('en');
    const lesson: LessonDefinition = {
        id: 'workspace-hide-test', demonstrationId: 'spline-cn', title: {sl: 'Učna pot', en: 'Guided path'}, summary: {sl: 'Povzetek', en: 'Summary'},
        steps: [{id: 'step', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'}, frames: [
            {id: 'read', kind: 'explanation', title: {sl: 'Uvod', en: 'Introduction'}, body: {sl: 'Besedilo', en: 'Reading'}},
            {id: 'observe', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Preveri graf.', en: 'Inspect the graph.'}},
        ]}],
    };
    lessonLookup.mockReturnValue(lesson);
    const capabilities = {captureState: () => ({version: 1 as const, value: null}), restoreState: vi.fn(), apply: vi.fn()};
    preferReducedMotion();
    render(<MemoryRouter initialEntries={['/bezeg-2.0/spline/spline?explore=splines.piecewise.spline-cn']}><DemonstrationWorkspace description="Explore"
        edit={<input aria-label="Parameter" defaultValue=".5"/>} display={null} save={null} navigate={vi.fn()} lessonCapabilities={capabilities}/>
        <LocationReadout/></MemoryRouter>);

    await screen.findByRole('heading', {name: 'Introduction'});
    const directFrameCount = resolveGuidedExample('?explore=splines.piecewise.spline-cn', 'spline-cn')?.lesson.steps[0].frames?.length;
    fireEvent.click(document.querySelector('.guided-lesson-nav-next')!);
    expect(screen.getByText('Observation', {selector: 'strong'})).toBeVisible();
    expect(screen.getByRole('region', {name: 'Interactive graph'})).toHaveAttribute('data-lesson-locked', 'true');
    const progress = document.querySelector('.guided-lesson-progress')?.textContent;

    fireEvent.click(screen.getByRole('button', {name: 'Observe on the graph'}));
    await waitFor(() => expect(document.querySelector('.guided-lesson')).toBeNull());
    const reopen = screen.getByRole('button', {name: new RegExp(`Guided path.*Step 1 of 1.*Frame 2 of ${directFrameCount}.*Back to the instructions`)});
    await waitFor(() => expect(reopen).toHaveFocus());
    expect(screen.queryByRole('button', {name: 'Learn this demonstration'})).not.toBeInTheDocument();
    expect(screen.getByRole('region', {name: 'Interactive graph'})).not.toHaveAttribute('data-lesson-locked');
    expect(capabilities.restoreState).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', {name: 'Continue example'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Exit example'})).not.toBeInTheDocument();

    const parameter = screen.getByLabelText('Parameter');
    fireEvent.change(parameter, {target: {value: '.8'}});
    fireEvent.click(reopen);
    expect(screen.getByText('Observation', {selector: 'strong'})).toBeVisible();
    expect(document.querySelector('.guided-lesson-progress')?.textContent).toBe(progress);
    expect(parameter).toHaveValue('.8');
    expect(screen.getByRole('region', {name: 'Interactive graph'})).toHaveAttribute('data-lesson-locked', 'true');

    fireEvent.click(document.querySelector('.guided-lesson-heading .guided-lesson-exit')!);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const safeChoice = screen.getByRole('button', {name: 'Continue example'});
    expect(safeChoice).toHaveFocus();
    fireEvent.click(safeChoice);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('.guided-lesson-progress')?.textContent).toBe(progress);
    expect(capabilities.restoreState).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', {name: 'Observe on the graph'}));
    const compactTab = screen.getByRole('button', {name: new RegExp(`Guided path.*Frame 2 of ${directFrameCount}`)});
    fireEvent.click(compactTab);
    for (let frame = 1; frame < (directFrameCount ?? 2); frame += 1) {
        fireEvent.click(document.querySelector('.guided-lesson-nav-next')!);
    }
    expect(await screen.findByText('Example complete')).toBeVisible();
    fireEvent.click(document.querySelector('.guided-lesson-heading .guided-lesson-exit')!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(capabilities.restoreState).toHaveBeenCalledTimes(1);
    const learnAgain = screen.getByRole('button', {name: 'Learn this demonstration'});
    await waitFor(() => expect(screen.getByRole('button', {name: 'Learn this demonstration'})).toHaveFocus());

    fireEvent.click(learnAgain);
    await screen.findByRole('heading', {name: 'Introduction'});
    fireEvent.click(document.querySelector('.guided-lesson-heading .guided-lesson-exit')!);
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Exit and restore graph'}));
    await waitFor(() => expect(capabilities.restoreState).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', {name: 'Learn this demonstration'})).toHaveFocus());
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/bezeg-2.0/spline/spline?learnChapter=splines&learnSection=piecewise'));
    expect(screen.queryByRole('region', {name: 'Investigation instructions'})).not.toBeInTheDocument();
    act(() => setLanguage('sl'));
});

test('minimized lesson exposes one focused reopen tab over the graph', async () => {
    setLanguage('en');
    preferReducedMotion();
    const lesson: LessonDefinition = {
        id: 'workspace-tab-test', demonstrationId: 'bezier', title: {sl: 'Učna pot', en: 'Guided path'}, summary: {sl: 'Povzetek', en: 'Summary'},
        steps: [{id: 'step', title: {sl: 'Korak', en: 'Step'}, body: {sl: 'Razlaga', en: 'Explanation'}, frames: [
            {id: 'read', kind: 'explanation', title: {sl: 'Uvod', en: 'Introduction'}, body: {sl: 'Besedilo', en: 'Reading'}},
            {id: 'observe', kind: 'observation', title: {sl: 'Opazovanje', en: 'Observation'}, prompt: {sl: 'Preveri graf.', en: 'Inspect the graph.'}},
        ]}],
    };
    lessonLookup.mockReturnValue(lesson);
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace description="Explore"
        edit={<input aria-label="Parameter" defaultValue=".5"/>} display={null} save={null} navigate={vi.fn()}
        lessonCapabilities={{captureState: () => ({version: 1 as const, value: null}), restoreState: vi.fn(), apply: vi.fn()}}/></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', {name: 'Learn this demonstration'}));
    await screen.findByRole('heading', {name: 'Introduction'});
    const frameCount = resolveGuidedExample('?learn=1&learnChapter=bezier-curves&learnSection=control-points', 'bezier')?.lesson.steps[0].frames?.length;
    fireEvent.click(screen.getByRole('button', {name: 'Next frame'}));
    fireEvent.click(screen.getByRole('button', {name: 'Observe on the graph'}));
    const tab = await screen.findByRole('button', {name: new RegExp(`Guided path.*Step 1 of 1.*Frame 2 of ${frameCount}`, 'i')});
    expect(tab.closest('.guided-lesson-layer')).not.toBeNull();
    expect(tab.closest('.demonstration-workspace')).not.toBeNull();
    await waitFor(() => expect(tab).toHaveFocus());
    await waitFor(() => expect(document.querySelector('.guided-lesson')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', {name: 'Back to the instructions'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Continue example'})).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Exit example'})).not.toBeInTheDocument();
    fireEvent.click(tab);
    expect(await screen.findByText('Observation', {selector: 'strong'})).toBeVisible();
    expect(document.querySelector('.guided-lesson-nav-next')).toBeVisible();
    act(() => setLanguage('sl'));
});

test('Bernstein exploration does not instruct students to drag control points', () => {
    setLanguage('sl');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein']}><DemonstrationWorkspace description="Raziskuj"
        edit={null} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.getByText(/Spremeni stopnjo polinomov/)).toBeVisible();
    expect(screen.queryByText(/Premakni eno kontrolno točko/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Prilagodi točkam'})).not.toBeInTheDocument();
});

test('repeated subdivision prompt reflects its fixed parameter', () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/subdivision']}><DemonstrationWorkspace description="Raziskuj"
        edit={null} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.getByText(/Ponovi subdivizijo pri t = ½/)).toBeVisible();
});

test('language changes preserve the current learning prompt and mounted draft controls', () => {
    setLanguage('sl');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace description=""
        edit={<input aria-label="draft" defaultValue=".5"/>} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    const draft = screen.getByLabelText('draft');
    fireEvent.change(draft, {target: {value: '.9'}});
    fireEvent.click(screen.getByRole('button', {name: 'Naslednji namig'}));
    act(() => setLanguage('en'));
    expect(screen.getByText(/Enable the control polygon in Display/)).toBeVisible();
    expect(screen.getByLabelText('draft')).toBe(draft);
    expect(draft).toHaveValue('.9');
    act(() => setLanguage('sl'));
});

test("presentation offers controls and exit without hover, and pan is explicit", () => {
    const setFullScreen = vi.fn();
    const navigate = vi.fn();
    render(<MemoryRouter><SiteContext.Provider value={{fullScreen: {fullScreen: true, setFullScreen}}}>
        <DemonstrationWorkspace description="Raziskuj" edit={<p>Urejanje</p>} display={null} save={null} navigate={navigate}/>
    </SiteContext.Provider></MemoryRouter>);
    expect(screen.getByText("Urejanje")).not.toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "Odpri orodja"}));
    expect(screen.getByText("Urejanje")).toBeVisible();
    fireEvent.click(screen.getByRole("button", {name: "Premakni pogled levo"}));
    expect(navigate).toHaveBeenCalledWith("left");
    fireEvent.click(screen.getByRole("button", {name: "Zapri predstavitev"}));
    expect(setFullScreen).toHaveBeenCalledWith(false);
});

beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function () {this.setAttribute('open', '');};
    HTMLDialogElement.prototype.close = function () {this.removeAttribute('open');};
});

test('picker cancellation and current graph selection retain mounted controls', () => {
    setLanguage('en');
    const pausePlayback = vi.fn();
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve?other=1#view']}><DemonstrationWorkspace description=""
        edit={<input aria-label="draft" defaultValue=".5"/>} display={null} save={null} navigate={vi.fn()} pausePlayback={pausePlayback}/></MemoryRouter>);
    const draft = screen.getByLabelText('draft');
    fireEvent.change(draft, {target: {value: '.9'}});
    const switcher = screen.getByRole('button', {name: 'Switch demonstration'});
    fireEvent.click(switcher);
    expect(pausePlayback).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('searchbox')).toHaveFocus();
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'nonsense'}});
    fireEvent.click(screen.getByRole('button', {name: 'Close'}));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('draft')).toBe(draft);
    expect(draft).toHaveValue('.9');
    fireEvent.click(switcher);
    const current = document.getElementById('demonstration-card-bezier-graph')!;
    fireEvent.click(current);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByLabelText('draft')).toBe(draft);
    expect(draft).toHaveValue('.9');
    expect(document.querySelector('.workspace-topics')).toBeNull();
    act(() => setLanguage('sl'));
});

test('busy workspace exposes unavailable switcher without opening a picker', () => {
    setLanguage('sl');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein']}><DemonstrationWorkspace description=""
        edit={null} display={null} save={null} navigate={vi.fn()} pickerUnavailable/></MemoryRouter>);
    expect(screen.getByRole('button', {name: 'Zamenjaj demonstracijo'})).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', {name: 'Zamenjaj demonstracijo'}));
    expect(screen.queryByRole('dialog')).toBeNull();
});

test('a surface demonstration hides pan and zoom and shows the surface gesture hint', () => {
    setLanguage('en');
    const surface = render(<MemoryRouter initialEntries={[surfaceFixture.path]}><DemonstrationWorkspace description="Explore"
        edit={<p>Edit</p>} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.queryByRole('group', {name: 'Graph pan and zoom'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Zoom in'})).toBeNull();
    expect(screen.getByText(/Drag empty space to orbit/)).toBeVisible();
    surface.unmount();

    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace description="Explore"
        edit={<p>Edit</p>} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.getByRole('group', {name: 'Graph pan and zoom'})).toBeVisible();
    expect(screen.queryByText(/Drag empty space to orbit/)).toBeNull();
});
