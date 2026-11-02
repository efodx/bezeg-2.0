import type {LocalizedText} from '../model';
import type {OrderedChapterContent} from '../chapter/orderedContent';
import type {FamilyChapter, FamilyChapterSection} from './familyChapters';
import {
    SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID, schoolFunctionGraphsGuidedExampleDemonstration, type SchoolFunctionGraphsSectionId,
} from './schoolFunctionGraphsChapterRegistry';

// Local helper: familyChapters.ts imports this chapter, so it must not import values from familyChapters.ts.
const text = (sl: string, en: string): LocalizedText => ({sl, en});

/** Reading material first, then the prepared activity at the section end. */
function withExample(sectionId: SchoolFunctionGraphsSectionId, section: FamilyChapterSection): FamilyChapterSection {
    const demonstrationId = schoolFunctionGraphsGuidedExampleDemonstration(sectionId);
    const content: OrderedChapterContent<LocalizedText>[] = [
        ...section.paragraphs.map(paragraph => ({kind: 'paragraph' as const, text: paragraph})),
        ...(section.formula ? [{kind: 'formula' as const, latex: section.formula}] : []),
        {kind: 'example', exampleId: `${SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID}.${sectionId}.${demonstrationId}`},
    ];
    return {...section, orderedContent: content};
}

