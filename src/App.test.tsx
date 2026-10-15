import React from 'react';
import {fireEvent, render, screen, within} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import App from './App';
import {DemonstrationsPage} from './DemonstrationsPage';
import {WelcomePage} from './WelcomePage';
import {setLanguage} from './localization';

beforeEach(() => {setLanguage('en');});

test('renders the app shell around its nested route and navigates through the header', () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0']}>
        <Routes>
            <Route path="/bezeg-2.0" element={<App/>}>
                <Route index element={<WelcomePage/>}/>
                <Route path="demonstrations" element={<DemonstrationsPage/>}/>
            </Route>
        </Routes>
    </MemoryRouter>);

    const appHeader = document.querySelector<HTMLElement>('.app-header')!;
    expect(appHeader).toBeVisible();
    expect(within(appHeader).getByRole('link', {name: 'Bezeg · home'})).toHaveAttribute('href', '/bezeg-2.0');
    expect(screen.getByRole('heading', {level: 1, name: 'Mathematics you can move.'})).toBeVisible();
    expect(screen.getByRole('region', {name: 'Starting demonstrations'})).toBeVisible();

    fireEvent.click(screen.getByRole('link', {name: /All demonstrations/}));
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
    expect(screen.getByRole('region', {name: 'All demonstrations'})).toBeVisible();
    expect(screen.queryByRole('region', {name: 'Starting demonstrations'})).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', {name: 'Bezeg · home'}));
    expect(screen.getByRole('heading', {level: 1, name: 'Mathematics you can move.'})).toBeVisible();
    fireEvent.click(screen.getByRole('link', {name: 'Demonstrations'}));
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstrations'})).toBeVisible();
});
