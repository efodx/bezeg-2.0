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
                'Število \\(a\\) je osnova, \\(x\\) pa eksponent. Vsaka potenca z eksponentom \\(0\\) je enaka \\(1\\), potenca z eksponentom \\(1\\) pa je kar osnova.',
                'The number \\(a\\) is the base and \\(x\\) is the exponent. Every power with exponent \\(0\\) equals \\(1\\), and the power with exponent \\(1\\) is the base itself.',
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
            id: 'trig-amplitude-midline', order: 2,
            title: text('Amplituda in srednja črta', 'Amplitude and midline'),
            purpose: text('Zalogo vrednosti izračunati iz \\(A\\) in \\(B\\).', 'Computing the range from \\(A\\) and \\(B\\).'),
            explanation: text(
                'Število \\(A\\) razteguje graf navpično: val doseže višino \\(|A|\\) nad srednjo črto in \\(|A|\\) pod njo. Število \\(B\\) premakne srednjo črto na \\(y=B\\). Zato je največja vrednost \\(B+|A|\\), najmanjša pa \\(B-|A|\\). Pri \\(A=2\\) in \\(B=-1\\) je največ \\(-1+2=1\\) in najmanj \\(-1-2=-3\\).',
                'The number \\(A\\) stretches the graph vertically: the wave reaches \\(|A|\\) above the midline and \\(|A|\\) below it. The number \\(B\\) moves the midline to \\(y=B\\). So the maximum is \\(B+|A|\\) and the minimum is \\(B-|A|\\). For \\(A=2\\) and \\(B=-1\\) the maximum is \\(-1+2=1\\) and the minimum is \\(-1-2=-3\\).',
            ),
            formulaIds: ['trig-range'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-amplitude-midline-explanation', 'explanation'), frame('trig-amplitude-midline-observation', 'observation')],
            observationPrompt: text(
                'Premakni drsnik \\(A\\) čez \\(0\\) v negativne vrednosti in opazuj graf ter odčitek amplitude.',
                'Move the slider \\(A\\) across \\(0\\) to negative values and watch the graph and the amplitude readout.',
            ),
            expectedObservations: [text(
                'Pri \\(A=2\\) in \\(B=-1\\) je zaloga vrednosti \\([-3,1]\\). Pri negativnem \\(A\\) se graf prezrcali čez srednjo črto, amplituda \\(|A|\\) pa ostane pozitivna.',
                'For \\(A=2\\) and \\(B=-1\\) the range is \\([-3,1]\\). For a negative \\(A\\) the graph is reflected over the midline, while the amplitude \\(|A|\\) stays positive.',
            )],
            scene: {
                id: 'trig-amplitude-two-midline-minus-one', basedOn: 'demonstration-default',
                actions: [parameter('A', 2), parameter('B', -1)],
                expectedState: text(
                    'Prikazan je graf \\(f(x)=2\\sin x-1\\) s srednjo črto \\(y=-1\\); amplituda je \\(2\\), zaloga vrednosti \\([-3,1]\\).',
                    'The graph of \\(f(x)=2\\sin x-1\\) is shown with the midline \\(y=-1\\); the amplitude is \\(2\\) and the range \\([-3,1]\\).',
                ),
            },
        },
        {
            id: 'trig-period-shift-step', order: 3,
            title: text('Perioda in fazni zamik', 'Period and phase shift'),
            purpose: text('Periodo \\(2\\pi/\\omega\\) in zamik \\(-\\varphi/\\omega\\) izračunati in odčitati z grafa.', 'Computing the period \\(2\\pi/\\omega\\) and the shift \\(-\\varphi/\\omega\\) and reading them off the graph.'),
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
            id: 'trig-cosine-shifted-sine', order: 4,
            title: text('Kosinus je zamaknjen sinus', 'The cosine is a shifted sine'),
            purpose: text('Pokazati, da je \\(\\cos x=\\sin(x+\\pi/2)\\).', 'Showing that \\(\\cos x=\\sin(x+\\pi/2)\\).'),
            explanation: text(
                'Črtkani referenčni graf je osnovni \\(\\sin x\\), polni graf pa \\(\\sin(x+\\pi/2)\\) pri \\(\\varphi=\\pi/2\\). Polni graf je zamaknjen za \\(-\\varphi/\\omega=-\\pi/2\\), torej v levo, in ima pri \\(x=0\\) največjo vrednost \\(1\\), tako kot \\(\\cos x\\). Preveri: izberi \\(\\cos\\) in nastavi \\(\\varphi=0\\); dobiš isti graf.',
                'The dashed reference graph is the basic \\(\\sin x\\), and the solid graph is \\(\\sin(x+\\pi/2)\\) for \\(\\varphi=\\pi/2\\). The solid graph is shifted by \\(-\\varphi/\\omega=-\\pi/2\\), that is to the left, and has its maximum \\(1\\) at \\(x=0\\), just like \\(\\cos x\\). Check it: choose \\(\\cos\\) and set \\(\\varphi=0\\); you get the same graph.',
            ),
            formulaIds: ['trig-cos-sin'], learnerInteraction: 'adjust-construction-parameter',
            frames: [frame('trig-cosine-shifted-sine-explanation', 'explanation'), frame('trig-cosine-shifted-sine-observation', 'observation')],
            observationPrompt: text(
                'Primerjaj polni graf s črtkanim: za koliko in v katero smer je zamaknjen? Nato izberi \\(\\cos\\), nastavi \\(\\varphi=0\\) in preveri, da se polni graf ne spremeni.',
                'Compare the solid graph with the dashed one: by how much and in which direction is it shifted? Then choose \\(\\cos\\), set \\(\\varphi=0\\) and check that the solid graph does not change.',
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
            id: 'trig-tangent', order: 5,
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

/** Lessons of the Functions and calculus family, in teaching order. */
export const functionGuidedLessons: readonly GuidedLesson[] = [linearFunction, exponentialFunction, trigonometricFunctions];