/** Batch A of the school function graphs spec: only the released lessons (S1 graph transformations, S2 inverse functions and the logarithm) are mentioned. */
export const schoolFunctionGraphsChapter: FamilyChapter = {
    id: SCHOOL_FUNCTION_GRAPHS_CHAPTER_ID,
    family: '/bezeg-2.0/functions',
    title: text('Grafi funkcij za maturo', 'Function graphs for the matura'),
    purpose: text('Pri maturi moraš iz formule funkcije hitro narisati in prebrati graf. Poglavje pokaže, kako štirje parametri v \\(y=a\\,f(b(x-c))+d\\) premaknejo, raztegnejo ali zrcalijo graf osnovne funkcije, in kako je graf inverzne funkcije zrcalna slika v premici \\(y=x\\), kar vodi do logaritma.', 'For the matura you need to sketch and read a graph quickly from the formula of a function. The chapter shows how the four parameters in \\(y=a\\,f(b(x-c))+d\\) shift, stretch or reflect the graph of a base function, and how the graph of an inverse function is the reflection in the line \\(y=x\\), which leads to the logarithm.'),
    prerequisites: text('Funkcija kot pravilo z grafom iz poglavja o funkcijah, eksponentna funkcija in odvod funkcije.', 'A function as a rule with a graph from the functions chapter, the exponential function, and the derivative of a function.'),
    prerequisiteLinks: [{path: '/bezeg-2.0/learn/functions-and-calculus#function-rules', title: text('Funkcije in analiza: funkcije so pravila z domeno', 'Functions and calculus: functions are rules with a domain')}],
    sections: [
        withExample('function-transformation', {
            id: 'function-transformation',
            demonstrationIds: ['function-transformation'],
            investigationPrompts: {'function-transformation': text('Napovej, kaj se zgodi z grafom, ko spremeniš en parameter, nato preveri. Nato izračunaj sliko točke \\((1,1)\\) po pravilu in jo poišči na grafu.', 'Predict what happens to the graph when you change one parameter, then check. Then compute the image of the point \\((1,1)\\) by the rule and find it on the graph.')},
            title: text('Premik, raztegnitev in zrcaljenje grafa', 'Shifting, stretching and reflecting a graph'),
            formula: String.raw`y=a\,f\bigl(b(x-c)\bigr)+d`,
            paragraphs: [
                text('Cilj razdelka: vsakemu od štirih parametrov znaš pripisati eno spremembo grafa. Graf funkcije \\(y=a\\,f(b(x-c))+d\\) dobimo iz grafa osnovne funkcije \\(f\\). Parameter \\(d\\) graf premakne navpično, \\(c\\) vodoravno, \\(a\\) ga navpično raztegne, \\(b\\) pa vodoravno. Negativen \\(a\\) graf zrcali čez os \\(x\\), negativen \\(b\\) pa čez navpično premico \\(x=c\\). Parameter \\(b=0\\) ni dovoljen, ker bi graf strnil v vodoravno premico.', 'Learning outcome: you can assign one change of the graph to each of the four parameters. The graph of \\(y=a\\,f(b(x-c))+d\\) comes from the graph of the base function \\(f\\). The parameter \\(d\\) shifts the graph vertically, \\(c\\) horizontally, \\(a\\) stretches it vertically and \\(b\\) horizontally. A negative \\(a\\) reflects the graph in the \\(x\\)-axis and a negative \\(b\\) reflects it in the vertical line \\(x=c\\). The value \\(b=0\\) is not allowed, because it would collapse the graph to a horizontal line.'),
                text('Zgled: osnova \\(f(x)=x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\), torej \\(y=-2\\bigl(\\tfrac12(x-3)\\bigr)^2+1\\). Teme je v \\((3,1)\\). Točka \\((u,v)\\) osnovnega grafa se preslika v \\((u/b+c,\\;a\\,v+d)\\), zato gre točka \\((2,4)\\) v \\((2/\\tfrac12+3,\\;-2\\cdot4+1)=(7,-7)\\). Pri \\(x=5\\) je \\(\\tfrac12(5-3)=1\\), zato je \\(y=-2\\cdot1+1=-1\\). Parametre vidimo na grafu kot premik, raztegnitev in zrcaljenje, vsakega posebej.', 'Example: base \\(f(x)=x^2\\), \\(a=-2\\), \\(b=\\tfrac12\\), \\(c=3\\), \\(d=1\\), so \\(y=-2\\bigl(\\tfrac12(x-3)\\bigr)^2+1\\). The vertex is at \\((3,1)\\). A point \\((u,v)\\) of the base graph maps to \\((u/b+c,\\;a\\,v+d)\\), so the point \\((2,4)\\) goes to \\((2/\\tfrac12+3,\\;-2\\cdot4+1)=(7,-7)\\). At \\(x=5\\) we have \\(\\tfrac12(5-3)=1\\), so \\(y=-2\\cdot1+1=-1\\). On the graph the parameters appear as a shift, a stretch and a reflection, each on its own.'),
                text('Pozor: vrstni red računanja je odštej \\(c\\), pomnoži z \\(b\\), vstavi v \\(f\\), pomnoži z \\(a\\), prištej \\(d\\). Parametra znotraj \\(f\\) delujeta nasprotno, kot bi pričakoval: \\(c=3\\) graf premakne v desno, \\(b=\\tfrac12\\) pa ga vodoravno razširi na dvakratno širino, ker točka potrebuje dvakrat večji \\(x\\), da doseže isto vrednost. Pravilo za sliko točke velja za vsako osnovno funkcijo, ne le za \\(x^2\\), zato ga uporabi tudi pri sinusni in eksponentni funkciji.', 'Caution: the order of computation is subtract \\(c\\), multiply by \\(b\\), apply \\(f\\), multiply by \\(a\\), add \\(d\\). The two parameters inside \\(f\\) act opposite to what you might expect: \\(c=3\\) moves the graph to the right, and \\(b=\\tfrac12\\) widens it horizontally to twice the width, because a point needs an \\(x\\) twice as large to reach the same value. The rule for the image of a point holds for every base function, not only for \\(x^2\\), so use it for the sine and exponential functions as well.'),
            ],
        }),
        withExample('function-inverse', {
            id: 'function-inverse',
            demonstrationIds: ['function-inverse'],
            investigationPrompts: {'function-inverse': text('Napovej, kje leži zrcalna točka točke \\((2,4)\\) v premici \\(y=x\\), nato razkrij zrcalno krivuljo. Nato spremeni osnovo \\(a\\) in opazuj \\(a^x\\) ter \\(\\log_a\\).', 'Predict where the mirror point of \\((2,4)\\) in the line \\(y=x\\) lies, then reveal the mirrored curve. Then change the base \\(a\\) and watch \\(a^x\\) and \\(\\log_a\\).')},
            title: text('Inverzna funkcija in logaritem', 'The inverse function and the logarithm'),
            formula: String.raw`(f^{-1})'(y_0)=\frac{1}{f'(x_0)}`,
            paragraphs: [
                text('Cilj razdelka: znaš narisati graf inverzne funkcije in razložiš, zakaj je logaritem inverz eksponentne funkcije. Graf inverzne funkcije \\(f^{-1}\\) je zrcalna slika grafa funkcije \\(f\\) v premici \\(y=x\\): točka \\((x,y)\\) preide v \\((y,x)\\). Inverz obstaja le, če je \\(f\\) injektivna, zato je pri \\(x^2\\) treba zožiti definicijsko območje na \\(x\\ge0\\); tedaj je inverz \\(\\sqrt x\\). Logaritem \\(\\ln\\) je inverz funkcije \\(e^x\\), logaritem z osnovo \\(a\\), \\(\\log_a\\), pa inverz funkcije \\(a^x\\) za \\(a>0\\) in \\(a\\ne1\\).', 'Learning outcome: you can sketch the graph of an inverse function and explain why the logarithm is the inverse of the exponential function. The graph of the inverse function \\(f^{-1}\\) is the reflection of the graph of \\(f\\) in the line \\(y=x\\): the point \\((x,y)\\) goes to \\((y,x)\\). An inverse exists only if \\(f\\) is one-to-one, so for \\(x^2\\) the domain must be restricted to \\(x\\ge0\\); the inverse is then \\(\\sqrt x\\). The logarithm \\(\\ln\\) is the inverse of \\(e^x\\), and the logarithm to base \\(a\\), \\(\\log_a\\), is the inverse of \\(a^x\\) for \\(a>0\\) and \\(a\\ne1\\).'),
                text('Zgled: točka \\((2,4)\\) grafa \\(x^2\\) na \\(x\\ge0\\) ima zrcalno točko \\((4,2)\\) na grafu \\(\\sqrt x\\). Tangenti v teh točkah se zrcalita, zato sta smerna koeficienta obratni vrednosti: \\(4\\) in \\(\\tfrac14\\), zmnožek je \\(1\\). Pri osnovi \\(2\\) je \\(2^3=8\\), zato je \\(\\log_28=3\\); smerni koeficient funkcije \\(2^x\\) v \\((3,8)\\) je \\(8\\ln2\\approx5{,}5452\\), funkcije \\(\\log_2\\) v \\((8,3)\\) pa \\(1/(8\\ln2)\\approx0{,}18034\\). Pri \\(e^x\\) v \\((1,e)\\) je smerni koeficient \\(e\\), pri \\(\\ln\\) v \\((e,1)\\) pa \\(1/e\\approx0{,}36788\\).', 'Example: the point \\((2,4)\\) of the graph of \\(x^2\\) on \\(x\\ge0\\) has the mirror point \\((4,2)\\) on the graph of \\(\\sqrt x\\). The tangents at these points mirror each other, so the slopes are reciprocal: \\(4\\) and \\(\\tfrac14\\), and the product is \\(1\\). For base \\(2\\) we have \\(2^3=8\\), so \\(\\log_28=3\\); the slope of \\(2^x\\) at \\((3,8)\\) is \\(8\\ln2\\approx5.5452\\), and that of \\(\\log_2\\) at \\((8,3)\\) is \\(1/(8\\ln2)\\approx0.18034\\). For \\(e^x\\) at \\((1,e)\\) the slope is \\(e\\), and for \\(\\ln\\) at \\((e,1)\\) it is \\(1/e\\approx0.36788\\).'),
                text('Pozor: pravilo o obratnih smernih koeficientih velja le tam, kjer je \\(f\'(x_0)\\ne0\\). Pri \\(x^2\\) v \\(x_0=0\\) je tangenta vodoravna, zrcalna tangenta funkcije \\(\\sqrt x\\) v \\(0\\) je navpična in smernega koeficienta ni. Funkcija \\(\\ln\\) je določena le za \\(x>0\\), njen graf se približuje premici \\(x=0\\); zrcalno ustreza vodoravni asimptoti \\(y=0\\) funkcije \\(e^x\\). Zrcaljenje je konstrukcija z zamenjavo koordinat; zveza med smernima koeficientoma je ilustracija pravila za odvod inverzne funkcije in ni dokaz.', 'Caution: the rule for reciprocal slopes holds only where \\(f\'(x_0)\\ne0\\). For \\(x^2\\) at \\(x_0=0\\) the tangent is horizontal, the mirrored tangent of \\(\\sqrt x\\) at \\(0\\) is vertical and there is no slope. The function \\(\\ln\\) is defined only for \\(x>0\\), and its graph approaches the line \\(x=0\\); mirrored, this corresponds to the horizontal asymptote \\(y=0\\) of \\(e^x\\). The reflection is a construction by swapping coordinates; the relation between the slopes illustrates the rule for the derivative of an inverse function and is not a proof.'),
            ],
        }),
    ],
};
