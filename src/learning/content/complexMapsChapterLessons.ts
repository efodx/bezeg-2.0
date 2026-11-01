import type {LessonAction, LessonDefinition, LessonStep, LocalizedText} from '../model';

// Complex maps chapter-owned guided activities (spec M1 and M2). Every number is recomputed in complexMapsChapter.test.ts from the kernel.
// Scene actions run synchronously in one tick; each scene starts from the Demonstration default and then names its state.

const words = (sl: string, en: string): LocalizedText => ({sl, en});

const defaultScene = (sceneId: string): LessonAction => ({kind: 'prepared-scene', sceneId, source: 'demonstration-default'});
const param = (name: Extract<LessonAction, {kind: 'function-parameter'}>['name'], value: number): LessonAction => ({kind: 'function-parameter', name, value});
const show = (target: Extract<LessonAction, {kind: 'function-visibility'}>['target'], visible = true): LessonAction => ({kind: 'function-visibility', target, visible});
const recipExample = (value: string): LessonAction => ({kind: 'function-choice', name: 'complex-reciprocal-example', value});
const rootsExample = (value: string): LessonAction => ({kind: 'function-choice', name: 'complex-roots-example', value});

function step(prefix: string, id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, actions: readonly LessonAction[]): LessonStep {
    return {id, title, body, prompt, scene: {actions: [defaultScene(`${prefix}-${id}`), ...actions]}};
}
const recipStep = (id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, actions: readonly LessonAction[]): LessonStep =>
    step('complex-reciprocal', id, title, body, prompt, actions);
const rootsStep = (id: string, title: LocalizedText, body: LocalizedText, prompt: LocalizedText, actions: readonly LessonAction[]): LessonStep =>
    step('complex-roots', id, title, body, prompt, actions);

