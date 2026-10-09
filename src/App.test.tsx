import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter, Route, Routes} from 'react-router-dom';
import App from './App';
import {setLanguage} from './localization';

beforeEach(() => {setLanguage('en');});

test('renders the app shell around its nested route and navigates through the header', () => {
    render(<MemoryRouter initialEntries={['/bezeg-2.0']}>
        <Routes>
            <Route path="/bezeg-2.0" element={<App/>}>
                <Route index element={<main><h1>Home route content</h1></main>}/>
                <Route path="demonstrations" element={<main><h1>Demonstrations route content</h1></main>}/>
            </Route>
        </Routes>
    </MemoryRouter>);

    expect(screen.getByRole('banner')).toBeVisible();
    expect(screen.getByRole('link', {name: 'Bezeg · home'})).toHaveAttribute('href', '/bezeg-2.0');
    expect(screen.getByRole('heading', {level: 1, name: 'Home route content'})).toBeVisible();

    fireEvent.click(screen.getByRole('link', {name: 'Demonstrations'}));
    expect(screen.getByRole('heading', {level: 1, name: 'Demonstrations route content'})).toBeVisible();
});
