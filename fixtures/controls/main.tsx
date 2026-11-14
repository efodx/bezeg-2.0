/**
 * Test-only rendered fixture of every shared control (docs/specs/shared-graph-controls.md decision 25). Served by the Vite dev
 * server at /bezeg-2.0/fixtures/controls/ and absent from the production build. It renders the real components from
 * src/inputs/ with the app's CSS, in the wrapper classes of the workspace inspector, once as Edit and once as Display.
 * `?lang=en` selects English.
 */
import React, {useEffect, useRef, useState} from 'react';
import ReactDOM from 'react-dom/client';
import '../../src/index.css';
import '../../src/inputs/controlTokens.css';
import '../../src/inputs/ControlRow.css';
import '../../src/bootstrap-overrides.scss';
import '../../src/App.css';
import '../../src/graphs/base/DemonstrationWorkspace.css';
import '../../src/graphs/base/WorkspaceControls.css';
import '../../src/graphs/base/DemonstrationWorkspaceIdentity.css';
import './fixture.css';
import {BooleanField} from '../../src/inputs/BooleanField';
import {ChoiceSelect} from '../../src/inputs/ChoiceSelect';
import {CountSetter} from '../../src/inputs/CountSetter';
import {InspectorDisclosure} from '../../src/inputs/InspectorDisclosure';
import {NumberGrid} from '../../src/inputs/NumberGrid';
import {NumberInput} from '../../src/inputs/NumberInput';
import {PointCollection} from '../../src/inputs/PointCollection';
import {PointListInput, type PointRow, type PointRow3} from '../../src/inputs/PointListInput';
import Slider from '../../src/inputs/Slider';
import {UnavailableButton} from '../../src/inputs/UnavailableButton';
import {setLanguage, useT, type Language} from '../../src/localization';

const params = new URLSearchParams(window.location.search);
const lang: Language = params.get('lang') === 'en' ? 'en' : 'sl';
setLanguage(lang);

/** Fixture-only strings (no catalog keys exist for them), in both languages. */
const text = {
    sl: {
        longLabel: 'Zelo dolga oznaka nastavitve, ki mora v ozki plošči preiti v več vrstic brez izrezanega besedila',
        longWord: 'Samodejnoprilagajanjeparametrizacijekrivuljnapredstavitvenemzaslonu',
        help: 'Kratka pomoč pod nastavitvijo; pojasni, kaj nastavitev spremeni na grafu in kdaj.',
        reason: 'Trenutno ni na voljo, ker graf še nima dovolj točk za to nastavitev.',
        refusal: 'Vrednost je zavrnjena: mora biti med 2 in 9, zato je ostala nespremenjena.',
        optionA: 'Prva možnost',
        optionB: 'Druga možnost z daljšim imenom',
        optionC: 'Tretja možnost',
        count: 'Število kontrolnih točk krivulje',
        button: 'Dolgo ime gumba, ki ni na voljo zaradi razloga',
        ordinary: 'Navaden gumb',
        edit: 'Urejanje',
        display: 'Prikaz',
        group: 'Skupina nastavitev',
        bounded: 'Omejena vrednost',
        status: 'Razlog pritisnjenega gumba',
        points: 'Točke',
        pointsLong: 'Zelo dolga oznaka zbirke kontrolnih točk, ki mora v ozki plošči preiti v več vrstic',
        pointName: 'Točka',
        matrix: 'Matrika A',
        knots: 'Vozel',
    },
    en: {
        longLabel: 'A very long setting label that has to wrap onto several lines in the narrow panel without any clipped text',
        longWord: 'Autoparameterisationofcurvesonthepresentationscreenwithoutbreaks',
        help: 'A short help text under the setting; it explains what the setting changes in the graph and when.',
        reason: 'Not available right now, because the graph does not have enough points for this setting yet.',
        refusal: 'Value refused: it must be between 2 and 9, so it was left unchanged.',
        optionA: 'First option',
        optionB: 'Second option, a longer name',
        optionC: 'Third option',
        count: 'Number of curve control points',
        button: 'A long button name that is unavailable for a reason',
        ordinary: 'Ordinary button',
        edit: 'Editing',
        display: 'Display',
        group: 'Settings group',
        bounded: 'Bounded value',
        status: 'Reason of the pressed button',
        points: 'Points',
        pointsLong: 'A very long label of the collection of control points that has to wrap onto several lines in the narrow panel',
        pointName: 'Point',
        matrix: 'Matrix A',
        knots: 'Knot',
    },
}[lang];

const noop = () => undefined;
/** A model that refuses every in-range value, so the controls show their refusal hint. */
const refuse = () => false;

/** Types a value into a number field and presses Enter, the way a user would, so a refusal hint is shown on load. */
function enter(input: HTMLInputElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    input.focus();
    setter.call(input, value);
    input.dispatchEvent(new Event('input', {bubbles: true}));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
    input.blur();
}

