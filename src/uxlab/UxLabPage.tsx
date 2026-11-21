import {Link} from 'react-router-dom';
import './UxLabPage.css';

interface Prototype {
    id: string;
    name: string;
    idea: string;
    generalizes: string;
    links: {label: string; to: string}[];
    try?: string;
}

/** Best first. Deep links open the lesson with the prototype switched on; the same link without `ux` is today's app. */
const PROTOTYPES: Prototype[] = [
    {
        id: 'b1',
        name: 'Prehodi: graf se premakne, ne preskoči',
        idea: 'Ko greš naprej ali nazaj, graf zdrsne iz prejšnjega prizora v novega: točke drsijo, parametri se zvezno spremenijo, novi elementi se narišejo kot s kredo, stari zbledijo. Učenec vidi, kaj se je spremenilo, namesto da išče razliko med dvema slikama.',
        generalizes: 'Deluje na ravni posnetkov stanja (captureState/restoreState), ki jih ima vsak graf z lekcijo: interpolira vsa števila, diskretne izbire preklopi. Brez kode na lekcijo.',
        try: 'Pritisni Naprej in opazuj graf.',
        links: [
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?learn=1&ux=b1'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?learn=1&ux=b1'},
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?learn=1&ux=b1'},
        ],
    },
];

export function UxLabPage() {
    return <main className="uxlab">
        <header className="uxlab-head">
            <p className="uxlab-kicker">UX laboratorij · pas B</p>
            <h1>Ko se zasveti</h1>
            <p className="uxlab-lede">Prototipi, ki izhajajo iz učenčeve glave: trenutek, ko nekaj klikne, kako lekcija pripelje do njega, kako učenec ve, da razume, in kako si zapomni še čez teden dni. Vsak prototip vklopi zastavica <code>?ux=</code>; ista povezava brez nje je današnja aplikacija.</p>
        </header>
        <ol className="uxlab-list">
            {PROTOTYPES.map((prototype, index) => <li key={prototype.id} className="uxlab-card">
                <div className="uxlab-card-head">
                    <span className="uxlab-rank">{index + 1}</span>
                    <h2>{prototype.name}</h2>
                    <code className="uxlab-flag">ux={prototype.id}</code>
                </div>
                <p>{prototype.idea}</p>
                <p className="uxlab-why"><strong>Zakaj velja splošno.</strong> {prototype.generalizes}</p>
                {prototype.try && <p className="uxlab-try">{prototype.try}</p>}
                <ul className="uxlab-links">
                    {prototype.links.map(link => <li key={link.to}>
                        <Link to={link.to} reloadDocument>{link.label}</Link>
                        <Link className="uxlab-compare" to={link.to.replace(/[?&]ux=[^&]*/, '').replace(/\?$/, '')} reloadDocument>brez</Link>
                    </li>)}
                </ul>
            </li>)}
        </ol>
    </main>;
}
