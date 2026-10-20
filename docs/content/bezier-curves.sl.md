# Bézierjeve krivulje: oblikovanje krivulje s kontrolnimi točkami

> **Uredniški status:** Osnutek za izvedbo. Povezave do dejavnosti vodijo na načrtovane cilje; poglavje še ni delujoče.

Začnimo s praktičnim vprašanjem: kako lahko nekaj točk določa gladko obrisno krivuljo, ki jo je mogoče preprosto urejati? Potrebuješ poznavanje koordinat v ravnini in osnovne algebre s potencami in množenjem. V poglavju uvedemo vse nove pojme; ne potrebuješ ne diferencialnega računa ne predznanja o Bézierjevih krivuljah.

<a id="motivation"></a>
## Kako opišemo obliko, ki jo lahko urejamo?

Predstavljaj si, da v risarskem programu urejaš gladek obris. Določiš, kje se začne in konča, spremeniš njegov zavoj ter premakneš ali povečaš končno obliko. Uporaben matematični model naj omogoča predvidljive spremembe. Bézierjeva krivulja uporablja kratek seznam kontrolnih točk: seznam določa celotno krivuljo, vsaka točka pa na natančno določen način usmerja njeno obliko.

Prva in zadnja kontrolna točka ležita na krivulji. Notranje kontrolne točke navadno ne ležijo na njej. Krivuljo vlečejo in usmerjajo, ne označujejo pa mest, skozi katera mora potekati. Tako lahko kratek seznam določa gladko pot, ne da bi morale vse naštete točke ležati na njej.

<a id="control-points"></a>
## Kontrolne točke usmerjajo krivuljo

Označimo naštete točke z \(P_0,P_1,\ldots,P_n\). Če jih povežemo po vrsti, dobimo kontrolni poligon. Krivulja se začne v \(P_0\) in konča v \(P_n\); notranje točke določajo njeno pot med njima. V običajnem kubičnem primeru v tem poglavju so štiri kontrolne točke

\[
P_0=(-4,-3),\quad P_1=(-3,2),\quad P_2=(2,2),\quad P_3=(3,-2).
\]

Te štiri točke določajo krivuljo s stopnjo predstavitve tri. Premik notranje kontrolne točke spremeni krivuljo na celotnem odprtem intervalu parametra, vendar je vpliv na nekaterih mestih močnejši kot na drugih. Krivulja ni nujno speljana skozi premaknjeno kontrolno točko. Kontrolni poligon je vodilo, ne niz točk na krivulji.

<!-- Uredniški metapodatki dejavnosti; predvideni cilji so prihodnje dejavnosti poglavja in ne potrjujejo delujočega uporabniškega vmesnika. -->
> **Razišči — Premakni kontrolno točko** · [Odpri običajni prikaz Bézierjeve krivulje](/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=shape-control). Premakni notranjo kontrolno točko in opazuj spremembo krivulje, medtem ko krajišči ostaneta nespremenjeni. Nato premakni krajiščno kontrolno točko in opazuj, kako ji sledi pripadajoče krajišče krivulje. **Vrni se k:** razlagi kontrolnih točk.
<!-- Konec uredniških metapodatkov dejavnosti. -->

Prva in zadnja kontrolna točka določata krajišči krivulje. Notranja kontrolna točka usmerja krivuljo, vendar navadno ne leži na njej; njen premik spremeni obliko krivulje med krajiščema.

<a id="parameter"></a>
## Parameter izbere točko

Krivulja je pravilo, ki številu \(t\) med \(0\) in \(1\) priredi lego. Izbrano lego zapišemo kot \(B(t)\). Parameter \(t\) pove, kje smo pri konstrukciji krivulje: velja \(B(0)=P_0\) in \(B(1)=P_n\). Če spremenimo \(t\), izberemo drugo točko na isti, nespremenjeni krivulji. Če premaknemo kontrolno točko, spremenimo samo krivuljo.

Parameter na splošno ni delež prepotovane razdalje. Enaki prirastki parametra ne zagotavljajo, da bo gibajoča se točka vsakič prepotovala enako razdaljo. Po nekaterih delih krivulje se lahko giblje hitreje kot po drugih.

