import React from "react";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
import {SiteContext} from "../context/react/SiteContext";
import {setLanguage} from '../../localization';
import {getLessonForDemonstration} from '../../learning/runtime/lessonCatalog';
import type {MockedFunction} from 'vitest';

// Every active route now has a reviewed lesson, so the "no lesson" branch is exercised by letting the allowlist
// seam report an unavailable route for one test.
vi.mock('../../learning/runtime/lessonCatalog', async () => {
    const actual = await vi.importActual<typeof import('../../learning/runtime/lessonCatalog')>('../../learning/runtime/lessonCatalog');
    return {...actual, getLessonForDemonstration: vi.fn(actual.getLessonForDemonstration)};
});
const actualLessonLookup = (await vi.importActual<typeof import('../../learning/runtime/lessonCatalog')>('../../learning/runtime/lessonCatalog')).getLessonForDemonstration;
const lessonLookup = getLessonForDemonstration as MockedFunction<typeof getLessonForDemonstration>;

// Reinstall the real lookup before every test so one test's unavailable-route override cannot leak into the next.
beforeEach(() => lessonLookup.mockImplementation(actualLessonLookup));

test("inspector sections remain mounted and retain values when switched or collapsed", () => {
    render(<MemoryRouter><DemonstrationWorkspace title="Bézier" description="Raziskuj" edit={<input aria-label="Parameter" defaultValue=".5"/>}
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

test('learning prompts switch without remounting controls and fit delegates to the board', () => {
    setLanguage('sl');
    const navigate = vi.fn();
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace title="Bézier" description="Raziskuj"
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
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve?learn=1']}><DemonstrationWorkspace title="Bézier" description="Raziskuj"
        edit={<p>Urejanje</p>} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);

    expect(document.querySelector('.guided-lesson')).toBeNull();
    expect(screen.getByRole('region', {name: 'Interaktivni graf'})).not.toHaveAttribute('data-lesson-locked');
});

test('ignores lesson query parameters on demonstrations without reviewed lessons', () => {
    lessonLookup.mockImplementation(() => undefined);
    render(<MemoryRouter initialEntries={['/bezeg-2.0/spline/spline?learn=1']}><DemonstrationWorkspace title="Spline" description="Raziskuj"
        edit={<p>Urejanje</p>} display={null} save={null} navigate={vi.fn()}
        lessonCapabilities={{captureState: () => ({version: 1, value: null}), restoreState: vi.fn(), apply: vi.fn()}}/></MemoryRouter>);

    expect(lessonLookup).toHaveBeenCalledWith('spline-cn');
    expect(document.querySelector('.guided-lesson')).toBeNull();
    expect(screen.getByRole('region', {name: 'Interaktivni graf'})).not.toHaveAttribute('data-lesson-locked');
});

test('opens the reviewed lesson on a lesson-enabled spline route', async () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/spline/spline?learn=1']}><DemonstrationWorkspace title="Spline" description="Raziskuj"
        edit={<p>Urejanje</p>} display={null} save={null} navigate={vi.fn()}
        lessonCapabilities={{captureState: () => ({version: 1, value: null}), restoreState: vi.fn(), apply: vi.fn()}}/></MemoryRouter>);

    expect(await screen.findByRole('heading', {level: 2, name: 'Enostranski Cⁿ zlepek'})).toBeVisible();
    await waitFor(() => expect(screen.getByRole('region', {name: 'Interaktivni graf'})).toHaveAttribute('data-lesson-locked', 'true'));
});

test('Bernstein exploration does not instruct students to drag control points', () => {
    setLanguage('sl');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein']}><DemonstrationWorkspace title="Bernstein" description="Raziskuj"
        edit={null} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.getByText(/Spremeni stopnjo polinomov/)).toBeVisible();
    expect(screen.queryByText(/Premakni eno kontrolno točko/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Prilagodi točkam'})).not.toBeInTheDocument();
});

test('repeated subdivision prompt reflects its fixed parameter', () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/subdivision']}><DemonstrationWorkspace title="Subdivision" description="Raziskuj"
        edit={null} display={null} save={null} navigate={vi.fn()}/></MemoryRouter>);
    expect(screen.getByText(/Ponovi subdivizijo pri t = ½/)).toBeVisible();
});

test('language changes preserve the current learning prompt and mounted draft controls', () => {
    setLanguage('sl');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace title="Bézier" description=""
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
        <DemonstrationWorkspace title="PH" description="Raziskuj" edit={<p>Urejanje</p>} display={null} save={null} navigate={navigate}/>
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
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve?other=1#view']}><DemonstrationWorkspace title="Bézier" description=""
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
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein']}><DemonstrationWorkspace title="B" description=""
        edit={null} display={null} save={null} navigate={vi.fn()} pickerUnavailable/></MemoryRouter>);
    expect(screen.getByRole('button', {name: 'Zamenjaj demonstracijo'})).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', {name: 'Zamenjaj demonstracijo'}));
    expect(screen.queryByRole('dialog')).toBeNull();
});
