import {FOURIER_EXAMPLES, FOURIER_EXAMPLE_IDS, isFourierExampleId} from './fourierExamples';
import {PiecewiseLinearShape, realCoefficients, validateBreakpoints, validatePiecewiseLinear} from './fourier';

describe('fourier example list', () => {
    it('is closed and every id maps to an example with valid breakpoints', () => {
        expect(FOURIER_EXAMPLE_IDS).toEqual(['square', 'sawtooth', 'abs', 'jump', 'smooth']);
        for (const id of FOURIER_EXAMPLE_IDS) {
            const example = FOURIER_EXAMPLES[id];
            expect(example.id).toBe(id);
            expect(validateBreakpoints(example.source.breakpoints)).toEqual({ok: true});
            if (example.shape) {
                expect(validatePiecewiseLinear(example.shape as PiecewiseLinearShape)).toEqual({ok: true});
            }
        }
    });

    it('rejects unknown ids', () => {
        expect(isFourierExampleId('abs')).toBe(true);
        expect(isFourierExampleId('circle')).toBe(false);
        expect(isFourierExampleId(3)).toBe(false);
    });

    it('closed forms agree with the kernel to 1e-10 for k <= 12', () => {
        for (const id of FOURIER_EXAMPLE_IDS) {
            const example = FOURIER_EXAMPLES[id];
            const closed = example.closedForm;
            expect(closed).toBeDefined();
            const {a, b} = realCoefficients(example.source, 12);
            for (let k = 0; k <= 12; k++) {
                expect(Math.abs(a[k] - (closed?.a(k) ?? NaN))).toBeLessThan(1e-10);
                if (k > 0) {
                    expect(Math.abs(b[k] - (closed?.b(k) ?? NaN))).toBeLessThan(1e-10);
                }
            }
        }
    });
});
