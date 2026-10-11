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

/** Lessons of the Functions and calculus family, in teaching order. */
export const functionGuidedLessons: readonly GuidedLesson[] = [linearFunction];
