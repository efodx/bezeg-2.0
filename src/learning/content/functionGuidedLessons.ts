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

/** Lessons of the Functions and calculus family, in teaching order. */
export const functionGuidedLessons: readonly GuidedLesson[] = [linearFunction, exponentialFunction];
