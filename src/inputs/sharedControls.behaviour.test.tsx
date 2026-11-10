/** The shared behaviour test (spec acceptance 3) against the bare shared controls; real graphs: `graphs/base/sharedControls.graphs.test.tsx`. */
import React, {useState} from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {NumberInput} from './NumberInput';
import Slider from './Slider';
import {CountSetter} from './CountSetter';
import {PointListInput} from './PointListInput';
import {PointCollection} from './PointCollection';
import {countSetterBehaviour, numericFieldBehaviour, pointCollectionBehaviour, pointListBehaviour, sliderBehaviour} from './sharedControlBehaviour';

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
    min: 0, max: 100, step: 1, valid: 50, outOfRange: 101, integer: true,
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

/** The point controls on the bare components. Real graphs (P3 to P5) mount the same helpers from `graphs/base/points/`. */
const rowsIn = (rows: number, start: number): (readonly [number, number])[] => Array.from({length: rows}, (_, i) => [start + i, 0] as const);

function bareList(props: {withSelection: boolean; minCount: number}) {
    let generation = 0;
    const Wrapper = () => {
        const [points, setPoints] = useState<(readonly [number, number])[]>(rowsIn(3, 1));
        const [selected, setSelected] = useState<number>();
        return <PointListInput points={points} title="points" pointLabel={i => `P${i + 1}`} min={0} max={100}
            onCommit={(i, value) => { setPoints(points.map((p, at) => at === i ? value : p)); }}
            onRemove={index => setPoints(points.filter((_, at) => at !== index))} minCount={props.minCount}
            selected={props.withSelection ? selected : undefined} onSelect={props.withSelection ? setSelected : undefined}/>;
    };
    const view = render(<Wrapper key={generation}/>);
    return {
        get field() { return screen.getByRole('spinbutton', {name: 'P1, x'}); },
        read: () => Number(screen.getByRole('spinbutton', {name: 'P1, x'}).getAttribute('aria-valuenow')),
        reset: () => view.rerender(<Wrapper key={++generation}/>),
        rows: () => document.querySelectorAll('.point-list-row').length,
        removeButtons: () => screen.getAllByRole('button', {name: /^(Odstrani|Remove)/}),
        selectButtons: props.withSelection ? () => screen.getAllByRole('button', {name: /^Izberi: P\d$/}) : undefined,
    };
}

for (const withSelection of [false, true]) {
    pointListBehaviour(withSelection ? 'PointListInput with selection' : 'PointListInput', {
        min: 0, max: 100, step: 1, valid: 50, outOfRange: 101, minCount: 1,
        mount: () => bareList({withSelection, minCount: 1}),
    });
}

pointListBehaviour('PointListInput without a count bound', {
    min: 0, max: 100, step: 1, valid: 50, outOfRange: 101,
    mount: () => bareList({withSelection: false, minCount: 0}),
});

for (const kind of ['last', 'selected'] as const) {
    for (const axes of [['x', 'y'], ['x']] as const) {
        pointCollectionBehaviour(`PointCollection, remove ${kind}, ${axes.length} axes`, {
            min: 1, max: 4,
            entry: {min: 0, max: 10, step: 1, valid: 5, outOfRange: 11},
            mount: () => {
                let generation = 0;
                let added: readonly number[] | undefined;
                const hasSelection = {value: false};
                const Wrapper = () => {
                    const [count, setCount] = useState(2);
                    const [selection, setSelection] = useState(false);
                    hasSelection.value = selection;
                    // The control in a graph: the component never decides the count, the graph does.
                    return <div>
                        <PointCollection label="points" count={count} min={1} max={4}
                            onAdd={at => { added = at; setCount(count + 1); }}
                            removal={kind === 'last' ? {kind, onRemove: () => setCount(count - 1)}
                                : {kind, hasSelection: selection, onRemove: () => setCount(count - 1)}}
                            typedEntry={{axisLabels: axes, min: 0, max: 10}}/>
                        <button type="button" data-select onClick={() => setSelection(true)}>select</button>
                    </div>;
                };
                const view = render(<Wrapper key={generation}/>);
                const counter = () => kind === 'last'
                    ? Number(document.querySelector('.count-setter-value')?.textContent)
                    : Number(/\d+/.exec(document.querySelector('.point-collection-count')?.textContent ?? '')?.[0]);
                return {
                    get add() { return kind === 'last' ? screen.getByRole('button', {name: /^(Povečaj število|Increase count)$/}) : screen.getByRole('button', {name: /^(Dodaj točko|Add point)$/}); },
                    get remove() { return kind === 'last' ? screen.getByRole('button', {name: /^(Zmanjšaj število|Decrease count)$/}) : screen.getByRole('button', {name: /^(Odstrani izbrano točko|Remove selected point)$/}); },
                    read: counter,
                    select: kind === 'selected' ? () => { fireEvent.click(document.querySelector('[data-select]')!); } : undefined,
                    entryFields: () => screen.getAllByRole('spinbutton'),
                    get addAt() { return screen.getByRole('button', {name: /^(Dodaj na koordinatah|Add at these coordinates)$/}); },
                    lastAddedAt: () => added,
                    reset: () => { added = undefined; view.rerender(<Wrapper key={++generation}/>); },
                };
            },
        });
    }
}