<!-- Uredniški metapodatki dejavnosti; predvideni cilji so prihodnje dejavnosti poglavja in ne potrjujejo delujočega uporabniškega vmesnika. -->
> **Razišči — Spreminjaj parameter** · [Odpri prikaz De Casteljau](/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=curve-parameter). Spreminjaj parameter konstrukcije, medtem ko pet kontrolnih točk ostane nespremenjenih. Opazuj, kaj se premika in kaj ostaja enako; enake spremembe parametra ne pomenijo enakih razdalj po krivulji. V tem prikazu je primer s stopnjo štiri, ne prej obravnavani kubični primer. **Vrni se k:** tej razlagi parametra.
<!-- Konec uredniških metapodatkov dejavnosti. -->

Če spremenimo parameter, izberemo drugo lego na isti krivulji. Kontrolne točke in oblika krivulje ostanejo enake; parameter meri napredovanje konstrukcije, ne pa zagotovljenega deleža razdalje.

<a id="interpolation"></a>
## Daljica je začetek ponovljene interpolacije

Pri krajiščih \(P\) in \(Q\) množenje s številom in seštevanje potekata po posameznih koordinatah. Če je \(P=(x_P,y_P)\), \(Q=(x_Q,y_Q)\) in \(0\le t\le1\), velja

\[
(1-t)P+tQ=\bigl((1-t)x_P+tx_Q,\ (1-t)y_P+ty_Q\bigr).
\]

Označimo interpolirano točko z \(L(t)\):

\[
L(t)=(1-t)P+tQ
\]

Točka \(L(t)\) leži na daljici od \(P\) do \(Q\), kadar velja \(0\le t\le1\). Števili \(1-t\) in \(t\) sta dopolnjujoča se deleža: sta nenegativni in njuna vsota je ena. Pri \(t=\frac14\) je točka četrtino poti od \(P\) proti \(Q\); pri \(t=\frac12\) je na polovici; pri \(t=\frac34\) pa je tri četrtine poti. Takemu postopku pravimo linearna interpolacija.

Isti postopek lahko ponavljamo. Začnemo s sosednjimi kontrolnimi točkami, pri istem \(t\) interpoliramo vsak par, nato pa interpoliramo nove sosednje točke. Ko postopek ponavljamo, dokler ne ostane ena točka, dobimo točko na Bézierjevi krivulji. Ta konstrukcija se imenuje konstrukcija De Casteljau.

<!-- Uredniški metapodatki dejavnosti; predvideni cilji so prihodnje dejavnosti poglavja in ne potrjujejo delujočega uporabniškega vmesnika. -->
> **Razišči — Ponavljaj interpolacijo** · [Odpri prikaz De Casteljau](/bezeg-2.0/bezier/decasteljau?chapter=bezier-curves&activity=repeated-interpolation). Pri sredinskem parametru si oglej zaporedne vrstice konstrukcije. Pripravljen prikaz uporablja pet kontrolnih točk, zato je njegova stopnja štiri. Vsaka nova točka leži med dvema točkama v prejšnji vrstici; zadnja je točka krivulje za izbrani parameter. **Vrni se k:** tej razlagi interpolacije.
<!-- Konec uredniških metapodatkov dejavnosti. -->

Vsaka vrstica znova uporabi izračun točke na daljici, tokrat za sosednji točki prejšnje vrstice. Zadnja vrstica vsebuje eno točko, ki je v matematični konstrukciji natančno lega krivulje pri izbranem parametru.

Oglejmo si preprostejši kvadratni primer s tremi kontrolnimi točkami \(P_0,P_1,P_2\). Najprej interpoliramo sosednje pare:

\[
Q_0(t)=(1-t)P_0+tP_1,\qquad Q_1(t)=(1-t)P_1+tP_2.
\]

Nato z istim parametrom interpoliramo dobljeni točki:

\[
\begin{aligned}
B(t)&=(1-t)Q_0(t)+tQ_1(t)\\
&=(1-t)^2P_0+2t(1-t)P_1+t^2P_2.
\end{aligned}
\]

