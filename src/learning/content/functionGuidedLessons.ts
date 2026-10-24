/**
 * Guided lessons of the Functions and calculus family (ADR 0007, docs/specs/function-concepts.md).
 * Each later concept appends its lesson to `functionGuidedLessons` and its id to GUIDED_LESSON_AVAILABLE_IDS.
 */
import type {FunctionParameterName} from '../model';
import type {GuidedLesson, GuidedLessonFrame, GuidedLessonFrameKind, LocalizedText, SceneAction} from './guidedLessons';

const text = (sl: string, en: string): LocalizedText => ({sl, en});
const frame = (id: string, kind: GuidedLessonFrameKind): GuidedLessonFrame => ({id, kind});
const parameter = (name: FunctionParameterName, value: number): SceneAction => ({name: 'set-function-parameter', value: {name, value}});

const linearFunction: GuidedLesson = {
    demonstrationId: 'linear-function',
    title: text('Linearna funkcija', 'Linear function'),
    summary: text(
        'Linearna funkcija \\(y=kx+n\\) ima za graf premico: naklon \\(k\\) pove, kako hitro \\(y\\) narašča ali pada, začetna vrednost \\(n\\) pa, kje premica seka os \\(y\\).',
        'A linear function \\(y=kx+n\\) has a line as its graph: the slope \\(k\\) tells how fast \\(y\\) rises or falls, and the intercept \\(n\\) tells where the line crosses the \\(y\\)-axis.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje koordinatnega sistema in odčitavanja koordinat točke.', 'Assumes familiarity with the coordinate plane and reading the coordinates of a point.'),
        text('Priporočeno je, da veš, da funkcija vsakemu \\(x\\) priredi en sam \\(y\\).', 'It helps to know that a function assigns a single \\(y\\) to every \\(x\\).'),
    ],
    learningGoals: [
        text('Iz dveh točk izračunaš naklon \\(k=\\Delta y/\\Delta x\\) in začetno vrednost \\(n\\).', 'Compute the slope \\(k=\\Delta y/\\Delta x\\) and the intercept \\(n\\) from two points.'),
        text('Po predznaku \\(k\\) ugotoviš, ali funkcija narašča, je konstantna ali pada.', 'Use the sign of \\(k\\) to decide whether the function rises, is constant or falls.'),
        text('Razložiš, zakaj navpična premica ni graf funkcije in nima naklona.', 'Explain why a vertical line is not the graph of a function and has no slope.'),
    ],
    formulaBlocks: [
        {
            id: 'linear-function-form',
            latex: 'y=kx+n',
            notation: text(
                'Število \\(k\\) je naklon, število \\(n\\) pa začetna vrednost: pri \\(x=0\\) je \\(y=n\\).',
                'The number \\(k\\) is the slope and \\(n\\) is the intercept: at \\(x=0\\) we get \\(y=n\\).',
            ),
            explanation: text(
                'Vsakemu \\(x\\) pripada natanko en \\(y\\), zato je to res funkcija; njen graf je premica.',
                'Every \\(x\\) has exactly one \\(y\\), so this is a function; its graph is a line.',
            ),
        },
        {
            id: 'linear-slope',
            latex: 'k=\\frac{\\Delta y}{\\Delta x}=\\frac{y_2-y_1}{x_2-x_1},\\qquad x_1\\ne x_2',
            notation: text(
                '\\(\\Delta x=x_2-x_1\\) je vodoravni krak trikotnika, \\(\\Delta y=y_2-y_1\\) pa navpični.',
                '\\(\\Delta x=x_2-x_1\\) is the horizontal leg of the triangle and \\(\\Delta y=y_2-y_1\\) the vertical leg.',
            ),
            explanation: text(
                'Naklon je kvocient krakov: za vsako enoto v desno se \\(y\\) spremeni za \\(k\\).',
                'The slope is the ratio of the legs: for every unit to the right, \\(y\\) changes by \\(k\\).',
            ),
        },
        {
            id: 'linear-intercept',
            latex: 'n=y_1-kx_1,\\qquad f(0)=n',
            notation: text(
                'Ko poznaš \\(k\\), dobiš \\(n\\) iz katere koli točke na premici.',
                'Once you know \\(k\\), you get \\(n\\) from any point on the line.',
            ),
            explanation: text(
                'Premica seka os \\(y\\) v točki \\((0,n)\\), ki je na grafu označena.',
                'The line crosses the \\(y\\)-axis at \\((0,n)\\), which is marked on the graph.',
            ),
        },
        {
            id: 'linear-vertical',
            latex: 'x_1=x_2\\;\\Longrightarrow\\;\\Delta x=0,\\qquad x=x_1',
            notation: text(
                'Pri \\(\\Delta x=0\\) kvocient \\(\\Delta y/\\Delta x\\) ni definiran.',
                'For \\(\\Delta x=0\\) the quotient \\(\\Delta y/\\Delta x\\) is not defined.',
            ),
            explanation: text(
                'Premica \\(x=c\\) je navpična; ima več točk z istim \\(x\\), zato ni graf funkcije.',
                'The line \\(x=c\\) is vertical; it has several points with the same \\(x\\), so it is not the graph of a function.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'linear-two-points',
            title: text('Premica skozi \\(P_1(0,1)\\) in \\(P_2(2,5)\\)', 'The line through \\(P_1(0,1)\\) and \\(P_2(2,5)\\)'),
            calculationLatex: 'k=\\frac{5-1}{2-0}=\\frac42=2,\\qquad n=y_1-kx_1=1-2\\cdot0=1',
            resultLatex: 'y=2x+1',
            check: text(
                'Odčitka \\(k\\) in \\(n\\) v inspektorju se ujemata z izračunom; pri \\(x=2\\) dobimo \\(2\\cdot2+1=5\\), kar je \\(y\\)-koordinata točke \\(P_2\\).',
                'The readouts of \\(k\\) and \\(n\\) in the inspector match the calculation; at \\(x=2\\) we get \\(2\\cdot2+1=5\\), the \\(y\\)-coordinate of \\(P_2\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'linear-line-through-points', order: 1,
            title: text('Premica skozi dve točki', 'A line through two points'),
            purpose: text('Spoznati, da dve točki določata premico in enačbo \\(y=kx+n\\).', 'Seeing that two points determine a line and the equation \\(y=kx+n\\).'),
            explanation: text(
                'Linearna funkcija ima enačbo \\(y=kx+n\\), njen graf pa je premica. Premico določata dve točki z različnima koordinatama \\(x\\): premakni \\(P_1\\) in \\(P_2\\) ter opazuj, kako premica sledi točkama.',
                'A linear function has the equation \\(y=kx+n\\), and its graph is a line. Two points with different \\(x\\)-coordinates determine the line: move \\(P_1\\) and \\(P_2\\) and watch the line follow them.',
            ),
            formulaIds: ['linear-function-form'], learnerInteraction: 'drag-control-point',
            frames: [frame('linear-line-through-points-explanation', 'explanation'), frame('linear-line-through-points-observation', 'observation')],
            observationPrompt: text(
                'Premakni točko \\(P_1\\) in opazuj, kaj se zgodi s premico in z enačbo na grafu.',
                'Move point \\(P_1\\) and observe what happens to the line and to the equation on the graph.',
            ),
            expectedObservations: [text(
                'Premica vedno poteka skozi obe točki, enačba na grafu pa se spreminja skupaj z njima.',
                'The line always passes through both points, and the equation on the graph changes along with them.',
            )],
            scene: {
                id: 'linear-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Točki \\(P_1(0,1)\\) in \\(P_2(2,5)\\) določata premico \\(y=2x+1\\).',
                    'The points \\(P_1(0,1)\\) and \\(P_2(2,5)\\) determine the line \\(y=2x+1\\).',
                ),
            },
        },
        {
            id: 'linear-slope-triangle', order: 2,
            title: text('Naklon \\(k\\) iz trikotnika', 'The slope \\(k\\) from the triangle'),
            purpose: text('Izračunati naklon kot kvocient krakov trikotnika.', 'Computing the slope as the ratio of the legs of the triangle.'),
            explanation: text(
                'Naklon pove, za koliko se \\(y\\) spremeni, ko se \\(x\\) poveča za 1. Iz točk ga izračunamo kot kvocient krakov črtkanega trikotnika, \\(k=\\Delta y/\\Delta x\\).',
                'The slope tells how much \\(y\\) changes when \\(x\\) grows by 1. From two points we compute it as the ratio of the legs of the dashed triangle, \\(k=\\Delta y/\\Delta x\\).',
            ),
            formulaIds: ['linear-slope'], workedExampleId: 'linear-two-points', learnerInteraction: 'observe',
            frames: [frame('linear-slope-triangle-explanation', 'explanation'), frame('linear-slope-triangle-calculation', 'calculation'), frame('linear-slope-triangle-observation', 'observation')],
            observationPrompt: text(
                'Odčitaj \\(\\Delta x\\) in \\(\\Delta y\\) s trikotnika ter ju deli.',
                'Read \\(\\Delta x\\) and \\(\\Delta y\\) off the triangle and divide them.',
            ),
            expectedObservations: [text(
                'Dobiš \\(\\Delta x=2\\) in \\(\\Delta y=4\\), zato je \\(k=4/2=2\\), kar se ujema z odčitkom \\(k\\).',
                'You get \\(\\Delta x=2\\) and \\(\\Delta y=4\\), so \\(k=4/2=2\\), which matches the readout of \\(k\\).',
            )],
            scene: {
                id: 'linear-slope-example', basedOn: 'demonstration-default',
                actions: [parameter('x1', 0), parameter('y1', 1), parameter('x2', 2), parameter('y2', 5)],
                expectedState: text(
                    'Trikotnik s krakoma \\(\\Delta x=2\\) in \\(\\Delta y=4\\) je narisan med \\(P_1(0,1)\\) in \\(P_2(2,5)\\).',
                    'The triangle with legs \\(\\Delta x=2\\) and \\(\\Delta y=4\\) is drawn between \\(P_1(0,1)\\) and \\(P_2(2,5)\\).',
                ),
            },
        },
        {
            id: 'linear-intercept-step', order: 3,
            title: text('Začetna vrednost \\(n\\)', 'The intercept \\(n\\)'),
            purpose: text('Povezati \\(n\\) s presečiščem premice z osjo \\(y\\).', 'Linking \\(n\\) with the point where the line crosses the \\(y\\)-axis.'),
            explanation: text(
                'Pri \\(x=0\\) je \\(y=n\\), zato premica seka os \\(y\\) v točki \\((0,n)\\). Če spremeniš \\(n\\) in pustiš \\(k\\), se premica vzporedno premakne gor ali dol, točki pa obdržita svoji koordinati \\(x\\).',
                'At \\(x=0\\) we get \\(y=n\\), so the line crosses the \\(y\\)-axis at \\((0,n)\\). If you change \\(n\\) and keep \\(k\\), the line shifts up or down in parallel while the points keep their \\(x\\)-coordinates.',
            ),
            formulaIds: ['linear-intercept'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('linear-intercept-step-explanation', 'explanation'), frame('linear-intercept-step-observation', 'observation')],
            observationPrompt: text(
                'Poišči označeno točko na osi \\(y\\) in primerjaj njeno višino z odčitkom \\(n\\).',
                'Find the marked point on the \\(y\\)-axis and compare its height with the readout of \\(n\\).',
            ),
            expectedObservations: [text(
                'Premica seka os \\(y\\) v točki \\((0,-2)\\), naklon pa ostane \\(k=2\\).',
                'The line crosses the \\(y\\)-axis at \\((0,-2)\\) while the slope stays \\(k=2\\).',
            )],
            scene: {
                id: 'linear-intercept-minus-two', basedOn: 'demonstration-default',
                actions: [parameter('n', -2)],
                expectedState: text(
                    'Premica \\(y=2x-2\\) poteka skozi \\(P_1(0,-2)\\) in \\(P_2(2,2)\\).',
                    'The line \\(y=2x-2\\) passes through \\(P_1(0,-2)\\) and \\(P_2(2,2)\\).',
                ),
            },
        },
        {
            id: 'linear-slope-sign', order: 4,
            title: text('Predznak naklona', 'The sign of the slope'),
            purpose: text('Po predznaku \\(k\\) razločiti naraščanje, konstantnost in padanje.', 'Telling rising, constant and falling lines apart by the sign of \\(k\\).'),
            explanation: text(
                'Pri \\(k>0\\) funkcija narašča, pri \\(k=0\\) je konstantna in pri \\(k<0\\) pada. Večja kot je vrednost \\(|k|\\), strmejša je premica.',
                'For \\(k>0\\) the function rises, for \\(k=0\\) it is constant and for \\(k<0\\) it falls. The larger \\(|k|\\) is, the steeper the line.',
            ),
            formulaIds: ['linear-slope'], learnerInteraction: 'drag-control-point',
            frames: [frame('linear-slope-sign-explanation', 'explanation'), frame('linear-slope-sign-observation', 'observation')],
            observationPrompt: text(
                'Premakni točko tako, da dobiš \\(k=0\\), nato pa še tako, da dobiš \\(k>0\\).',
                'Move a point so that \\(k=0\\), and then so that \\(k>0\\).',
            ),
            expectedObservations: [text(
                'Pri \\(k=0\\) imata točki enak \\(y\\) in je premica vodoravna; pri \\(k>0\\) premica narašča.',
                'For \\(k=0\\) both points have the same \\(y\\) and the line is horizontal; for \\(k>0\\) the line rises.',
            )],
            scene: {
                id: 'linear-slope-minus-half', basedOn: 'demonstration-default',
                actions: [parameter('k', -0.5)],
                expectedState: text(
                    'Pri naklonu \\(k=-\\tfrac12\\) premica pada: \\(P_1(0,1)\\) in \\(P_2(2,0)\\), vrednost \\(n=1\\) ostane.',
                    'The slope \\(k=-\\tfrac12\\) makes the line fall: \\(P_1(0,1)\\) and \\(P_2(2,0)\\), while \\(n=1\\) stays.',
                ),
            },
        },
        {
            id: 'linear-parallel-vertical', order: 5,
            title: text('Vzporedne in navpične premice', 'Parallel and vertical lines'),
            purpose: text('Vzporedne premice primerjati po naklonu in spoznati robni primer \\(\\Delta x=0\\).', 'Comparing parallel lines by slope and meeting the edge case \\(\\Delta x=0\\).'),
            explanation: text(
                'Vzporedni premici imata isti naklon \\(k\\) in se razlikujeta le v \\(n\\). Če imata točki isti \\(x\\), je \\(\\Delta x=0\\): premica je navpična z enačbo \\(x=c\\), naklona pa ni, ker z \\(0\\) ne smemo deliti. Navpična premica ni graf nobene funkcije.',
                'Parallel lines have the same slope \\(k\\) and differ only in \\(n\\). If the points have the same \\(x\\), then \\(\\Delta x=0\\): the line is vertical with the equation \\(x=c\\), and it has no slope because we must not divide by \\(0\\). A vertical line is not the graph of any function.',
            ),
            formulaIds: ['linear-vertical'], learnerInteraction: 'drag-control-point',
            frames: [frame('linear-parallel-vertical-explanation', 'explanation'), frame('linear-parallel-vertical-observation', 'observation')],
            observationPrompt: text(
                'Premakni \\(P_2\\) vodoravno stran od navpičnice in opazuj, kdaj spet dobiš naklon. Nato poskusi dobiti premico, vzporedno s prvotno.',
                'Move \\(P_2\\) sideways away from the vertical line and observe when the slope returns. Then try to get a line parallel to the original one.',
            ),
            expectedObservations: [text(
                'Takoj ko se koordinati \\(x\\) točk razlikujeta, je naklon spet določen; vzporedni premici imata enak \\(k\\).',
                'As soon as the \\(x\\)-coordinates of the points differ, the slope is defined again; parallel lines have equal \\(k\\).',
            )],
            scene: {
                id: 'linear-vertical-line', basedOn: 'demonstration-default',
                actions: [parameter('x1', 1), parameter('y1', -1), parameter('x2', 1), parameter('y2', 3)],
                expectedState: text(
                    'Točki imata isti \\(x=1\\): prikazana je navpična premica \\(x=1\\), naklon in \\(n\\) nista določena.',
                    'The points share \\(x=1\\): the vertical line \\(x=1\\) is shown, and neither the slope nor \\(n\\) is defined.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-lines',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Appendix B: Coordinate Geometry and Lines.',
            supports: ['slope as Δy/Δx', 'slope-intercept form', 'vertical lines have no slope', 'parallel lines have equal slopes'],
        },
        {
            id: 'efodx-line-graph',
            citation: 'Owner\'s earlier app: efodx.github.io, src/graphs line-graph (studied 2026-10-11).',
            supports: ['two draggable points', 'slope triangle with Δx and Δy', 'editable k and n'],
            implementationCorrespondence: 'Bezeg keeps the points, the triangle and the k and n controls, and represents a vertical line explicitly instead of reusing n as its x position.',
        },
        {
            id: 'bezeg-linear-implementation',
            citation: 'Bezeg source: src/analysis/linear.ts and src/graphs/functions/LinearFunctionGraph.tsx.',
            supports: ['line through two points', 'k and n readouts', 'vertical line reported as undefined slope', 'points keep their x when k or n change'],
        },
    ],
    edgeCases: [
        text(
            'Pri \\(x_1=x_2\\) je premica navpična: naklon in \\(n\\) nista določena, kontroli za \\(k\\) in \\(n\\) sta onemogočeni, odčitki pa nikoli ne pokažejo neskončnosti.',
            'For \\(x_1=x_2\\) the line is vertical: the slope and \\(n\\) are undefined, the controls for \\(k\\) and \\(n\\) are disabled, and the readouts never show infinity.',
        ),
        text(
            'Če točki sovpadata, ne določata premice; graf jo skrije in to sporoči.',
            'If the points coincide they do not determine a line; the graph hides it and says so.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj obravnava naklona začne s trikotnikom ali z neposrednim premikanjem točk.',
            'Before classroom-ready review, confirm whether the treatment of the slope should start with the triangle or with moving the points directly.',
        ),
    ],
};

const mirrorVisibility = (visible: boolean): SceneAction => ({name: 'show-function-element', value: {name: 'mirror', value: visible}});

const exponentialFunction: GuidedLesson = {
    demonstrationId: 'exponential-function',
    title: text('Eksponentna funkcija', 'Exponential function'),
    summary: text(
        'Eksponentna funkcija \\(f(x)=a^x\\) ima pozitivno osnovo \\(a\\): njen graf gre skozi točko \\((0,1)\\), pri \\(a>1\\) narašča, pri \\(0<a<1\\) pada in vedno ostane nad osjo \\(x\\).',
        'The exponential function \\(f(x)=a^x\\) has a positive base \\(a\\): its graph passes through \\((0,1)\\), rises for \\(a>1\\), falls for \\(0<a<1\\) and always stays above the \\(x\\)-axis.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje potenc z celimi eksponenti, na primer \\(2^3=8\\).', 'Assumes familiarity with powers with integer exponents, for example \\(2^3=8\\).'),
        text('Priporočeno je, da znaš odčitavati koordinate točke z grafa funkcije.', 'It helps to know how to read the coordinates of a point from the graph of a function.'),
    ],
    learningGoals: [
        text('Razložiš, zakaj graf \\(a^x\\) vedno poteka skozi \\((0,1)\\) in \\((1,a)\\).', 'Explain why the graph of \\(a^x\\) always passes through \\((0,1)\\) and \\((1,a)\\).'),
        text('Z zvezo \\(f(x+1)=a\\cdot f(x)\\) izračunaš zaporedne vrednosti in razločiš rast (\\(a>1\\)), padanje (\\(0<a<1\\)) in konstanto (\\(a=1\\)).', 'Use \\(f(x+1)=a\\cdot f(x)\\) to compute consecutive values and tell growth (\\(a>1\\)), decay (\\(0<a<1\\)) and the constant case (\\(a=1\\)) apart.'),
        text('Pokažeš, da je graf \\((1/a)^x\\) zrcalna slika grafa \\(a^x\\) čez os \\(y\\), in utemeljiš, zakaj mora biti \\(a>0\\).', 'Show that the graph of \\((1/a)^x\\) is the reflection of the graph of \\(a^x\\) over the \\(y\\)-axis, and justify why \\(a>0\\) is required.'),
    ],
    formulaBlocks: [
        {
            id: 'exponential-form',
            latex: 'f(x)=a^x,\\qquad a>0,\\qquad f(0)=1,\\quad f(1)=a',
            notation: text(
                'Število \\(a\\) je osnova, \\(x\\) pa eksponent. Vsaka potenca s pozitivno osnovo in eksponentom \\(0\\) je enaka \\(1\\), potenca z eksponentom \\(1\\) pa je kar osnova.',
                'The number \\(a\\) is the base and \\(x\\) is the exponent. Every power with a positive base and exponent \\(0\\) equals \\(1\\), and the power with exponent \\(1\\) is the base itself.',
            ),
            explanation: text(
                'Zato gredo vsi grafi \\(a^x\\) skozi točko \\((0,1)\\), druga označena točka \\((1,a)\\) pa kaže osnovo.',
                'That is why all graphs of \\(a^x\\) pass through \\((0,1)\\), while the second marked point \\((1,a)\\) shows the base.',
            ),
        },
        {
            id: 'exponential-step',
            latex: 'f(x+1)=a^{x+1}=a\\cdot a^x=a\\cdot f(x)',
            notation: text(
                'Ko se \\(x\\) poveča za \\(1\\), se vrednost funkcije pomnoži z \\(a\\).',
                'When \\(x\\) grows by \\(1\\), the value of the function is multiplied by \\(a\\).',
            ),
            explanation: text(
                'Pri \\(a>1\\) se vrednost z vsakim korakom poveča, pri \\(0<a<1\\) zmanjša, pri \\(a=1\\) pa ostane enaka.',
                'For \\(a>1\\) the value grows with every step, for \\(0<a<1\\) it shrinks, and for \\(a=1\\) it stays the same.',
            ),
        },
        {
            id: 'exponential-mirror',
            latex: '\\left(\\frac1a\\right)^x=a^{-x}=f(-x)',
            notation: text(
                'Osnova \\(1/a\\) je obratna vrednost osnove \\(a\\).',
                'The base \\(1/a\\) is the reciprocal of the base \\(a\\).',
            ),
            explanation: text(
                'Vrednost zrcalne funkcije pri \\(x\\) je vrednost prvotne funkcije pri \\(-x\\), zato je njen graf zrcalna slika čez os \\(y\\).',
                'The value of the mirror function at \\(x\\) is the value of the original function at \\(-x\\), so its graph is the reflection over the \\(y\\)-axis.',
            ),
        },
        {
            id: 'exponential-positive',
            latex: 'a^x>0\\ \\text{for all } x,\\qquad a>0',
            notation: text(
                'Pri \\(a>0\\) je vsaka potenca \\(a^x\\) pozitivna.',
                'For \\(a>0\\) every power \\(a^x\\) is positive.',
            ),
            explanation: text(
                'Graf je zato vedno nad osjo \\(x\\); ko gre \\(x\\) v smeri, kjer se vrednosti zmanjšujejo, se osi približuje, a je ne doseže.',
                'The graph therefore always lies above the \\(x\\)-axis; as \\(x\\) moves in the direction in which the values shrink, it approaches the axis without reaching it.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'exponential-doubling',
            title: text('Osnova \\(a=2\\): vrednosti \\(f(0),\\dots,f(3)\\)', 'Base \\(a=2\\): the values \\(f(0),\\dots,f(3)\\)'),
            calculationLatex: 'f(0)=2^0=1,\\quad f(1)=2\\cdot1=2,\\quad f(2)=2\\cdot2=4,\\quad f(3)=2\\cdot4=8',
            resultLatex: 'f(0),f(1),f(2),f(3)=1,\\,2,\\,4,\\,8',
            check: text(
                'Odčitek \\(f(1)\\) v inspektorju je \\(2\\), kar je enako osnovi \\(a\\); pri \\(x=3\\) je točka na grafu v višini \\(2^3=8\\).',
                'The readout of \\(f(1)\\) in the inspector is \\(2\\), equal to the base \\(a\\); at \\(x=3\\) the graph is at height \\(2^3=8\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'exponential-fixed-points', order: 1,
            title: text('Točki \\((0,1)\\) in \\((1,a)\\)', 'The points \\((0,1)\\) and \\((1,a)\\)'),
            purpose: text('Spoznati, da vsak graf \\(a^x\\) poteka skozi \\((0,1)\\), vrednost pri \\(x=1\\) pa je osnova.', 'Seeing that every graph of \\(a^x\\) passes through \\((0,1)\\) and that the value at \\(x=1\\) is the base.'),
            explanation: text(
                'Eksponentna funkcija \\(f(x)=a^x\\) ima pozitivno osnovo \\(a\\). Ker je \\(a^0=1\\), graf vedno poteka skozi \\((0,1)\\); ker je \\(a^1=a\\), je druga označena točka \\((1,a)\\). Premikaj drsnik osnove in opazuj, kaj se spreminja in kaj ne.',
                'The exponential function \\(f(x)=a^x\\) has a positive base \\(a\\). Since \\(a^0=1\\), the graph always passes through \\((0,1)\\); since \\(a^1=a\\), the second marked point is \\((1,a)\\). Move the base slider and watch what changes and what does not.',
            ),
            formulaIds: ['exponential-form'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('exponential-fixed-points-explanation', 'explanation'), frame('exponential-fixed-points-observation', 'observation')],
            observationPrompt: text(
                'Premakni drsnik osnove \\(a\\) in primerjaj višino točke \\((1,a)\\) z odčitkom \\(f(1)\\).',
                'Move the base slider \\(a\\) and compare the height of the point \\((1,a)\\) with the readout of \\(f(1)\\).',
            ),
            expectedObservations: [text(
                'Točka \\((0,1)\\) miruje pri vsaki osnovi, točka \\((1,a)\\) pa se dviga in spušča skupaj z \\(a\\); odčitek \\(f(1)\\) je vedno enak \\(a\\).',
                'The point \\((0,1)\\) stays put for every base, while the point \\((1,a)\\) rises and falls with \\(a\\); the readout \\(f(1)\\) always equals \\(a\\).',
            )],
            scene: {
                id: 'exponential-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazan je graf \\(f(x)=2^x\\) z označenima točkama \\((0,1)\\) in \\((1,2)\\); zrcalni graf je skrit.',
                    'The graph of \\(f(x)=2^x\\) is shown with the marked points \\((0,1)\\) and \\((1,2)\\); the mirror graph is hidden.',
                ),
            },
        },
        {
            id: 'exponential-multiplication-step', order: 2,
            title: text('Korak v desno pomeni množenje z \\(a\\)', 'One step to the right means multiplying by \\(a\\)'),
            purpose: text('Zvezo \\(f(x+1)=a\\cdot f(x)\\) uporabiti za izračun zaporednih vrednosti.', 'Using \\(f(x+1)=a\\cdot f(x)\\) to compute consecutive values.'),
            explanation: text(
                'Ker je \\(a^{x+1}=a\\cdot a^x\\), se vrednost funkcije pri vsakem koraku za \\(1\\) v desno pomnoži z \\(a\\). Pri osnovi \\(a=2\\) začnemo z \\(f(0)=1\\) in vrednost vsakič podvojimo.',
                'Because \\(a^{x+1}=a\\cdot a^x\\), the value of the function is multiplied by \\(a\\) at every step of \\(1\\) to the right. For the base \\(a=2\\) we start with \\(f(0)=1\\) and double the value each time.',
            ),
            formulaIds: ['exponential-step'], workedExampleId: 'exponential-doubling', learnerInteraction: 'observe',
            frames: [frame('exponential-multiplication-step-explanation', 'explanation'), frame('exponential-multiplication-step-calculation', 'calculation'), frame('exponential-multiplication-step-observation', 'observation')],
            observationPrompt: text(
                'Pri \\(x=0,1,2,3\\) odčitaj višino grafa in preveri, da je vsaka vrednost dvakratnik prejšnje.',
                'Read the height of the graph at \\(x=0,1,2,3\\) and check that every value is twice the previous one.',
            ),
            expectedObservations: [text(
                'Višine so \\(1\\), \\(2\\), \\(4\\) in \\(8\\), kar se ujema z izračunom.',
                'The heights are \\(1\\), \\(2\\), \\(4\\) and \\(8\\), which matches the calculation.',
            )],
            scene: {
                id: 'exponential-base-two', basedOn: 'demonstration-default',
                actions: [parameter('a', 2)],
                expectedState: text(
                    'Prikazan je graf \\(f(x)=2^x\\); odčitek \\(f(1)\\) je \\(2\\).',
                    'The graph of \\(f(x)=2^x\\) is shown; the readout \\(f(1)\\) is \\(2\\).',
                ),
            },
        },
        {
            id: 'exponential-growth-decay', order: 3,
            title: text('Rast, padanje in konstanta', 'Growth, decay and the constant case'),
            purpose: text('Po osnovi \\(a\\) razločiti naraščajočo, padajočo in konstantno funkcijo.', 'Telling increasing, decreasing and constant functions apart by the base \\(a\\).'),
            explanation: text(
                'Pri \\(a>1\\) se vrednost z vsakim korakom poveča, zato funkcija narašča. Pri \\(0<a<1\\) se z vsakim korakom pomnoži z manjšim številom od \\(1\\), zato pada: za \\(a=0{,}5\\) so vrednosti \\(1\\), \\(0{,}5\\), \\(0{,}25\\), \\(0{,}125\\). Pri \\(a=1\\) je \\(1^x=1\\) za vsak \\(x\\), graf je vodoravna premica.',
                'For \\(a>1\\) the value grows with every step, so the function increases. For \\(0<a<1\\) it is multiplied by a number smaller than \\(1\\) at every step, so it decreases: for \\(a=0.5\\) the values are \\(1\\), \\(0.5\\), \\(0.25\\), \\(0.125\\). For \\(a=1\\) we have \\(1^x=1\\) for every \\(x\\), and the graph is a horizontal line.',
            ),
            formulaIds: ['exponential-step'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('exponential-growth-decay-explanation', 'explanation'), frame('exponential-growth-decay-observation', 'observation')],
            observationPrompt: text(
                'Nastavi drsnik na \\(a=1\\) in preberi obnašanje v inspektorju, nato ga premakni na obe strani.',
                'Set the slider to \\(a=1\\) and read the behavior in the inspector, then move it to both sides.',
            ),
            expectedObservations: [text(
                'Pri \\(a=0{,}5\\) graf pada in \\(f(1)=0{,}5\\); pri \\(a=1\\) je graf vodoravna premica \\(y=1\\); pri \\(a>1\\) graf narašča.',
                'At \\(a=0.5\\) the graph falls and \\(f(1)=0.5\\); at \\(a=1\\) the graph is the horizontal line \\(y=1\\); for \\(a>1\\) the graph rises.',
            )],
            scene: {
                id: 'exponential-base-half', basedOn: 'demonstration-default',
                actions: [parameter('a', 0.5)],
                expectedState: text(
                    'Pri osnovi \\(a=0{,}5\\) graf \\(f(x)=0{,}5^x\\) pada, inspektor javlja padanje.',
                    'With the base \\(a=0.5\\) the graph of \\(f(x)=0.5^x\\) falls, and the inspector reports decay.',
                ),
            },
        },
        {
            id: 'exponential-mirror-step', order: 4,
            title: text('Zrcalni graf \\((1/a)^x\\)', 'The mirror graph \\((1/a)^x\\)'),
            purpose: text('Spoznati, da obratna osnova da zrcalno sliko grafa čez os \\(y\\).', 'Seeing that the reciprocal base gives the reflection of the graph over the \\(y\\)-axis.'),
            explanation: text(
                'Ker je \\((1/a)^x=a^{-x}\\), ima zrcalna funkcija pri \\(x\\) enako vrednost kot prvotna pri \\(-x\\). Pri \\(a=2\\) je zrcalna osnova \\(1/2\\): točka \\((1,2)\\) na prvotnem grafu ustreza točki \\((-1,2)\\) na zrcalnem, ker je \\((1/2)^{-1}=2\\).',
                'Since \\((1/a)^x=a^{-x}\\), the mirror function at \\(x\\) has the same value as the original at \\(-x\\). For \\(a=2\\) the mirror base is \\(1/2\\): the point \\((1,2)\\) on the original graph corresponds to the point \\((-1,2)\\) on the mirror graph, because \\((1/2)^{-1}=2\\).',
            ),
            formulaIds: ['exponential-mirror'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('exponential-mirror-step-explanation', 'explanation'), frame('exponential-mirror-step-observation', 'observation')],
            observationPrompt: text(
                'Spreminjaj osnovo \\(a\\) in opazuj, kako se oba grafa odzivata glede na os \\(y\\).',
                'Change the base \\(a\\) and observe how the two graphs respond relative to the \\(y\\)-axis.',
            ),
            expectedObservations: [text(
                'Prekinjeni oranžni graf je zrcalna slika modrega čez os \\(y\\); ob vsaki spremembi \\(a\\) se zrcalita skupaj, odčitek zrcalne osnove pa je \\(1/a=0{,}5\\).',
                'The dashed orange graph is the mirror image of the blue one over the \\(y\\)-axis; they stay mirror images when \\(a\\) changes, and the mirror base readout is \\(1/a=0.5\\).',
            )],
            scene: {
                id: 'exponential-mirror-shown', basedOn: 'demonstration-default',
                actions: [parameter('a', 2), mirrorVisibility(true)],
                expectedState: text(
                    'Prikazana sta \\(2^x\\) in zrcalni graf \\((1/2)^x\\), ki sta zrcalni sliki čez os \\(y\\).',
                    'Both \\(2^x\\) and the mirror graph \\((1/2)^x\\) are shown; they are reflections over the \\(y\\)-axis.',
                ),
            },
        },
        {
            id: 'exponential-above-axis', order: 5,
            title: text('Nad osjo \\(x\\) in izključena osnova', 'Above the \\(x\\)-axis and the excluded base'),
            purpose: text('Opaziti, da je graf vedno nad osjo \\(x\\), in razumeti, zakaj osnova ne sme biti \\(a\\le0\\).', 'Noticing that the graph is always above the \\(x\\)-axis and understanding why the base must not satisfy \\(a\\le0\\).'),
            explanation: text(
                'Pri \\(a>0\\) je vsaka potenca \\(a^x\\) pozitivna, zato graf nikoli ne seka osi \\(x\\). Pri \\(a=2\\) in vse bolj negativnih \\(x\\) vrednosti padajo: \\(2^{-10}=1/1024\\approx0{,}001\\), a ostanejo večje od \\(0\\). Osnov \\(a\\le0\\) ne dovolimo: \\(0^x\\) ni definirana za \\(x\\le0\\), pri negativni osnovi pa na primer \\((-2)^{1/2}\\) ni realno število, zato drsnik teče od \\(0{,}1\\) naprej.',
                'For \\(a>0\\) every power \\(a^x\\) is positive, so the graph never meets the \\(x\\)-axis. For \\(a=2\\) and more and more negative \\(x\\) the values decrease: \\(2^{-10}=1/1024\\approx0.001\\), yet they stay greater than \\(0\\). Bases \\(a\\le0\\) are not allowed: \\(0^x\\) is not defined for \\(x\\le0\\), and for a negative base, for example, \\((-2)^{1/2}\\) is not a real number, so the slider starts at \\(0.1\\).',
            ),
            formulaIds: ['exponential-positive'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('exponential-above-axis-explanation', 'explanation'), frame('exponential-above-axis-observation', 'observation')],
            observationPrompt: text(
                'Poglej levi del grafa pri \\(a=2\\) in nato pri najmanjši osnovi \\(a=0{,}1\\), kjer graf z desne pada proti osi \\(x\\).',
                'Look at the left part of the graph at \\(a=2\\) and then at the smallest base \\(a=0.1\\), where the graph falls toward the \\(x\\)-axis on the right.',
            ),
            expectedObservations: [text(
                'Graf se osi \\(x\\) približuje, a je ne doseže ali preseka; drsnik ne dovoli osnove \\(a\\le0\\).',
                'The graph approaches the \\(x\\)-axis without reaching or crossing it; the slider does not allow a base \\(a\\le0\\).',
            )],
            scene: {
                id: 'exponential-above-axis-scene', basedOn: 'demonstration-default',
                actions: [parameter('a', 2), mirrorVisibility(false)],
                expectedState: text(
                    'Prikazan je graf \\(2^x\\), ki je povsod nad osjo \\(x\\), zrcalni graf je skrit.',
                    'The graph of \\(2^x\\) is shown, everywhere above the \\(x\\)-axis, with the mirror graph hidden.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-exponential',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Section 1.5: Exponential Functions.',
            supports: ['a^x for a > 0', 'graphs pass through (0, 1)', 'growth for a > 1 and decay for 0 < a < 1', 'a^(x+1) = a * a^x', 'graph above the x-axis with the x-axis as asymptote'],
        },
        {
            id: 'efodx-exponential-graph',
            citation: 'Owner\'s earlier app: efodx.github.io, src/graphs exponential-fun-graph (studied 2026-10-11).',
            supports: ['f(x) = a^x with an editable base', 'comparing growth and decay by changing the base'],
            implementationCorrespondence: 'Bezeg keeps the editable base as a slider limited to the valid range, marks the points (0, 1) and (1, a), and adds an optional mirror graph (1/a)^x with readouts of f(1) and the behavior.',
        },
        {
            id: 'bezeg-exponential-implementation',
            citation: 'Bezeg source: src/analysis/exponential.ts and src/graphs/functions/ExponentialFunctionGraph.tsx.',
            supports: ['a^x values, classification and mirror base', 'base slider limited to 0.1 to 5', 'marked points (0, 1) and (1, a)', 'mirror graph toggle'],
        },
    ],
    edgeCases: [
        text(
            'Osnova \\(a\\le0\\) ni dovoljena: drsnik teče od \\(0{,}1\\) do \\(5\\), uvoz shranjenih nastavitev in učni prizori pa osnove zunaj tega območja zavrnejo.',
            'A base \\(a\\le0\\) is not allowed: the slider runs from \\(0.1\\) to \\(5\\), and importing saved settings and lesson scenes reject bases outside that range.',
        ),
        text(
            'Pri \\(a=1\\) je funkcija konstantna \\(f(x)=1\\), zrcalni graf pa se prekrije z njo; inspektor javlja konstantnost.',
            'For \\(a=1\\) the function is the constant \\(f(x)=1\\) and the mirror graph coincides with it; the inspector reports the constant case.',
        ),
        text(
            'Pri majhnih osnovah, na primer \\(a=0{,}1\\), vrednosti na levi zelo hitro zrastejo (\\(0{,}1^{-4}=10\\,000\\)) in graf zapusti vidno območje; to ni napaka, ampak posledica hitre rasti.',
            'For small bases, for example \\(a=0.1\\), the values on the left grow very quickly (\\(0.1^{-4}=10\\,000\\)) and the graph leaves the visible area; this is not an error but a consequence of fast growth.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj razlaga obravnava tudi število \\(e\\) kot posebno osnovo.',
            'Before classroom-ready review, confirm whether the explanation should also treat the number \\(e\\) as a special base.',
        ),
    ],
};

const referenceVisibility = (visible: boolean): SceneAction => ({name: 'show-function-element', value: {name: 'reference', value: visible}});
const trigChoice = (value: 'sin' | 'cos' | 'tan'): SceneAction => ({name: 'set-function-choice', value: {name: 'trig-function', value}});

const trigonometricFunctions: GuidedLesson = {
    demonstrationId: 'trigonometric-functions',
    title: text('Trigonometrične funkcije', 'Trigonometric functions'),
    summary: text(
        'Funkcija \\(f(x)=A\\,g(\\omega x+\\varphi)+B\\) je osnovna funkcija \\(g\\in\\{\\sin,\\cos,\\tan\\}\\), ki jo razpotegnemo, stisnemo in premaknemo: \\(A\\) določa višino valov, \\(\\omega\\) periodo, \\(\\varphi\\) vodoravni zamik in \\(B\\) srednjo črto.',
        'The function \\(f(x)=A\\,g(\\omega x+\\varphi)+B\\) is a basic function \\(g\\in\\{\\sin,\\cos,\\tan\\}\\) that is stretched, squeezed and shifted: \\(A\\) sets the height of the waves, \\(\\omega\\) the period, \\(\\varphi\\) the horizontal shift and \\(B\\) the midline.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje funkcij \\(\\sin\\) in \\(\\cos\\) ter merjenja kotov v radianih, na primer \\(\\pi\\) radianov je pol kroga.', 'Assumes familiarity with the functions \\(\\sin\\) and \\(\\cos\\) and with measuring angles in radians, for example \\(\\pi\\) radians is half a turn.'),
        text('Priporočeno je znanje o navpičnem in vodoravnem premikanju ter raztegovanju grafa funkcije.', 'It helps to know about shifting and stretching the graph of a function vertically and horizontally.'),
    ],
    learningGoals: [
        text('Iz parametrov \\(A\\), \\(\\omega\\), \\(\\varphi\\) in \\(B\\) razbereš amplitudo \\(|A|\\), periodo, fazni zamik \\(-\\varphi/\\omega\\) in zalogo vrednosti \\([B-|A|,B+|A|]\\).', 'Read the amplitude \\(|A|\\), the period, the phase shift \\(-\\varphi/\\omega\\) and the range \\([B-|A|,B+|A|]\\) from the parameters \\(A\\), \\(\\omega\\), \\(\\varphi\\) and \\(B\\).'),
        text('Pokažeš, da je kosinus zamaknjen sinus: \\(\\cos x=\\sin(x+\\pi/2)\\).', 'Show that the cosine is a shifted sine: \\(\\cos x=\\sin(x+\\pi/2)\\).'),
        text('Razložiš, zakaj ima \\(\\tan\\) periodo \\(\\pi/\\omega\\), asimptote pri \\(\\omega x+\\varphi=\\pi/2+m\\pi\\) in nima amplitude, ter zakaj je \\(\\omega=0\\) izključen.', 'Explain why \\(\\tan\\) has the period \\(\\pi/\\omega\\), asymptotes at \\(\\omega x+\\varphi=\\pi/2+m\\pi\\) and no amplitude, and why \\(\\omega=0\\) is excluded.'),
    ],
    formulaBlocks: [
        {
            id: 'trig-form',
            latex: 'f(x)=A\\,g(\\omega x+\\varphi)+B,\\qquad g\\in\\{\\sin,\\cos,\\tan\\},\\quad \\omega>0',
            notation: text(
                '\\(A\\) je navpični razteg, \\(\\omega\\) vodoravno stiskanje, \\(\\varphi\\) faza in \\(B\\) navpični premik.',
                '\\(A\\) is the vertical stretch, \\(\\omega\\) the horizontal squeeze, \\(\\varphi\\) the phase and \\(B\\) the vertical shift.',
            ),
            explanation: text(
                'Pri \\(A=1\\), \\(\\omega=1\\), \\(\\varphi=0\\) in \\(B=0\\) dobimo osnovno funkcijo \\(g\\) brez sprememb; črtkani referenčni graf prikazuje prav to.',
                'For \\(A=1\\), \\(\\omega=1\\), \\(\\varphi=0\\) and \\(B=0\\) we get the basic function \\(g\\) unchanged; the dashed reference graph shows exactly that.',
            ),
        },
        {
            id: 'trig-range',
            latex: 'f(x)\\in\\left[B-|A|,\\;B+|A|\\right]\\quad(g=\\sin,\\cos)',
            notation: text(
                'Sinus in kosinus zavzameta vse vrednosti med \\(-1\\) in \\(1\\), zato \\(A\\,g\\) zavzame vrednosti med \\(-|A|\\) in \\(|A|\\).',
                'Sine and cosine take all values between \\(-1\\) and \\(1\\), so \\(A\\,g\\) takes values between \\(-|A|\\) and \\(|A|\\).',
            ),
            explanation: text(
                'Dodani \\(B\\) vse vrednosti premakne navzgor, zato je zaloga vrednosti interval od \\(B-|A|\\) do \\(B+|A|\\).',
                'Adding \\(B\\) moves all values up, so the range is the interval from \\(B-|A|\\) to \\(B+|A|\\).',
            ),
        },
        {
            id: 'trig-period-shift',
            latex: 'T=\\frac{2\\pi}{\\omega}\\;(\\tan:\\ \\frac{\\pi}{\\omega}),\\qquad \\omega x+\\varphi=\\omega\\left(x+\\frac{\\varphi}{\\omega}\\right)',
            notation: text(
                '\\(T\\) je perioda, \\(-\\varphi/\\omega\\) pa fazni zamik.',
                '\\(T\\) is the period and \\(-\\varphi/\\omega\\) is the phase shift.',
            ),
            explanation: text(
                'Argument se poveča za \\(2\\pi\\), ko se \\(x\\) poveča za \\(2\\pi/\\omega\\). Graf \\(g\\) je zato premaknjen za \\(-\\varphi/\\omega\\): v desno, če je to število pozitivno, in v levo, če je negativno.',
                'The argument grows by \\(2\\pi\\) when \\(x\\) grows by \\(2\\pi/\\omega\\). The graph of \\(g\\) is therefore shifted by \\(-\\varphi/\\omega\\): to the right if this number is positive and to the left if it is negative.',
            ),
        },
        {
            id: 'trig-cos-sin',
            latex: '\\cos x=\\sin\\left(x+\\frac{\\pi}{2}\\right)',
            notation: text(
                'Kosinus je sinus, zamaknjen za \\(\\pi/2\\) v levo.',
                'The cosine is the sine shifted by \\(\\pi/2\\) to the left.',
            ),
            explanation: text(
                'Pri \\(\\varphi=\\pi/2\\) in \\(\\omega=1\\) je fazni zamik \\(-\\pi/2\\), zato ima \\(\\sin(x+\\pi/2)\\) največjo vrednost pri \\(x=0\\), tako kot \\(\\cos x\\).',
                'For \\(\\varphi=\\pi/2\\) and \\(\\omega=1\\) the phase shift is \\(-\\pi/2\\), so \\(\\sin(x+\\pi/2)\\) has its maximum at \\(x=0\\), just like \\(\\cos x\\).',
            ),
        },
        {
            id: 'trig-tan-asymptotes',
            latex: '\\omega x+\\varphi=\\frac{\\pi}{2}+m\\pi\\;\\Longleftrightarrow\\;x=\\frac{\\frac{\\pi}{2}+m\\pi-\\varphi}{\\omega},\\qquad m\\in\\mathbb{Z}',
            notation: text(
                '\\(m\\) je poljubno celo število, vsak \\(m\\) da eno asimptoto.',
                '\\(m\\) is any integer, and each \\(m\\) gives one asymptote.',
            ),
            explanation: text(
                'Ker je \\(\\tan u=\\sin u/\\cos u\\), tangens ni definiran tam, kjer je \\(\\cos u=0\\), to je pri \\(u=\\pi/2+m\\pi\\). Razmik med sosednjima asimptotama je perioda \\(\\pi/\\omega\\).',
                'Since \\(\\tan u=\\sin u/\\cos u\\), the tangent is not defined where \\(\\cos u=0\\), that is at \\(u=\\pi/2+m\\pi\\). The distance between neighboring asymptotes is the period \\(\\pi/\\omega\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'trig-period-shift-example',
            title: text('Zgled s parametri \\(A=2\\), \\(\\omega=2\\), \\(\\varphi=\\pi/2\\), \\(B=1\\)', 'Example with \\(A=2\\), \\(\\omega=2\\), \\(\\varphi=\\pi/2\\), \\(B=1\\)'),
            calculationLatex: 'f(x)=2\\sin\\left(2x+\\frac{\\pi}{2}\\right)+1,\\quad \\max=1+2=3,\\ \\min=1-2=-1,\\quad T=\\frac{2\\pi}{2}=\\pi,\\quad -\\frac{\\varphi}{\\omega}=-\\frac{\\pi/2}{2}=-\\frac{\\pi}{4}',
            resultLatex: '\\max=3,\\ \\min=-1,\\ T=\\pi,\\ -\\frac{\\varphi}{\\omega}=-\\frac{\\pi}{4}',
            check: text(
                'Odčitki v inspektorju se ujemajo: zaloga vrednosti \\([-1,3]\\), perioda \\(\\pi\\approx3{,}14\\), zamik \\(-\\pi/4\\approx-0{,}79\\). Pri \\(x=0\\) je \\(2\\sin(\\pi/2)+1=3\\), največja vrednost.',
                'The inspector readouts agree: the range is \\([-1,3]\\), the period \\(\\pi\\approx3.14\\), the shift \\(-\\pi/4\\approx-0.79\\). At \\(x=0\\) we have \\(2\\sin(\\pi/2)+1=3\\), the maximum.',
            ),
        },
    ],
    steps: [
        {
            id: 'trig-base-sine', order: 1,
            title: text('Osnovni val \\(\\sin x\\)', 'The basic wave \\(\\sin x\\)'),
            purpose: text('Spoznati periodo in vrednosti funkcije \\(\\sin x\\), iz katere nastanejo vsi drugi grafi.', 'Getting to know the period and the values of \\(\\sin x\\), from which all other graphs are made.'),
            explanation: text(
                'Pri privzetih nastavitvah \\(A=1\\), \\(\\omega=1\\), \\(\\varphi=0\\) in \\(B=0\\) je \\(f(x)=\\sin x\\). Val se ponovi vsakih \\(2\\pi\\approx6{,}28\\) in nikoli ne preseže vrednosti \\(1\\) ali pade pod \\(-1\\). Poskusi spremeniti drsnike, nato pa se vrni na te vrednosti.',
                'With the default settings \\(A=1\\), \\(\\omega=1\\), \\(\\varphi=0\\) and \\(B=0\\) we have \\(f(x)=\\sin x\\). The wave repeats every \\(2\\pi\\approx6.28\\) and never rises above \\(1\\) or falls below \\(-1\\). Try the sliders, then return to these values.',
            ),
            formulaIds: ['trig-form'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-base-sine-explanation', 'explanation'), frame('trig-base-sine-observation', 'observation')],
            observationPrompt: text(
                'Poišči najvišjo in najnižjo točko grafa ter dve točki, kjer se val začne ponavljati, in primerjaj z odčitkoma zaloge vrednosti in periode.',
                'Find the highest and the lowest point of the graph and two points where the wave starts to repeat, and compare them with the readouts of the range and the period.',
            ),
            expectedObservations: [text(
                'Graf niha med \\(-1\\) in \\(1\\), zaloga vrednosti je \\([-1,1]\\), perioda pa \\(2\\pi\\approx6{,}28\\).',
                'The graph oscillates between \\(-1\\) and \\(1\\), the range is \\([-1,1]\\) and the period is \\(2\\pi\\approx6.28\\).',
            )],
            scene: {
                id: 'trig-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazan je graf \\(f(x)=\\sin x\\) s srednjo črto \\(y=0\\); referenčni graf je skrit.',
                    'The graph of \\(f(x)=\\sin x\\) is shown with the midline \\(y=0\\); the reference graph is hidden.',
                ),
            },
        },
        {
            id: 'trig-amplitude', order: 2,
            title: text('Amplituda \\(A\\)', 'Amplitude \\(A\\)'),
            purpose: text('Videti, da \\(A\\) navpično razteguje val in poveča zalogo vrednosti, perioda pa ostane enaka.', 'Seeing that \\(A\\) stretches the wave vertically and widens the range while the period stays the same.'),
            explanation: text(
                'Črtkani referenčni graf je osnovni \\(\\sin x\\). Spremenimo samo \\(A\\): pri \\(A=2\\) je \\(f(x)=2\\sin x\\) in val doseže višino \\(|A|=2\\) nad srednjo črto \\(y=0\\) in \\(2\\) pod njo. Zaloga vrednosti je zato \\([B-|A|,B+|A|]=[-2,2]\\), perioda \\(2\\pi\\) in srednja črta ostaneta enaki kot pri referenčnem grafu.',
                'The dashed reference graph is the basic \\(\\sin x\\). We change only \\(A\\): for \\(A=2\\) we have \\(f(x)=2\\sin x\\), and the wave reaches \\(|A|=2\\) above the midline \\(y=0\\) and \\(2\\) below it. The range is therefore \\([B-|A|,B+|A|]=[-2,2]\\), while the period \\(2\\pi\\) and the midline stay the same as for the reference graph.',
            ),
            formulaIds: ['trig-range'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-amplitude-midline-explanation', 'explanation'), frame('trig-amplitude-midline-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj višino vrhov polnega in črtkanega grafa ter njuna prečkanja osi \\(x\\). Nato premakni drsnik \\(A\\) čez \\(0\\) v negativne vrednosti in opazuj graf ter odčitek amplitude.',
                'Compare the height of the peaks of the solid and the dashed graph and where they cross the \\(x\\)-axis. Then move the slider \\(A\\) across \\(0\\) to negative values and watch the graph and the amplitude readout.',
            ),
            expectedObservations: [text(
                'Polni graf je dvakrat višji od črtkanega, zaloga vrednosti je \\([-2,2]\\), prečkanja osi \\(x\\) in perioda \\(2\\pi\\approx6{,}28\\) pa so ista. Pri negativnem \\(A\\) se graf prezrcali čez srednjo črto, amplituda \\(|A|\\) ostane pozitivna.',
                'The solid graph is twice as tall as the dashed one, the range is \\([-2,2]\\), while the crossings of the \\(x\\)-axis and the period \\(2\\pi\\approx6.28\\) are the same. For a negative \\(A\\) the graph is reflected over the midline, while the amplitude \\(|A|\\) stays positive.',
            )],
            scene: {
                id: 'trig-amplitude-two', basedOn: 'demonstration-default',
                actions: [parameter('A', 2), referenceVisibility(true)],
                expectedState: text(
                    'Polni graf \\(f(x)=2\\sin x\\) in črtkani referenčni graf \\(\\sin x\\); amplituda je \\(2\\), zaloga vrednosti \\([-2,2]\\), perioda \\(2\\pi\\), zamik \\(0\\).',
                    'The solid graph \\(f(x)=2\\sin x\\) and the dashed reference graph \\(\\sin x\\); the amplitude is \\(2\\), the range \\([-2,2]\\), the period \\(2\\pi\\), the shift \\(0\\).',
                ),
            },
        },
        {
            id: 'trig-vertical-shift', order: 3,
            title: text('Navpični premik \\(B\\)', 'Vertical shift \\(B\\)'),
            purpose: text('Videti, da \\(B\\) celoten val premakne navzgor ali navzdol in ne spremeni njegove oblike.', 'Seeing that \\(B\\) moves the whole wave up or down without changing its shape.'),
            explanation: text(
                'Referenčni graf je spet osnovni \\(\\sin x\\). Spremenimo samo \\(B\\): pri \\(B=1\\) je \\(f(x)=\\sin x+1\\), srednja črta je \\(y=1\\), največja vrednost je \\(B+|A|=1+1=2\\), najmanjša pa \\(B-|A|=1-1=0\\). Višina vala nad srednjo črto je še vedno \\(|A|=1\\), perioda pa \\(2\\pi\\).',
                'The reference graph is again the basic \\(\\sin x\\). We change only \\(B\\): for \\(B=1\\) we have \\(f(x)=\\sin x+1\\), the midline is \\(y=1\\), the maximum is \\(B+|A|=1+1=2\\) and the minimum is \\(B-|A|=1-1=0\\). The height of the wave above the midline is still \\(|A|=1\\) and the period is \\(2\\pi\\).',
            ),
            formulaIds: ['trig-range'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-vertical-shift-explanation', 'explanation'), frame('trig-vertical-shift-observation', 'observation')],
            observationPrompt: text(
                'Izberi točko na črtkanem grafu in poišči točko polnega grafa z istim \\(x\\): za koliko je višja? Primerjaj še srednjo črto in odčitek zaloge vrednosti.',
                'Pick a point on the dashed graph and find the point of the solid graph with the same \\(x\\): how much higher is it? Also compare the midline and the range readout.',
            ),
            expectedObservations: [text(
                'Vsaka točka polnega grafa je za \\(1\\) višja od točke črtkanega grafa z istim \\(x\\). Srednja črta je \\(y=1\\), zaloga vrednosti je \\([0,2]\\), amplituda \\(1\\) in perioda \\(2\\pi\\) ostaneta.',
                'Every point of the solid graph is \\(1\\) higher than the point of the dashed graph with the same \\(x\\). The midline is \\(y=1\\), the range is \\([0,2]\\), and the amplitude \\(1\\) and the period \\(2\\pi\\) stay.',
            )],
            scene: {
                id: 'trig-vertical-shift-one', basedOn: 'demonstration-default',
                actions: [parameter('B', 1), referenceVisibility(true)],
                expectedState: text(
                    'Polni graf \\(f(x)=\\sin x+1\\) s srednjo črto \\(y=1\\) in črtkani referenčni graf \\(\\sin x\\); zaloga vrednosti \\([0,2]\\), perioda \\(2\\pi\\), zamik \\(0\\).',
                    'The solid graph \\(f(x)=\\sin x+1\\) with the midline \\(y=1\\) and the dashed reference graph \\(\\sin x\\); the range is \\([0,2]\\), the period \\(2\\pi\\), the shift \\(0\\).',
                ),
            },
        },
        {
            id: 'trig-frequency', order: 4,
            title: text('Frekvenca \\(\\omega\\) in perioda', 'Frequency \\(\\omega\\) and the period'),
            purpose: text('Videti, da \\(\\omega\\) val vodoravno stisne: perioda je \\(2\\pi/\\omega\\), zaloga vrednosti pa se ne spremeni.', 'Seeing that \\(\\omega\\) squeezes the wave horizontally: the period is \\(2\\pi/\\omega\\) while the range does not change.'),
            explanation: text(
                'Referenčni graf je osnovni \\(\\sin x\\). Spremenimo samo \\(\\omega\\): pri \\(\\omega=2\\) je \\(f(x)=\\sin 2x\\). Argument \\(2x\\) preteče \\(2\\pi\\) že, ko se \\(x\\) poveča za \\(\\pi\\), zato je perioda \\(2\\pi/\\omega=\\pi\\) in se v istem razmiku \\(2\\pi\\) val ponovi dvakrat. Višina vala se ne spremeni, zaloga vrednosti ostane \\([-1,1]\\).',
                'The reference graph is the basic \\(\\sin x\\). We change only \\(\\omega\\): for \\(\\omega=2\\) we have \\(f(x)=\\sin 2x\\). The argument \\(2x\\) runs through \\(2\\pi\\) already when \\(x\\) grows by \\(\\pi\\), so the period is \\(2\\pi/\\omega=\\pi\\) and the wave repeats twice in the same distance \\(2\\pi\\). The height of the wave does not change, and the range stays \\([-1,1]\\).',
            ),
            formulaIds: ['trig-period-shift'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-frequency-explanation', 'explanation'), frame('trig-frequency-observation', 'observation')],
            observationPrompt: text(
                'Preštej vrhove črtkanega in polnega grafa na razmiku od \\(0\\) do \\(2\\pi\\) in primerjaj razmik med dvema zaporednima vrhovoma polnega grafa z odčitkom periode.',
                'Count the peaks of the dashed and of the solid graph between \\(0\\) and \\(2\\pi\\) and compare the distance between two consecutive peaks of the solid graph with the period readout.',
            ),
            expectedObservations: [text(
                'Črtkani graf ima na \\([0,2\\pi]\\) en vrh, polni dva; razmik med vrhovoma je \\(\\pi\\approx3{,}14\\), kar kaže odčitek periode. Zaloga vrednosti \\([-1,1]\\) in zamik \\(0\\) ostaneta.',
                'On \\([0,2\\pi]\\) the dashed graph has one peak and the solid one has two; the distance between the peaks is \\(\\pi\\approx3.14\\), as the period readout shows. The range \\([-1,1]\\) and the shift \\(0\\) stay.',
            )],
            scene: {
                id: 'trig-frequency-two', basedOn: 'demonstration-default',
                actions: [parameter('omega', 2), referenceVisibility(true)],
                expectedState: text(
                    'Polni graf \\(f(x)=\\sin 2x\\) in črtkani referenčni graf \\(\\sin x\\); perioda je \\(\\pi\\), zaloga vrednosti \\([-1,1]\\), zamik \\(0\\).',
                    'The solid graph \\(f(x)=\\sin 2x\\) and the dashed reference graph \\(\\sin x\\); the period is \\(\\pi\\), the range \\([-1,1]\\), the shift \\(0\\).',
                ),
            },
        },
        {
            id: 'trig-phase-cosine', order: 5,
            title: text('Fazni zamik \\(\\varphi\\) in kosinus', 'Phase shift \\(\\varphi\\) and the cosine'),
            purpose: text('Videti, da \\(\\varphi\\) val vodoravno zamakne za \\(-\\varphi/\\omega\\), in iz tega pokazati \\(\\cos x=\\sin(x+\\pi/2)\\).', 'Seeing that \\(\\varphi\\) moves the wave horizontally by \\(-\\varphi/\\omega\\), and showing from it that \\(\\cos x=\\sin(x+\\pi/2)\\).'),
            explanation: text(
                'Črtkani referenčni graf je osnovni \\(\\sin x\\). Spremenimo samo \\(\\varphi\\): polni graf je \\(\\sin(x+\\pi/2)\\) pri \\(\\varphi=\\pi/2\\). Pozitiven \\(\\varphi\\) graf zamakne v levo, negativen pa v desno. Polni graf je zamaknjen za \\(-\\varphi/\\omega=-\\pi/2\\), torej v levo, in ima pri \\(x=0\\) največjo vrednost \\(1\\), tako kot \\(\\cos x\\). Preveri: izberi \\(\\cos\\) in nastavi \\(\\varphi=0\\); dobiš isti graf.',
                'The dashed reference graph is the basic \\(\\sin x\\). We change only \\(\\varphi\\): the solid graph is \\(\\sin(x+\\pi/2)\\) for \\(\\varphi=\\pi/2\\). A positive \\(\\varphi\\) moves the graph to the left and a negative one to the right. The solid graph is shifted by \\(-\\varphi/\\omega=-\\pi/2\\), that is to the left, and has its maximum \\(1\\) at \\(x=0\\), just like \\(\\cos x\\). Check it: choose \\(\\cos\\) and set \\(\\varphi=0\\); you get the same graph.',
            ),
            formulaIds: ['trig-cos-sin'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-cosine-shifted-sine-explanation', 'explanation'), frame('trig-cosine-shifted-sine-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj polni graf s črtkanim: za koliko in v katero smer je zamaknjen? Nato nastavi \\(\\varphi=-\\pi/2\\) in preveri, da se graf zamakne v desno, nato pa izberi \\(\\cos\\), nastavi \\(\\varphi=0\\) in preveri, da se polni graf ne spremeni.',
                'Compare the solid graph with the dashed one: by how much and in which direction is it shifted? Then set \\(\\varphi=-\\pi/2\\) and check that the graph moves to the right, and finally choose \\(\\cos\\), set \\(\\varphi=0\\) and check that the solid graph does not change.',
            ),
            expectedObservations: [text(
                'Polni graf je za \\(\\pi/2\\approx1{,}57\\) v levo od črtkanega, odčitek zamika je \\(-\\pi/2\\); isto krivuljo dobiš pri \\(\\cos\\) in \\(\\varphi=0\\).',
                'The solid graph is \\(\\pi/2\\approx1.57\\) to the left of the dashed one, the shift readout is \\(-\\pi/2\\); you get the same curve with \\(\\cos\\) and \\(\\varphi=0\\).',
            )],
            scene: {
                id: 'trig-sine-shifted-by-half-pi', basedOn: 'demonstration-default',
                actions: [trigChoice('sin'), parameter('phi', Math.PI / 2), referenceVisibility(true)],
                expectedState: text(
                    'Polni graf \\(\\sin(x+\\pi/2)\\), ki je enak \\(\\cos x\\), in črtkani referenčni graf \\(\\sin x\\); zamik je \\(-\\pi/2\\).',
                    'The solid graph \\(\\sin(x+\\pi/2)\\), which equals \\(\\cos x\\), and the dashed reference graph \\(\\sin x\\); the shift is \\(-\\pi/2\\).',
                ),
            },
        },
        {
            id: 'trig-combined', order: 6,
            title: text('Vsi štirje parametri skupaj', 'All four parameters together'),
            purpose: text('Znane učinke \\(A\\), \\(\\omega\\), \\(\\varphi\\) in \\(B\\) sestaviti in odčitati z grafa.', 'Combining the known effects of \\(A\\), \\(\\omega\\), \\(\\varphi\\) and \\(B\\) and reading them off the graph.'),
            explanation: text(
                'Faktor \\(\\omega\\) graf vodoravno stisne: perioda je \\(2\\pi/\\omega\\). Ker je \\(\\omega x+\\varphi=\\omega(x+\\varphi/\\omega)\\), je graf zamaknjen za \\(-\\varphi/\\omega\\). Pri \\(A=2\\), \\(\\omega=2\\), \\(\\varphi=\\pi/2\\) in \\(B=1\\) je največ \\(1+2=3\\), najmanj \\(1-2=-1\\), perioda \\(2\\pi/2=\\pi\\) in zamik \\(-(\\pi/2)/2=-\\pi/4\\).',
                'The factor \\(\\omega\\) squeezes the graph horizontally: the period is \\(2\\pi/\\omega\\). Since \\(\\omega x+\\varphi=\\omega(x+\\varphi/\\omega)\\), the graph is shifted by \\(-\\varphi/\\omega\\). For \\(A=2\\), \\(\\omega=2\\), \\(\\varphi=\\pi/2\\) and \\(B=1\\) the maximum is \\(1+2=3\\), the minimum \\(1-2=-1\\), the period \\(2\\pi/2=\\pi\\) and the shift \\(-(\\pi/2)/2=-\\pi/4\\).',
            ),
            formulaIds: ['trig-period-shift'], workedExampleId: 'trig-period-shift-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-period-shift-explanation', 'explanation'), frame('trig-period-shift-calculation', 'calculation'), frame('trig-period-shift-observation', 'observation')],
            observationPrompt: text(
                'Poišči najvišjo točko grafa blizu \\(x=0\\) in preveri njeno višino. Primerjaj razmik med dvema zaporednima vrhovoma z odčitkom periode.',
                'Find the highest point of the graph near \\(x=0\\) and check its height. Compare the distance between two consecutive peaks with the period readout.',
            ),
            expectedObservations: [text(
                'Največja vrednost je \\(3\\) pri \\(x=0\\), najmanjša \\(-1\\), razmik med vrhovoma je \\(\\pi\\approx3{,}14\\), zamik v inspektorju je \\(-\\pi/4\\approx-0{,}79\\).',
                'The maximum is \\(3\\) at \\(x=0\\), the minimum is \\(-1\\), the distance between peaks is \\(\\pi\\approx3.14\\) and the shift in the inspector is \\(-\\pi/4\\approx-0.79\\).',
            )],
            scene: {
                id: 'trig-worked-example', basedOn: 'demonstration-default',
                actions: [parameter('A', 2), parameter('omega', 2), parameter('phi', Math.PI / 2), parameter('B', 1)],
                expectedState: text(
                    'Prikazan je graf \\(f(x)=2\\sin(2x+\\pi/2)+1\\): zaloga vrednosti \\([-1,3]\\), perioda \\(\\pi\\), zamik \\(-\\pi/4\\).',
                    'The graph of \\(f(x)=2\\sin(2x+\\pi/2)+1\\) is shown: range \\([-1,3]\\), period \\(\\pi\\), shift \\(-\\pi/4\\).',
                ),
            },
        },
        {
            id: 'trig-tangent', order: 7,
            title: text('Tangens in asimptote', 'The tangent and its asymptotes'),
            purpose: text('Spoznati periodo \\(\\pi/\\omega\\), asimptote in odsotnost največje ter najmanjše vrednosti pri \\(\\tan\\).', 'Learning the period \\(\\pi/\\omega\\), the asymptotes and the absence of a maximum and a minimum for \\(\\tan\\).'),
            explanation: text(
                'Pri \\(\\tan\\) je perioda \\(\\pi/\\omega\\). Graf ima navpične asimptote, kjer je \\(\\cos(\\omega x+\\varphi)=0\\), torej pri \\(\\omega x+\\varphi=\\pi/2+m\\pi\\) za cele \\(m\\). Pri \\(\\omega=1\\) in \\(\\varphi=0\\) so v pogledu asimptote pri \\(x=\\pm\\pi/2\\approx\\pm1{,}57\\) in \\(x=\\pm3\\pi/2\\approx\\pm4{,}71\\). Med asimptotami graf (pri \\(A>0\\)) narašča čez vse vrednosti, zato nima največje ali najmanjše vrednosti in amplitude, zaloga vrednosti pa so vsa realna števila. Veje niso povezane čez asimptote.',
                'For \\(\\tan\\) the period is \\(\\pi/\\omega\\). The graph has vertical asymptotes where \\(\\cos(\\omega x+\\varphi)=0\\), that is at \\(\\omega x+\\varphi=\\pi/2+m\\pi\\) for integers \\(m\\). For \\(\\omega=1\\) and \\(\\varphi=0\\) the visible asymptotes are at \\(x=\\pm\\pi/2\\approx\\pm1.57\\) and \\(x=\\pm3\\pi/2\\approx\\pm4.71\\). Between asymptotes the graph (for \\(A>0\\)) rises through all values, so it has no maximum, no minimum and no amplitude, and its range is all real numbers. The branches are not joined across asymptotes.',
            ),
            formulaIds: ['trig-tan-asymptotes'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-tangent-explanation', 'explanation'), frame('trig-tangent-observation', 'observation')],
            observationPrompt: text(
                'Spremeni \\(\\omega\\) in \\(\\varphi\\) ter opazuj, kako se premikajo asimptote in kako se spreminja razmik med njimi.',
                'Change \\(\\omega\\) and \\(\\varphi\\) and watch how the asymptotes move and how the distance between them changes.',
            ),
            expectedObservations: [text(
                'Razmik med sosednjima asimptotama je enak periodi \\(\\pi/\\omega\\); namesto amplitude je prikazan pomišljaj, zaloga vrednosti so vsa realna števila.',
                'The distance between neighboring asymptotes equals the period \\(\\pi/\\omega\\); there is no amplitude (a dash is shown), and the range is all real numbers.',
            )],
            scene: {
                id: 'trig-tangent-scene', basedOn: 'demonstration-default',
                actions: [trigChoice('tan')],
                expectedState: text(
                    'Prikazan je graf \\(f(x)=\\tan x\\) z navpičnimi asimptotami pri \\(\\pi/2+m\\pi\\); perioda je \\(\\pi\\).',
                    'The graph of \\(f(x)=\\tan x\\) is shown with vertical asymptotes at \\(\\pi/2+m\\pi\\); the period is \\(\\pi\\).',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-trigonometric',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Appendix D: Trigonometry, and Section 1.3: New Functions from Old Functions.',
            supports: ['graphs of sin, cos and tan and their periods', 'amplitude, period and phase shift of A sin(ωx + φ) + B', 'cos x = sin(x + π/2)', 'vertical asymptotes of tan at π/2 + mπ'],
        },
        {
            id: 'efodx-trigonometric-functions-graph',
            citation: 'Owner\'s earlier app: efodx.github.io, src/graphs trigonometric-functions-graph (studied 2026-10-11).',
            supports: ['f(x) = A g(ωx + φ) + B for sin, cos and tan', 'sliders for the four parameters'],
            implementationCorrespondence: 'Bezeg keeps the function choice and the four parameter sliders, adds the dashed reference graph of g(x) and the midline y = B, draws tan branch by branch so that it is not joined across asymptotes, and shows amplitude, period, phase shift and range as readouts.',
        },
        {
            id: 'bezeg-trigonometric-implementation',
            citation: 'Bezeg source: src/analysis/trigonometric.ts and src/graphs/functions/TrigonometricFunctionsGraph.tsx.',
            supports: ['values, amplitude, period, phase shift and range', 'tangent asymptote positions and branches', 'phase slider with step π/12', 'reference graph toggle and midline'],
        },
    ],
    edgeCases: [
        text(
            'Vrednost \\(\\omega=0\\) ni dovoljena: funkcija bi bila konstantna in ne bi imela periode \\(2\\pi/\\omega\\). Drsnik teče od \\(0{,}25\\) do \\(4\\), uvoz shranjenih nastavitev in učni prizori pa vrednosti zunaj tega območja zavrnejo.',
            'The value \\(\\omega=0\\) is not allowed: the function would be constant and have no period \\(2\\pi/\\omega\\). The slider runs from \\(0.25\\) to \\(4\\), and importing saved settings and lesson scenes reject values outside that range.',
        ),
        text(
            'Pri \\(A=0\\) je \\(f(x)=B\\) konstanta: amplituda je \\(0\\) in zaloga vrednosti \\([B,B]\\). Pri \\(\\tan\\) funkcija v asimptotah ni definirana, zato graf nima točk na teh navpičnicah.',
            'For \\(A=0\\) we have \\(f(x)=B\\), a constant: the amplitude is \\(0\\) and the range is \\([B,B]\\). For \\(\\tan\\) the function is not defined at the asymptotes, so the graph has no points on those vertical lines.',
        ),
        text(
            'Drsnik \\(\\varphi\\) ima korak \\(\\pi/12\\), zato so \\(\\pm\\pi/2\\), \\(\\pm\\pi/3\\) in \\(\\pm\\pi/4\\) natančno dosegljive; zamik \\(-\\varphi/\\omega\\) je zapisan tudi kot večkratnik \\(\\pi\\), kadar je natančen.',
            'The slider \\(\\varphi\\) has the step \\(\\pi/12\\), so \\(\\pm\\pi/2\\), \\(\\pm\\pi/3\\) and \\(\\pm\\pi/4\\) are reachable exactly; the shift \\(-\\varphi/\\omega\\) is also written as a multiple of \\(\\pi\\) when it is exact.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija obravnava tudi negativno frekvenco \\(\\omega<0\\) in zapis \\(A\\,g(\\omega(x-x_0))+B\\).',
            'Before classroom-ready review, confirm whether the lesson should also treat a negative frequency \\(\\omega<0\\) and the form \\(A\\,g(\\omega(x-x_0))+B\\).',
        ),
    ],
};

const continuity: GuidedLesson = {
    demonstrationId: 'continuity',
    title: text('Zveznost', 'Continuity'),
    summary: text(
        'Odsekoma podana funkcija \\(f(x)=ax^2\\) za \\(x\\le1\\) in \\(f(x)=-ax+3\\) za \\(x>1\\) je pri \\(x=1\\) zvezna le za eno vrednost parametra \\(a\\): takrat se limiti z leve in z desne ujemata z vrednostjo \\(f(1)\\).',
        'The piecewise function \\(f(x)=ax^2\\) for \\(x\\le1\\) and \\(f(x)=-ax+3\\) for \\(x>1\\) is continuous at \\(x=1\\) for exactly one value of the parameter \\(a\\): then the limits from the left and from the right agree with the value \\(f(1)\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje funkcij \\(ax^2\\) in \\(-ax+3\\) ter odčitavanja vrednosti funkcije z grafa.', 'Assumes familiarity with the functions \\(ax^2\\) and \\(-ax+3\\) and with reading function values off a graph.'),
        text('Priporočeno je, da veš, kaj pomeni, da se \\(x\\) približuje številu z leve ali z desne.', 'It helps to know what it means for \\(x\\) to approach a number from the left or from the right.'),
    ],
    learningGoals: [
        text('Iz obeh delov funkcije izračunaš \\(f(1)\\), limito z leve, limito z desne in skok \\(|3-2a|\\).', 'Compute \\(f(1)\\), the limit from the left, the limit from the right and the jump \\(|3-2a|\\) from the two pieces.'),
        text('Poiščeš \\(a\\), pri katerem je funkcija zvezna pri \\(x=1\\), in preveriš, da se tedaj vse tri vrednosti ujemajo.', 'Find the \\(a\\) for which the function is continuous at \\(x=1\\) and check that all three values then agree.'),
        text('Razložiš, zakaj zvezna funkcija ni nujno gladka: naklona obeh delov pri \\(x=1\\) se lahko razlikujeta.', 'Explain why a continuous function need not be smooth: the slopes of the two pieces at \\(x=1\\) can differ.'),
    ],
    formulaBlocks: [
        {
            id: 'continuity-piecewise',
            latex: 'f(x)=\\begin{cases}ax^{2}, & x\\le 1\\\\ -ax+3, & x>1\\end{cases}',
            notation: text(
                'Za \\(x\\le1\\) velja prvi predpis, za \\(x>1\\) drugi; točka \\(x=1\\) spada v levi del.',
                'The first rule holds for \\(x\\le1\\) and the second for \\(x>1\\); the point \\(x=1\\) belongs to the left piece.',
            ),
            explanation: text(
                'Zato je \\(f(1)=a\\cdot1^2=a\\). Desni predpis pri \\(x=1\\) da \\(-a+3\\), vendar ta vrednost ni vrednost funkcije, ampak le limita z desne.',
                'Hence \\(f(1)=a\\cdot1^2=a\\). The right rule gives \\(-a+3\\) at \\(x=1\\), but this is not the value of the function, only the limit from the right.',
            ),
        },
        {
            id: 'continuity-one-sided',
            latex: '\\lim_{x\\to1^-}f(x)=a,\\qquad \\lim_{x\\to1^+}f(x)=3-a,\\qquad \\left|(3-a)-a\\right|=|3-2a|',
            notation: text(
                'Znak \\(1^-\\) pomeni približevanje z leve, znak \\(1^+\\) pa z desne.',
                'The sign \\(1^-\\) means approaching from the left and \\(1^+\\) approaching from the right.',
            ),
            explanation: text(
                'Vsak del je zvezna funkcija, zato limito dobimo kar z vstavitvijo \\(x=1\\) v ustrezni predpis. Razlika limit je skok.',
                'Each piece is a continuous function, so each limit is found by substituting \\(x=1\\) into the matching rule. The difference of the limits is the jump.',
            ),
        },
        {
            id: 'continuity-condition',
            latex: '\\lim_{x\\to1^-}f(x)=\\lim_{x\\to1^+}f(x)=f(1)',
            notation: text(
                'Funkcija je zvezna pri \\(x=1\\), če so leva limita, desna limita in vrednost \\(f(1)\\) enaka.',
                'The function is continuous at \\(x=1\\) if the left limit, the right limit and the value \\(f(1)\\) are equal.',
            ),
            explanation: text(
                'Ker je \\(f(1)=a\\) že enak levi limiti, ostane pogoj \\(a=3-a\\), to je \\(a=3/2\\).',
                'Since \\(f(1)=a\\) already equals the left limit, the remaining condition is \\(a=3-a\\), that is \\(a=3/2\\).',
            ),
        },
        {
            id: 'continuity-slopes',
            latex: 'k_{-}=2a,\\qquad k_{+}=-a',
            notation: text(
                'Naklon levega dela \\(k_{-}\\) je odvod \\(2ax\\) pri \\(x=1\\), naklon desnega dela \\(k_{+}\\) pa \\(-a\\). To sta naklona delov; enostranski odvod funkcije \\(f\\) v \\(x=1\\) z desne obstaja le, ko je funkcija tam zvezna.',
                'The slope of the left piece \\(k_{-}\\) is the derivative \\(2ax\\) at \\(x=1\\), and the slope of the right piece \\(k_{+}\\) is \\(-a\\). These are slopes of the pieces; the right-hand derivative of \\(f\\) at \\(x=1\\) exists only when the function is continuous there.',
            ),
            explanation: text(
                'Naklona se ujemata le pri \\(2a=-a\\), to je pri \\(a=0\\), tam pa funkcija ni zvezna. Zato ima zvezen graf te funkcije vedno ostri vogal.',
                'The slopes agree only when \\(2a=-a\\), that is at \\(a=0\\), where the function is not continuous. So the continuous graph of this function always has a corner.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'continuity-condition-example',
            title: text('Iskanje \\(a\\) za zveznost pri \\(x=1\\)', 'Finding \\(a\\) for continuity at \\(x=1\\)'),
            calculationLatex: 'a=3-a\\;\\Rightarrow\\;2a=3\\;\\Rightarrow\\;a=\\frac{3}{2},\\quad f(1)=\\frac{3}{2},\\quad \\lim_{x\\to1^-}f(x)=\\frac{3}{2},\\quad \\lim_{x\\to1^+}f(x)=3-\\frac{3}{2}=\\frac{3}{2}',
            resultLatex: 'a=\\frac{3}{2}',
            check: text(
                'Pri \\(a=3/2\\) so vse tri vrednosti enake \\(3/2\\), skok je \\(|3-2\\cdot\\frac{3}{2}|=0\\). Pri vsakem drugem \\(a\\) je skok \\(|3-2a|>0\\).',
                'For \\(a=3/2\\) all three values equal \\(3/2\\) and the jump is \\(|3-2\\cdot\\frac{3}{2}|=0\\). For every other \\(a\\) the jump \\(|3-2a|\\) is positive.',
            ),
        },
    ],
    steps: [
        {
            id: 'continuity-piecewise-step', order: 1,
            title: text('Odsekoma podana funkcija', 'A piecewise function'),
            purpose: text('Vrednost \\(f(1)\\) prebrati iz levega dela funkcije.', 'Reading the value \\(f(1)\\) from the left piece of the function.'),
            explanation: text(
                'Funkcija ima dva predpisa: \\(f(x)=ax^2\\) za \\(x\\le1\\) in \\(f(x)=-ax+3\\) za \\(x>1\\). Točka \\(x=1\\) spada v levi del, zato je \\(f(1)=a\\cdot1^2=a\\); pri privzetem \\(a=1\\) je \\(f(1)=1\\). Zapolnjena točka \\((1,a)\\) kaže to vrednost. Desni del se začne šele desno od \\(x=1\\).',
                'The function has two rules: \\(f(x)=ax^2\\) for \\(x\\le1\\) and \\(f(x)=-ax+3\\) for \\(x>1\\). The point \\(x=1\\) belongs to the left piece, so \\(f(1)=a\\cdot1^2=a\\); for the default \\(a=1\\) we get \\(f(1)=1\\). The filled point \\((1,a)\\) shows this value. The right piece starts only to the right of \\(x=1\\).',
            ),
            formulaIds: ['continuity-piecewise'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('continuity-piecewise-explanation', 'explanation'), frame('continuity-piecewise-observation', 'observation')],
            observationPrompt: text(
                'Premikaj drsnik \\(a\\) in opazuj zapolnjeno točko na navpičnici \\(x=1\\). Primerjaj njeno višino z odčitkom \\(f(1)\\).',
                'Move the slider \\(a\\) and watch the filled point on the vertical line \\(x=1\\). Compare its height with the readout \\(f(1)\\).',
            ),
            expectedObservations: [text(
                'Zapolnjena točka je vedno na višini \\(a\\) in odčitek \\(f(1)\\) je enak \\(a\\); pri \\(a=1\\) je \\(f(1)=1\\).',
                'The filled point is always at height \\(a\\) and the readout \\(f(1)\\) equals \\(a\\); for \\(a=1\\) we have \\(f(1)=1\\).',
            )],
            scene: {
                id: 'continuity-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazana sta oba dela funkcije pri \\(a=1\\): zapolnjena točka \\((1,1)\\) in votla točka \\((1,2)\\).',
                    'Both pieces are shown for \\(a=1\\): the filled point \\((1,1)\\) and the hollow point \\((1,2)\\).',
                ),
            },
        },
        {
            id: 'continuity-one-sided-step', order: 2,
            title: text('Enostranski limiti in skok', 'One-sided limits and the jump'),
            purpose: text('Limito z leve, limito z desne in skok izračunati iz obeh predpisov.', 'Computing the limit from the left, the limit from the right and the jump from the two rules.'),
            explanation: text(
                'Ko se \\(x\\) približuje \\(1\\) z leve, računamo z levim predpisom: \\(\\lim_{x\\to1^-}f(x)=a\\). Z desne računamo z desnim predpisom: \\(\\lim_{x\\to1^+}f(x)=-a\\cdot1+3=3-a\\). Votla točka \\((1,3-a)\\) kaže limito z desne; to ni vrednost funkcije, ker \\(x=1\\) ne spada v desni del. Razlika je skok \\(|(3-a)-a|=|3-2a|\\). Pri \\(a=1\\) je leva limita \\(1\\), desna \\(2\\) in skok \\(1\\).',
                'When \\(x\\) approaches \\(1\\) from the left we use the left rule: \\(\\lim_{x\\to1^-}f(x)=a\\). From the right we use the right rule: \\(\\lim_{x\\to1^+}f(x)=-a\\cdot1+3=3-a\\). The hollow point \\((1,3-a)\\) shows the limit from the right; it is not the value of the function, because \\(x=1\\) does not belong to the right piece. The difference is the jump \\(|(3-a)-a|=|3-2a|\\). For \\(a=1\\) the left limit is \\(1\\), the right limit is \\(2\\) and the jump is \\(1\\).',
            ),
            formulaIds: ['continuity-one-sided'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('continuity-one-sided-explanation', 'explanation'), frame('continuity-one-sided-observation', 'observation')],
            observationPrompt: text(
                'Poišči zapolnjeno in votlo točko ter odčitaj navpično razdaljo med njima. Primerjaj jo z odčitkom skoka.',
                'Find the filled and the hollow point and read off the vertical distance between them. Compare it with the jump readout.',
            ),
            expectedObservations: [text(
                'Pri \\(a=1\\) je razdalja med točkama \\(1\\), enaka skoku \\(|3-2\\cdot1|=1\\); točki sta obarvani rdečkasto in na grafu piše, da je skok \\(1\\).',
                'For \\(a=1\\) the distance between the points is \\(1\\), equal to the jump \\(|3-2\\cdot1|=1\\); the points are colored terracotta and the board says the jump is \\(1\\).',
            )],
            scene: {
                id: 'continuity-jump-example', basedOn: 'demonstration-default',
                actions: [parameter('a', 1)],
                expectedState: text(
                    'Pri \\(a=1\\): leva limita \\(1\\), desna limita \\(2\\), skok \\(1\\); funkcija ni zvezna pri \\(x=1\\).',
                    'For \\(a=1\\): left limit \\(1\\), right limit \\(2\\), jump \\(1\\); the function is not continuous at \\(x=1\\).',
                ),
            },
        },
        {
            id: 'continuity-condition-step', order: 3,
            title: text('Pogoj za zveznost', 'The condition for continuity'),
            purpose: text('Iz pogoja \\(a=3-a\\) izračunati parameter, pri katerem je funkcija zvezna.', 'Computing from the condition \\(a=3-a\\) the parameter for which the function is continuous.'),
            explanation: text(
                'Funkcija je zvezna pri \\(x=1\\), če je \\(\\lim_{x\\to1^-}f(x)=\\lim_{x\\to1^+}f(x)=f(1)\\). Ker je \\(f(1)=a\\) že enak levi limiti, ostane pogoj \\(a=3-a\\). Iz njega sledi \\(2a=3\\), torej \\(a=3/2\\). Pri tej vrednosti je \\(f(1)=3/2\\), leva limita \\(3/2\\) in desna limita \\(3-3/2=3/2\\). Pri privzetem \\(a=1\\) pogoj ni izpolnjen.',
                'The function is continuous at \\(x=1\\) if \\(\\lim_{x\\to1^-}f(x)=\\lim_{x\\to1^+}f(x)=f(1)\\). Since \\(f(1)=a\\) already equals the left limit, the remaining condition is \\(a=3-a\\). It gives \\(2a=3\\), so \\(a=3/2\\). For this value \\(f(1)=3/2\\), the left limit is \\(3/2\\) and the right limit is \\(3-3/2=3/2\\). For the default \\(a=1\\) the condition is not met.',
            ),
            formulaIds: ['continuity-condition'], workedExampleId: 'continuity-condition-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('continuity-condition-explanation', 'explanation'), frame('continuity-condition-calculation', 'calculation'), frame('continuity-condition-observation', 'observation')],
            observationPrompt: text(
                'Poskusi z drsnikom \\(a\\) najti vrednost, pri kateri se zapolnjena in votla točka pokrijeta. Kaj se zgodi z barvo točk in z odčitkom skoka?',
                'Try the slider \\(a\\) to find the value at which the filled and the hollow point coincide. What happens to the color of the points and to the jump readout?',
            ),
            expectedObservations: [text(
                'Točki se pokrijeta pri \\(a=3/2\\); takrat sta zeleni, skok je \\(0\\) in pri vsaki drugi vrednosti \\(a\\) je skok pozitiven.',
                'The points coincide at \\(a=3/2\\); then they are green and the jump is \\(0\\), while for every other value of \\(a\\) the jump is positive.',
            )],
            scene: {
                id: 'continuity-condition-scene', basedOn: 'demonstration-default',
                actions: [parameter('a', 1)],
                expectedState: text(
                    'Pri \\(a=1\\) pogoj \\(a=3-a\\) ni izpolnjen: točki se ne pokrivata.',
                    'For \\(a=1\\) the condition \\(a=3-a\\) is not met: the points do not coincide.',
                ),
            },
        },
        {
            id: 'continuity-continuous-step', order: 4,
            title: text('Zvezna funkcija pri \\(a=3/2\\)', 'The continuous function at \\(a=3/2\\)'),
            purpose: text('Preveriti, da se pri \\(a=3/2\\) obe točki pokrijeta in skoka ni.', 'Checking that for \\(a=3/2\\) both points coincide and there is no jump.'),
            explanation: text(
                'Pri \\(a=3/2\\) leži zapolnjena točka \\((1,3/2)\\) znotraj votle: obe sta zeleni, skok je \\(0\\) in na grafu piše, da je funkcija zvezna pri \\(x=1\\). Drsnik ima korak \\(0{,}05\\), zato je \\(a=1{,}5\\) dosegljiv; odločitev o zveznosti dopušča razliko \\(10^{-9}\\), da zaokrožitvene napake pri premikanju drsnika ne bi skrile zveznosti.',
                'For \\(a=3/2\\) the filled point \\((1,3/2)\\) sits inside the hollow one: both are green, the jump is \\(0\\) and the board says the function is continuous at \\(x=1\\). The slider has the step \\(0.05\\), so \\(a=1.5\\) is reachable; the decision about continuity allows a difference of \\(10^{-9}\\), so that rounding errors from moving the slider do not hide continuity.',
            ),
            formulaIds: ['continuity-condition'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('continuity-continuous-explanation', 'explanation'), frame('continuity-continuous-observation', 'observation')],
            observationPrompt: text(
                'Premakni drsnik \\(a\\) za en korak v vsako smer in opazuj, kdaj se točki razmakneta in kdaj se barva spremeni.',
                'Move the slider \\(a\\) one step in each direction and watch when the points separate and when the color changes.',
            ),
            expectedObservations: [text(
                'Pri \\(a=3/2\\) je skok \\(0\\); pri \\(a=1{,}45\\) in \\(a=1{,}55\\) je skok \\(0{,}1\\) in barva se spremeni.',
                'At \\(a=3/2\\) the jump is \\(0\\); at \\(a=1.45\\) and \\(a=1.55\\) the jump is \\(0.1\\) and the color changes.',
            )],
            scene: {
                id: 'continuity-continuous-scene', basedOn: 'demonstration-default',
                actions: [parameter('a', 1.5)],
                expectedState: text(
                    'Pri \\(a=3/2\\): \\(f(1)=3/2\\), obe limiti \\(3/2\\), skok \\(0\\); funkcija je zvezna pri \\(x=1\\).',
                    'For \\(a=3/2\\): \\(f(1)=3/2\\), both limits \\(3/2\\), jump \\(0\\); the function is continuous at \\(x=1\\).',
                ),
            },
        },
        {
            id: 'continuity-not-smooth', order: 5,
            title: text('Zvezna ni nujno gladka', 'Continuous is not smooth'),
            purpose: text('Primerjati naklona obeh delov pri \\(x=1\\) in ju povezati z zveznostjo \\(C^0\\) in \\(C^1\\).', 'Comparing the slopes of the two pieces at \\(x=1\\) and linking them to \\(C^0\\) and \\(C^1\\) continuity.'),
            explanation: text(
                'Pri \\(a=3/2\\) je graf zvezen, a ima pri \\(x=1\\) ostri vogal. Levi del ima tam naklon \\(2a=3\\), desni pa \\(-a=-1{,}5\\). Ker se naklona razlikujeta, funkcija ni gladka. Isto razliko srečaš pri zlepkih: zveznost \\(C^0\\) pomeni samo, da se deli stikajo, zveznost \\(C^1\\) pa zahteva še enak naklon v stičišču.',
                'For \\(a=3/2\\) the graph is continuous but has a corner at \\(x=1\\). The left piece has the slope \\(2a=3\\) there and the right piece has \\(-a=-1.5\\). Because the slopes differ, the function is not smooth. You meet the same distinction for splines: \\(C^0\\) continuity only means that the pieces join, while \\(C^1\\) continuity also requires equal slopes at the joint.',
            ),
            formulaIds: ['continuity-slopes'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('continuity-not-smooth-explanation', 'explanation'), frame('continuity-not-smooth-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj odčitka levega in desnega naklona ter poišči vogal na grafu. Ali obstaja \\(a\\), pri katerem sta naklona enaka?',
                'Compare the readouts of the left and the right slope and find the corner on the graph. Is there an \\(a\\) for which the slopes are equal?',
            ),
            expectedObservations: [text(
                'Naklona sta \\(3\\) in \\(-1{,}5\\); enaka bi bila le pri \\(2a=-a\\), to je pri \\(a=0\\), tam pa skok \\(3\\) uniči zveznost.',
                'The slopes are \\(3\\) and \\(-1.5\\); they would be equal only for \\(2a=-a\\), that is \\(a=0\\), but there the jump \\(3\\) destroys continuity.',
            )],
            scene: {
                id: 'continuity-slopes-scene', basedOn: 'demonstration-default',
                actions: [parameter('a', 1.5)],
                expectedState: text(
                    'Pri \\(a=3/2\\) je graf zvezen z ostrim vogalom pri \\(x=1\\); levi naklon \\(3\\), desni naklon \\(-1{,}5\\).',
                    'For \\(a=3/2\\) the graph is continuous with a corner at \\(x=1\\); the left slope is \\(3\\) and the right slope is \\(-1.5\\).',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-continuity',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Section 2.2: The Limit of a Function (one-sided limits), and Section 2.5: Continuity.',
            supports: ['definition of continuity at a point by lim f(x) = f(a)', 'one-sided limits and the jump discontinuity', 'piecewise functions and the choice of a parameter for continuity'],
        },
        {
            id: 'efodx-continuity-graph',
            citation: 'Earlier app by the owner: efodx.github.io, src/graphs continuity-graph (studied 2026-10-11).',
            supports: ['piecewise f(x) = a x^2 for x <= 1 and -a x + 3 for x > 1', 'points marking the two one-sided values'],
            implementationCorrespondence: 'Bezeg keeps the two pieces and the points at the one-sided values, clips each piece to its own domain, compares the values with a stated tolerance of 10^-9 instead of ===, and adds the status text, the jump and the one-sided slopes as readouts.',
        },
        {
            id: 'bezeg-continuity-implementation',
            citation: 'Bezeg source: src/analysis/continuity.ts and src/graphs/functions/ContinuityGraph.tsx.',
            supports: ['pieces, one-sided limits, jump and one-sided slopes', 'continuity test with the tolerance 1e-9', 'slider a in [0, 3] with step 0.05', 'filled and hollow point colored by continuity'],
        },
    ],
    edgeCases: [
        text(
            'Pri \\(a=0\\) je levi del ničelna funkcija \\(0\\) za \\(x\\le1\\), \\(f(1)=0\\), desna limita je \\(3\\) in skok je \\(3\\). Enak skok \\(3\\) je pri \\(a=3\\). Zveznost je dosegljiva samo pri \\(a=3/2\\).',
            'For \\(a=0\\) the left piece is the zero function for \\(x\\le1\\), \\(f(1)=0\\), the right limit is \\(3\\) and the jump is \\(3\\). The same jump \\(3\\) occurs at \\(a=3\\). Continuity is reachable only at \\(a=3/2\\).',
        ),
        text(
            'Drsnik ima korak \\(0{,}05\\), zato je \\(a=1{,}5\\) natančno dosegljiv. Zaradi seštevanja decimalk lahko drsnik vrne tudi število, ki se od \\(1{,}5\\) razlikuje za manj kot \\(10^{-9}\\); takšna vrednost šteje kot zvezna, razlika \\(10^{-7}\\) pa ne.',
            'The slider has the step \\(0.05\\), so \\(a=1.5\\) is reachable exactly. Because of decimal addition the slider may also return a number that differs from \\(1.5\\) by less than \\(10^{-9}\\); such a value counts as continuous, while a difference of \\(10^{-7}\\) does not.',
        ),
        text(
            'Točka \\(x=1\\) spada samo v levi del. Zato je \\(f(1)=a\\), ne \\(3-a\\); votla točka \\((1,3-a)\\) ni vrednost funkcije.',
            'The point \\(x=1\\) belongs only to the left piece. So \\(f(1)=a\\), not \\(3-a\\); the hollow point \\((1,3-a)\\) is not a value of the function.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija zveznost obravnava tudi z zapisom \\(\\varepsilon\\)-\\(\\delta\\).',
            'Before classroom-ready review, confirm whether the lesson should also treat continuity with the \\(\\varepsilon\\)-\\(\\delta\\) notation.',
        ),
    ],
};

const derivativeChoice = (value: 'square' | 'sin' | 'exp'): SceneAction => ({name: 'set-function-choice', value: {name: 'derivative-function', value}});
const tangentVisibility = (visible: boolean): SceneAction => ({name: 'show-function-element', value: {name: 'tangent', value: visible}});

const derivative: GuidedLesson = {
    demonstrationId: 'derivative',
    title: text('Odvod', 'Derivative'),
    summary: text(
        'Sekanta skozi \\(P=(x_0,f(x_0))\\) in \\(Q=(x_0+h,f(x_0+h))\\) ima naklon, ki ga imenujemo diferenčni kvocient. Ko se \\(h\\) bliža \\(0\\), se sekanta bliža tangenti, njen naklon pa odvodu \\(f\'(x_0)\\).',
        'The secant through \\(P=(x_0,f(x_0))\\) and \\(Q=(x_0+h,f(x_0+h))\\) has a slope called the difference quotient. As \\(h\\) approaches \\(0\\), the secant approaches the tangent and its slope approaches the derivative \\(f\'(x_0)\\).',
    ),
    prerequisites: [
        text('Potrebno je poznavanje naklona premice \\(k=\\Delta y/\\Delta x\\) in odčitavanja vrednosti funkcije z grafa.', 'Assumes familiarity with the slope of a line \\(k=\\Delta y/\\Delta x\\) and with reading function values off a graph.'),
        text('Priporočeno je, da veš, kaj pomeni, da se \\(h\\) približuje številu \\(0\\).', 'It helps to know what it means for \\(h\\) to approach \\(0\\).'),
    ],
    learningGoals: [
        text('Izračunaš naklon sekante, to je diferenčni kvocient \\(\\frac{f(x_0+h)-f(x_0)}{h}\\).', 'Compute the slope of the secant, that is the difference quotient \\(\\frac{f(x_0+h)-f(x_0)}{h}\\).'),
        text('Pri \\(f(x)=x^2\\) kvocient poenostaviš v \\(2+h\\) in iz tega razbereš \\(f\'(1)=2\\).', 'For \\(f(x)=x^2\\) simplify the quotient to \\(2+h\\) and read off \\(f\'(1)=2\\).'),
        text('Razložiš, zakaj \\(h=0\\) ni dovoljen, in zakaj se kvocient približuje odvodu z obeh strani, pri \\(h>0\\) in pri \\(h<0\\).', 'Explain why \\(h=0\\) is not allowed and why the quotient approaches the derivative from both sides, for \\(h>0\\) and for \\(h<0\\).'),
    ],
    formulaBlocks: [
        {
            id: 'derivative-difference-quotient',
            latex: 'm_{\\mathrm{sek}}=\\frac{f(x_0+h)-f(x_0)}{h}',
            notation: text(
                'Število \\(h\\) je vodoravni razmik med \\(P\\) in \\(Q\\); lahko je pozitivno ali negativno, ne pa \\(0\\).',
                'The number \\(h\\) is the horizontal distance from \\(P\\) to \\(Q\\); it can be positive or negative, but not \\(0\\).',
            ),
            explanation: text(
                'To je naklon \\(\\Delta y/\\Delta x\\) premice skozi \\(P=(x_0,f(x_0))\\) in \\(Q=(x_0+h,f(x_0+h))\\), torej naklon sekante.',
                'This is the slope \\(\\Delta y/\\Delta x\\) of the line through \\(P=(x_0,f(x_0))\\) and \\(Q=(x_0+h,f(x_0+h))\\), that is the slope of the secant.',
            ),
        },
        {
            id: 'derivative-square-quotient',
            latex: '\\frac{(1+h)^{2}-1}{h}=\\frac{2h+h^{2}}{h}=2+h',
            notation: text(
                'Za \\(f(x)=x^2\\) in \\(x_0=1\\) velja \\(f(1+h)=(1+h)^2\\) in \\(f(1)=1\\).',
                'For \\(f(x)=x^2\\) and \\(x_0=1\\) we have \\(f(1+h)=(1+h)^2\\) and \\(f(1)=1\\).',
            ),
            explanation: text(
                'Ker je \\(h\\ne0\\), smemo okrajšati \\(h\\) v števcu \\(2h+h^2\\). Izraz \\(2+h\\) velja za vsak \\(h\\ne0\\).',
                'Since \\(h\\ne0\\), we may cancel \\(h\\) in the numerator \\(2h+h^2\\). The expression \\(2+h\\) holds for every \\(h\\ne0\\).',
            ),
        },
        {
            id: 'derivative-limit',
            latex: 'f\'(x_0)=\\lim_{h\\to0}\\frac{f(x_0+h)-f(x_0)}{h}',
            notation: text(
                'Odvod je limita diferenčnega kvocienta, ko gre \\(h\\) proti \\(0\\) z desne ali z leve.',
                'The derivative is the limit of the difference quotient as \\(h\\) goes to \\(0\\) from the right or from the left.',
            ),
            explanation: text(
                'Pri \\(f(x)=x^2\\) je \\(f\'(x)=2x\\), pri \\(\\sin x\\) je \\(\\cos x\\), pri \\(e^x\\) pa spet \\(e^x\\). Tangenta je premica skozi \\(P\\) z naklonom \\(f\'(x_0)\\).',
                'For \\(f(x)=x^2\\) we have \\(f\'(x)=2x\\), for \\(\\sin x\\) it is \\(\\cos x\\) and for \\(e^x\\) again \\(e^x\\). The tangent is the line through \\(P\\) with slope \\(f\'(x_0)\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'derivative-square-example',
            title: text('Kvocient za \\(f(x)=x^2\\) pri \\(x_0=1\\)', 'The quotient for \\(f(x)=x^2\\) at \\(x_0=1\\)'),
            calculationLatex: '\\frac{(1+h)^{2}-1}{h}=\\frac{2h+h^{2}}{h}=2+h,\\quad h=1:\\ 3,\\quad h=\\frac{1}{2}:\\ \\frac{5}{2},\\quad h=\\frac{1}{10}:\\ \\frac{21}{10}',
            resultLatex: 'f\'(1)=2',
            check: text(
                'Za \\(h=1\\) je \\(Q=(2,4)\\) in naklon \\((4-1)/1=3\\). Za \\(h=0{,}5\\) je \\(Q=(1{,}5;\\,2{,}25)\\) in naklon \\((2{,}25-1)/0{,}5=2{,}5\\). Oba se ujemata z \\(2+h\\).',
                'For \\(h=1\\) we get \\(Q=(2,4)\\) and the slope \\((4-1)/1=3\\). For \\(h=0.5\\) we get \\(Q=(1.5,\\,2.25)\\) and the slope \\((2.25-1)/0.5=2.5\\). Both agree with \\(2+h\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'derivative-secant-step', order: 1,
            title: text('Sekanta in njen naklon', 'The secant and its slope'),
            purpose: text('Naklon sekante izračunati kot diferenčni kvocient.', 'Computing the slope of the secant as the difference quotient.'),
            explanation: text(
                'Točka \\(P=(x_0,f(x_0))\\) leži na grafu, točka \\(Q=(x_0+h,f(x_0+h))\\) pa je za \\(h\\) vodoravno od nje. Premica skozi \\(P\\) in \\(Q\\) je sekanta; njen naklon je razmerje \\(\\Delta y/\\Delta x\\), to je diferenčni kvocient \\(\\frac{f(x_0+h)-f(x_0)}{h}\\). Pri privzetem \\(f(x)=x^2\\), \\(x_0=1\\) in \\(h=1\\) je \\(P=(1,1)\\), \\(Q=(2,4)\\) in naklon \\((4-1)/1=3\\).',
                'The point \\(P=(x_0,f(x_0))\\) lies on the graph, and the point \\(Q=(x_0+h,f(x_0+h))\\) is \\(h\\) horizontally away from it. The line through \\(P\\) and \\(Q\\) is the secant; its slope is the ratio \\(\\Delta y/\\Delta x\\), that is the difference quotient \\(\\frac{f(x_0+h)-f(x_0)}{h}\\). For the default \\(f(x)=x^2\\), \\(x_0=1\\) and \\(h=1\\) we get \\(P=(1,1)\\), \\(Q=(2,4)\\) and the slope \\((4-1)/1=3\\).',
            ),
            formulaIds: ['derivative-difference-quotient'], learnerInteraction: 'drag-control-point',
            frames: [frame('derivative-secant-explanation', 'explanation'), frame('derivative-secant-observation', 'observation')],
            observationPrompt: text(
                'Povleci točko \\(P\\) po grafu in premakni drsnik \\(h\\). Primerjaj naklon sekante na grafu z odčitkom diferenčnega kvocienta.',
                'Drag the point \\(P\\) along the graph and move the slider \\(h\\). Compare the slope of the secant on the board with the difference quotient readout.',
            ),
            expectedObservations: [text(
                'Točka \\(P\\) ostane na grafu, točka \\(Q\\) je vedno za \\(h\\) desno od nje; pri \\(x_0=1\\) in \\(h=1\\) je naklon sekante \\(3\\).',
                'The point \\(P\\) stays on the graph and \\(Q\\) is always \\(h\\) to the right of it; for \\(x_0=1\\) and \\(h=1\\) the slope of the secant is \\(3\\).',
            )],
            scene: {
                id: 'derivative-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazan je graf \\(x^2\\) s točkama \\(P=(1,1)\\), \\(Q=(2,4)\\) in sekanto z naklonom \\(3\\); tangenta je skrita.',
                    'The graph of \\(x^2\\) is shown with the points \\(P=(1,1)\\), \\(Q=(2,4)\\) and the secant with slope \\(3\\); the tangent is hidden.',
                ),
            },
        },
        {
            id: 'derivative-quotient-step', order: 2,
            title: text('Izračun kvocienta za \\(x^2\\)', 'Computing the quotient for \\(x^2\\)'),
            purpose: text('Kvocient za \\(f(x)=x^2\\) poenostaviti v \\(2+h\\).', 'Simplifying the quotient for \\(f(x)=x^2\\) to \\(2+h\\).'),
            explanation: text(
                'Za \\(f(x)=x^2\\) in \\(x_0=1\\) je \\(\\frac{(1+h)^2-1}{h}=\\frac{2h+h^2}{h}=2+h\\). Pri \\(h=1\\) dobimo \\(3\\), pri \\(h=0{,}5\\) pa \\(2{,}5\\). Scena nastavi \\(h=0{,}5\\): točka \\(Q=(1{,}5;\\,2{,}25)\\) in naklon sekante \\(2{,}5\\).',
                'For \\(f(x)=x^2\\) and \\(x_0=1\\) we have \\(\\frac{(1+h)^2-1}{h}=\\frac{2h+h^2}{h}=2+h\\). For \\(h=1\\) we get \\(3\\) and for \\(h=0.5\\) we get \\(2.5\\). The scene sets \\(h=0.5\\): the point \\(Q=(1.5,\\,2.25)\\) and the secant slope \\(2.5\\).',
            ),
            formulaIds: ['derivative-square-quotient'], workedExampleId: 'derivative-square-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('derivative-quotient-explanation', 'explanation'), frame('derivative-quotient-calculation', 'calculation'), frame('derivative-quotient-observation', 'observation')],
            observationPrompt: text(
                'Nastavi nekaj vrednosti \\(h\\) in za vsako primerjaj odčitek kvocienta z izrazom \\(2+h\\).',
                'Set a few values of \\(h\\) and for each compare the quotient readout with the expression \\(2+h\\).',
            ),
            expectedObservations: [text(
                'Odčitek kvocienta je vedno enak \\(2+h\\): \\(3\\) pri \\(h=1\\), \\(2{,}5\\) pri \\(h=0{,}5\\); pri \\(h=0{,}5\\) je \\(f(1+h)=2{,}25\\).',
                'The quotient readout always equals \\(2+h\\): \\(3\\) at \\(h=1\\), \\(2.5\\) at \\(h=0.5\\); at \\(h=0.5\\) we have \\(f(1+h)=2.25\\).',
            )],
            scene: {
                id: 'derivative-quotient-scene', basedOn: 'demonstration-default',
                actions: [parameter('h', 0.5)],
                expectedState: text(
                    'Pri \\(h=0{,}5\\): \\(Q=(1{,}5;\\,2{,}25)\\), naklon sekante \\(2{,}5\\), \\(f\'(1)=2\\).',
                    'For \\(h=0.5\\): \\(Q=(1.5,\\,2.25)\\), secant slope \\(2.5\\), \\(f\'(1)=2\\).',
                ),
            },
        },
        {
            id: 'derivative-shrinking-step', order: 3,
            title: text('Manjši \\(h\\): sekanta se bliža tangenti', 'Smaller \\(h\\): the secant approaches the tangent'),
            purpose: text('Videti, da se kvocient \\(2+h\\) bliža številu \\(2=f\'(1)\\).', 'Seeing that the quotient \\(2+h\\) approaches \\(2=f\'(1)\\).'),
            explanation: text(
                'Ko se \\(h\\) manjša, se \\(Q\\) bliža točki \\(P\\) in sekanta se obrača proti tangenti. Pri \\(h=0{,}1\\) je kvocient \\(2+0{,}1=2{,}1\\), pri \\(h=0{,}01\\) pa \\(2{,}01\\). Vrednosti se bližajo številu \\(2\\), to je odvodu \\(f\'(1)=2\\cdot1=2\\). Odvod je limita \\(\\lim_{h\\to0}(2+h)=2\\).',
                'As \\(h\\) shrinks, \\(Q\\) approaches \\(P\\) and the secant turns towards the tangent. At \\(h=0.1\\) the quotient is \\(2+0.1=2.1\\) and at \\(h=0.01\\) it is \\(2.01\\). The values approach \\(2\\), the derivative \\(f\'(1)=2\\cdot1=2\\). The derivative is the limit \\(\\lim_{h\\to0}(2+h)=2\\).',
            ),
            formulaIds: ['derivative-limit'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('derivative-shrinking-explanation', 'explanation'), frame('derivative-shrinking-observation', 'observation')],
            observationPrompt: text(
                'Počasi manjšaj \\(h\\) do \\(0{,}01\\) in opazuj odčitek razlike med kvocientom in \\(f\'(1)\\).',
                'Slowly decrease \\(h\\) down to \\(0.01\\) and watch the readout of the difference between the quotient and \\(f\'(1)\\).',
            ),
            expectedObservations: [text(
                'Pri \\(h=0{,}1\\) je kvocient \\(2{,}1\\) in razlika \\(0{,}1\\); pri \\(h=0{,}01\\) je razlika \\(0{,}01\\). Razlika je enaka \\(h\\).',
                'At \\(h=0.1\\) the quotient is \\(2.1\\) and the difference is \\(0.1\\); at \\(h=0.01\\) the difference is \\(0.01\\). The difference equals \\(h\\).',
            )],
            scene: {
                id: 'derivative-shrinking-scene', basedOn: 'demonstration-default',
                actions: [parameter('h', 0.1)],
                expectedState: text(
                    'Pri \\(h=0{,}1\\): \\(Q=(1{,}1;\\,1{,}21)\\), naklon sekante \\(2{,}1\\), \\(f\'(1)=2\\).',
                    'For \\(h=0.1\\): \\(Q=(1.1,\\,1.21)\\), secant slope \\(2.1\\), \\(f\'(1)=2\\).',
                ),
            },
        },
        {
            id: 'derivative-tangent-step', order: 4,
            title: text('Tangenta in negativen \\(h\\)', 'The tangent and a negative \\(h\\)'),
            purpose: text('Tangento prikazati kot mejno premico in preveriti, da se kvocient bliža odvodu tudi z leve.', 'Showing the tangent as the limit line and checking that the quotient approaches the derivative from the left as well.'),
            explanation: text(
                'Tangenta je premica skozi \\(P\\) z naklonom \\(f\'(x_0)\\); prikažeš jo s stikalom. Pri negativnem \\(h\\) leži \\(Q\\) levo od \\(P\\). Za \\(h=-0{,}5\\) je \\(Q=(0{,}5;\\,0{,}25)\\) in kvocient \\(\\frac{0{,}25-1}{-0{,}5}=1{,}5=2+h\\). Tudi z leve se kvocient bliža številu \\(2\\).',
                'The tangent is the line through \\(P\\) with slope \\(f\'(x_0)\\); you show it with the switch. For a negative \\(h\\), the point \\(Q\\) lies to the left of \\(P\\). For \\(h=-0.5\\) we get \\(Q=(0.5,\\,0.25)\\) and the quotient \\(\\frac{0.25-1}{-0.5}=1.5=2+h\\). From the left as well, the quotient approaches \\(2\\).',
            ),
            formulaIds: ['derivative-limit'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('derivative-tangent-explanation', 'explanation'), frame('derivative-tangent-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj črtkano tangento s sekanto, ko je \\(h\\) pozitiven in ko je negativen. Na kateri strani od \\(P\\) leži \\(Q\\)?',
                'Compare the dashed tangent with the secant when \\(h\\) is positive and when it is negative. On which side of \\(P\\) does \\(Q\\) lie?',
            ),
            expectedObservations: [text(
                'Pri \\(h=-0{,}5\\) je naklon sekante \\(1{,}5\\), manj kot naklon tangente \\(2\\); pri \\(h=0{,}5\\) je \\(2{,}5\\), več kot \\(2\\). Ko se \\(|h|\\) manjša, se sekanta z obeh strani bliža tangenti.',
                'At \\(h=-0.5\\) the secant slope is \\(1.5\\), below the tangent slope \\(2\\); at \\(h=0.5\\) it is \\(2.5\\), above \\(2\\). As \\(|h|\\) shrinks, the secant approaches the tangent from both sides.',
            )],
            scene: {
                id: 'derivative-tangent-scene', basedOn: 'demonstration-default',
                actions: [parameter('h', -0.5), tangentVisibility(true)],
                expectedState: text(
                    'Pri \\(h=-0{,}5\\): \\(Q=(0{,}5;\\,0{,}25)\\), naklon sekante \\(1{,}5\\); črtkana tangenta ima naklon \\(2\\).',
                    'For \\(h=-0.5\\): \\(Q=(0.5,\\,0.25)\\), secant slope \\(1.5\\); the dashed tangent has slope \\(2\\).',
                ),
            },
        },
        {
            id: 'derivative-sin-step', order: 5,
            title: text('Opazovanje pri \\(\\sin x\\)', 'An observation with \\(\\sin x\\)'),
            purpose: text('Isti postopek preizkusiti na funkciji, kjer odvoda ne moremo uganiti iz poenostavitve.', 'Trying the same procedure on a function where the derivative cannot be guessed from a simplification.'),
            explanation: text(
                'Izberi \\(f(x)=\\sin x\\) pri \\(x_0=1\\). Odvod je \\(\\cos 1\\approx0{,}5403\\). Pri \\(h=0{,}2\\) je kvocient \\(\\frac{\\sin1{,}2-\\sin1}{0{,}2}\\approx0{,}4528\\), torej za približno \\(0{,}0875\\) manj. Pri \\(h=0{,}01\\) je kvocient \\(\\approx0{,}5361\\). Kvocient se bliža vrednosti \\(\\cos1\\), vendar \\(h\\) ne sme postati \\(0\\): tam bi bil kvocient \\(0/0\\).',
                'Choose \\(f(x)=\\sin x\\) at \\(x_0=1\\). The derivative is \\(\\cos 1\\approx0.5403\\). At \\(h=0.2\\) the quotient is \\(\\frac{\\sin1.2-\\sin1}{0.2}\\approx0.4528\\), about \\(0.0875\\) below it. At \\(h=0.01\\) the quotient is \\(\\approx0.5361\\). The quotient approaches \\(\\cos1\\), but \\(h\\) must never become \\(0\\): there the quotient would be \\(0/0\\).',
            ),
            formulaIds: ['derivative-limit'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('derivative-sin-explanation', 'explanation'), frame('derivative-sin-observation', 'observation')],
            observationPrompt: text(
                'Manjšaj \\(h\\) in primerjaj kvocient z natančnim odvodom \\(\\cos x_0\\). Poskusi tudi povleči \\(P\\) po grafu in poišči mesto z vodoravno tangento.',
                'Decrease \\(h\\) and compare the quotient with the exact derivative \\(\\cos x_0\\). Also try dragging \\(P\\) along the graph and find the place with a horizontal tangent.',
            ),
            expectedObservations: [text(
                'Pri \\(h=0{,}2\\) je kvocient \\(0{,}4528\\) in odvod \\(0{,}5403\\); razlika je približno \\(-0{,}0875\\). Manjši kot je \\(|h|\\), manjša je razlika.',
                'At \\(h=0.2\\) the quotient is \\(0.4528\\) and the derivative is \\(0.5403\\); the difference is about \\(-0.0875\\). The smaller \\(|h|\\) is, the smaller the difference.',
            )],
            scene: {
                id: 'derivative-sin-scene', basedOn: 'demonstration-default',
                actions: [derivativeChoice('sin'), parameter('x0', 1), parameter('h', 0.2), tangentVisibility(true)],
                expectedState: text(
                    'Prikazan je \\(\\sin x\\) pri \\(x_0=1\\) in \\(h=0{,}2\\): kvocient \\(0{,}4528\\), \\(f\'(1)=\\cos1=0{,}5403\\), tangenta je prikazana.',
                    'The graph of \\(\\sin x\\) is shown at \\(x_0=1\\) and \\(h=0.2\\): quotient \\(0.4528\\), \\(f\'(1)=\\cos1=0.5403\\), the tangent is shown.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-derivative',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Section 2.7: Derivatives and Rates of Change, and Section 3.1: Derivatives of Polynomials and Exponential Functions.',
            supports: ['tangent as the limit of secant lines', 'derivative as the limit of the difference quotient', 'derivatives of x^2, sin x and e^x'],
        },
        {
            id: 'efodx-derivatives-graph',
            citation: 'Earlier app by the owner: efodx.github.io, src/graphs derivatives-graph (studied 2026-10-11).',
            supports: ['secant of sin through x and x + h with draggable x and slider h', 'slope readout'],
            implementationCorrespondence: 'Bezeg keeps the secant, the draggable point on the graph and the slider h, and adds a choice of x^2, sin x and e^x, the exact tangent, the exact derivative and the difference as readouts, and excludes |h| < 0.01 instead of allowing the undefined 0/0 quotient.',
        },
        {
            id: 'bezeg-derivative-implementation',
            citation: 'Bezeg source: src/analysis/derivative.ts, src/analysis/functions.ts and src/graphs/functions/DerivativeGraph.tsx.',
            supports: ['difference quotient, secant and tangent', 'function catalog with exact derivatives', 'slider h in [-2, 2] with step 0.01 excluding |h| < 0.01', 'point P constrained to the graph'],
        },
    ],
    edgeCases: [
        text(
            'Pri \\(h=0\\) bi bil kvocient \\(\\frac{0}{0}\\), ki ni definiran; sekanta bi se skrčila v eno samo točko. Zato je prepovedan pas \\(|h|<0{,}01\\): drsnik, ki bi prečkal \\(0\\), skoči z \\(0{,}01\\) na \\(-0{,}01\\) in obratno.',
            'At \\(h=0\\) the quotient would be \\(\\frac{0}{0}\\), which is undefined; the secant would collapse to a single point. That is why the band \\(|h|<0.01\\) is excluded: a slider crossing \\(0\\) jumps from \\(0.01\\) to \\(-0.01\\) and back.',
        ),
        text(
            'Pri \\(x^2\\) kvocient ni nikoli točno enak odvodu, saj je razlika natanko \\(h\\), ki ni \\(0\\); pri drugih funkcijah se lahko pri kakšnem \\(h\\) ujemata po naključju. Odvod je limita, ne vrednost pri nobenem \\(h\\ne0\\).',
            'For \\(x^2\\) the quotient is never exactly the derivative, since the difference is exactly \\(h\\), which is not \\(0\\); for other functions the two can agree at some \\(h\\) by coincidence. The derivative is a limit, not the value at any \\(h\\ne0\\).',
        ),
        text(
            'Pri \\(e^x\\) in večjem \\(x_0\\) so vrednosti velike in graf zapusti pogled; uporabi gumb »Prilagodi točkam« ali premakni pogled.',
            'For \\(e^x\\) and a larger \\(x_0\\) the values are large and the graph leaves the view; use the “Fit to points” button or pan the view.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija odvod obravnava tudi kot trenutno hitrost.',
            'Before classroom-ready review, confirm whether the lesson should also present the derivative as an instantaneous rate of change.',
        ),
    ],
};

const integralFunction = (value: 'square' | 'sin' | 'exp'): SceneAction => ({name: 'set-function-choice', value: {name: 'integral-function', value}});
const sumMethod = (value: 'left' | 'right' | 'midpoint' | 'trapezoid'): SceneAction => ({name: 'set-function-choice', value: {name: 'sum-method', value}});

const definiteIntegral: GuidedLesson = {
    demonstrationId: 'definite-integral',
    title: text('Določeni integral', 'Definite integral'),
    summary: text(
        'Določeni integral \\(\\int_a^b f(x)\\,dx\\) je predznačena ploščina med grafom in osjo \\(x\\). Interval \\([a,b]\\) razdelimo na \\(n\\) podintervalov širine \\(h=\\frac{b-a}{n}\\), seštejemo ploščine pravokotnikov ali trapezov in dobimo Riemannovo vsoto, ki se z večjim \\(n\\) bliža točnemu integralu \\(F(b)-F(a)\\).',
        'The definite integral \\(\\int_a^b f(x)\\,dx\\) is the signed area between the graph and the \\(x\\)-axis. We split the interval \\([a,b]\\) into \\(n\\) subintervals of width \\(h=\\frac{b-a}{n}\\), add the areas of rectangles or trapezoids, and get a Riemann sum that approaches the exact integral \\(F(b)-F(a)\\) as \\(n\\) grows.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje ploščine pravokotnika in trapeza ter odčitavanja vrednosti funkcije z grafa.', 'Assumes familiarity with the area of a rectangle and a trapezoid and with reading function values off a graph.'),
        text('Priporočeno je, da veš, kaj je odvod in kaj je primitivna funkcija: \\(F\'=f\\).', 'It helps to know what a derivative is and what an antiderivative is: \\(F\'=f\\).'),
    ],
    learningGoals: [
        text('Izračunaš širino \\(h=\\frac{b-a}{n}\\) in levo, desno, sredinsko ter trapezno vsoto za \\(f(x)=x^2\\) na \\([0,2]\\).', 'Compute the width \\(h=\\frac{b-a}{n}\\) and the left, right, midpoint and trapezoid sums for \\(f(x)=x^2\\) on \\([0,2]\\).'),
        text('Primerjaš vsote s točnim integralom \\(\\frac{8}{3}\\) in razložiš, zakaj se z večjim \\(n\\) približajo.', 'Compare the sums with the exact integral \\(\\frac{8}{3}\\) and explain why they approach it as \\(n\\) grows.'),
        text('Razložiš, zakaj deli pod osjo \\(x\\) štejejo negativno in kaj se zgodi pri \\(a=b\\) ter pri zamenjanih mejah.', 'Explain why parts below the \\(x\\)-axis count as negative and what happens for \\(a=b\\) and for swapped bounds.'),
    ],
    formulaBlocks: [
        {
            id: 'integral-width',
            latex: 'h=\\frac{b-a}{n},\\qquad x_i=a+ih',
            notation: text(
                'Število \\(h\\) je širina podintervala, \\(x_i\\) so delilne točke od \\(x_0=a\\) do \\(x_n=b\\).',
                'The number \\(h\\) is the width of a subinterval and the \\(x_i\\) are the division points from \\(x_0=a\\) to \\(x_n=b\\).',
            ),
            explanation: text(
                'Pri \\(a>b\\) je \\(h\\) negativen, pri \\(a=b\\) je \\(h=0\\).',
                'For \\(a>b\\) the width \\(h\\) is negative, and for \\(a=b\\) we get \\(h=0\\).',
            ),
        },
        {
            id: 'integral-sums',
            latex: '\\begin{aligned}L&=h\\sum_{i=0}^{n-1}f(x_i)\\\\R&=h\\sum_{i=1}^{n}f(x_i)\\\\M&=h\\sum_{i=0}^{n-1}f\\!\\left(x_i+\\tfrac{h}{2}\\right)\\\\T&=\\frac{L+R}{2}\\end{aligned}',
            notation: text(
                'Vsota \\(L\\) je leva, \\(R\\) desna, \\(M\\) sredinska, \\(T\\) pa trapezna.',
                'The sum \\(L\\) is the left, \\(R\\) the right, \\(M\\) the midpoint and \\(T\\) the trapezoid sum.',
            ),
            explanation: text(
                'Leva, desna in sredinska vsota seštejejo ploščine pravokotnikov, ki imajo višino \\(f\\) v levem krajišču, v desnem krajišču oziroma v sredini podintervala. Trapezna vsota je povprečje leve in desne.',
                'The left, right and midpoint sums add the areas of rectangles whose height is \\(f\\) at the left end, at the right end or at the middle of the subinterval. The trapezoid sum is the mean of the left and right sums.',
            ),
        },
        {
            id: 'integral-exact',
            latex: '\\begin{aligned}\\int_a^b f(x)\\,dx&=F(b)-F(a),\\quad F\'=f\\\\\\int_0^2 x^{2}\\,dx&=\\left[\\frac{x^{3}}{3}\\right]_0^2=\\frac{8}{3}\\end{aligned}',
            notation: text(
                'Funkcija \\(F\\) je primitivna funkcija funkcije \\(f\\); za \\(x^2\\) je to \\(\\frac{x^3}{3}\\), za \\(\\sin x\\) je \\(-\\cos x\\), za \\(e^x\\) pa spet \\(e^x\\).',
                'The function \\(F\\) is an antiderivative of \\(f\\); for \\(x^2\\) it is \\(\\frac{x^3}{3}\\), for \\(\\sin x\\) it is \\(-\\cos x\\), and for \\(e^x\\) it is again \\(e^x\\).',
            ),
            explanation: text(
                'Točni integral je razlika vrednosti primitivne funkcije v mejah. Je predznačen: pri \\(a>b\\) je \\(h\\) negativen, vsota in integral pa zamenjata predznak.',
                'The exact integral is the difference of the antiderivative at the bounds. It is signed: for \\(a>b\\) the width \\(h\\) is negative, and the sum and the integral change sign.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'integral-square-example',
            title: text('Vsote za \\(f(x)=x^2\\) na \\([0,2]\\) pri \\(n=4\\)', 'Sums for \\(f(x)=x^2\\) on \\([0,2]\\) with \\(n=4\\)'),
            calculationLatex: '\\begin{aligned}h&=\\frac{2-0}{4}=\\frac{1}{2}\\\\L&=\\frac{1}{2}\\left(0+\\frac{1}{4}+1+\\frac{9}{4}\\right)=\\frac{7}{4}\\\\R&=\\frac{1}{2}\\left(\\frac{1}{4}+1+\\frac{9}{4}+4\\right)=\\frac{15}{4}\\\\M&=\\frac{21}{8},\\quad T=\\frac{L+R}{2}=\\frac{11}{4}\\end{aligned}',
            resultLatex: '\\int_0^2 x^{2}\\,dx=\\frac{8}{3}\\approx2{,}6667',
            check: text(
                'Leva vsota je \\(1{,}75\\), desna \\(3{,}75\\), sredinska \\(2{,}625\\) in trapezna \\(2{,}75\\). Točna vrednost \\(\\frac{8}{3}\\approx2{,}6667\\) leži med levo in desno vsoto, ker je \\(x^2\\) na \\([0,2]\\) naraščajoča.',
                'The left sum is \\(1.75\\), the right sum \\(3.75\\), the midpoint sum \\(2.625\\) and the trapezoid sum \\(2.75\\). The exact value \\(\\frac{8}{3}\\approx2.6667\\) lies between the left and the right sum because \\(x^2\\) is increasing on \\([0,2]\\).',
            ),
        },
    ],
    steps: [
        {
            id: 'integral-area-step', order: 1,
            title: text('Ploščina pod grafom in širina \\(h\\)', 'Area under the graph and the width \\(h\\)'),
            purpose: text('Ploščino pod grafom oceniti z vsoto ploščin pravokotnikov.', 'Estimating the area under the graph with a sum of rectangle areas.'),
            explanation: text(
                'Interval \\([a,b]\\) razdelimo na \\(n\\) enako širokih podintervalov širine \\(h=\\frac{b-a}{n}\\) in na vsakem narišemo pravokotnik. Pri privzetih \\(f(x)=x^2\\), \\(a=0\\), \\(b=2\\) in \\(n=4\\) je \\(h=\\frac{2-0}{4}=0{,}5\\). Privzeta je leva vsota: višina pravokotnika je vrednost \\(f\\) v levem krajišču podintervala. Točni integral je \\(\\int_0^2 x^2\\,dx=\\frac{8}{3}\\approx2{,}6667\\).',
                'We split the interval \\([a,b]\\) into \\(n\\) equally wide subintervals of width \\(h=\\frac{b-a}{n}\\) and draw a rectangle on each one. For the default \\(f(x)=x^2\\), \\(a=0\\), \\(b=2\\) and \\(n=4\\) we get \\(h=\\frac{2-0}{4}=0.5\\). The default is the left sum: the height of a rectangle is the value of \\(f\\) at the left end of its subinterval. The exact integral is \\(\\int_0^2 x^2\\,dx=\\frac{8}{3}\\approx2.6667\\).',
            ),
            formulaIds: ['integral-width', 'integral-exact'], learnerInteraction: 'drag-control-point',
            frames: [frame('integral-area-explanation', 'explanation'), frame('integral-area-observation', 'observation')],
            observationPrompt: text(
                'Povleci točki \\(a\\) in \\(b\\) po osi \\(x\\) in opazuj širino \\(h\\), pravokotnike ter vsoto. Nato ju vrni na \\(0\\) in \\(2\\).',
                'Drag the points \\(a\\) and \\(b\\) along the \\(x\\)-axis and watch the width \\(h\\), the rectangles and the sum. Then return them to \\(0\\) and \\(2\\).',
            ),
            expectedObservations: [text(
                'Pri \\(a=0\\), \\(b=2\\) in \\(n=4\\) je \\(h=0{,}5\\), narisani so štirje pravokotniki pod grafom, leva vsota je \\(1{,}75\\) in je manjša od točnega integrala \\(2{,}6667\\).',
                'For \\(a=0\\), \\(b=2\\) and \\(n=4\\) the width is \\(h=0.5\\), four rectangles are drawn under the graph, the left sum is \\(1.75\\) and it is smaller than the exact integral \\(2.6667\\).',
            )],
            scene: {
                id: 'integral-default', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Prikazan je graf \\(x^2\\) na \\([0,2]\\) s štirimi levimi pravokotniki: \\(h=0{,}5\\), vsota \\(1{,}75\\), integral \\(2{,}6667\\).',
                    'The graph of \\(x^2\\) on \\([0,2]\\) is shown with four left rectangles: \\(h=0.5\\), sum \\(1.75\\), integral \\(2.6667\\).',
                ),
            },
        },
        {
            id: 'integral-left-right-step', order: 2,
            title: text('Leva in desna vsota', 'The left and the right sum'),
            purpose: text('Levo in desno vsoto izračunati ročno in ju primerjati s točnim integralom.', 'Computing the left and the right sum by hand and comparing them with the exact integral.'),
            explanation: text(
                'Leva vsota: višine v levih krajiščih so \\(0\\), \\(0{,}25\\), \\(1\\) in \\(2{,}25\\) z vsoto \\(3{,}5\\), zato \\(L=0{,}5\\cdot3{,}5=1{,}75\\). Desna vsota uporabi desna krajišča: višine \\(0{,}25\\), \\(1\\), \\(2{,}25\\) in \\(4\\) imajo vsoto \\(7{,}5\\), zato \\(R=0{,}5\\cdot7{,}5=3{,}75\\). Točna vrednost je \\(\\frac{8}{3}\\approx2{,}6667\\). Ker \\(x^2\\) na \\([0,2]\\) narašča, leva vsota podceni (\\(1{,}75<\\frac{8}{3}\\)), desna pa preceni (\\(3{,}75>\\frac{8}{3}\\)). Scena izbere desno vsoto.',
                'Left sum: the heights at the left ends are \\(0\\), \\(0.25\\), \\(1\\) and \\(2.25\\) with sum \\(3.5\\), so \\(L=0.5\\cdot3.5=1.75\\). The right sum uses the right ends: the heights \\(0.25\\), \\(1\\), \\(2.25\\) and \\(4\\) have sum \\(7.5\\), so \\(R=0.5\\cdot7.5=3.75\\). The exact value is \\(\\frac{8}{3}\\approx2.6667\\). Since \\(x^2\\) is increasing on \\([0,2]\\), the left sum underestimates (\\(1.75<\\frac{8}{3}\\)) and the right sum overestimates (\\(3.75>\\frac{8}{3}\\)). The scene selects the right sum.',
            ),
            formulaIds: ['integral-sums'], workedExampleId: 'integral-square-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('integral-left-right-explanation', 'explanation'), frame('integral-left-right-calculation', 'calculation'), frame('integral-left-right-observation', 'observation')],
            observationPrompt: text(
                'Preklopi med levo in desno vsoto in primerjaj višine pravokotnikov z grafom. Kateri pravokotniki ležijo pod grafom in kateri nad njim?',
                'Switch between the left and the right sum and compare the heights of the rectangles with the graph. Which rectangles lie under the graph and which stick out above it?',
            ),
            expectedObservations: [text(
                'Leva vsota je \\(1{,}75\\) in vsi pravokotniki ležijo pod grafom; desna vsota je \\(3{,}75\\) in vsi pravokotniki segajo nad graf. Točni integral \\(2{,}6667\\) leži vmes.',
                'The left sum is \\(1.75\\) and all rectangles lie under the graph; the right sum is \\(3.75\\) and all rectangles stick out above the graph. The exact integral \\(2.6667\\) lies in between.',
            )],
            scene: {
                id: 'integral-right-scene', basedOn: 'demonstration-default',
                actions: [sumMethod('right')],
                expectedState: text(
                    'Pri desni vsoti z \\(n=4\\): vsota \\(3{,}75\\), integral \\(2{,}6667\\), pravokotniki segajo nad graf.',
                    'For the right sum with \\(n=4\\): sum \\(3.75\\), integral \\(2.6667\\), the rectangles stick out above the graph.',
                ),
            },
        },
        {
            id: 'integral-midpoint-trapezoid-step', order: 3,
            title: text('Sredinska in trapezna vsota', 'The midpoint and the trapezoid sum'),
            purpose: text('Videti, da sta sredinska in trapezna vsota z istim \\(n\\) bližje točni vrednosti.', 'Seeing that the midpoint and trapezoid sums are closer to the exact value with the same \\(n\\).'),
            explanation: text(
                'Sredinska vsota vzame višino v sredini podintervala, pri \\(x=0{,}25\\), \\(0{,}75\\), \\(1{,}25\\) in \\(1{,}75\\). Višine imajo vsoto \\(5{,}25\\), zato \\(M=0{,}5\\cdot5{,}25=2{,}625\\). Trapezna vsota je povprečje leve in desne: \\(T=\\frac{1{,}75+3{,}75}{2}=2{,}75\\); namesto pravokotnikov riše trapeze. Napaki sta \\(\\frac{8}{3}-2{,}625=\\frac{1}{24}\\approx0{,}0417\\) in \\(2{,}75-\\frac{8}{3}=\\frac{1}{12}\\approx0{,}0833\\), pri levi in desni vsoti pa \\(\\frac{11}{12}\\) in \\(\\frac{13}{12}\\). Scena izbere sredinsko vsoto.',
                'The midpoint sum takes the height at the middle of the subinterval, at \\(x=0.25\\), \\(0.75\\), \\(1.25\\) and \\(1.75\\). The heights have sum \\(5.25\\), so \\(M=0.5\\cdot5.25=2.625\\). The trapezoid sum is the mean of the left and right sums: \\(T=\\frac{1.75+3.75}{2}=2.75\\); it draws trapezoids instead of rectangles. The errors are \\(\\frac{8}{3}-2.625=\\frac{1}{24}\\approx0.0417\\) and \\(2.75-\\frac{8}{3}=\\frac{1}{12}\\approx0.0833\\), against \\(\\frac{11}{12}\\) and \\(\\frac{13}{12}\\) for the left and right sums. The scene selects the midpoint sum.',
            ),
            formulaIds: ['integral-sums'], workedExampleId: 'integral-square-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('integral-midpoint-explanation', 'explanation'), frame('integral-midpoint-calculation', 'calculation'), frame('integral-midpoint-observation', 'observation')],
            observationPrompt: text(
                'Preklopi med sredinsko in trapezno vsoto ter primerjaj odčitek razlike med vsoto in integralom z obema prejšnjima vsotama.',
                'Switch between the midpoint and the trapezoid sum and compare the readout of the difference between the sum and the integral with the two earlier sums.',
            ),
            expectedObservations: [text(
                'Pri \\(n=4\\) je sredinska vsota \\(2{,}625\\) (razlika \\(-0{,}0417\\)) in trapezna \\(2{,}75\\) (razlika \\(0{,}0833\\)); obe sta veliko bližje kot leva in desna. Sredinska vsota je tu pod, trapezna nad točnim integralom, ker je \\(x^2\\) konveksna.',
                'With \\(n=4\\) the midpoint sum is \\(2.625\\) (difference \\(-0.0417\\)) and the trapezoid sum is \\(2.75\\) (difference \\(0.0833\\)); both are much closer than the left and right sums. Here the midpoint sum lies below and the trapezoid sum above the exact integral because \\(x^2\\) is convex.',
            )],
            scene: {
                id: 'integral-midpoint-scene', basedOn: 'demonstration-default',
                actions: [sumMethod('midpoint')],
                expectedState: text(
                    'Pri sredinski vsoti z \\(n=4\\): vsota \\(2{,}625\\), integral \\(2{,}6667\\), razlika \\(-0{,}0417\\).',
                    'For the midpoint sum with \\(n=4\\): sum \\(2.625\\), integral \\(2.6667\\), difference \\(-0.0417\\).',
                ),
            },
        },
        {
            id: 'integral-more-rectangles-step', order: 4,
            title: text('Več podintervalov', 'More subintervals'),
            purpose: text('Videti, da se vse vsote z večjim \\(n\\) bližajo točnemu integralu.', 'Seeing that all sums approach the exact integral as \\(n\\) grows.'),
            explanation: text(
                'Pri \\(n=100\\) je \\(h=0{,}02\\) in vsote so: leva \\(2{,}6268\\), desna \\(2{,}7068\\), sredinska \\(2{,}6666\\), trapezna \\(2{,}6668\\). Vse so znotraj \\(0{,}05\\) od \\(\\frac{8}{3}\\approx2{,}6667\\). Napaka leve in desne vsote je približno \\(0{,}04\\), sredinske in trapezne pa manj kot \\(0{,}0002\\). Z večjim \\(n\\) so pravokotniki ožji in bolje prekrijejo ploščino; integral je limita teh vsot. Scena nastavi \\(n=100\\) pri levi vsoti.',
                'With \\(n=100\\) the width is \\(h=0.02\\) and the sums are: left \\(2.6268\\), right \\(2.7068\\), midpoint \\(2.6666\\), trapezoid \\(2.6668\\). All of them are within \\(0.05\\) of \\(\\frac{8}{3}\\approx2.6667\\). The error of the left and right sums is about \\(0.04\\), and that of the midpoint and trapezoid sums is below \\(0.0002\\). With larger \\(n\\) the rectangles are narrower and cover the area better; the integral is the limit of these sums. The scene sets \\(n=100\\) with the left sum.',
            ),
            formulaIds: ['integral-sums', 'integral-exact'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('integral-more-explanation', 'explanation'), frame('integral-more-observation', 'observation')],
            observationPrompt: text(
                'Premakni drsnik \\(n\\) od \\(1\\) do \\(150\\) in pri vsaki vrsti vsote opazuj razliko med vsoto in integralom.',
                'Move the slider \\(n\\) from \\(1\\) to \\(150\\) and, for each kind of sum, watch the difference between the sum and the integral.',
            ),
            expectedObservations: [text(
                'Pri \\(n=100\\) leva vsota \\(2{,}6268\\) zaostaja za integralom \\(2{,}6667\\) za približno \\(0{,}04\\); pri drugih vrstah vsote je razlika še manjša ali nasprotnega predznaka. Z večjim \\(n\\) se vse razlike manjšajo proti \\(0\\).',
                'For \\(n=100\\) the left sum \\(2.6268\\) falls short of the integral \\(2.6667\\) by about \\(0.04\\); the other kinds of sum are closer or differ in sign. As \\(n\\) grows, all differences shrink towards \\(0\\).',
            )],
            scene: {
                id: 'integral-more-scene', basedOn: 'demonstration-default',
                actions: [parameter('n', 100)],
                expectedState: text(
                    'Pri levi vsoti z \\(n=100\\): \\(h=0{,}02\\), vsota \\(2{,}6268\\), integral \\(2{,}6667\\), razlika približno \\(-0{,}04\\).',
                    'For the left sum with \\(n=100\\): \\(h=0.02\\), sum \\(2.6268\\), integral \\(2.6667\\), difference about \\(-0.04\\).',
                ),
            },
        },
        {
            id: 'integral-signed-step', order: 5,
            title: text('Predznačena ploščina pri \\(\\sin x\\)', 'Signed area with \\(\\sin x\\)'),
            purpose: text('Razumeti, da deli pod osjo \\(x\\) štejejo negativno.', 'Understanding that parts below the \\(x\\)-axis count as negative.'),
            explanation: text(
                'Pri \\(f(x)=\\sin x\\) na \\([0,2\\pi]\\) je točni integral \\(-\\cos2\\pi+\\cos0=-1+1=0\\). Del na \\([0,\\pi]\\) nad osjo da \\(+2\\), del na \\([\\pi,2\\pi]\\) pod osjo pa \\(-2\\); drugače obarvani pravokotniki pod osjo se odštejejo. Scena nastavi sredinsko vsoto z \\(n=12\\) in vsota je \\(0\\). Navadna (nepredznačena) ploščina bi bila \\(2+2=4\\), integral pa to ni. Pri \\(a=b\\) je \\(h=0\\) in sta vsota ter integral \\(0\\); pri zamenjanih mejah \\(a>b\\) je \\(h<0\\) in obe zamenjata predznak.',
                'For \\(f(x)=\\sin x\\) on \\([0,2\\pi]\\) the exact integral is \\(-\\cos2\\pi+\\cos0=-1+1=0\\). The part on \\([0,\\pi]\\) above the axis gives \\(+2\\) and the part on \\([\\pi,2\\pi]\\) below the axis gives \\(-2\\); the differently coloured rectangles below the axis are subtracted. The scene sets the midpoint sum with \\(n=12\\) and the sum is \\(0\\). The ordinary (unsigned) area would be \\(2+2=4\\), but the integral is not that. For \\(a=b\\) we get \\(h=0\\) and both the sum and the integral are \\(0\\); for swapped bounds \\(a>b\\) we get \\(h<0\\) and both change sign.',
            ),
            formulaIds: ['integral-exact'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('integral-signed-explanation', 'explanation'), frame('integral-signed-observation', 'observation')],
            observationPrompt: text(
                'Premakni \\(b\\) na \\(\\pi\\) in nazaj na \\(2\\pi\\) ter primerjaj odčitek vsote. Nato zamenjaj \\(a\\) in \\(b\\) ter nastavi \\(a=b\\).',
                'Move \\(b\\) to \\(\\pi\\) and back to \\(2\\pi\\) and compare the sum readout. Then swap \\(a\\) and \\(b\\) and set \\(a=b\\).',
            ),
            expectedObservations: [text(
                'Pri \\(b=2\\pi\\) je vsota \\(0\\) in integral \\(0\\); pri \\(b=\\pi\\) je integral \\(2\\). Pri zamenjanih mejah je predznak obrnjen, pri \\(a=b\\) pa ni narisanih likov in je rezultat \\(0\\).',
                'For \\(b=2\\pi\\) the sum is \\(0\\) and the integral is \\(0\\); for \\(b=\\pi\\) the integral is \\(2\\). With swapped bounds the sign is reversed, and for \\(a=b\\) no shapes are drawn and the result is \\(0\\).',
            )],
            scene: {
                id: 'integral-signed-scene', basedOn: 'demonstration-default',
                actions: [integralFunction('sin'), parameter('a', 0), parameter('b', 2 * Math.PI), parameter('n', 12), sumMethod('midpoint')],
                expectedState: text(
                    'Prikazan je \\(\\sin x\\) na \\([0,2\\pi]\\) z 12 sredinskimi pravokotniki: šest nad osjo, šest pod njo, vsota \\(0\\), integral \\(0\\).',
                    'The graph of \\(\\sin x\\) on \\([0,2\\pi]\\) is shown with 12 midpoint rectangles: six above the axis and six below it, sum \\(0\\), integral \\(0\\).',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-definite-integral',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Section 5.2: The Definite Integral, Section 5.3: The Fundamental Theorem of Calculus, and Section 7.7: Approximate Integration.',
            supports: ['Riemann sums with left, right and midpoint sample points', 'the trapezoidal rule', 'the signed definite integral and F(b) - F(a)', 'the effect of swapping the bounds'],
        },
        {
            id: 'efodx-integral-graph',
            citation: 'Earlier app by the owner: efodx.github.io, src/graphs integral-graph (studied 2026-10-11).',
            supports: ['rectangles under sin on draggable bounds [a, b] with a count slider', 'area readout'],
            implementationCorrespondence: 'Bezeg keeps the draggable bounds on the x-axis and the count slider, and adds a choice of x^2, sin x and e^x, explicit left, right, midpoint and trapezoid rules (the trapezoid rule drawn as trapezoids), the signed sum next to the exact integral F(b) - F(a) instead of a sum of absolute rectangle areas, a differently shaded negative part, and oriented bounds (a > b flips the sign).',
        },
        {
            id: 'bezeg-integral-implementation',
            citation: 'Bezeg source: src/analysis/riemann.ts, src/analysis/functions.ts and src/graphs/functions/DefiniteIntegralGraph.tsx.',
            supports: ['signed oriented left, right, midpoint and trapezoid sums', 'exact integral from the catalog antiderivative', 'bounds in [-7, 7] and n from 1 to 150', 'two filled curve objects for the parts above and below the axis'],
        },
    ],
    edgeCases: [
        text(
            'Pri \\(a=b\\) je \\(h=0\\): vsota in integral sta \\(0\\), likov ni. Pri zamenjanih mejah (\\(a=2\\), \\(b=0\\)) je \\(h=-0{,}5\\), integral je \\(-\\frac{8}{3}\\) in sredinska vsota z \\(n=4\\) je \\(-2{,}625\\): predznak se obrne, velikost pa ostane.',
            'For \\(a=b\\) the width is \\(h=0\\): the sum and the integral are \\(0\\) and no shapes are drawn. With swapped bounds (\\(a=2\\), \\(b=0\\)) the width is \\(h=-0.5\\), the integral is \\(-\\frac{8}{3}\\) and the midpoint sum with \\(n=4\\) is \\(-2.625\\): the sign flips and the magnitude stays.',
        ),
        text(
            'Pri zamenjanih mejah leva vsota uporabi začetno krajišče vsakega podintervala v smeri od \\(a\\) proti \\(b\\), to je desno krajišče na osi, zato postane enaka negativni desni vsoti prvotnih mej: \\(-3{,}75\\) pri \\(a=2\\), \\(b=0\\), \\(n=4\\).',
            'With swapped bounds the left sum takes the starting end of each subinterval in the direction from \\(a\\) to \\(b\\), which is the right end on the axis, so it equals the negative of the right sum of the original bounds: \\(-3.75\\) for \\(a=2\\), \\(b=0\\), \\(n=4\\).',
        ),
        text(
            'Število podintervalov \\(n\\) je celo število od \\(1\\) do \\(150\\), meji sta v \\([-7,7]\\), da je mogoče izbrati \\(2\\pi\\). Pri \\(e^x\\) in večjih mejah graf zapusti pogled; uporabi gumb »Prilagodi točkam« ali premakni pogled.',
            'The number of subintervals \\(n\\) is an integer from \\(1\\) to \\(150\\) and the bounds lie in \\([-7,7]\\) so that \\(2\\pi\\) can be chosen. For \\(e^x\\) and larger bounds the graph leaves the view; use the “Fit to points” button or pan the view.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija omeni tudi osnovni izrek analize in napako trapezne ter sredinske vsote.',
            'Before classroom-ready review, confirm whether the lesson should also mention the fundamental theorem of calculus and the error terms of the trapezoid and midpoint rules.',
        ),
    ],
};

const areaMode = (value: 'under-f' | 'under-g' | 'between'): SceneAction => ({name: 'set-function-choice', value: {name: 'area-mode', value}});

const areaBetweenCurves: GuidedLesson = {
    demonstrationId: 'area-between-curves',
    title: text('Ploščina med krivuljama', 'Area between curves'),
    summary: text(
        'Dve krivulji, \\(f(x)=(x-2)^2\\) in \\(g(x)=3-(x-2)^2\\), omejita lik. Ploščino med njima dobimo kot določeni integral razlike zgornje in spodnje krivulje, \\(\\int_a^b\\bigl(g(x)-f(x)\\bigr)dx\\); kjer je zgoraj \\(f\\), se krivulji zamenjata in predznačeni integral ni več ploščina, zato razdelimo interval v presečiščih.',
        'Two curves, \\(f(x)=(x-2)^2\\) and \\(g(x)=3-(x-2)^2\\), enclose a region. The area between them is the definite integral of the difference of the upper and the lower curve, \\(\\int_a^b\\bigl(g(x)-f(x)\\bigr)dx\\); where \\(f\\) is on top the curves swap roles and the signed integral is no longer the area, so we split the interval at the intersections.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje določenega integrala kot predznačene ploščine pod grafom in izreka \\(\\int_a^b f(x)\\,dx=F(b)-F(a)\\).', 'Assumes familiarity with the definite integral as signed area under a graph and with \\(\\int_a^b f(x)\\,dx=F(b)-F(a)\\).'),
        text('Priporočeno je, da znaš rešiti enačbo \\((x-2)^2=c\\).', 'It helps to be able to solve an equation \\((x-2)^2=c\\).'),
    ],
    learningGoals: [
        text('Izračunaš ploščino pod vsako od krivulj posebej in jo primerjaš s ploščino med njima.', 'Compute the area under each curve separately and compare it with the area between them.'),
        text('Določiš presečišči \\(x=2\\mp\\sqrt{1{,}5}\\) in izračunaš ploščino \\(4\\sqrt{1{,}5}=2\\sqrt6\\) med njima.', 'Find the intersections \\(x=2\\mp\\sqrt{1.5}\\) and compute the area \\(4\\sqrt{1.5}=2\\sqrt6\\) between them.'),
        text('Razložiš, zakaj je pri mejah zunaj presečišč \\(\\int(g-f)\\,dx\\) manjši od ploščine \\(\\int|g-f|\\,dx\\).', 'Explain why, for bounds beyond the intersections, \\(\\int(g-f)\\,dx\\) is smaller than the area \\(\\int|g-f|\\,dx\\).'),
    ],
    formulaBlocks: [
        {
            id: 'area-between-difference',
            latex: 'A=\\int_a^b\\bigl(g(x)-f(x)\\bigr)\\,dx=\\int_a^b g(x)\\,dx-\\int_a^b f(x)\\,dx\\quad(g\\ge f)',
            notation: text(
                'Funkcija \\(g\\) je zgornja, \\(f\\) pa spodnja krivulja; \\(a\\) in \\(b\\) sta meji na osi \\(x\\).',
                'The function \\(g\\) is the upper and \\(f\\) the lower curve; \\(a\\) and \\(b\\) are the bounds on the \\(x\\)-axis.',
            ),
            explanation: text(
                'Ploščina med krivuljama je ploščina pod zgornjo krivuljo minus ploščina pod spodnjo, zato se integrala odštejeta. Tako velja, dokler je \\(g\\ge f\\) na vsem intervalu.',
                'The area between the curves is the area under the upper curve minus the area under the lower one, so the integrals subtract. This holds as long as \\(g\\ge f\\) on the whole interval.',
            ),
        },
        {
            id: 'area-between-intersections',
            latex: '\\begin{aligned}f(x)=g(x)&\\iff(x-2)^2=3-(x-2)^2\\iff(x-2)^2=\\tfrac32\\\\&\\iff x=2\\mp\\sqrt{\\tfrac32}\\approx0{,}7753,\\;3{,}2247\\end{aligned}',
            notation: text(
                'Presečišči \\(P_1\\) in \\(P_2\\) ležita na višini \\(f=g=\\frac32\\).',
                'The intersections \\(P_1\\) and \\(P_2\\) lie at the height \\(f=g=\\frac32\\).',
            ),
            explanation: text(
                'Med presečiščema je \\(g>f\\), zunaj njiju pa \\(f>g\\); v presečiščih se krivulji stakneta in razlika \\(g-f\\) spremeni predznak.',
                'Between the intersections \\(g>f\\), outside them \\(f>g\\); at the intersections the curves meet and the difference \\(g-f\\) changes sign.',
            ),
        },
        {
            id: 'area-between-unsigned',
            latex: '\\begin{aligned}\\int_a^b\\bigl(g-f\\bigr)dx&=\\Bigl[3x-\\tfrac23(x-2)^3\\Bigr]_a^b\\\\\\int_a^b|g-f|\\,dx&=\\sum_{k=1}^{m}\\left|\\int_{x_{k-1}}^{x_k}(g-f)\\,dx\\right|\\end{aligned}',
            notation: text(
                'Funkcija \\(3x-\\frac23(x-2)^3\\) je primitivna funkcija razlike \\(g-f=3-2(x-2)^2\\). Točke \\(x_0=a<x_1<\\dots<x_m=b\\) so meji in presečišči, ki ležita med njima.',
                'The function \\(3x-\\frac23(x-2)^3\\) is an antiderivative of the difference \\(g-f=3-2(x-2)^2\\). The points \\(x_0=a<x_1<\\dots<x_m=b\\) are the bounds and the intersections that lie between them.',
            ),
            explanation: text(
                'Predznačeni integral se računa naravnost iz primitivne funkcije. Ploščino dobimo tako, da interval razdelimo v presečiščih, ki ležita v njem, in na vsakem delu vzamemo absolutno vrednost integrala razlike. Ploščina je vedno nenegativna, tudi če je \\(a>b\\).',
                'The signed integral is computed straight from the antiderivative. The area comes from splitting the interval at the intersections that lie inside it and taking the absolute value of the integral of the difference on each piece. The area is always non-negative, even if \\(a>b\\).',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'area-between-example',
            title: text('Ploščina med presečiščema', 'The area between the intersections'),
            calculationLatex: '\\begin{aligned}\\int_{2-\\sqrt{1{,}5}}^{2+\\sqrt{1{,}5}}\\bigl(3-2(x-2)^2\\bigr)dx&=\\int_{-\\sqrt{1{,}5}}^{\\sqrt{1{,}5}}\\bigl(3-2u^2\\bigr)du,\\quad u=x-2\\\\&=\\Bigl[3u-\\tfrac23u^3\\Bigr]_{-\\sqrt{1{,}5}}^{\\sqrt{1{,}5}}\\\\&=6\\sqrt{1{,}5}-\\tfrac43\\,(1{,}5)^{3/2}\\\\&=6\\sqrt{1{,}5}-2\\sqrt{1{,}5}\\end{aligned}',
            resultLatex: 'A=4\\sqrt{1{,}5}=2\\sqrt6\\approx4{,}8990',
            check: text(
                'Ker je \\((1{,}5)^{3/2}=1{,}5\\sqrt{1{,}5}\\), je \\(\\frac43(1{,}5)^{3/2}=2\\sqrt{1{,}5}\\). Posebej: \\(\\int f\\,dx=\\sqrt{1{,}5}\\approx1{,}2247\\) in \\(\\int g\\,dx=5\\sqrt{1{,}5}\\approx6{,}1237\\); razlika je \\(4\\sqrt{1{,}5}\\approx4{,}8990\\), kar prikaže tudi odčitek.',
                'Since \\((1.5)^{3/2}=1.5\\sqrt{1.5}\\), we get \\(\\frac43(1.5)^{3/2}=2\\sqrt{1.5}\\). Separately, \\(\\int f\\,dx=\\sqrt{1.5}\\approx1.2247\\) and \\(\\int g\\,dx=5\\sqrt{1.5}\\approx6.1237\\); the difference is \\(4\\sqrt{1.5}\\approx4.8990\\), which the readout also shows.',
            ),
        },
    ],
    steps: [
        {
            id: 'area-difference-step', order: 1,
            title: text('Ploščina med krivuljama je razlika', 'The area between is the difference'),
            purpose: text('Videti, da je ploščina med krivuljama integral razlike, ko je \\(g\\ge f\\).', 'Seeing that the area between the curves is the integral of the difference when \\(g\\ge f\\).'),
            explanation: text(
                'Ploščina med krivuljama je ploščina pod zgornjo minus ploščina pod spodnjo: \\(A=\\int_a^b g\\,dx-\\int_a^b f\\,dx\\), torej \\(A=\\int_a^b(g-f)\\,dx\\), če je \\(g\\ge f\\) na \\([a,b]\\). Pri \\(a=1\\) in \\(b=3\\), ki ležita med presečiščema, je \\(g-f=3-2(x-2)^2\\) z primitivno funkcijo \\(3x-\\frac23(x-2)^3\\), zato je \\(A=\\left(9-\\frac23\\right)-\\left(3+\\frac23\\right)\\), kar je \\(\\frac{14}{3}\\approx4{,}6667\\). Odčitka \\(\\int g\\,dx=\\frac{16}{3}\\) in \\(\\int f\\,dx=\\frac23\\) imata prav to razliko. Scena izbere način »Ploščina med f in g«.',
                'The area between the curves is the area under the upper one minus the area under the lower one: \\(A=\\int_a^b g\\,dx-\\int_a^b f\\,dx\\), that is \\(A=\\int_a^b(g-f)\\,dx\\), if \\(g\\ge f\\) on \\([a,b]\\). For \\(a=1\\) and \\(b=3\\), which lie between the intersections, \\(g-f=3-2(x-2)^2\\) has the antiderivative \\(3x-\\frac23(x-2)^3\\), so \\(A=\\left(9-\\frac23\\right)-\\left(3+\\frac23\\right)\\), which is \\(\\frac{14}{3}\\approx4.6667\\). The readouts \\(\\int g\\,dx=\\frac{16}{3}\\) and \\(\\int f\\,dx=\\frac23\\) have exactly this difference. The scene selects the mode “Area between f and g”.',
            ),
            formulaIds: ['area-between-difference'], learnerInteraction: 'drag-control-point',
            frames: [frame('area-difference-explanation', 'explanation'), frame('area-difference-observation', 'observation')],
            observationPrompt: text(
                'Povleci točki \\(a\\) in \\(b\\) po osi \\(x\\), ostani med presečiščema in preveri, da je \\(\\int g\\,dx-\\int f\\,dx\\) enak \\(\\int(g-f)\\,dx\\).',
                'Drag the points \\(a\\) and \\(b\\) along the \\(x\\)-axis, stay between the intersections, and check that \\(\\int g\\,dx-\\int f\\,dx\\) equals \\(\\int(g-f)\\,dx\\).',
            ),
            expectedObservations: [text(
                'Pri \\(a=1\\), \\(b=3\\) je \\(\\int g\\,dx=5{,}3333\\), \\(\\int f\\,dx=0{,}6667\\) in \\(\\int(g-f)\\,dx=4{,}6667\\); ploščina je enaka, ker je povsod \\(g\\ge f\\) in je ves lik obarvan z isto barvo.',
                'For \\(a=1\\), \\(b=3\\) we get \\(\\int g\\,dx=5.3333\\), \\(\\int f\\,dx=0.6667\\) and \\(\\int(g-f)\\,dx=4.6667\\); the area is the same because \\(g\\ge f\\) everywhere and the whole region has one colour.',
            )],
            scene: {
                id: 'area-difference-scene', basedOn: 'demonstration-default',
                actions: [areaMode('between'), parameter('a', 1), parameter('b', 3)],
                expectedState: text(
                    'Pobarvan je lik med krivuljama med \\(a=1\\) in \\(b=3\\): \\(\\int(g-f)\\,dx=4{,}6667\\) in ploščina \\(4{,}6667\\).',
                    'The region between the curves from \\(a=1\\) to \\(b=3\\) is shaded: \\(\\int(g-f)\\,dx=4.6667\\) and area \\(4.6667\\).',
                ),
            },
        },
        {
            id: 'area-under-step', order: 2,
            title: text('Ploščina pod vsako krivuljo', 'The area under each curve'),
            purpose: text('Ploščino med krivuljama razstaviti na ploščini pod vsako krivuljo posebej.', 'Splitting the area between the curves into the areas under each curve separately.'),
            explanation: text(
                'Na istem intervalu \\([1,3]\\) preklopimo v način »Ploščina pod g«. Pod \\(g\\) do osi \\(x\\) je \\(\\int_1^3 g(x)\\,dx=\\left[3x-\\frac{(x-2)^3}{3}\\right]_1^3=\\frac{16}{3}\\approx5{,}3333\\); to scena pobarva. Pod \\(f\\) je \\(\\int_1^3 f(x)\\,dx=\\left[\\frac{(x-2)^3}{3}\\right]_1^3=\\frac23\\approx0{,}6667\\). Razlika \\(\\frac{16}{3}-\\frac23=\\frac{14}{3}\\) je ploščina med krivuljama iz prejšnjega koraka. Izbirnik »Kaj je pobarvano« preklopi med načini.',
                'On the same interval \\([1,3]\\) we switch to the mode “Area under g”. Under \\(g\\) down to the \\(x\\)-axis the area is \\(\\int_1^3 g(x)\\,dx=\\left[3x-\\frac{(x-2)^3}{3}\\right]_1^3=\\frac{16}{3}\\approx5.3333\\); the scene shades this. Under \\(f\\) it is \\(\\int_1^3 f(x)\\,dx=\\left[\\frac{(x-2)^3}{3}\\right]_1^3=\\frac23\\approx0.6667\\). The difference \\(\\frac{16}{3}-\\frac23=\\frac{14}{3}\\) is the area between the curves from the previous step. The selector “What is shaded” switches between the modes.',
            ),
            formulaIds: ['area-between-difference'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('area-under-explanation', 'explanation'), frame('area-under-observation', 'observation')],
            observationPrompt: text(
                'Preklopi med »Ploščina pod f« in »Ploščina pod g« ter primerjaj pobarvana lika in odčitka \\(\\int f\\,dx\\) ter \\(\\int g\\,dx\\).',
                'Switch between “Area under f” and “Area under g” and compare the two shaded regions and the readouts of \\(\\int f\\,dx\\) and \\(\\int g\\,dx\\).',
            ),
            expectedObservations: [text(
                'Pod \\(g\\) je pobarvan lik z ploščino \\(5{,}3333\\); pod \\(f\\) je manjši lik z ploščino \\(0{,}6667\\). Ploščina med krivuljama \\(4{,}6667\\) je razlika teh dveh.',
                'Under \\(g\\) a region with area \\(5.3333\\) is shaded; under \\(f\\) there is a smaller region with area \\(0.6667\\). The area between the curves, \\(4.6667\\), is the difference of the two.',
            )],
            scene: {
                id: 'area-under-g-scene', basedOn: 'demonstration-default',
                actions: [areaMode('under-g'), parameter('a', 1), parameter('b', 3)],
                expectedState: text(
                    'Pobarvan je lik pod \\(g\\) med \\(a=1\\) in \\(b=3\\): \\(\\int g\\,dx=5{,}3333\\), \\(\\int f\\,dx=0{,}6667\\).',
                    'The region under \\(g\\) between \\(a=1\\) and \\(b=3\\) is shaded: \\(\\int g\\,dx=5.3333\\), \\(\\int f\\,dx=0.6667\\).',
                ),
            },
        },
        {
            id: 'area-intersections-step', order: 3,
            title: text('Meji v presečiščih', 'Bounds at the intersections'),
            purpose: text('Ploščino lika, ki ga omejita krivulji, izračunati natančno.', 'Computing exactly the area of the region the two curves enclose.'),
            explanation: text(
                'Lik med krivuljama je omejen s presečiščema: \\((x-2)^2=3-(x-2)^2\\) da \\((x-2)^2=\\frac32\\) in \\(x=2\\mp\\sqrt{1{,}5}\\approx0{,}7753;\\;3{,}2247\\). Z \\(u=x-2\\) je ploščina enaka \\(\\int_{-\\sqrt{1{,}5}}^{\\sqrt{1{,}5}}(3-2u^2)\\,du\\), kar je \\(6\\sqrt{1{,}5}-\\frac43(1{,}5)^{3/2}\\), torej \\(6\\sqrt{1{,}5}-2\\sqrt{1{,}5}\\) in končno \\(4\\sqrt{1{,}5}=2\\sqrt6\\approx4{,}8990\\). Točki \\(P_1\\) in \\(P_2\\) na grafu ležita na višini \\(\\frac32\\) in sta krajišči lika. Scena vrne meji na privzeti vrednosti.',
                'The region between the curves is bounded by the intersections: \\((x-2)^2=3-(x-2)^2\\) gives \\((x-2)^2=\\frac32\\) and \\(x=2\\mp\\sqrt{1.5}\\approx0.7753;\\;3.2247\\). With \\(u=x-2\\) the area equals \\(\\int_{-\\sqrt{1.5}}^{\\sqrt{1.5}}(3-2u^2)\\,du\\), which is \\(6\\sqrt{1.5}-\\frac43(1.5)^{3/2}\\), that is \\(6\\sqrt{1.5}-2\\sqrt{1.5}\\), and finally \\(4\\sqrt{1.5}=2\\sqrt6\\approx4.8990\\). The points \\(P_1\\) and \\(P_2\\) on the graph lie at the height \\(\\frac32\\) and are the ends of the region. The scene returns the bounds to their default values.',
            ),
            formulaIds: ['area-between-intersections', 'area-between-unsigned'], workedExampleId: 'area-between-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('area-intersections-explanation', 'explanation'), frame('area-intersections-calculation', 'calculation'), frame('area-intersections-observation', 'observation')],
            observationPrompt: text(
                'Poskusi premakniti \\(a\\) in \\(b\\) čim bliže presečiščema (na stotinko natančno) in opazuj, kako se \\(\\int(g-f)\\,dx\\) približa \\(4{,}8990\\).',
                'Try moving \\(a\\) and \\(b\\) as close to the intersections as possible (to the nearest hundredth) and watch \\(\\int(g-f)\\,dx\\) approach \\(4.8990\\).',
            ),
            expectedObservations: [text(
                'Pri privzetih mejah (v inšpektorju \\(0{,}78\\) in \\(3{,}22\\)) sta \\(\\int(g-f)\\,dx\\) in ploščina oba \\(4{,}8990\\), lik je v celoti obarvan z eno barvo, črtkani navpičnici segata od presečišča do presečišča.',
                'With the default bounds (shown as \\(0.78\\) and \\(3.22\\) in the inspector) \\(\\int(g-f)\\,dx\\) and the area are both \\(4.8990\\), the whole region has one colour, and the dashed verticals run from intersection to intersection.',
            )],
            scene: {
                id: 'area-intersections-scene', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Meji sta v presečiščih \\(2\\mp\\sqrt{1{,}5}\\), način »med f in g«: \\(\\int(g-f)\\,dx=4{,}8990\\), ploščina \\(4{,}8990\\).',
                    'The bounds are at the intersections \\(2\\mp\\sqrt{1.5}\\), mode “between f and g”: \\(\\int(g-f)\\,dx=4.8990\\), area \\(4.8990\\).',
                ),
            },
        },
        {
            id: 'area-beyond-step', order: 4,
            title: text('Meji zunaj presečišč', 'Bounds beyond the intersections'),
            purpose: text('Razumeti, zakaj se predznačeni integral in ploščina razlikujeta.', 'Understanding why the signed integral and the area differ.'),
            explanation: text(
                'Pri \\(a=0\\) in \\(b=4\\) sega interval čez presečišči. Na krajnih delih \\([0;0{,}7753]\\) in \\([3{,}2247;4]\\) je zgoraj \\(f\\), zato je tam \\(g-f<0\\): vsak del prispeva \\(\\frac23-2\\sqrt{1{,}5}\\approx-1{,}7828\\) k \\(\\int(g-f)\\,dx\\). Skupaj je \\(\\int_0^4(g-f)\\,dx\\) enak \\(4\\sqrt{1{,}5}+2\\left(\\frac23-2\\sqrt{1{,}5}\\right)\\), kar je \\(\\frac43\\approx1{,}3333\\). Prava ploščina pa vsak del šteje pozitivno: \\(\\int_0^4|g-f|\\,dx\\) je enak \\(2\\sqrt6+2\\left(2\\sqrt{1{,}5}-\\frac23\\right)\\), kar je približno \\(8{,}4646\\). Deli, kjer je zgoraj \\(f\\), se pri predznačenem integralu odštejejo. Drugače obarvana lika ob robovih kažeta ravno te dele.',
                'For \\(a=0\\) and \\(b=4\\) the interval reaches beyond the intersections. On the end pieces \\([0,0.7753]\\) and \\([3.2247,4]\\) the curve \\(f\\) is on top, so \\(g-f<0\\) there: each piece contributes \\(\\frac23-2\\sqrt{1.5}\\approx-1.7828\\) to \\(\\int(g-f)\\,dx\\). Altogether \\(\\int_0^4(g-f)\\,dx\\) equals \\(4\\sqrt{1.5}+2\\left(\\frac23-2\\sqrt{1.5}\\right)\\), which is \\(\\frac43\\approx1.3333\\). The true area counts each piece as positive: \\(\\int_0^4|g-f|\\,dx\\) equals \\(2\\sqrt6+2\\left(2\\sqrt{1.5}-\\frac23\\right)\\), which is about \\(8.4646\\). The parts where \\(f\\) is on top are subtracted in the signed integral. The two regions at the edges, in the other colour, show exactly these parts.',
            ),
            formulaIds: ['area-between-unsigned'], learnerInteraction: 'drag-control-point',
            frames: [frame('area-beyond-explanation', 'explanation'), frame('area-beyond-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj odčitka \\(\\int(g-f)\\,dx\\) in \\(\\int|g-f|\\,dx\\) ter obe barvi lika. Nato poglej, kaj se zgodi z obema odčitkoma, če zamenjaš \\(a\\) in \\(b\\).',
                'Compare the readouts of \\(\\int(g-f)\\,dx\\) and \\(\\int|g-f|\\,dx\\) and the two colours of the region. Then see what happens to both readouts if you swap \\(a\\) and \\(b\\).',
            ),
            expectedObservations: [text(
                'Pri \\(a=0\\), \\(b=4\\) je \\(\\int(g-f)\\,dx=1{,}3333\\), ploščina pa \\(8{,}4646\\); odčitka \\(\\int f\\,dx=5{,}3333\\) in \\(\\int g\\,dx=6{,}6667\\) imata razliko \\(1{,}3333\\). Pri zamenjanih mejah predznačeni integral zamenja predznak, ploščina ostane \\(8{,}4646\\).',
                'For \\(a=0\\), \\(b=4\\) we get \\(\\int(g-f)\\,dx=1.3333\\) and an area of \\(8.4646\\); the readouts \\(\\int f\\,dx=5.3333\\) and \\(\\int g\\,dx=6.6667\\) differ by \\(1.3333\\). With swapped bounds the signed integral changes sign and the area stays \\(8.4646\\).',
            )],
            scene: {
                id: 'area-beyond-scene', basedOn: 'demonstration-default',
                actions: [areaMode('between'), parameter('a', 0), parameter('b', 4)],
                expectedState: text(
                    'Prikazan je lik med krivuljama na \\([0,4]\\) v dveh barvah: \\(\\int(g-f)\\,dx=1{,}3333\\), ploščina \\(8{,}4646\\).',
                    'The region between the curves on \\([0,4]\\) is shown in two colours: \\(\\int(g-f)\\,dx=1.3333\\), area \\(8.4646\\).',
                ),
            },
        },
        {
            id: 'area-crossing-step', order: 5,
            title: text('Prehod čez presečišče', 'Crossing an intersection'),
            purpose: text('Opaziti, da se pri prehodu meje čez presečišče zamenja zgornja krivulja.', 'Noticing that moving a bound across an intersection changes which curve is on top.'),
            explanation: text(
                'Scena postavi \\(a=1\\) in \\(b=3{,}5\\): meja \\(b\\) je že desno od presečišča \\(3{,}2247\\). Do presečišča je zgoraj \\(g\\), za njim pa \\(f\\), zato se zadnji košček z ploščino \\(\\approx0{,}1995\\) pri \\(\\int(g-f)\\,dx=\\frac{55}{12}\\approx4{,}5833\\) odšteje, pri ploščini \\(\\approx4{,}9823\\) pa prišteje. Pri \\(b=3{,}2\\) sta obe vrednosti enaki \\(4{,}7813\\); pri \\(b=3{,}3\\) je \\(\\int(g-f)\\,dx\\approx4{,}7687\\) manjši, ploščina \\(\\approx4{,}7970\\) pa večja. Zgornjo krivuljo pove predznak razlike \\(g-f\\).',
                'The scene sets \\(a=1\\) and \\(b=3.5\\): the bound \\(b\\) is already to the right of the intersection \\(3.2247\\). Up to the intersection \\(g\\) is on top and beyond it \\(f\\) is, so the last little piece with area \\(\\approx0.1995\\) is subtracted in \\(\\int(g-f)\\,dx=\\frac{55}{12}\\approx4.5833\\) and added in the area \\(\\approx4.9823\\). For \\(b=3.2\\) both values are equal to \\(4.7813\\); for \\(b=3.3\\) the integral \\(\\int(g-f)\\,dx\\approx4.7687\\) is smaller and the area \\(\\approx4.7970\\) is larger. The sign of the difference \\(g-f\\) tells which curve is on top.',
            ),
            formulaIds: ['area-between-unsigned'], learnerInteraction: 'drag-control-point',
            frames: [frame('area-crossing-explanation', 'explanation'), frame('area-crossing-observation', 'observation')],
            observationPrompt: text(
                'Povleci \\(b\\) počasi čez presečišče pri \\(3{,}2247\\) in opazuj barvo pobarvanega lika ter obe vrednosti: kdaj se \\(\\int(g-f)\\,dx\\) in ploščina razideta?',
                'Slowly drag \\(b\\) across the intersection at \\(3.2247\\) and watch the colour of the shaded region and both values: when do \\(\\int(g-f)\\,dx\\) and the area part ways?',
            ),
            expectedObservations: [text(
                'Levo od presečišča sta vrednosti enaki; desno od njega se lik pobarva z drugo barvo, \\(\\int(g-f)\\,dx\\) začne padati, ploščina pa naraščati.',
                'To the left of the intersection the two values are equal; to the right of it the region gets the other colour, \\(\\int(g-f)\\,dx\\) starts to fall and the area keeps growing.',
            )],
            scene: {
                id: 'area-crossing-scene', basedOn: 'demonstration-default',
                actions: [areaMode('between'), parameter('a', 1), parameter('b', 3.5)],
                expectedState: text(
                    'Meji sta \\(a=1\\) in \\(b=3{,}5\\): \\(\\int(g-f)\\,dx=4{,}5833\\), ploščina \\(4{,}9823\\); ozek del desno od \\(P_2\\) je v drugi barvi.',
                    'The bounds are \\(a=1\\) and \\(b=3.5\\): \\(\\int(g-f)\\,dx=4.5833\\), area \\(4.9823\\); the narrow part to the right of \\(P_2\\) has the other colour.',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-area-between-curves',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Section 6.1: Areas Between Curves.',
            supports: ['the area between y = f(x) and y = g(x) as the integral of the upper minus the lower function', 'splitting the interval where the curves intersect', 'the area as the integral of |f(x) - g(x)|'],
        },
        {
            id: 'efodx-area-between-graph',
            citation: 'Earlier app by the owner: efodx.github.io, src/graphs area-between graph (studied 2026-10-11).',
            supports: ['two curves with draggable bounds on the x-axis and a choice of the shaded integral', 'readout of the area'],
            implementationCorrespondence: 'Bezeg keeps the two curves, the draggable bounds on the x-axis and the choice of what is shaded, but connects every input to the curve it names and labels each option with the quantity it really shades (under f, under g, between f and g). It adds the marked intersections, a second colour where f is on top, the signed integral of g - f next to the unsigned area (computed exactly by splitting at the intersections), and oriented bounds (a > b flips the signed values and keeps the area).',
        },
        {
            id: 'bezeg-area-between-implementation',
            citation: 'Bezeg source: src/analysis/areaBetween.ts and src/graphs/functions/AreaBetweenCurvesGraph.tsx.',
            supports: ['exact antiderivatives of f, g and g - f', 'unsigned area split at the intersections 2 -+ sqrt(1.5)', 'bounds in [-1, 5]', 'two filled curve objects for the parts where g is on top and where f is on top'],
        },
    ],
    edgeCases: [
        text(
            'Pri \\(a=b\\) je interval prazen: vsi odčitki so \\(0\\) in nič ni pobarvano. Pri \\(a>b\\) vsi predznačeni odčitki zamenjajo predznak, ploščina \\(\\int|g-f|\\,dx\\) pa je nenegativna in se ne spremeni, kar je dogovor te aplikacije.',
            'For \\(a=b\\) the interval is empty: every readout is \\(0\\) and nothing is shaded. For \\(a>b\\) all signed readouts change sign while the area \\(\\int|g-f|\\,dx\\) is non-negative and does not change, which is this app\'s convention.',
        ),
        text(
            'Načina »pod f« in »pod g« pobarvata lik med krivuljo in osjo \\(x\\), ne ploščine med krivuljama. Krivulja \\(g\\) seka os \\(x\\) pri \\(2\\mp\\sqrt3\\approx0{,}2679;\\;3{,}7321\\); dele pod osjo prikaže druga barva in štejejo negativno, pri \\(a=0\\), \\(b=4\\) je zato \\(\\int g\\,dx=\\frac{20}{3}\\).',
            'The modes “under f” and “under g” shade the region between a curve and the \\(x\\)-axis, not the area between the curves. The curve \\(g\\) crosses the \\(x\\)-axis at \\(2\\mp\\sqrt3\\approx0.2679;\\;3.7321\\); the parts below the axis have the other colour and count as negative, so for \\(a=0\\), \\(b=4\\) we get \\(\\int g\\,dx=\\frac{20}{3}\\).',
        ),
        text(
            'Meji ležita v \\([-1,5]\\). Pri robovih te domene graf \\(f\\) zapusti pogled (\\(f(-1)=9\\)); uporabi gumb »Prilagodi točkam« ali premakni pogled.',
            'The bounds lie in \\([-1,5]\\). Near the ends of that domain the graph of \\(f\\) leaves the view (\\(f(-1)=9\\)); use the “Fit to points” button or pan the view.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija obravnava tudi krivulje, ki se sekajo večkrat ali ne sekajo nikjer.',
            'Before classroom-ready review, confirm whether the lesson should also treat curves that intersect several times or not at all.',
        ),
    ],
};

const arcLength: GuidedLesson = {
    demonstrationId: 'arc-length',
    title: text('Dolžina loka krivulje', 'Arc length of a curve'),
    summary: text(
        'Dolžino loka grafa \\(y=\\sin x\\) približamo z lomljenko iz \\(n\\) tetiv, od katerih ima vsaka dolžino \\(\\sqrt{\\Delta x^2+\\Delta y^2}\\). Ko je daljic vedno več, se dolžina lomljenke približuje številu \\(L=\\int_a^b\\sqrt{1+f\'(x)^2}\\,dx\\), ki je dolžina loka.',
        'We approximate the arc length of the graph \\(y=\\sin x\\) by a polyline of \\(n\\) chords, each of length \\(\\sqrt{\\Delta x^2+\\Delta y^2}\\). As the number of segments grows, the polyline length approaches the number \\(L=\\int_a^b\\sqrt{1+f\'(x)^2}\\,dx\\), the arc length.',
    ),
    prerequisites: [
        text('Potrebno je poznavanje razdalje med dvema točkama v ravnini (Pitagorov izrek) in določenega integrala.', 'Assumes familiarity with the distance between two points in the plane (the Pythagorean theorem) and with the definite integral.'),
        text('Priporočeno je, da veš, da je odvod \\(f\'(x)\\) naklon tangente na graf.', 'It helps to know that the derivative \\(f\'(x)\\) is the slope of the tangent to the graph.'),
    ],
    learningGoals: [
        text('Izračunaš dolžino lomljenke iz \\(n\\) tetiv na grafu in jo primerjaš z dolžino loka.', 'Compute the length of a polyline of \\(n\\) chords on the graph and compare it with the arc length.'),
        text('Razložiš, zakaj lomljenka ni nikoli daljša od loka in zakaj se z večanjem \\(n\\) približuje loku.', 'Explain why a polyline is never longer than the arc and why it approaches the arc as \\(n\\) grows.'),
        text('Izpelješ \\(L=\\int_a^b\\sqrt{1+f\'(x)^2}\\,dx\\) in ga povežeš z \\(\\int\\|r\'(t)\\|\\,dt\\) ter s PH-krivuljami.', 'Derive \\(L=\\int_a^b\\sqrt{1+f\'(x)^2}\\,dx\\) and connect it with \\(\\int\\|r\'(t)\\|\\,dt\\) and with PH curves.'),
    ],
    formulaBlocks: [
        {
            id: 'arc-length-chord',
            latex: '\\begin{aligned}x_i&=a+i\\,\\tfrac{b-a}{n},\\quad y_i=f(x_i)\\\\\\ell_i&=\\sqrt{(x_i-x_{i-1})^2+(y_i-y_{i-1})^2}=\\sqrt{\\Delta x^2+\\Delta y^2}\\\\P_n&=\\sum_{i=1}^{n}\\ell_i\\end{aligned}',
            notation: text(
                'Točke \\((x_i,y_i)\\) ležijo na grafu, \\(\\ell_i\\) je dolžina \\(i\\)-te tetive, \\(P_n\\) pa dolžina lomljenke z \\(n\\) daljicami.',
                'The points \\((x_i,y_i)\\) lie on the graph, \\(\\ell_i\\) is the length of the \\(i\\)-th chord and \\(P_n\\) is the length of the polyline with \\(n\\) segments.',
            ),
            explanation: text(
                'Krivuljo razrežemo na \\(n\\) delov enake širine \\(\\Delta x=\\frac{b-a}{n}\\) in vsak del nadomestimo z ravno daljico med krajiščema. Dolžina daljice sledi iz Pitagorovega izreka.',
                'We cut the curve into \\(n\\) pieces of equal width \\(\\Delta x=\\frac{b-a}{n}\\) and replace each piece by the straight segment between its ends. The length of the segment follows from the Pythagorean theorem.',
            ),
        },
        {
            id: 'arc-length-integral',
            latex: 'L=\\int_a^b\\sqrt{1+f\'(x)^2}\\,dx=\\lim_{n\\to\\infty}P_n',
            notation: text(
                'Število \\(L\\) je dolžina loka grafa med \\(x=a\\) in \\(x=b\\); funkcija \\(f\\) mora imeti zvezen odvod.',
                'The number \\(L\\) is the arc length of the graph from \\(x=a\\) to \\(x=b\\); the function \\(f\\) must have a continuous derivative.',
            ),
            explanation: text(
                'Na majhnem delu je \\(\\Delta y\\approx f\'(x)\\,\\Delta x\\), zato je \\(\\sqrt{\\Delta x^2+\\Delta y^2}\\approx\\sqrt{1+f\'(x)^2}\\,\\Delta x\\). Vsota teh členov je Riemannova vsota za integral funkcije \\(\\sqrt{1+f\'(x)^2}\\), njena limita pa dolžina loka. Za \\(f=\\sin\\) je \\(f\'=\\cos\\) in \\(L=\\int_a^b\\sqrt{1+\\cos^2 x}\\,dx\\). Aplikacija ga računa z adaptivnim Simpsonovim pravilom na \\(10^{-9}\\) natančno.',
                'On a small piece \\(\\Delta y\\approx f\'(x)\\,\\Delta x\\), so \\(\\sqrt{\\Delta x^2+\\Delta y^2}\\approx\\sqrt{1+f\'(x)^2}\\,\\Delta x\\). The sum of these terms is a Riemann sum for the integral of \\(\\sqrt{1+f\'(x)^2}\\), and its limit is the arc length. For \\(f=\\sin\\) we have \\(f\'=\\cos\\) and \\(L=\\int_a^b\\sqrt{1+\\cos^2 x}\\,dx\\). The app computes it with adaptive Simpson quadrature to \\(10^{-9}\\).',
            ),
        },
        {
            id: 'arc-length-parametric',
            latex: 'L=\\int_{t_0}^{t_1}\\|r\'(t)\\|\\,dt=\\int_{t_0}^{t_1}\\sqrt{x\'(t)^2+y\'(t)^2}\\,dt',
            notation: text(
                'Krivulja \\(r(t)=(x(t),y(t))\\) je podana parametrično, \\(\\|r\'(t)\\|\\) pa je njena hitrost.',
                'The curve \\(r(t)=(x(t),y(t))\\) is given parametrically and \\(\\|r\'(t)\\|\\) is its speed.',
            ),
            explanation: text(
                'Graf funkcije je poseben primer z \\(r(t)=(t,f(t))\\): tedaj je \\(r\'(t)=(1,f\'(t))\\) in \\(\\|r\'(t)\\|=\\sqrt{1+f\'(t)^2}\\). Pri PH-krivuljah (Pitagorejski hodograf) je \\(\\|r\'(t)\\|\\) polinom, zato je dolžina loka natančna vrednost integrala polinoma in ne numerični približek.',
                'The graph of a function is a special case with \\(r(t)=(t,f(t))\\): then \\(r\'(t)=(1,f\'(t))\\) and \\(\\|r\'(t)\\|=\\sqrt{1+f\'(t)^2}\\). For PH (Pythagorean-hodograph) curves \\(\\|r\'(t)\\|\\) is a polynomial, so the arc length is the exact integral of a polynomial rather than a numerical approximation.',
            ),
        },
    ],
    workedExamples: [
        {
            id: 'arc-length-example',
            title: text('Dve daljici na \\([0,\\pi]\\)', 'Two segments on \\([0,\\pi]\\)'),
            calculationLatex: '\\begin{aligned}(x_0,y_0)&=(0,0),\\quad(x_1,y_1)=\\left(\\tfrac{\\pi}{2},1\\right),\\quad(x_2,y_2)=(\\pi,0)\\\\\\ell_1=\\ell_2&=\\sqrt{\\left(\\tfrac{\\pi}{2}\\right)^2+1^2}\\approx1{,}8621\\\\P_2&=2\\sqrt{\\left(\\tfrac{\\pi}{2}\\right)^2+1}\\end{aligned}',
            resultLatex: 'P_2=2\\sqrt{\\left(\\tfrac{\\pi}{2}\\right)^2+1}\\approx3{,}7242',
            check: text(
                'Z eno samo tetivo (\\(n=1\\)) je lomljenka daljica od \\((0,0)\\) do \\((\\pi,0)\\) po osi \\(x\\) z dolžino \\(P_1=\\pi\\approx3{,}1416\\). Dolžina loka je \\(L\\approx3{,}8202\\), zato je \\(P_2\\) bližje: razlika znaša \\(3{,}8202-3{,}7242\\approx0{,}0960\\), kar prikaže tudi odčitek.',
                'With a single chord (\\(n=1\\)) the polyline is the segment from \\((0,0)\\) to \\((\\pi,0)\\) along the \\(x\\)-axis with length \\(P_1=\\pi\\approx3.1416\\). The arc length is \\(L\\approx3.8202\\), so \\(P_2\\) is closer: the difference is \\(3.8202-3.7242\\approx0.0960\\), which the readout also shows.',
            ),
        },
    ],
    steps: [
        {
            id: 'arc-chord-step', order: 1,
            title: text('Krivuljo nadomestimo s tetivami', 'Replacing the curve by chords'),
            purpose: text('Razumeti idejo: ukrivljeno pot približamo z ravnimi daljicami.', 'Understanding the idea: approximating a bent path by straight segments.'),
            explanation: text(
                'Dolžine ukrivljene črte ne znamo izmeriti neposredno, dolžino daljice pa znamo: med \\((x_{i-1},y_{i-1})\\) in \\((x_i,y_i)\\) je \\(\\ell_i=\\sqrt{\\Delta x^2+\\Delta y^2}\\). Graf \\(y=\\sin x\\) na \\([0,\\pi]\\) zato nadomestimo z lomljenko iz \\(n\\) tetiv, katerih oglišča ležijo na grafu. Scena nastavi \\(n=1\\): ena sama tetiva gre od \\(A=(0,0)\\) do \\(B=(\\pi,0)\\) po osi \\(x\\) in ima dolžino \\(\\pi\\approx3{,}1416\\), kar je očitno premalo.',
                'We cannot measure the length of a bent line directly, but we know the length of a segment: between \\((x_{i-1},y_{i-1})\\) and \\((x_i,y_i)\\) it is \\(\\ell_i=\\sqrt{\\Delta x^2+\\Delta y^2}\\). So we replace the graph \\(y=\\sin x\\) on \\([0,\\pi]\\) by a polyline of \\(n\\) chords whose vertices lie on the graph. The scene sets \\(n=1\\): a single chord runs from \\(A=(0,0)\\) to \\(B=(\\pi,0)\\) along the \\(x\\)-axis and has length \\(\\pi\\approx3.1416\\), which is clearly too short.',
            ),
            formulaIds: ['arc-length-chord'], learnerInteraction: 'observe',
            frames: [frame('arc-chord-explanation', 'explanation'), frame('arc-chord-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj eno tetivo z lokom sinusoide: koliko manjka in kje je razlika največja?',
                'Compare the single chord with the arch of the sine: how much is missing and where is the difference largest?',
            ),
            expectedObservations: [text(
                'Odčitek lomljenke je \\(3{,}1416\\), odčitek loka pa \\(3{,}8202\\); tetiva je pri \\(x=\\frac{\\pi}{2}\\) za \\(1\\) pod vrhom loka.',
                'The polyline readout is \\(3.1416\\) and the arc readout is \\(3.8202\\); at \\(x=\\frac{\\pi}{2}\\) the chord is \\(1\\) below the top of the arch.',
            )],
            scene: {
                id: 'arc-chord-scene', basedOn: 'demonstration-default',
                actions: [parameter('n', 1)],
                expectedState: text(
                    'Ena tetiva od \\(A=(0,0)\\) do \\(B=(\\pi,0)\\): lomljenka \\(3{,}1416\\), lok \\(3{,}8202\\).',
                    'One chord from \\(A=(0,0)\\) to \\(B=(\\pi,0)\\): polyline \\(3.1416\\), arc \\(3.8202\\).',
                ),
            },
        },
        {
            id: 'arc-two-step', order: 2,
            title: text('Dve daljici: primer', 'Two segments: an example'),
            purpose: text('Dolžino lomljenke izračunati s formulo za tetive.', 'Computing a polyline length with the chord formula.'),
            explanation: text(
                'Pri \\(n=2\\) se oglišča pojavijo pri \\(x=0,\\frac{\\pi}{2},\\pi\\): to so točke \\((0,0)\\), \\(\\left(\\frac{\\pi}{2},1\\right)\\) in \\((\\pi,0)\\). Vsaka tetiva ima \\(\\Delta x=\\frac{\\pi}{2}\\) in \\(|\\Delta y|=1\\), zato je njena dolžina \\(\\sqrt{\\left(\\frac{\\pi}{2}\\right)^2+1}\\approx1{,}8621\\) in \\(P_2=2\\sqrt{\\left(\\frac{\\pi}{2}\\right)^2+1}\\approx3{,}7242\\). To je že precej bližje loku \\(L\\approx3{,}8202\\) kot \\(P_1=\\pi\\). Scena vrne privzeti \\(n=2\\).',
                'For \\(n=2\\) the vertices are at \\(x=0,\\frac{\\pi}{2},\\pi\\): the points \\((0,0)\\), \\(\\left(\\frac{\\pi}{2},1\\right)\\) and \\((\\pi,0)\\). Each chord has \\(\\Delta x=\\frac{\\pi}{2}\\) and \\(|\\Delta y|=1\\), so its length is \\(\\sqrt{\\left(\\frac{\\pi}{2}\\right)^2+1}\\approx1.8621\\) and \\(P_2=2\\sqrt{\\left(\\frac{\\pi}{2}\\right)^2+1}\\approx3.7242\\). This is already much closer to the arc \\(L\\approx3.8202\\) than \\(P_1=\\pi\\). The scene returns to the default \\(n=2\\).',
            ),
            formulaIds: ['arc-length-chord'], workedExampleId: 'arc-length-example', learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('arc-two-explanation', 'explanation'), frame('arc-two-calculation', 'calculation'), frame('arc-two-observation', 'observation')],
            observationPrompt: text(
                'Premakni drsnik \\(n\\) z \\(1\\) na \\(2\\) in nazaj ter opazuj, kako se oglišče doda na vrh loka in lomljenka podaljša.',
                'Move the slider \\(n\\) from \\(1\\) to \\(2\\) and back and watch the vertex appear at the top of the arch and the polyline get longer.',
            ),
            expectedObservations: [text(
                'Pri \\(n=2\\) odčitek lomljenke pokaže \\(3{,}7242\\), razlika do loka je \\(0{,}0960\\); obe tetivi sta enako dolgi.',
                'For \\(n=2\\) the polyline readout shows \\(3.7242\\) and the difference to the arc is \\(0.0960\\); both chords have the same length.',
            )],
            scene: {
                id: 'arc-two-scene', basedOn: 'demonstration-default',
                actions: [],
                expectedState: text(
                    'Dve tetivi z ogliščem pri \\(\\left(\\frac{\\pi}{2},1\\right)\\): lomljenka \\(3{,}7242\\), lok \\(3{,}8202\\), razlika \\(0{,}0960\\).',
                    'Two chords with a vertex at \\(\\left(\\frac{\\pi}{2},1\\right)\\): polyline \\(3.7242\\), arc \\(3.8202\\), difference \\(0.0960\\).',
                ),
            },
        },
        {
            id: 'arc-more-step', order: 3,
            title: text('Več daljic: lomljenka ne preseže loka', 'More segments: the polyline never exceeds the arc'),
            purpose: text('Videti, da se lomljenka z večanjem \\(n\\) približuje loku od spodaj.', 'Seeing that the polyline approaches the arc from below as \\(n\\) grows.'),
            explanation: text(
                'Pri \\(n=10\\) je \\(P_{10}\\approx3{,}8153\\), pri \\(n=100\\) pa \\(P_{100}\\approx3{,}8201\\), medtem ko je \\(L\\approx3{,}8202\\). Dolžina lomljenke nikoli ne preseže dolžine loka: vsaka tetiva je najkrajša pot med svojima krajiščema, zato je krajša ali enaka delu loka med njima, vsota pa je krajša ali enaka celotnemu loku. Scena nastavi \\(n=10\\); z drsnikom nadaljuj do \\(n=100\\).',
                'For \\(n=10\\) we have \\(P_{10}\\approx3.8153\\) and for \\(n=100\\) we have \\(P_{100}\\approx3.8201\\), while \\(L\\approx3.8202\\). The polyline length never exceeds the arc length: each chord is the shortest path between its two ends, so it is no longer than the piece of arc between them, and the sum is no longer than the whole arc. The scene sets \\(n=10\\); continue to \\(n=100\\) with the slider.',
            ),
            formulaIds: ['arc-length-chord'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('arc-more-explanation', 'explanation'), frame('arc-more-observation', 'observation')],
            observationPrompt: text(
                'Povečuj \\(n\\) od \\(10\\) do \\(100\\) in spremljaj odčitek razlike lok \\(-\\) lomljenka: ali kdaj postane negativna?',
                'Increase \\(n\\) from \\(10\\) to \\(100\\) and follow the readout of the difference arc \\(-\\) polyline: does it ever become negative?',
            ),
            expectedObservations: [text(
                'Razlika pada (\\(0{,}0049\\) pri \\(n=10\\), manj kot \\(0{,}0001\\) pri \\(n=100\\)), vendar ostaja nenegativna; lomljenka se loku prilega vse natančneje.',
                'The difference shrinks (\\(0.0049\\) for \\(n=10\\), less than \\(0.0001\\) for \\(n=100\\)) but stays non-negative; the polyline hugs the arc ever more closely.',
            )],
            scene: {
                id: 'arc-more-scene', basedOn: 'demonstration-default',
                actions: [parameter('n', 10)],
                expectedState: text(
                    'Deset tetiv na \\([0,\\pi]\\): lomljenka \\(3{,}8153\\), lok \\(3{,}8202\\), razlika \\(0{,}0049\\).',
                    'Ten chords on \\([0,\\pi]\\): polyline \\(3.8153\\), arc \\(3.8202\\), difference \\(0.0049\\).',
                ),
            },
        },
        {
            id: 'arc-limit-step', order: 4,
            title: text('Limita: integral', 'The limit: an integral'),
            purpose: text('Izpeljati formulo za dolžino loka kot limito lomljenk.', 'Deriving the arc length formula as the limit of polylines.'),
            explanation: text(
                'Na majhnem delu je \\(\\Delta y\\approx f\'(x)\\,\\Delta x\\), zato je \\(\\ell_i=\\sqrt{\\Delta x^2+\\Delta y^2}\\), kar je približno \\(\\sqrt{1+f\'(x_i)^2}\\,\\Delta x\\). Vsota \\(P_n\\) je torej približno Riemannova vsota za \\(\\sqrt{1+f\'(x)^2}\\), njena limita pa je dolžina loka \\(L=\\int_a^b\\sqrt{1+f\'(x)^2}\\,dx\\). Za \\(f=\\sin\\) je \\(f\'=\\cos\\) in \\(L=\\int_0^{\\pi}\\sqrt{1+\\cos^2 x}\\,dx\\approx3{,}8202\\); ta integral nima enostavne zaključene oblike, zato ga aplikacija računa numerično. Scena nastavi \\(n=100\\), kjer se \\(P_{100}\\approx3{,}8201\\) komaj še loči od \\(L\\).',
                'On a small piece \\(\\Delta y\\approx f\'(x)\\,\\Delta x\\), so \\(\\ell_i=\\sqrt{\\Delta x^2+\\Delta y^2}\\), which is approximately \\(\\sqrt{1+f\'(x_i)^2}\\,\\Delta x\\). The sum \\(P_n\\) is therefore approximately a Riemann sum for \\(\\sqrt{1+f\'(x)^2}\\), and its limit is the arc length \\(L=\\int_a^b\\sqrt{1+f\'(x)^2}\\,dx\\). For \\(f=\\sin\\) we have \\(f\'=\\cos\\) and \\(L=\\int_0^{\\pi}\\sqrt{1+\\cos^2 x}\\,dx\\approx3.8202\\); this integral has no simple closed form, so the app computes it numerically. The scene sets \\(n=100\\), where \\(P_{100}\\approx3.8201\\) is hardly distinguishable from \\(L\\).',
            ),
            formulaIds: ['arc-length-integral'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('arc-limit-explanation', 'explanation'), frame('arc-limit-observation', 'observation')],
            observationPrompt: text(
                'Povleci \\(B\\) po grafu in primerjaj odčitka lomljenke in loka za več intervalov.',
                'Drag \\(B\\) along the graph and compare the polyline and arc readouts for several intervals.',
            ),
            expectedObservations: [text(
                'Pri \\(n=100\\) na \\([0,\\pi]\\) odčitka kažeta \\(3{,}8201\\) in \\(3{,}8202\\). Na vsakem intervalu je lomljenka kvečjemu tako dolga kot lok; pri velikem \\(n\\) je tik pod njim.',
                'For \\(n=100\\) on \\([0,\\pi]\\) the readouts show \\(3.8201\\) and \\(3.8202\\). On every interval the polyline is at most as long as the arc; for large \\(n\\) it is just below it.',
            )],
            scene: {
                id: 'arc-limit-scene', basedOn: 'demonstration-default',
                actions: [parameter('n', 100)],
                expectedState: text(
                    'Sto tetiv na \\([0,\\pi]\\): lomljenka \\(3{,}8201\\), lok \\(3{,}8202\\).',
                    'One hundred chords on \\([0,\\pi]\\): polyline \\(3.8201\\), arc \\(3.8202\\).',
                ),
            },
        },
        {
            id: 'arc-link-step', order: 5,
            title: text('Parametrične krivulje in PH-krivulje', 'Parametric curves and PH curves'),
            purpose: text('Povezati dolžino loka grafa z dolžino parametrične krivulje in s PH-krivuljami.', 'Connecting the arc length of a graph with that of a parametric curve and with PH curves.'),
            explanation: text(
                'Enaka zamisel velja za parametrično krivuljo \\(r(t)\\): tetiva med bližnjima točkama ima dolžino približno \\(\\|r\'(t)\\|\\,\\Delta t\\), zato je \\(L=\\int\\|r\'(t)\\|\\,dt\\). Graf funkcije je primer z \\(r(t)=(t,f(t))\\) in hitrostjo \\(\\sqrt{1+f\'(t)^2}\\). Za sinus ta hitrost ni polinom, zato je integral treba računati numerično. PH-krivulje (glej lekcijo o kubični PH-krivulji in grafe PH-krivulj v Bezegu, ki prikažejo natančno dolžino loka) so natanko polinomske krivulje, pri katerih je hitrost \\(\\|r\'(t)\\|\\) polinom, zato je njihova dolžina loka natančna. Scena nastavi \\(b=2\\pi\\) in \\(n=2\\): obe oglišči sta na osi \\(x\\), lomljenka ima dolžino \\(2\\pi\\approx6{,}2832\\), lok pa \\(7{,}6404\\).',
                'The same idea applies to a parametric curve \\(r(t)\\): the chord between nearby points has length about \\(\\|r\'(t)\\|\\,\\Delta t\\), so \\(L=\\int\\|r\'(t)\\|\\,dt\\). The graph of a function is the case \\(r(t)=(t,f(t))\\) with speed \\(\\sqrt{1+f\'(t)^2}\\). For the sine this speed is not a polynomial, so the integral has to be computed numerically. PH curves (see the cubic PH curve lesson and the PH-curve graphs in Bezeg, which show the exact arc length) are exactly the polynomial curves whose speed \\(\\|r\'(t)\\|\\) is a polynomial, so their arc length is exact. The scene sets \\(b=2\\pi\\) and \\(n=2\\): both vertices lie on the \\(x\\)-axis, the polyline has length \\(2\\pi\\approx6.2832\\) and the arc has \\(7.6404\\).',
            ),
            formulaIds: ['arc-length-parametric'], learnerInteraction: 'drag-control-point',
            frames: [frame('arc-link-explanation', 'explanation'), frame('arc-link-observation', 'observation')],
            observationPrompt: text(
                'Pri \\(b=2\\pi\\) povečaj \\(n\\) z \\(2\\) na \\(3\\), \\(4\\), \\(8\\) in opazuj, kako lomljenka sledi grafu; nato zamenjaj \\(a\\) in \\(b\\).',
                'With \\(b=2\\pi\\), increase \\(n\\) from \\(2\\) to \\(3\\), \\(4\\), \\(8\\) and watch how the polyline follows the graph; then swap \\(a\\) and \\(b\\).',
            ),
            expectedObservations: [text(
                'Pri \\(n=2\\) je lomljenka ravna črta po osi \\(x\\) z dolžino \\(6{,}2832\\) in lok \\(7{,}6404\\) je precej daljši. Pri zamenjanih \\(a\\) in \\(b\\) sta dolžini nespremenjeni, ker dolžina ni nikoli negativna.',
                'For \\(n=2\\) the polyline is a straight line along the \\(x\\)-axis of length \\(6.2832\\) and the arc \\(7.6404\\) is much longer. With \\(a\\) and \\(b\\) swapped the lengths do not change, because a length is never negative.',
            )],
            scene: {
                id: 'arc-link-scene', basedOn: 'demonstration-default',
                actions: [parameter('b', 2 * Math.PI)],
                expectedState: text(
                    'Interval \\([0,2\\pi]\\), dve tetivi po osi \\(x\\): lomljenka \\(6{,}2832\\), lok \\(7{,}6404\\).',
                    'Interval \\([0,2\\pi]\\), two chords along the \\(x\\)-axis: polyline \\(6.2832\\), arc \\(7.6404\\).',
                ),
            },
        },
    ],
    sources: [
        {
            id: 'stewart-arc-length',
            citation: 'Stewart, J. Calculus: Early Transcendentals, Section 8.1: Arc Length.',
            supports: ['the length of a curve as the limit of inscribed polygons', 'the formula L = integral of sqrt(1 + f\'(x)^2)', 'the arc length of a parametric curve as the integral of the speed'],
        },
        {
            id: 'efodx-line-length-graph',
            citation: 'Earlier app by the owner: efodx.github.io, src/graphs line-length graph (studied 2026-10-11).',
            supports: ['a polyline on sin x over draggable endpoints', 'a number of segments from 2 to 100', 'readout of the polyline length'],
            implementationCorrespondence: 'Bezeg keeps the polyline on sin x with draggable endpoints, extends the number of segments to 1-100 (n = 1 is the chord on the x-axis) and draws the vertices as small markers. It adds the arc length integral sqrt(1 + f\'^2) (adaptive Simpson, 1e-9, exact derivative) and the difference arc - polyline next to the polyline length, and states the convention that lengths are never negative whichever endpoint is larger.',
        },
        {
            id: 'farouki-ph-arc-length',
            citation: 'Farouki, R. T. Pythagorean-Hodograph Curves: Algebra and Geometry Inseparable, Springer, 2008.',
            supports: ['PH curves have a polynomial speed ||r\'(t)||', 'the arc length of a PH curve is the integral of a polynomial and therefore exact', 'Bezeg shows this on the PH routes, for example /bezeg-2.0/ph/cubic'],
        },
        {
            id: 'bezeg-arc-length-implementation',
            citation: 'Bezeg source: src/analysis/arcLength.ts and src/graphs/functions/ArcLengthGraph.tsx.',
            supports: ['polyline vertices at n equal x-steps with the last vertex exactly at b', 'adaptive Simpson arc length with the catalog derivative of sin', 'endpoints in [-7, 7] rounded to 0.01', 'one curve object for the polyline and one for the vertex markers, whatever n is'],
        },
    ],
    edgeCases: [
        text(
            'Pri \\(a=b\\) sta obe dolžini \\(0\\). Pri \\(a>b\\) se dolžini ne spremenita, saj je dolžina vedno nenegativna (v aplikaciji se uporabi \\(|b-a|\\)); to se razlikuje od predznačenega integrala v lekciji o določenem integralu.',
            'For \\(a=b\\) both lengths are \\(0\\). For \\(a>b\\) the lengths do not change, because a length is always non-negative (the app uses \\(|b-a|\\)); this differs from the signed integral in the definite-integral lesson.',
        ),
        text(
            'Pri premajhnem \\(n\\) je lomljenka lahko slab približek: na \\([0,2\\pi]\\) pri \\(n=2\\) ležijo vsa oglišča na osi \\(x\\) in je lomljenka dolga \\(2\\pi\\approx6{,}2832\\) namesto \\(7{,}6404\\). Vseeno je lomljenka vedno krajša od loka ali enako dolga.',
            'For a small \\(n\\) the polyline can be a poor approximation: on \\([0,2\\pi]\\) with \\(n=2\\) all vertices lie on the \\(x\\)-axis and the polyline has length \\(2\\pi\\approx6.2832\\) instead of \\(7.6404\\). It is still never longer than the arc.',
        ),
        text(
            'Krajišči ležita v \\([-7,7]\\), število daljic \\(n\\) pa je celo število od \\(1\\) do \\(100\\). Vrednosti zunaj teh območij aplikacija zavrne.',
            'The endpoints lie in \\([-7,7]\\) and the number of segments \\(n\\) is an integer from \\(1\\) to \\(100\\). The app rejects values outside these ranges.',
        ),
    ],
    unresolvedQuestions: [
        text(
            'Pred classroom-ready pregledom je treba potrditi, ali naj lekcija obravnava tudi druge funkcije kot sinus in primer, ko \\(f\'\\) ni zvezen.',
            'Before classroom-ready review, confirm whether the lesson should also treat functions other than the sine and the case where \\(f\'\\) is not continuous.',
        ),
    ],
};

/** Lessons of the Functions and calculus family, in teaching order. */
export const functionGuidedLessons: readonly GuidedLesson[] = [linearFunction, exponentialFunction, trigonometricFunctions, continuity, derivative, definiteIntegral, areaBetweenCurves, arcLength];
