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
        id: 'b4',
        name: 'Ujemi obliko: izziv, ki ga ne moreš nehati igrati',
        idea: 'Trenutni prizor postane vijolična tarča, graf pa se strese v bližnji veljaven prizor. Z vlečenjem točk ali drsniki ga pripelješ nazaj; merilnik kaže ujemanje, ob zadetku zacveti bezeg in niz se podaljša, z nizom pa raste število premaknjenih parametrov.',
        generalizes: 'Tresljaj nastane iz posnetka stanja (točke premakne kot celoto, parametre pomnoži), tarča in ujemanje pa iz vzorčenja SVG-krivulj plošče. Deluje v prostem raziskovanju in v okvirjih za opazovanje vsake lekcije; namig in rešitev uporabljata prehode iz b1.',
        try: 'Pritisni »Izziv: ujemi obliko« spodaj desno na grafu.',
        links: [
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?ux=b4'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b4'},
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?ux=b4'},
        ],
    },
    {
        id: 'b3',
        name: 'Sledi: vidiš celo družino krivulj',
        idea: 'Ko vlečeš točko ali premikaš drsnik, prejšnje lege vseh krivulj ostanejo na grafu kot bledeče sledi, kot čebulni papir pri risani animaciji. Začetna oblika ostane črtkana, z »Ohrani sledi« pa učitelj pusti celo pahljačo na tabli.',
        generalizes: 'Posluša posodobitve plošče JSXGraph med učenčevo interakcijo in klonira narisane krivulje; ne pozna nobenega grafa posebej.',
        try: 'Primi točko ali drsnik in ga premikaj.',
        links: [
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?ux=b3'},
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?ux=b3'},
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?ux=b3'},
        ],
    },
    {
        id: 'b5',
        name: 'Vrt spomina: čez teden dni še veš',
        idea: 'Vsak okvir za opazovanje, ki ga obiščeš, posadi seme. Spomin se vrne po 1, 3, 7, 16 in 35 dneh: lekcija se odpre točno v tistem prizoru, vprašanje čaka, odgovor odkriješ sam in oceniš, koliko si vedel; z vsakim priklicem se odpre en cvet bezgovega kobula.',
        generalizes: 'Kartica je le kazalec na okvir lekcije (pot, lekcija, korak, okvir); prizor zgradi lekcija sama, vprašanje in odgovor pa sta njen poziv in pričakovana opažanja. Vse ostane v brskalniku. Časovni stroj (+1 dan, +1 teden) pokaže razmike takoj.',
        try: 'Na vrtu pritisni »Posadi primere«, nato »Ponovi zdaj«.',
        links: [
            {label: 'Vrt spomina', to: '/bezeg-2.0/ux-lab/spomin'},
            {label: 'Bézier: lekcija, ki sadi', to: '/bezeg-2.0/bezier/curve?learn=1&ux=b5'},
            {label: 'Funkcije: lekcija, ki sadi', to: '/bezeg-2.0/functions/transformations?learn=1&ux=b5'},
        ],
    },
    {
        id: 'b2',
        name: 'Napoved: najprej nariši, potem poglej',
        idea: 'Preden lekcija spremeni graf, ga zadrži v starem stanju, razlago zamegli in vpraša: kaj se bo zgodilo? Učenec s prstom nariše napoved, nato se resnica zvezno pripelje na graf, njegova črta ostane kot črtkana sled z oceno ujemanja.',
        generalizes: 'Napoved se sproži sama ob vsakem prehodu, ki spremeni graf, in se oceni z vzorčenjem spremenjenih SVG-elementov plošče; ni ročno pripravljenih vprašanj. Vključuje prehode iz b1.',
        try: 'Pritisni Naprej; ko se pojavi »Napoved«, nariši na graf in pritisni Pokaži.',
        links: [
            {label: 'Funkcije: transformacije', to: '/bezeg-2.0/functions/transformations?learn=1&ux=b2'},
            {label: 'Trikotnik: Eulerjeva premica', to: '/bezeg-2.0/euler-line?learn=1&ux=b2'},
            {label: 'Bézier: krivulja', to: '/bezeg-2.0/bezier/curve?learn=1&ux=b2'},
        ],
    },
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