Srednji koeficient se pojavi dvakrat, ker \(P_1\) prispeva prek obeh interpolacij v prvi vrstici. To je izpeljava za tri kontrolne točke; v naslednjem razdelku je splošna formula. Dejavnost De Casteljau zgoraj uporablja pet točk in ostaja ločen primer s stopnjo štiri.

<a id="bernstein-form"></a>
## Bernsteinovi koeficienti dajo splošno formulo

V kvadratnem razvoju so koeficienti odvisni od \(t\) in povedo, kolikšen je prispevek posamezne kontrolne točke. Za stopnjo predstavitve \(n\) definiramo Bernsteinov koeficient

\[
b_i^n(t)=\binom{n}{i}(1-t)^{n-i}t^i,\qquad i=0,1,\ldots,n.
\]

Binomski koeficient \(\binom{n}{i}\) šteje, na koliko načinov lahko med \(n\) mesti izberemo \(i\) mest; na primer, \(\binom{2}{1}=2\). Bézierjeva krivulja s kontrolnimi točkami \(P_0,\ldots,P_n\) je

\[
B(t)=\sum_{i=0}^{n}P_i b_i^n(t),\qquad 0\le t\le1.
\]

Zapis \(\sum_{i=0}^{n}\) pomeni, da seštejemo po en člen za vsak indeks \(i\), od nič do \(n\). Formula torej sešteje vsako kontrolno točko, pomnoženo z njenim Bernsteinovim koeficientom.

Torej \(n+1\) kontrolnih točk pomeni predstavitev s stopnjo \(n\). Pri posebni razporeditvi kontrolnih točk je lahko dejanska polinomska stopnja manjša. »Stopnja predstavitve« šteje kontrolne točke v tej formuli in ne zagotavlja, da ima vsaka tako določena krivulja tudi natanko to polinomsko stopnjo. Zgornji kvadratni razvoj ponazori vzorec. Splošna enakost sledi iz rekurzije ponovljene interpolacije; graf nekaj koeficientov si lahko ogledamo, vendar s tem še ne dokažemo trditve za vse stopnje.

Koeficienti imajo vsoto ena, ker je \(((1-t)+t)^n\) produkt \(n\) enakih faktorjev. Pri razvoju izberemo \(i\) od teh faktorjev, ki prispevajo \(t\); takih izbir je \(\binom{n}{i}\), vsak ustrezni člen pa je \((1-t)^{n-i}t^i\). Vsota vseh možnosti da celoten razvoj, \(((1-t)+t)^n=1\).

Dejavnost z Bernsteinovimi koeficienti se začne pri stopnji dve, da se ujema z izpeljavo za tri kontrolne točke. Graf prikazuje osnovne funkcije, ne Bézierjeve krivulje. V ločenem običajnem kubičnem primeru je stopnja tri, uteži v sredini pa so \(\left(\frac18,\frac38,\frac38,\frac18\right)\). Za njegove določene kontrolne točke ponovljena interpolacija s sredinami da

\[
\begin{aligned}
\text{Prva vrstica: }&\left(-\frac72,-\frac12\right),\left(-\frac12,2\right),\left(\frac52,0\right),\\
\text{Druga vrstica: }&\left(-2,\frac34\right),\left(1,1\right),\\
\text{Končna točka: }&\left(-\frac12,\frac78\right).
\end{aligned}
\]

Ta izračun s štirimi kontrolnimi točkami je kubični primer. Ločen je od kvadratne izpeljave in dejavnosti De Casteljau s stopnjo štiri.

<!-- Uredniški metapodatki dejavnosti; predvideni cilji so prihodnje dejavnosti poglavja in ne potrjujejo delujočega uporabniškega vmesnika. -->
> **Razišči — Oglej si uteži** · [Odpri prikaz Bernsteinovih funkcij](/bezeg-2.0/bernstein?chapter=bezier-curves&activity=blending-coefficients). Odpre se pri stopnji dve; oglej si tri koeficiente in po želji še naloženi prikaz. Graf prikazuje koeficiente, formula za krivuljo pa jih združuje s kontrolnimi točkami. **Vrni se k:** tej formuli in njeni notaciji.
<!-- Konec uredniških metapodatkov dejavnosti. -->

