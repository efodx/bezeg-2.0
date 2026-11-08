# curve-curvature-guided (lesson script r1)

**Naslov:** Ukrivljenost in krivinska krožnica

**Uvod (viden na prvem koraku, prvem okvirju):** Ta krivulja se na začetku zavije bolj kot na koncu. Zakaj? In kako zavoj izmeriš s številom, ki ga lahko tudi narišeš kot krožnico?

## Korak 1/6: Kateri konec se bolj zavije?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Kateri konec se bolj zavije?

[besedilo] Krivulja se začne pri \(t=0\) in konča pri \(t=1\). Na enem koncu se zavije bolj kot na drugem. Program izpisuje ukrivljenost \(\kappa\): število, ki je večje, kjer je zavoj močnejši. Okvir in krožnica sta zaenkrat skrita.

[gumb: Nazaj] (onemogočen) [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Kateri konec se bolj zavije?

[navodilo za opazovanje] Napovej, na katerem koncu je zavoj močnejši. Nato z drsnikom »Parameter t« preberi \(\kappa\) pri \(t=0\) in pri \(t=1\).

[skrito pod 'Kaj bi morali opaziti'] Začetek se zavije dosti bolj: \(\kappa\) je pri \(t=0\) približno 11-krat večja kot pri \(t=1\). Zakaj je tako, bomo ugotovili do konca.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja s kontrolnimi točkami \((0,0)\), \((1,0)\), \((2,1)\), \((3,3)\), točka pri \(t=0{,}5\); okvir in krožnica skrita.*

## Korak 2/6: Tangenta se obrača

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Tangenta se obrača

[besedilo] V točki krivulje sta zdaj narisani dve puščici dolžine \(1\): tangenta \(T\) kaže v smeri krivulje, normala \(N\) pa je nanjo pravokotna in kaže na stran zavoja. Ko se krivulja zavija, se tangenta obrača; ukrivljenost pove, kako hitro. Program izpisuje tudi kot \(\varphi\) med tangento in osjo \(x\).

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Tangenta se obrača

[navodilo za opazovanje] Premakni \(t\) z \(0\) na \(0{,}25\) in poglej, za koliko se je kot \(\varphi\) spremenil. Potem isto naredi med \(0{,}75\) in \(1\). Kje se je tangenta obrnila bolj?

[skrito pod 'Kaj bi morali opaziti'] Na prvi četrtini se kot spremeni skoraj štirikrat bolj kot na zadnji. Tangenta se na začetku obrača hitreje, zato je tam ukrivljenost večja.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0\); vidna sta tangenta in normala, krožnice ni.*

## Korak 3/6: Krivinska krožnica

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Krivinska krožnica

[besedilo] Skozi točko na krivulji lahko potegneš krožnico, ki se ji tam prilega najbolje: to je krivinska krožnica. Njeno središče leži na normali \(N\), na strani zavoja. Močnejši ko je zavoj, manjša je krožnica. Njen polmer \(R\) je povezan z ukrivljenostjo.

[formula/oznake] \[R=\frac{1}{|\kappa|}\]

[formula/oznake] \(R\) je krivinski polmer, \(\kappa\) pa ukrivljenost.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Krivinska krožnica

[navodilo za opazovanje] Pri \(t=0\) primerjaj izpisana \(\kappa\) in \(R\). Napovej, ali bo krožnica pri \(t=1\) večja ali manjša, nato premakni drsnik na \(t=1\).

[skrito pod 'Kaj bi morali opaziti'] Krožnica se močno poveča: polmer je pri \(t=1\) približno 11-krat večji kot pri \(t=0\), krivulja je tam skoraj ravna. Začetek je torej bolj zavit, ker je tam krivinska krožnica manjša.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0\); vidni so tangenta, normala in krivinska krožnica.*

## Korak 4/6: Zakaj je začetek bolj zavit?

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Zakaj je začetek bolj zavit?

[besedilo] Vrnimo se k vprašanju, kaj zavoj sploh določa. Krivuljo oblikujejo kontrolne točke. Prvi dve ležita na osi \(x\), tretja je nekoliko višje, četrta še višje. Katera od njih odloča o zavoju pri \(t=0\)?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Zakaj je začetek bolj zavit?

[navodilo za opazovanje] Povleci tretjo kontrolno točko (tisto pri \((2,1)\)) navzgor in navzdol ter opazuj \(\kappa\) pri \(t=0\). Potem poskusi še s četrto točko.

[skrito pod 'Kaj bi morali opaziti'] Višje ko je tretja točka nad osjo \(x\), večja je \(\kappa\) pri \(t=0\); na osi je \(\kappa=0\), pod njo pa negativna, ker se krivulja zavije na drugo stran. Četrta točka na \(\kappa\) pri \(t=0\) ne vpliva.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja, točka pri \(t=0\); vidni so tangenta, normala in krivinska krožnica.*

## Korak 5/6: Ko zavoj preide v drugo smer

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Ko zavoj preide v drugo smer

[besedilo] Krivulja v obliki črke S se najprej zavija v eno smer, nato v drugo. Predznak \(\kappa\) pove, na katero stran se krivulja zavija. Kaj se zgodi s krožnico, ko \(\kappa\) preide s plusa na minus?

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Ko zavoj preide v drugo smer

[navodilo za opazovanje] Premikaj \(t\) od \(0\) do \(1\) in poišči točko, kjer krožnica izgine. Kje je in kaj se tam nariše namesto krožnice?

[skrito pod 'Kaj bi morali opaziti'] Pri \(t=0{,}5\) krožnice ni, nariše se premica: \(\kappa=0\), krivinski polmer je neskončen. Tej točki pravimo prevoj. Pred njo in za njo je krožnica na nasprotnih straneh krivulje.

[gumb: Nazaj] [gumb: Naprej]

*Na grafu: Kubična krivulja s kontrolnimi točkami \((0,0)\), \((1,2)\), \((2,-2)\), \((3,0)\), točka pri \(t=0{,}2\); vidni so tangenta, normala in krivinska krožnica.*

## Korak 6/6: Odgovor in izziv

### Okvir 1 od 2 (Razlaga)

[naslov okvirja] Odgovor in izziv

[besedilo] Vprašanje z začetka je rešeno. Krivulja se zavije bolj tam, kjer je krivinska krožnica manjša, ukrivljenost \(\kappa\) pa je obratna vrednost polmera. Tam se tangenta obrača hitreje. Na prevoju je \(\kappa=0\) in krožnica postane premica.

[gumb: Nazaj] [gumb: Naprej]

### Okvir 2 od 2 (Opazovanje)

[naslov okvirja] Odgovor in izziv

[navodilo za opazovanje] Izziv: na paraboli premikaj srednjo kontrolno točko (tisto pod krivuljo) navzgor in navzdol. Kdaj je krožnica v temenu najmanjša in kdaj se spremeni v premico?

[skrito pod 'Kaj bi morali opaziti'] Niže ko je srednja točka, manjša je krožnica v temenu in večja je \(\kappa\). Ko jo dvigaš proti višini krajišč, se krožnica veča; ko so vse tri točke na premici, je krivulja ravna in \(\kappa=0\).

[gumb: Nazaj] [gumb: Končaj]

*Na grafu: Parabola, narisana s tremi kontrolnimi točkami; točka v temenu (\(t=0{,}5\)), vidni so tangenta, normala in krivinska krožnica; vse je prosto za raziskovanje.*

## Konec

[naslov] Vodeni primer je končan

[besedilo] Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa.

[gumb: Nadaljuj v poglavju] (samo če je lekcija odprta iz poglavja)
