import type {Language} from '../localization';
import type {BezierActivityId} from './content/bezierChapter';
import shapeControlFigure from '../images/learning/bezier/shape-control.png';
import curveParameterFigure from '../images/learning/bezier/curve-parameter.png';
import repeatedInterpolationFigure from '../images/learning/bezier/repeated-interpolation.png';
import blendingCoefficientsFigure from '../images/learning/bezier/blending-coefficients.png';
import geometricBoundsFigure from '../images/learning/bezier/geometric-bounds.png';
import transformShapeFigure from '../images/learning/bezier/transform-shape.png';

export const activityFigures: Record<BezierActivityId, {src: string; alt: Record<Language, string>; caption: Record<Language, string>}> = {
    'shape-control': {src: shapeControlFigure,
        alt: {sl: 'Kubična Bézierjeva krivulja, štiri kontrolne točke in črtkani kontrolni poligon.', en: 'A cubic Bézier curve, its four control points, and the dashed control polygon.'},
        caption: {sl: 'Pripravljena kubična krivulja s kontrolnim poligonom in kontrolnimi točkami.', en: 'The prepared cubic curve with its control polygon and control points.'}},
    'curve-parameter': {src: curveParameterFigure,
        alt: {sl: 'Krivulja stopnje štiri in zaporedne točke De Casteljaujeve konstrukcije.', en: 'A degree-four curve with successive points from the De Casteljau construction.'},
        caption: {sl: 'Pri parametru \\(t = 0{,}5\\) končna interpolirana točka leži na krivulji stopnje štiri.', en: 'At \\(t = 0.5\\), the final interpolated point lies on the degree-four curve.'}},
    'repeated-interpolation': {src: repeatedInterpolationFigure,
        alt: {sl: 'Pet kontrolnih točk in vse zaporedne vrstice interpolacije do točke na krivulji.', en: 'Five control points and each successive interpolation row ending at the curve point.'},
        caption: {sl: 'Pri \\(t = 0{,}5\\) pet kontrolnih točk da štiri, tri, dve in nazadnje eno interpolirano točko.', en: 'At \\(t = 0.5\\), five controls produce rows of four, three, two, then one interpolated point.'}},
    'blending-coefficients': {src: blendingCoefficientsFigure,
        alt: {sl: 'Trije grafi Bernsteinovih baznih funkcij stopnje dve na intervalu od nič do ena.', en: 'Three graphs of the degree-two Bernstein basis functions on the interval from zero to one.'},
        caption: {sl: 'Tri Bernsteinove bazne funkcije druge stopnje na intervalu od nič do ena.', en: 'The three degree-two Bernstein basis functions on the interval from zero to one.'}},
    'geometric-bounds': {src: geometricBoundsFigure,
        alt: {sl: 'Kubična Bézierjeva krivulja v osenčeni konveksni ovojnici svojih kontrolnih točk.', en: 'A cubic Bézier curve inside the shaded convex hull of its control points.'},
        caption: {sl: 'Krivulja leži v konveksni ovojnici kontrolnih točk; prikazan je en konkreten primer.', en: 'The curve lies in the convex hull of its control points; this shows one example.'}},
    'transform-shape': {src: transformShapeFigure,
        alt: {sl: 'Začetna kubična Bézierjeva krivulja s kontrolnimi točkami in kontrolnim poligonom.', en: 'The starting cubic Bézier curve with its control points and control polygon.'},
        caption: {sl: 'Začetni kubični primer za raziskovanje premika, spremembe merila, vrtenja ali zrcaljenja.', en: 'The starting cubic example for exploring translation, scaling, rotation, or reflection.'}},
};
