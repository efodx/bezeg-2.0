import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {setLanguage} from './index';
import {LanguageSelector} from './LanguageSelector';
import {PresetImportDialog} from '../graphs/base/PresetImportDialog';
import {DemonstrationWorkspace} from '../graphs/base/DemonstrationWorkspace';

beforeEach(() => { localStorage.clear(); act(() => setLanguage('sl')); });
afterEach(() => {jest.restoreAllMocks();});


test('existing import error and open dialog switch immediately', async () => {
    render(<><LanguageSelector/><PresetImportDialog onImported={jest.fn()}/></>);
    fireEvent.click(screen.getByRole('button', {name: 'Uvozi prednastavitve'}));
    const file = new File(['{'], 'broken.txt');
    Object.defineProperty(file, 'text', {value: async () => '{'});
    fireEvent.change(screen.getByLabelText('Datoteka prednastavitev'), {target: {files: [file]}});
    expect(await screen.findByRole('alert')).toHaveTextContent('neveljaven JSON');
    fireEvent.change(screen.getByRole('combobox'), {target: {value: 'en'}});
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('invalid JSON');
    expect(screen.getByRole('button', {name: 'Import', exact: true})).toBeDisabled();
});

test('language changes preserve draft input and inspector state', () => {
    render(<MemoryRouter><LanguageSelector/><DemonstrationWorkspace title="Bézier" description=""
        edit={<input aria-label="draft" defaultValue="0.5"/>} display={<p>display content</p>} save={null} navigate={jest.fn()}/></MemoryRouter>);
    const draft = screen.getByLabelText('draft');
    fireEvent.change(draft, {target: {value: '0.75'}});
    fireEvent.click(screen.getByRole('button', {name: 'Prikaz', exact: true}));
    fireEvent.change(screen.getByRole('combobox'), {target: {value: 'en'}});
    expect(screen.getByRole('button', {name: 'Display', exact: true})).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('draft')).toBe(draft);
    expect(draft).toHaveValue('0.75');
    fireEvent.click(screen.getByRole('button', {name: 'Edit', exact: true}));
    expect(draft).toBeVisible();
});

test('file read failure becomes an actionable error in the current language', async () => {
    render(<><LanguageSelector/><PresetImportDialog onImported={jest.fn()}/></>);
    fireEvent.click(screen.getByRole('button', {name: 'Uvozi prednastavitve'}));
    const file = new File([''], 'unreadable.txt');
    Object.defineProperty(file, 'text', {value: async () => {throw new Error('OS-specific failure');}});
    fireEvent.change(screen.getByLabelText('Datoteka prednastavitev'), {target: {files: [file]}});
    expect(await screen.findByRole('alert')).toHaveTextContent('Datoteke ni mogoče prebrati');
    fireEvent.change(screen.getByRole('combobox'), {target: {value: 'en'}});
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot read the file. Choose another file.');
});

test('native import storage failure remains actionable after a language switch', async () => {
    render(<><LanguageSelector/><PresetImportDialog onImported={jest.fn()}/></>);
    fireEvent.click(screen.getByRole('button', {name: 'Uvozi prednastavitve'}));
    const contents = JSON.stringify({'preset-bezier-curve': {data: [{id: 'Example', data: [['JSXBezierCurve', {points: [[0, 0], [1, 2]]}]]}]}});
    const file = new File([contents], 'presets.txt');
    Object.defineProperty(file, 'text', {value: async () => contents});
    fireEvent.change(screen.getByLabelText('Datoteka prednastavitev'), {target: {files: [file]}});
    const confirm = await screen.findByRole('button', {name: 'Uvozi', exact: true});
    await screen.findByText(/Datoteka je veljavna/);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('blocked');});
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {throw new Error('rollback blocked');});
    fireEvent.click(confirm);
    expect(screen.getByRole('alert')).toHaveTextContent('Prednastavitev ni bilo mogoče shraniti');
    fireEvent.change(screen.getByRole('combobox'), {target: {value: 'en'}});
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot save presets.');
});
