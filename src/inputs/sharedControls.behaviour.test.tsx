/** The shared behaviour test (spec acceptance 3) against the bare shared controls; real graphs: `graphs/base/sharedControls.graphs.test.tsx`. */
import React, {useState} from 'react';
import {render, screen} from '@testing-library/react';
import {NumberInput} from './NumberInput';
import Slider from './Slider';
import {CountSetter} from './CountSetter';
import {countSetterBehaviour, numericFieldBehaviour, sliderBehaviour} from './sharedControlBehaviour';

/** Renders a control with its own state; `reset` remounts it from `start`, as the host Reset reloads the scene. */
function bare(node: (props: {value: number; set(value: number): void}) => React.ReactNode, start: number) {
    const Wrapper = () => {
        const [value, set] = useState(start);
        return <div>{node({value, set})}</div>;
    };
    let generation = 0;
    const view = render(<Wrapper key={generation}/>);
    return {reset: () => view.rerender(<Wrapper key={++generation}/>)};
}

const spin = () => screen.getByRole('spinbutton');
const model = () => Number(spin().getAttribute('aria-valuenow'));

numericFieldBehaviour('NumberInput', {
    min: 0, max: 100, step: 1, valid: 50, outOfRange: 101,
    mount: () => {
        const {reset} = bare(({value, set}) => <NumberInput label="n" value={value} min={0} max={100} step={1} decimals={0} integer onChange={set}/>, 5);
        return {get field() { return spin(); }, read: model, reset};
    },
});

sliderBehaviour('Slider', {
    min: 0, max: 1, step: 0.05, valid: 0.5, outOfRange: 2,
    mount: () => {
        const {reset} = bare(({value, set}) => <Slider customText="alpha" min={0} max={1} step={0.05} value={value} onChange={set}/>, 0.25);
        return {get field() { return spin(); }, get range() { return screen.getByRole('slider'); }, read: model, reset};
    },
});

for (const settable of [false, true]) {
    countSetterBehaviour(settable ? 'CountSetter with a typed field' : 'CountSetter', {
        min: 2, max: 6,
        mount: () => {
            const {reset} = bare(({value, set}) => <CountSetter label="count" n={value} min={2} max={6}
                onPlus={() => set(value + 1)} onMinus={() => set(value - 1)} onSet={settable ? set : undefined}/>, 3);
            const count = () => Number(document.querySelector('.count-setter-value')?.textContent);
            return {
                get plus() { return screen.getByRole('button', {name: /^(Povečaj število|Increase count)$/}); },
                get minus() { return screen.getByRole('button', {name: /^(Zmanjšaj število|Decrease count)$/}); },
                get field() { return settable ? spin() : undefined; },
                read: settable ? model : count, reset,
            };
        },
    });
}