export const complexReciprocalLesson: LessonDefinition = {
    id: 'complex-reciprocal-inversion',
    demonstrationId: 'complex-reciprocal',
    title: words('Recipročna vrednost in inverzija', 'The reciprocal and inversion'),
    summary: words(
        'Za \\(z\\ne0\\) velja \\(1/z=\\bar z/|z|^2\\): recipročna vrednost je inverzija v enotski krožnici, ki ji sledi zrcaljenje čez realno os. Točka znotraj krožnice gre ven, na krožnici pa je \\(1/z=\\bar z\\).',
        'For \\(z\\ne0\\) we have \\(1/z=\\bar z/|z|^2\\): the reciprocal is the inversion in the unit circle followed by the reflection in the real axis. A point inside the circle goes outside, and on the circle \\(1/z=\\bar z\\).',
    ),
    steps: [
        recipStep('conjugate',
            words('Konjugirana vrednost in modul', 'The conjugate and the modulus'),
            words('Za \\(z=1+i\\) je konjugirana vrednost \\(\\bar z=1-i\\): točka, zrcaljena čez realno os. Modul je \\(|z|=\\sqrt2\\approx1{,}4142\\) in argument \\(45^\\circ\\); zrcaljenje modula ne spremeni, argument pa obrne v \\(-45^\\circ\\).', 'For \\(z=1+i\\) the conjugate is \\(\\bar z=1-i\\): the point reflected in the real axis. The modulus is \\(|z|=\\sqrt2\\approx1.4142\\) and the argument is \\(45^\\circ\\); the reflection keeps the modulus and reverses the argument to \\(-45^\\circ\\).'),
            words('Povleci \\(z\\) in napovej \\(\\bar z\\) ter \\(|z|\\), preden pogledaš odčitek. Kam gre \\(\\bar z\\), ko je \\(z\\) na realni osi?', 'Drag \\(z\\) and predict \\(\\bar z\\) and \\(|z|\\) before looking at the readout. Where does \\(\\bar z\\) go when \\(z\\) is on the real axis?'),
            [recipExample('outside')]),
        recipStep('reciprocal',
            words('Recipročna vrednost \\(1/z\\)', 'The reciprocal \\(1/z\\)'),
            words('Zapišemo \\(1/z=\\bar z/|z|^2\\), ker je \\(z\\bar z=|z|^2\\). Za \\(z=1+i\\) je \\(|z|^2=2\\), zato je \\(1/z=\\tfrac12(1-i)=0{,}5-0{,}5i\\). Modul je \\(1/|z|\\approx0{,}7071\\) in argument \\(-\\arg z=-45^\\circ\\).', 'We write \\(1/z=\\bar z/|z|^2\\), because \\(z\\bar z=|z|^2\\). For \\(z=1+i\\) we have \\(|z|^2=2\\), so \\(1/z=\\tfrac12(1-i)=0.5-0.5i\\). The modulus is \\(1/|z|\\approx0.7071\\) and the argument is \\(-\\arg z=-45^\\circ\\).'),
            words('Pokaži \\(1/z\\) in povleci \\(z\\): kaj se zgodi z modulom \\(1/z\\), ko se \\(z\\) približuje izhodišču?', 'Show \\(1/z\\) and drag \\(z\\): what happens to the modulus of \\(1/z\\) as \\(z\\) approaches the origin?'),
            [recipExample('outside'), show('complex-reciprocal')]),
        recipStep('inside-outside',
            words('Znotraj in zunaj enotske krožnice', 'Inside and outside the unit circle'),
            words('Točka \\(z=0{,}5+0{,}5i\\) je znotraj krožnice, saj je \\(|z|=\\tfrac{\\sqrt2}{2}\\approx0{,}7071<1\\). Njena recipročna vrednost je \\(1/z=1-i\\), z modulom \\(\\sqrt2\\approx1{,}4142>1\\): znotraj gre ven in obratno, ker je \\(|1/z|=1/|z|\\).', 'The point \\(z=0.5+0.5i\\) is inside the circle, since \\(|z|=\\tfrac{\\sqrt2}{2}\\approx0.7071<1\\). Its reciprocal is \\(1/z=1-i\\), with modulus \\(\\sqrt2\\approx1.4142>1\\): inside goes outside and conversely, because \\(|1/z|=1/|z|\\).'),
            words('Povleci \\(z\\) čez krožnico in opazuj, na kateri strani je \\(1/z\\). Pri katerem modulu se strani zamenjata?', 'Drag \\(z\\) across the circle and watch which side \\(1/z\\) is on. At which modulus do the sides swap?'),
            [recipExample('inside'), show('complex-reciprocal')]),
        recipStep('on-circle',
            words('Na krožnici je \\(1/z=\\bar z\\)', 'On the circle \\(1/z=\\bar z\\)'),
            words('Za \\(z=0{,}6+0{,}8i\\) je \\(|z|^2=0{,}36+0{,}64=1\\), zato je \\(1/z=\\bar z=0{,}6-0{,}8i\\). Točka je na krožnici natanko tedaj, ko je \\(|z|=1\\); to graf presodi natančno na mreži, ne s toleranco.', 'For \\(z=0.6+0.8i\\) we have \\(|z|^2=0.36+0.64=1\\), so \\(1/z=\\bar z=0.6-0.8i\\). A point is on the circle exactly when \\(|z|=1\\); the graph decides this exactly on the grid, not with a tolerance.'),
            words('Poišči še eno mrežno točko na krožnici in preveri, da je tam \\(1/z\\) enak \\(\\bar z\\).', 'Find another grid point on the circle and check that \\(1/z\\) equals \\(\\bar z\\) there.'),
            [recipExample('unit-circle'), show('complex-reciprocal')]),
        recipStep('division',
            words('Deljenje \\(w/z\\)', 'Division \\(w/z\\)'),
            words('Količnik je \\(w/z=w\\cdot\\tfrac1z\\). Za \\(w=2+i\\) in \\(z=1-i\\) je \\(1/z=\\tfrac12(1+i)\\), torej \\(w/z=\\tfrac12(2+i)(1+i)=\\tfrac12(1+3i)=0{,}5+1{,}5i\\). Moduli se delijo, argumenta odštejeta.', 'The quotient is \\(w/z=w\\cdot\\tfrac1z\\). For \\(w=2+i\\) and \\(z=1-i\\) we have \\(1/z=\\tfrac12(1+i)\\), so \\(w/z=\\tfrac12(2+i)(1+i)=\\tfrac12(1+3i)=0.5+1.5i\\). Moduli divide and arguments subtract.'),
            words('Povleci \\(w\\) in \\(z\\) in preveri, da je \\(|w/z|=|w|/|z|\\).', 'Drag \\(w\\) and \\(z\\) and check that \\(|w/z|=|w|/|z|\\).'),
            [recipExample('division'), show('complex-reciprocal'), show('complex-quotient')]),
        recipStep('inversion-circle',
            words('Inverzija v poljubni krožnici', 'Inversion in any circle'),
            words('Inverzija v krožnici s središčem \\(c\\) in polmerom \\(r\\) je \\(z\\mapsto c+r^2/\\overline{z-c}\\). V enotski krožnici s središčem \\(0\\) je \\(1+i\\mapsto0{,}5+0{,}5i\\), njena konjugirana vrednost pa je \\(1/z=0{,}5-0{,}5i\\). Za središče \\(0{,}5\\) in polmer \\(1\\) se \\(z=1{,}5+i\\) preslika v \\(1+0{,}5i\\). Izrek: dvakratna inverzija vrne točko (involucija) in inverzija obrne orientacijo: kot med smerema \\(1\\) in \\(i\\) pri \\(0{,}5+0{,}5i\\) postane \\(-90^\\circ\\). Na isto inverzijo se sklicujejo lekcije o geometriji trikotnika.', 'Inversion in the circle with centre \\(c\\) and radius \\(r\\) is \\(z\\mapsto c+r^2/\\overline{z-c}\\). In the unit circle with centre \\(0\\), \\(1+i\\mapsto0.5+0.5i\\), and its conjugate is \\(1/z=0.5-0.5i\\). For centre \\(0.5\\) and radius \\(1\\), \\(z=1.5+i\\) goes to \\(1+0.5i\\). Theorem: applying the inversion twice returns the point (an involution), and it reverses orientation: the angle between the directions \\(1\\) and \\(i\\) at \\(0.5+0.5i\\) becomes \\(-90^\\circ\\). The triangle geometry lessons reuse this same inversion.'),
            words('Povleci središče in polmer krožnice ter opazuj sliko \\(z\\). Katere točke ostanejo na mestu?', 'Drag the centre and the radius of the circle and watch the image of \\(z\\). Which points stay in place?'),
            [recipExample('outside'), show('complex-circle'), param('complex-centre-re', 0.5), param('complex-centre-im', 0), param('complex-radius', 1), param('complex-z-re', 1.5), param('complex-z-im', 1)]),
        recipStep('explore',
            words('Prosto raziskovanje', 'Free exploration'),
            words('Pokazano je vse. Točka \\(z=0\\) je dovoljena: recipročna vrednost ni definirana in \\(1/z\\) neomejeno raste, ko gre \\(z\\to0\\); graf tega ne izpiše kot število. Slike so ponazoritev: da je \\(1/z=\\bar z/|z|^2\\), sledi iz \\(z\\bar z=|z|^2\\), ne iz risanja.', 'Everything is shown. The point \\(z=0\\) is allowed: the reciprocal is not defined and \\(1/z\\) grows without bound as \\(z\\to0\\); the graph does not print it as a number. The pictures illustrate: that \\(1/z=\\bar z/|z|^2\\) follows from \\(z\\bar z=|z|^2\\), not from the drawing.'),
            words('Postavi \\(z\\) na \\(0\\) in nato na \\(0{,}05\\). Kaj se zgodi z \\(1/z\\)?', 'Put \\(z\\) at \\(0\\) and then at \\(0.05\\). What happens to \\(1/z\\)?'),
            [recipExample('outside'), show('complex-reciprocal'), show('complex-quotient'), show('complex-circle')]),
    ],
};

