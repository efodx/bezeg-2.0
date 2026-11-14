import type {GuidedExamplePreviewCopy} from './guidedExamplePreviewCopy';

const copy = (altSl: string, altEn: string, captionSl: string, captionEn: string): GuidedExamplePreviewCopy => ({
    alt: {sl: altSl, en: altEn},
    caption: {sl: captionSl, en: captionEn},
});

/**
 * Describes the prepared opening scene of each Kinematics lesson, keyed by example id: KN1 (the cycloid of a wheel of radius 1 m at time 0, no arrows), KN2 (the circle of radius 1 m with the
 * solid point and the square reference point at time 0), KN3 (the throw at 20 m/s and 45 degrees at time 0) and KN4 (the uniform circle of radius 2 m and angular velocity 1,5 rad/s at time 0).
 * The copy names the frame only and states none of the answers the first steps ask for (the way the point starts to move, which of the two points reaches the top first, when the ball is highest
 * and the flight time, the speed and the period). The position readouts, the flight time, the range and the speed stay out of it. Every scene is deterministic: no source draws random numbers.
 */
export const kinematicsPreviewCopy = {
    'kinematics.circular-motion.curve-kinematics': copy(
        'Krem ozadje brez koordinatnih osi. Velik siv krog zavzame spodnji del slike, na njegovem desnem robu je temnozelena pika. Zgoraj desno stojijo tri vrstice zelenega in sivega besedila: Točka, ki se giblje; Pot (bleda črta); Prepotovani del poti (debela črta). Puščic ni.',
        'Cream background without coordinate axes. A large grey circle fills the lower part of the picture, with a dark green dot on its right edge. Three lines of green and grey text stand at the upper right: Točka, ki se giblje (the moving point); Pot (bleda črta) (the path, faint line); Prepotovani del poti (debela črta) (the part travelled, thick line). There are no arrows.',
        'Kroženje s polmerom \\(R=2\\ \\mathrm{m}\\) in kotno hitrostjo \\(\\omega=1{,}5\\ \\mathrm{rad/s}\\), čas \\(0\\).',
        'Circular motion of radius \\(R=2\\ \\mathrm{m}\\) and angular velocity \\(\\omega=1.5\\ \\mathrm{rad/s}\\), time \\(0\\).',
    ),
    'kinematics.position-velocity-acceleration.curve-kinematics': copy(
        'Krem ozadje brez koordinatnih osi. Siv lok, en obok cikloide, se dvigne z levega spodnjega roba in pade na desni na isto višino. Na levem koncu loka je temnozelena pika. Zgoraj levo so tri vrstice besedila: Točka, ki se giblje; Pot (bleda črta); Prepotovani del poti (debela črta). Puščic ni.',
        'Cream background without coordinate axes. A grey arch, one hump of a cycloid, rises from the lower left and comes back down to the same height at the right. A dark green dot sits at the left end of the arch. Three lines of text stand at the upper left: Točka, ki se giblje (the moving point); Pot (bleda črta) (the path, faint line); Prepotovani del poti (debela črta) (the part travelled, thick line). There are no arrows.',
        'Cikloida točke na kolesu s polmerom \\(1\\ \\mathrm{m}\\), čas \\(t=0\\), brez puščic.',
        'The cycloid of a point on a wheel of radius \\(1\\ \\mathrm{m}\\), time \\(t=0\\), no arrows.',
    ),
    'kinematics.projectile-motion.curve-kinematics': copy(
        'Krem ozadje brez koordinatnih osi. Siv paraboličen lok se dvigne z levega spodnjega roba in se spusti na isto višino na desni. Na levem koncu loka je temnozelena pika. Zgoraj levo so štiri vrstice besedila: Točka, ki se giblje; Pot (bleda črta); Prepotovani del poti (debela črta); Težni pospešek je povsod enak, navpično navzdol. Puščic ni.',
        'Cream background without coordinate axes. A grey parabolic arch rises from the lower left and comes back down to the same height at the right. A dark green dot sits at the left end of the arch. Four lines of text stand at the upper left: Točka, ki se giblje (the moving point); Pot (bleda črta) (the path, faint line); Prepotovani del poti (debela črta) (the part travelled, thick line); and a line saying the gravitational acceleration is the same everywhere, vertically down. There are no arrows.',
        'Poševni met s hitrostjo \\(v_0=20\\ \\mathrm{m/s}\\) pod kotom \\(\\alpha=45^\\circ\\), čas \\(0\\).',
        'A projectile launched at \\(v_0=20\\ \\mathrm{m/s}\\) at the angle \\(\\alpha=45^\\circ\\), time \\(0\\).',
    ),
    'kinematics.speed-and-parametrization.curve-kinematics': copy(
        'Krem ozadje brez koordinatnih osi. Manjši siv krog stoji v spodnji polovici slike, na njegovem desnem robu je temnozelena pika z oranžnim kvadratkom, ki jo prekriva. Zgoraj desno je pet vrstic besedila: Točka, ki se giblje; Pot (bleda črta); Prepotovani del poti (debela črta); oranžno Primerjalna točka: enakomerno kroženje z isto kotno hitrostjo. Puščic ni.',
        'Cream background without coordinate axes. A smaller grey circle stands in the lower half of the picture, with a dark green dot on its right edge and an orange square drawn over it. Five lines of text stand at the upper right: Točka, ki se giblje (the moving point); Pot (bleda črta) (the path, faint line); Prepotovani del poti (debela črta) (the part travelled, thick line); and in orange Primerjalna točka: enakomerno kroženje z isto kotno hitrostjo (the reference point: uniform circular motion with the same angular velocity). There are no arrows.',
        'Kroženje s polmerom \\(1\\ \\mathrm{m}\\), \\(\\omega=1\\ \\mathrm{rad/s}\\) in \\(b=0{,}5\\), čas \\(0\\).',
        'Circular motion of radius \\(1\\ \\mathrm{m}\\), \\(\\omega=1\\ \\mathrm{rad/s}\\) and \\(b=0.5\\), time \\(0\\).',
    ),
} as const satisfies Record<string, GuidedExamplePreviewCopy>;
