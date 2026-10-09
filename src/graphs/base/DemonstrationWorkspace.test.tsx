import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {DemonstrationWorkspace} from "./DemonstrationWorkspace";
import {SiteContext} from "../context/react/SiteContext";
import {setLanguage} from '../../localization';

test("inspector sections remain mounted and retain values when switched or collapsed", () => {
    render(<MemoryRouter><DemonstrationWorkspace title="Bézier" description="Raziskuj" edit={<input aria-label="Parameter" defaultValue=".5"/>}
        display={<p>Koordinatni sistem</p>} save={<p>Prednastavitve</p>} navigate={jest.fn()}/></MemoryRouter>);
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
    const navigate = jest.fn();
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
        edit={<p>Urejanje</p>} display={null} save={null} navigate={jest.fn()}/></MemoryRouter>);

    expect(document.querySelector('.guided-lesson')).toBeNull();
    expect(screen.getByRole('region', {name: 'Interaktivni graf'})).not.toHaveAttribute('data-lesson-locked');
});

test('ignores lesson query parameters on demonstrations without reviewed lessons', () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein?learn=1']}><DemonstrationWorkspace title="Bernstein" description="Raziskuj"
        edit={<p>Urejanje</p>} display={null} save={null} navigate={jest.fn()}
        lessonCapabilities={{captureState: () => ({version: 1, value: null}), restoreState: jest.fn(), apply: jest.fn()}}/></MemoryRouter>);

    expect(document.querySelector('.guided-lesson')).toBeNull();
    expect(screen.getByRole('region', {name: 'Interaktivni graf'})).not.toHaveAttribute('data-lesson-locked');
});

test('Bernstein exploration does not instruct students to drag control points', () => {
    setLanguage('sl');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bernstein']}><DemonstrationWorkspace title="Bernstein" description="Raziskuj"
        edit={null} display={null} save={null} navigate={jest.fn()}/></MemoryRouter>);
    expect(screen.getByText(/Spremeni stopnjo polinomov/)).toBeVisible();
    expect(screen.queryByText(/Premakni eno kontrolno točko/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Prilagodi točkam'})).not.toBeInTheDocument();
});

test('repeated subdivision prompt reflects its fixed parameter', () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/subdivision']}><DemonstrationWorkspace title="Subdivision" description="Raziskuj"
        edit={null} display={null} save={null} navigate={jest.fn()}/></MemoryRouter>);
    expect(screen.getByText(/Ponovi subdivizijo pri t = ½/)).toBeVisible();
});

test('language changes preserve the current learning prompt and mounted draft controls', () => {
    setLanguage('sl');
    render(<MemoryRouter initialEntries={['/bezeg-2.0/bezier/curve']}><DemonstrationWorkspace title="Bézier" description=""
        edit={<input aria-label="draft" defaultValue=".5"/>} display={null} save={null} navigate={jest.fn()}/></MemoryRouter>);
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
    const setFullScreen = jest.fn();
    const navigate = jest.fn();
    render(<MemoryRouter><SiteContext.Provider value={{preset: {selected: "", setSelected: jest.fn()}, fullScreen: {fullScreen: true, setFullScreen}}}>
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