Pri stopnji dve lahko na grafu primerjaš tri koeficientne funkcije po celotnem intervalu parametra. So uteži v formuli za krivuljo; same zase pa niso koordinate krivulje.

<a id="geometric-properties"></a>
## Krajišči in konveksna ovojnica pojasnita uporabni jamstvi

Pri \(t=0\) so vsi Bernsteinovi koeficienti enaki nič, razen \(b_0^n(0)=1\), zato je \(B(0)=P_0\). Pri \(t=1\) je edini neničelni koeficient \(b_n^n(1)=1\), zato je \(B(1)=P_n\). Krivulja torej natančno poteka skozi prvo in zadnjo kontrolno točko.

Za vsak \(t\) iz intervala \([0,1]\) so koeficienti nenegativni. Njihova vsota je ena po binomskem izreku:

\[
\sum_{i=0}^{n}b_i^n(t)=((1-t)+t)^n=1.
\]

Kombinaciji točk z nenegativnimi utežmi, katerih vsota je ena, pravimo konveksna kombinacija. Konveksna ovojnica kontrolnih točk je najmanjša konveksna množica, ki jih vsebuje. »Konveksna« pomeni, da daljica med poljubnima točkama množice v celoti ostane v njej. Ta definicija vključuje tudi degenerirane primere, ko je ovojnica daljica ali ena sama točka. Krivulja leži znotraj te ovojnice. To lahko razumemo s ponovljeno konstrukcijo: vsak korak ostane na daljici med točkama, ki sta že v ovojnici, konveksnost pa zagotavlja, da je tudi daljica v njej. To je splošno jamstvo, ne sklep na podlagi nekaj narisanih mest. Velja na \([0,1]\); zunaj tega intervala so nekatere uteži lahko negativne.

Notranje kontrolne točke niso nujno na krivulji. Njihov vpliv sega po celotni krivulji: za notranji indeks \(i\) je koeficient \(b_i^n(t)\) pozitiven pri vsakem \(0<t<1\). Premik te kontrolne točke zato spremeni krivuljo na celotnem odprtem intervalu parametra, vendar se velikost spremembe spreminja. Krajišči ostaneta nespremenjeni. Ovojnica določa mejo za celotno krivuljo, ne pa natančnega poteka.

<!-- Uredniški metapodatki dejavnosti; predvideni cilji so prihodnje dejavnosti poglavja in ne potrjujejo delujočega uporabniškega vmesnika. -->
> **Razišči — Preveri geometrijske meje** · [Odpri običajni prikaz Bézierjeve krivulje](/bezeg-2.0/bezier/curve?chapter=bezier-curves&activity=geometric-bounds). Pripravljena dejavnost ob odprtju že pokaže kontrolni poligon in konveksno ovojnico. Premakni kontrolno točko in primerjaj krivuljo z ovojnico. Na grafu opazujemo primere; nenegativni koeficienti z vsoto ena pa pojasnijo, zakaj vsebovanost velja za vsak \(t\in[0,1]\). **Vrni se k:** temu jamstvu.
<!-- Konec uredniških metapodatkov dejavnosti. -->

Krivulja se lahko v ovojnici spreminja, vendar ostane v konveksni množici. To jamstvo omeji krivuljo, ne pomeni pa, da poteka po robovih poligona ali skozi vse kontrolne točke.

<a id="affine-transformations"></a>
## Če preoblikujemo kontrolne točke, se preoblikuje tudi krivulja

Običajni Bézierjev primer ima štiri kontrolne točke, navedene prej. Prikaz afinega preoblikovanja uporablja drug, izrecno pripravljen kubični primer; slika in koordinate pripadajo temu prikazu. V obeh primerih velja isto matematično pravilo: če z afino transformacijo \(T\) preoblikujemo vse kontrolne točke, dobimo staro krivuljo, preoblikovano z \(T\).