export const complexRootsLesson: LessonDefinition = {
    id: 'complex-roots-polygon',
    demonstrationId: 'complex-roots',
    title: words('Koreni kot pravilni mnogokotnik', 'Roots as a regular polygon'),
    summary: words(
        'Enačba \\(z^n=w\\) pri \\(w\\ne0\\) ima natanko \\(n\\) rešitev, ki so oglišča pravilnega \\(n\\)-kotnika s polmerom \\(|w|^{1/n}\\). Vrtenje števila \\(w\\) za kot zavrti mnogokotnik za \\(n\\)-ti del kota.',
        'For \\(w\\ne0\\) the equation \\(z^n=w\\) has exactly \\(n\\) solutions, the vertices of a regular \\(n\\)-gon of radius \\(|w|^{1/n}\\). Rotating \\(w\\) by an angle turns the polygon by the \\(n\\)th part of it.',
    ),
    steps: [
        rootsStep('cube-rotates',
            words('Tretja potenca kot vrtenje', 'The cube as a rotation'),
            words('Pri potenciranju \\(z^3\\) se modul kubira, argument pa potroji. Za \\(w=2i\\) velja \\(|w|=2\\) in \\(\\arg w=90^\\circ\\). Rešitev \\(z^3=w\\) mora imeti modul \\(2^{1/3}\\approx1{,}26\\) in argument \\(30^\\circ\\) plus večkratnik \\(120^\\circ\\), da se potrojen kot ujema z \\(90^\\circ\\) do polnega kroga.', 'Raising to the power \\(z^3\\) cubes the modulus and triples the argument. For \\(w=2i\\) we have \\(|w|=2\\) and \\(\\arg w=90^\\circ\\). A solution of \\(z^3=w\\) must have modulus \\(2^{1/3}\\approx1.26\\) and argument \\(30^\\circ\\) plus a multiple of \\(120^\\circ\\), so that the tripled angle matches \\(90^\\circ\\) up to a full turn.'),
            words('Napovej, kje so rešitve \\(z^3=2i\\), preden jih pokažeš.', 'Predict where the solutions of \\(z^3=2i\\) are before you show them.'),
            [rootsExample('two-i')]),
        rootsStep('find-roots',
            words('Poišči točke, katerih kub je \\(w\\)', 'Find the points whose cube is \\(w\\)'),
            words('Koreni so \\(2^{1/3}e^{i\\pi/6}\\approx1{,}0911+0{,}63i\\), \\(\\approx-1{,}0911+0{,}63i\\) in \\(\\approx-1{,}26i\\), pri kotih \\(30^\\circ\\), \\(150^\\circ\\) in \\(270^\\circ\\) (glavni argument zadnjega je \\(-90^\\circ\\)). Kub vsakega je \\(2i\\).', 'The roots are \\(2^{1/3}e^{i\\pi/6}\\approx1.0911+0.63i\\), \\(\\approx-1.0911+0.63i\\) and \\(\\approx-1.26i\\), at \\(30^\\circ\\), \\(150^\\circ\\) and \\(270^\\circ\\) (the principal argument of the last is \\(-90^\\circ\\)). Each cubes to \\(2i\\).'),
            words('Pokaži točko \\(z\\) in jo povleci proti korenu. Ob odčitku \\(z^3\\) primerjaj z \\(w\\).', 'Show the point \\(z\\) and drag it towards a root. Compare \\(z^3\\) with \\(w\\) in the readout.'),
            [rootsExample('two-i'), show('complex-roots'), show('complex-test'), param('complex-z-re', 1.1), param('complex-z-im', 0.65)]),
        rootsStep('polygon',
            words('Trikotnik', 'The triangle'),
            words('Trije koreni so oglišča enakostraničnega trikotnika s polmerom \\(2^{1/3}\\). Njihova vsota je \\(0\\) in produkt je \\(2i\\), to je \\((-1)^{n+1}w\\) za \\(n=3\\) (Vietove formule, navedene, ne izpeljane). To, da je rešitev natanko \\(n\\), je osnovni izrek algebre za \\(z^n-w\\) (naveden); slika pokaže mnogokotnik, tega ne dokazuje.', 'The three roots are the vertices of an equilateral triangle of radius \\(2^{1/3}\\). Their sum is \\(0\\) and their product is \\(2i\\), which is \\((-1)^{n+1}w\\) for \\(n=3\\) (Vieta, cited, not derived). That there are exactly \\(n\\) solutions is the fundamental theorem of algebra applied to \\(z^n-w\\) (cited); the picture shows the polygon, it does not prove this.'),
            words('Preveri, da se vsi trije koreni vidijo na isti krožnici, in izračunaj njihovo vsoto iz odčitkov.', 'Check that all three roots lie on one circle, and compute their sum from the readouts.'),
            [rootsExample('two-i'), show('complex-roots'), show('complex-polygon')]),
        rootsStep('rotate-w',
            words('Vrtenje \\(w\\) zavrti mnogokotnik', 'Rotating \\(w\\) turns the polygon'),
            words('Za \\(w=1+i\\) je \\(|w|=\\sqrt2\\) in \\(\\arg w=45^\\circ\\), polmer je \\(2^{1/6}\\approx1{,}1225\\) in prvi koren leži pri \\(15^\\circ\\); ostala dva sta pri \\(135^\\circ\\) in \\(-105^\\circ\\). Od \\(w=2i\\) smo \\(w\\) zavrteli za \\(-45^\\circ\\), mnogokotnik pa se je zavrtel za tretjino tega, za \\(-15^\\circ\\) (z \\(30^\\circ\\) na \\(15^\\circ\\)).', 'For \\(w=1+i\\) we have \\(|w|=\\sqrt2\\) and \\(\\arg w=45^\\circ\\), the radius is \\(2^{1/6}\\approx1.1225\\) and the first root is at \\(15^\\circ\\); the other two are at \\(135^\\circ\\) and \\(-105^\\circ\\). From \\(w=2i\\) we rotated \\(w\\) by \\(-45^\\circ\\), and the polygon turned by a third of that, by \\(-15^\\circ\\) (from \\(30^\\circ\\) to \\(15^\\circ\\)).'),
            words('Povleci \\(w\\) po krožnici okoli izhodišča. Za koliko se zavrti mnogokotnik, ko se \\(w\\) zavrti za \\(90^\\circ\\)?', 'Drag \\(w\\) around the origin. By how much does the polygon turn when \\(w\\) turns by \\(90^\\circ\\)?'),
            [rootsExample('one-plus-i'), show('complex-roots'), show('complex-polygon')]),
        rootsStep('change-n',
            words('Spremeni stopnjo \\(n\\)', 'Change the degree \\(n\\)'),
            words('Za \\(w=1\\) in \\(n=6\\) so koreni šesti koreni enote, pri kotih \\(0^\\circ,60^\\circ,120^\\circ,180^\\circ,-120^\\circ,-60^\\circ\\) in s polmerom \\(1\\). Njihova vsota je \\(0\\) in produkt je \\((-1)^{7}\\cdot1=-1\\). Pri \\(n=4\\) so koreni \\(1,i,-1,-i\\), produkt je \\(-1\\) in vsota \\(0\\).', 'For \\(w=1\\) and \\(n=6\\) the roots are the sixth roots of unity, at \\(0^\\circ,60^\\circ,120^\\circ,180^\\circ,-120^\\circ,-60^\\circ\\) and with radius \\(1\\). Their sum is \\(0\\) and their product is \\((-1)^{7}\\cdot1=-1\\). For \\(n=4\\) the roots are \\(1,i,-1,-i\\), with product \\(-1\\) and sum \\(0\\).'),
            words('Spreminjaj \\(n\\) od \\(2\\) do \\(8\\). Koliko je oglišč in kje je vedno eno od njih?', 'Change \\(n\\) from \\(2\\) to \\(8\\). How many vertices are there, and where is one of them always?'),
            [rootsExample('unity'), param('n', 6), show('complex-roots'), show('complex-polygon')]),
        rootsStep('labelling',
            words('Oštevilčenje in prelom pri negativni osi', 'The labelling and the jump at the negative axis'),
            words('Koren \\(k\\) je \\(|w|^{1/n}e^{i(\\operatorname{Arg}w+2\\pi k)/n}\\), \\(k=0,\\dots,n-1\\), z glavnim argumentom iz \\((-\\pi,\\pi]\\); koren \\(0\\) je glavni koren. Pri \\(w=-1\\) in \\(n=3\\) je \\(\\operatorname{Arg}w=\\pi\\) natančno in koreni \\(0,1,2\\) so pri \\(60^\\circ,180^\\circ,-60^\\circ\\). Tik nad osjo so oznake približno enake, tik pod njo (\\(\\operatorname{Arg}w\\approx-\\pi\\)) pa so koreni \\(0,1,2\\) pri približno \\(-60^\\circ,60^\\circ,-180^\\circ\\): oznake skočijo, množica korenov pa ostane ista.', 'Root \\(k\\) is \\(|w|^{1/n}e^{i(\\operatorname{Arg}w+2\\pi k)/n}\\), \\(k=0,\\dots,n-1\\), with the principal argument in \\((-\\pi,\\pi]\\); root \\(0\\) is the principal root. For \\(w=-1\\) and \\(n=3\\) we have \\(\\operatorname{Arg}w=\\pi\\) exactly and roots \\(0,1,2\\) are at \\(60^\\circ,180^\\circ,-60^\\circ\\). Just above the axis the labels are nearly the same, but just below it (\\(\\operatorname{Arg}w\\approx-\\pi\\)) roots \\(0,1,2\\) are at about \\(-60^\\circ,60^\\circ,-180^\\circ\\): the labels jump while the set of roots stays the same.'),
            words('Povleci \\(w\\) iz točke tik nad negativno realno osjo na točko tik pod njo. Kateri koren dobi katero oznako?', 'Drag \\(w\\) from just above the negative real axis to just below it. Which root gets which label?'),
            [rootsExample('negative-real'), param('n', 3), param('complex-w-im', 0.05), show('complex-roots'), show('complex-polygon')]),
        rootsStep('explore',
            words('Prosto raziskovanje', 'Free exploration'),
            words('Pokazano je vse. Za \\(w=0\\) je edini koren \\(0\\) z večkratnostjo \\(n\\) in mnogokotnika ni. Povleci \\(w\\) in \\(z\\) ter spreminjaj \\(n\\); vsaka postavitev je primer izreka, ne njegov dokaz.', 'Everything is shown. For \\(w=0\\) the only root is \\(0\\) with multiplicity \\(n\\) and there is no polygon. Drag \\(w\\) and \\(z\\) and change \\(n\\); each position is an instance of the theorem, not a proof of it.'),
            words('Postavi \\(w\\) na \\(0\\) in opiši, kaj se zgodi z mnogokotnikom.', 'Put \\(w\\) at \\(0\\) and describe what happens to the polygon.'),
            [rootsExample('two-i'), show('complex-roots'), show('complex-polygon'), show('complex-test')]),
    ],
};