/** One column of controls. The same set is shown in both placements. */
function ControlSet({placement}: {placement: 'edit' | 'display'}) {
    const t = useT();
    const root = useRef<HTMLDivElement>(null);
    const [on, setOn] = useState(true);
    const [off, setOff] = useState(false);
    const [choice, setChoice] = useState('b');
    const [number, setNumber] = useState(4);
    const [slider, setSlider] = useState(0.5);
    const [count, setCount] = useState(3);
    const [blocked, setBlocked] = useState<string>();
    const [rows, setRows] = useState<PointRow[]>([[0, 0], [2.5, 1], [4, -3]]);
    const [selected, setSelected] = useState<number | undefined>(1);
    const [cube, setCube] = useState<PointRow3[]>([[1, 2, 3], [4, 5, 6]]);
    const [points, setPoints] = useState(3);
    const [addMode, setAddMode] = useState(true);
    const p = `${placement}-`;

    useEffect(() => {
        const el = root.current!;
        // Refusal hints on load, after the first commit (a discrete event dispatched inside an effect is not flushed until the
        // effect ends, so a typed draft would be stale): a rejected number, a rejected slider value, a press at the count's
        // lower bound, a blocked button.
        const timer = window.setTimeout(() => {
            enter(el.querySelector<HTMLInputElement>('[data-fixture="number-refused"] input')!, '5');
            enter(el.querySelector<HTMLInputElement>('[data-fixture="slider-refused"] input[role="spinbutton"]')!, '0.7');
            el.querySelector<HTMLButtonElement>('[data-fixture="count-min"] .count-setter-button')!.click();
            el.querySelector<HTMLButtonElement>('[data-fixture="blocked-button"]')!.click();
            enter(el.querySelector<HTMLInputElement>('[data-fixture="entry-refused"] input')!, '99');
            el.querySelector<HTMLButtonElement>('[data-fixture="list-min"] .point-list-remove')!.click();
            el.querySelector<HTMLButtonElement>('[data-fixture="collection-selected"] .point-collection-buttons button:nth-child(2)')!.click();
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    return <div ref={root} data-placement={placement}>
        <div className="inspector-group">
            <h3>{text.group}</h3>
            <div className="inspector-control"><BooleanField variant="switch" checked={on} onChange={setOn} label={t('display')} help={text.help}/></div>
            <div className="inspector-control"><BooleanField variant="switch" checked={off} onChange={setOff} label={text.longLabel} help={text.help}/></div>
            <div className="inspector-control"><BooleanField variant="checkbox" checked={on} onChange={setOn} label={text.longWord}/></div>
            <div className="inspector-control"><BooleanField variant="checkbox" checked={off} onChange={setOff} label={text.longLabel} help={text.help}/></div>
            <div className="inspector-control"><BooleanField variant="switch" checked={off} onChange={noop} label={text.bounded} unavailableReason={text.reason}/></div>
            <div className="inspector-control"><BooleanField variant="switch" checked={on} onChange={noop} label={text.bounded} disabled describedBy={`${p}bool-reason`}/>
                <p id={`${p}bool-reason`} className="inspector-help">{text.reason}</p></div>
        </div>
        <div className="inspector-group">
            <h3>{t('coordinate_system')}</h3>
            <div className="inspector-control"><ChoiceSelect label={text.longLabel} value={choice} onChange={setChoice} help={text.help}
                options={[{value: 'a', text: text.optionA}, {value: 'b', text: text.optionB}, {value: 'c', text: text.optionC, disabled: true}]}/></div>
            <div className="inspector-control"><NumberInput label={text.longLabel} value={number} onChange={setNumber} min={2} max={9} step={1} help={text.help}/></div>
            <div className="inspector-control" data-fixture="number-refused"><NumberInput label={text.bounded} value={number} onChange={refuse} min={2} max={9} step={1} rejectedHint={text.refusal}/></div>
            <div className="inspector-control"><NumberInput label={text.longWord} value={number} onChange={setNumber} unavailableReason={text.reason}/></div>
            <div className="inspector-control"><NumberInput label={text.bounded} value={number} onChange={setNumber} disabled/></div>
        </div>
        <div className="inspector-group">
            <h3>{t('element_sizes')}</h3>
            <Slider min={0} max={10} step={1} value={slider * 10} onChange={noop} customText="a"/>
            <Slider min={0} max={10} step={1} value={slider * 10} onChange={noop} customText="b"/>
            <div className="inspector-control"><Slider min={0} max={1} step={0.05} value={slider} onChange={setSlider} customText={text.longLabel} help={text.help}/></div>
            <div className="inspector-control" data-fixture="slider-refused"><Slider min={0} max={1} step={0.05} value={slider} onChange={refuse} customText={text.bounded} rejectedHint={text.refusal}/></div>
            <div className="inspector-control"><Slider min={0} max={1} step={0.05} value={slider} onChange={noop} customText={text.bounded} disabled help={text.reason}/></div>
            <div className="inspector-control"><CountSetter label={text.count} n={count} min={2} max={9} onPlus={() => setCount(count + 1)} onMinus={() => setCount(count - 1)} onSet={setCount} help={text.help}/></div>
            <div className="inspector-control" data-fixture="count-min"><CountSetter label={text.count} n={2} min={2} max={9} onPlus={noop} onMinus={noop} minReason={text.reason}/></div>
        </div>
        <div className="inspector-group" data-fixture="playback-rows">
            <div className="inspector-playback" data-playback-row="3"><button type="button" className="btn">▶</button><button type="button" className="btn">1</button><button type="button" className="btn">2</button></div>
            <div className="inspector-playback" data-playback-row="4"><button type="button" className="btn">1</button><button type="button" className="btn">2</button><button type="button" className="btn">3</button><button type="button" className="btn">4</button></div>
        </div>
        <div className="inspector-group">
            <h3>{text.points}</h3>
            <div className="inspector-control" data-fixture="list-min">
                <PointListInput title={text.pointsLong} points={rows} pointLabel={i => `${text.pointName} ${i + 1}`} min={-10} max={10} minCount={3}
                    onCommit={(i, value) => { setRows(rows.map((row, at) => at === i ? value : row)); }}
                    onRemove={index => setRows(rows.filter((_, at) => at !== index))} selected={selected} onSelect={setSelected}/>
            </div>
            <div className="inspector-control">
                <PointListInput title={text.group} points={cube} axisLabels={['x', 'y', 'z']} pointLabel={i => `${text.pointName} ${i + 1}`} min={-10} max={10} grid={0.5}
                    onCommit={(i, value) => { setCube(cube.map((row, at) => at === i ? value : row)); }}/>
            </div>
            <div className="inspector-control" data-fixture="number-grid-matrix">
                <NumberGrid label={text.matrix} columns={2}
                    cells={[1, 0.5, -2, 4].map((value, at) => ({label: `${text.matrix} ${at + 1}`, value, onChange: noop, min: -4, max: 4, step: 0.25}))}/>
            </div>
            <div className="inspector-control" data-fixture="number-grid-wrap">
                <NumberGrid label={text.knots} columns="wrap" help={text.help}
                    cells={[0, 0, 0, 0.25, 0.5, 0.75, 1].map((value, at) => ({label: `${text.knots} ${at}`, value, onChange: noop, decimals: 3, step: 0.01}))}/>
            </div>
            <div className="inspector-control">
                <PointCollection label={text.pointsLong} count={points} min={2} max={6} onAdd={() => setPoints(points + 1)}
                    removal={{kind: 'last', onRemove: () => setPoints(points - 1)}} addMode={{on: addMode, onToggle: () => setAddMode(!addMode)}}/>
            </div>
            <div className="inspector-control">
                <PointCollection label={text.points} count={2} min={2} max={2} onAdd={noop} removal={{kind: 'last', onRemove: noop}}/>
            </div>
            <div className="inspector-control" data-fixture="collection-selected">
                <PointCollection label={text.points} count={4} min={0} max={8} onAdd={noop} onClear={noop}
                    removal={{kind: 'selected', onRemove: noop, hasSelection: false}}/>
            </div>
            <div className="inspector-control" data-fixture="entry-refused">
                <PointCollection label={text.pointsLong} count={3} min={0} max={8} onAdd={noop} onClear={noop}
                    removal={{kind: 'selected', onRemove: noop, hasSelection: true}} typedEntry={{axisLabels: ['x', 'y'], min: -10, max: 10, grid: 0.5}}/>
            </div>
        </div>
        <div className="inspector-group">
            <h3>{text.status}</h3>
            <div className="inspector-control btn-group">
                <UnavailableButton className="btn" data-fixture="blocked-button" reason={text.reason} onPress={noop} onBlockedPress={setBlocked}>{text.button}</UnavailableButton>
                <UnavailableButton className="btn" onPress={noop}>{text.ordinary}</UnavailableButton>
            </div>
            <p className="inspector-help" role="status" data-fixture="blocked-status">{blocked}</p>
            <InspectorDisclosure title={text.longLabel}><p className="inspector-help">{text.help}</p></InspectorDisclosure>
        </div>
    </div>;
}

function Inspector({placement, label}: {placement: 'edit' | 'display'; label: string}) {
    return <aside className="workspace-inspector" aria-label={label} data-testid={`inspector-${placement}`}>
        <div className="inspector-toolbar"><div className="inspector-heading"><div><h2>{label}</h2></div></div></div>
        <div className="fixture-content" id={placement === 'edit' ? 'inspector-content' : undefined}>
            <section id={`inspector-${placement}`} aria-label={label}>
                {placement === 'display' ? <div className="inspector-display-graph"><ControlSet placement={placement}/></div> : <ControlSet placement={placement}/>}
            </section>
        </div>
    </aside>;
}

function Fixture() {
    return <main className="demonstration-workspace fixture-workspace">
        <Inspector placement="edit" label={text.edit}/>
        <Inspector placement="display" label={text.display}/>
    </main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Fixture/>);
