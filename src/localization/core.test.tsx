import React from 'react';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {sl} from './sl';
import {en} from './en';
import {beginFigureExport, LocalizedError, message, setLanguage, t} from './index';
import {LanguageSelector} from './LanguageSelector';

beforeEach(() => { localStorage.clear(); act(() => setLanguage('sl')); });
afterEach(() => {jest.restoreAllMocks();});

test('both catalogs have identical keys and interpolation parameters', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(sl).sort());
    for (const key of Object.keys(sl) as (keyof typeof sl)[]) {
        expect(en[key].trim()).not.toBe('');
        expect(en[key].match(/\{\w+\}/g)?.sort() ?? []).toEqual(sl[key].match(/\{\w+\}/g)?.sort() ?? []);
    }
});

test('switches language, updates the document, and saves a separate preference', () => {
    localStorage.setItem('preset-bezier-curve', 'unchanged');
    render(<LanguageSelector/>);
    fireEvent.change(screen.getByRole('combobox'), {target: {value: 'en'}});
    expect(screen.getByText('Language')).toBeVisible();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('bezeg-language')).toBe('en');
    expect(localStorage.getItem('preset-bezier-curve')).toBe('unchanged');
});

test('storage failure retains session choice and displays a translated notice', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('blocked');});
    render(<LanguageSelector/>);
    fireEvent.change(screen.getByRole('combobox'), {target: {value: 'en'}});
    expect(screen.getByRole('status')).toHaveTextContent('Cannot remember the language choice');
    expect(screen.getByRole('combobox')).toHaveValue('en');
    fireEvent.change(screen.getByRole('combobox'), {target: {value: 'sl'}});
    expect(screen.getByRole('status')).toHaveTextContent('Izbire jezika ni mogoče shraniti');
});

test('nested validation errors translate again without altering technical identifiers', () => {
    const failure = new LocalizedError(message('unsupported_file_export_presets_from_bezeg_and_check_the_data', {
        value0: message('unknown_collection', {value0: 'preset-custom'})
    }));
    expect(failure.message).toContain('neznana zbirka preset-custom');
    act(() => setLanguage('en'));
    expect(failure.message).toContain('unknown collection preset-custom');
});

test('nested exports lock switching and release exactly once, including failure cleanup', () => {
    render(<LanguageSelector/>);
    let finish!: () => void, finishCapture!: () => void;
    act(() => {finish = beginFigureExport(); finishCapture = beginFigureExport();});
    expect(screen.getByRole('combobox')).toBeDisabled();
    act(() => setLanguage('en'));
    expect(screen.getByRole('combobox')).toHaveValue('sl');
    act(() => {finishCapture(); finishCapture();});
    expect(screen.getByRole('combobox')).toBeDisabled();
    act(() => finish());
    expect(screen.getByRole('combobox')).toBeEnabled();
});

test('runtime missing English message falls back to Slovenian', () => {
    const original = en.help;
    delete (en as Partial<typeof en>).help;
    try {act(() => setLanguage('en')); expect(t('help')).toBe(sl.help);}
    finally {en.help = original;}
});

test.each(['en', 'sl', 'unsupported'])('initial preference %s is resolved without browser-language detection', saved => {
    localStorage.setItem('bezeg-language', saved);
    jest.isolateModules(() => {
        const isolated = require('./index');
        expect(isolated.t('language')).toBe(saved === 'en' ? 'Language' : 'Jezik');
    });
});

test('initial preference read failure falls back without throwing', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {throw new Error('blocked');});
    jest.isolateModules(() => {
        const isolated = require('./index');
        expect(isolated.t('language')).toBe('Jezik');
    });
});