Za točko \(x=(x_1,x_2)\) zapišemo matriko \(2\times2\) kot \(A=\begin{pmatrix}a_{11}&a_{12}\\a_{21}&a_{22}\end{pmatrix}\); tedaj je \(Ax=(a_{11}x_1+a_{12}x_2,a_{21}x_1+a_{22}x_2)\). Ta linearni del lahko zavrti, zrcali ali spremeni merilo. Nato prištejemo vektor \(c\), ki povzroči premik. Skupaj določata \(T(x)=Ax+c\). Ker velja \(B(t)=\sum_{i=0}^{n} b_i^n(t)P_i\) in je vsota uteži ena, dobimo

\[
\begin{aligned}
T(B(t))&=A\left(\sum_{i=0}^{n}b_i^n(t)P_i\right)+c\\
&=\sum_{i=0}^{n}b_i^n(t)\bigl(AP_i+c\bigr),
\end{aligned}
\]

V drugi vrstici je premik enak \(c\sum_{i=0}^{n} b_i^n(t)=c\), ker je vsota uteži ena. Rezultat je natanko formula za Bézierjevo krivuljo, določeno s preoblikovanimi kontrolnimi točkami \(T(P_i)\). Zato premik, vrtenje, zrcaljenje ali spreminjanje merila kontrolnih podatkov na ustrezen način preoblikuje celotno krivuljo.

<!-- Uredniški metapodatki dejavnosti; predvideni cilji so prihodnje dejavnosti poglavja in ne potrjujejo delujočega uporabniškega vmesnika. -->
> **Razišči — Preoblikuj celotno obliko** · [Odpri prikaz afine Bézierjeve krivulje](/bezeg-2.0/bezier/affine?chapter=bezier-curves&activity=transform-shape). Preizkusi podprte možnosti za premik, spremembo merila, vrtenje ali zrcaljenje na označenem kubičnem primeru. Kontrole preoblikujejo kontrolne točke krivulje. **Vrni se k:** tej afini lastnosti in razlagi premika.
<!-- Konec uredniških metapodatkov dejavnosti. -->

Vsaka podprta operacija deluje na kontrolnih podatkih in krivulja sledi isti afini transformaciji. Pri premiku je to mogoče zaradi vsote uteži ena.

<a id="next-ideas"></a>
## Kaj lahko raziščemo naslednje?

Spoznali smo, kako seznam kontrolnih točk določa krivuljo, kako parameter izbere točko, kako jo zgradi ponovljena interpolacija in kako isto krivuljo zapišemo z Bernsteinovimi koeficienti. Lastnosti krajišč in konveksne ovojnice dajejo uporabna jamstva, afine transformacije pa lahko uporabimo neposredno na kontrolnih točkah.

Te zamisli odprejo nova vprašanja. Kako obdržimo le del krivulje? [Razišči delitev krivulje](/bezeg-2.0/bezier/subdivision-2). Kako isto obliko predstavimo z več kontrolnimi točkami? [Razišči zvišanje stopnje](/bezeg-2.0/bezier/elevation). Kako gladko združimo več delov krivulje? [Razišči zlepkovne krivulje](/bezeg-2.0/spline/spline). Kaj se spremeni, če želimo natančen krožni lok? [Razišči racionalne krivulje](/bezeg-2.0/rational/base) in [konstrukcijo krožnice](/bezeg-2.0/rational/circlen). Te povezave vodijo na povezane prikaze, ne napovedujejo pa novih poglavij ali predpogojev za to poglavje.

### Vir

Matematične definicije in lastnosti v poglavju sledijo delu Kevina Štamparja, *Orodje za grafični prikaz lastnosti Bézierjevih in PH krivulj* (magistrsko delo, Univerza v Ljubljani, 2024), zlasti §§1, 2.1 in 2.3–2.5. Uvodni primer je izvirno uredniško besedilo, ki izhaja iz motivacije računalniško podprtega geometrijskega oblikovanja v magistrskem delu; ni citat. Kubični izračun središčne točke in kvadratni razvoj sta izračunana primera.
