/**
 * Test-only (never imported by app code): the shared behaviour test of the graph controls, spec acceptance 3 of
 * `docs/specs/shared-graph-controls.md`. One function per control kind registers the same `it` cases against a
 * caller-supplied `mount`, so the bare control and every real graph offering the capability meet one contract:
 *
 *   placement  the control sits in the expected inspector tab (skipped, with the reason in the name, for a bare control);
 *   limit      an arrow or Shift step at the bound stays at the bound and shows no message (decision 7);
 *   refusal    a typed out-of-range value (or a press at a count bound) leaves the value and gives its reason, in both
 *              languages (decisions 3, 13, 14);
 *   commit     typing applies only on Enter or blur (decision 2); sliders and steppers apply at once;
 *   Escape     an open draft reverts and writes nothing;
 *   keyboard   the keymap of `stepKeys.ts` (arrow, Shift+arrow, PageUp/PageDown). Home and End are not in the keymap, so
 *              they must change nothing in a text field;
 *   Reset      the host Reset restores the starting value and clears any refusal.
 *
 * A check a real graph cannot meet is a finding about that graph; do not weaken the helper for it.
 *
 * A mount (sync or async) renders a fresh control (the caller sets the language before, the helpers set it per case) and returns a
 * handle; `reset()` is the host Reset (a bare control: re-render the starting props). All values are model values read
 * from the DOM (`aria-valuenow`, the count output), not the shown text.
 */
import {act, fireEvent} from '@testing-library/react';
import {formatNumber} from '../analysis/format';
import {Language, setLanguage, t} from '../localization';
import {enterNumber} from './testEntry';

/** Handle on the control. */
interface Handle {
    /** The host Reset; may be async for a real graph (which drives its own `act` turns, for example with `settle`). */
    reset(): void | Promise<void>;
    /** The refusal text now shown for the control, or null. Defaults to the hint under the field. */
    refusalText?(): string | null;
}

export interface NumericHandle extends Handle {
    /** The text field (role spinbutton). */
    field: HTMLElement;
    read(): number;
}

export interface NumericSpec {
    /** The inspector tab a real graph is expected to put the control in; leave out for a bare control. */
    section?: 'edit' | 'display';
    mount(): NumericHandle | Promise<NumericHandle>;
    min: number;
    max: number;
    step: number;
    bigStep?: number;
    /** A value different from the starting one, inside the range, with room for a big step either way. */
    valid: number;
    /** A value to type that must be refused (outside [min, max]). */
    outOfRange: number;
    /**
     * A reported finding the control does not meet yet. The case then runs with `it.fails`, so the suite stays green and
     * fails the moment the finding is fixed (remove the entry then).
     */
    knownGap?: {reset?: string};
}

export interface SliderHandle extends Handle {
    /** The range input. */
    range: HTMLElement;
    /** The slider's number field. */
    field: HTMLElement;
    read(): number;
}

export interface SliderSpec extends Omit<NumericSpec, 'mount'> {
    mount(): SliderHandle | Promise<SliderHandle>;
}

export interface CountHandle extends Handle {
    plus: HTMLElement;
    minus: HTMLElement;
    read(): number;
    /** The typed field, only when the graph can set the count directly. */
    field?: HTMLElement;
}

export interface CountSpec {
    section?: 'edit' | 'display';
    mount(): CountHandle | Promise<CountHandle>;
    min: number;
    max: number;
}

const languages: Language[] = ['sl', 'en'];
const flush = () => act(async () => {});
const hintOf = (field: HTMLElement): string | null =>
    field.closest('.number-input')?.querySelector('.number-input-hint')?.textContent?.trim() || null;
const key = (element: HTMLElement, name: string, shiftKey = false) => fireEvent.keyDown(element, {key: name, shiftKey});
const typeDraft = (field: HTMLElement, value: string) => fireEvent.input(field, {target: {value}, inputType: 'insertText'});
const shown = (field: HTMLElement) => (field as HTMLInputElement).value;
const near = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 6);
type Anchor = Handle & {field?: HTMLElement; plus?: HTMLElement};

/** Placement: the expected inspector tab (`section`), or a stated skip for a bare control that has none. */
function registerPlacement(spec: {section?: 'edit' | 'display'; mount(): Anchor | Promise<Anchor>}) {
    const {section} = spec;
    (section === undefined ? it.skip : it)(section === undefined ? 'placement (skipped: a bare control has no inspector tab)' : `placement: sits in the ${section} tab`, async () => {
        setLanguage('sl');
        const handle = await spec.mount();
        await flush();
        expect((handle.field ?? handle.plus)!.closest('section')?.id).toBe(`inspector-${section}`);
    });
}

const rangeHint = (min: number, max: number, language: Language) =>
    t('number_range_hint', {value0: formatNumber(min, language), value1: formatNumber(max, language)});

/** The typed-field cases shared by the numeric field and the slider's number field. */
function typedFieldCases(spec: NumericSpec | SliderSpec) {
    const text = (value: number) => String(value);

    it('limit: an arrow or Shift step at the bounds stays put without a message', async () => {
        setLanguage('sl');
        const handle = await spec.mount();
        for (const [bound, up] of [[spec.max, true], [spec.min, false]] as const) {
            enterNumber(handle.field, text(bound));
            await flush();
            near(handle.read(), bound);
            for (const shift of [false, true]) {
                key(handle.field, up ? 'ArrowUp' : 'ArrowDown', shift);
                await flush();
                near(handle.read(), bound);
                expect(handle.refusalText ? handle.refusalText() : hintOf(handle.field)).toBeNull();
            }
        }
    });

    it.each(languages)('refusal: a typed value outside the range is refused with a reason (%s)', async language => {
        setLanguage(language);
        const handle = await spec.mount();
        const start = handle.read();
        enterNumber(handle.field, text(spec.outOfRange));
        await flush();
        expect(handle.read()).toBe(start);
        const reason = handle.refusalText ? handle.refusalText() : hintOf(handle.field);
        expect(reason).toBeTruthy();
        if (!handle.refusalText) {
            expect(reason).toBe(rangeHint(spec.min, spec.max, language));
            expect(handle.field).toHaveAttribute('aria-invalid', 'true');
        }
    });

    it('commit: typing applies only on Enter or blur', async () => {
        setLanguage('sl');
        const handle = await spec.mount();
        const start = handle.read();
        typeDraft(handle.field, text(spec.valid));
        await flush();
        expect(handle.read()).toBe(start);
        key(handle.field, 'Enter');
        await flush();
        near(handle.read(), spec.valid);
        typeDraft(handle.field, text(start));
        await flush();
        near(handle.read(), spec.valid);
        fireEvent.blur(handle.field);
        await flush();
        near(handle.read(), start);
    });

    it('Escape: an open draft reverts and writes nothing', async () => {
        setLanguage('sl');
        const handle = await spec.mount();
        const start = handle.read();
        const before = shown(handle.field);
        typeDraft(handle.field, text(spec.valid));
        key(handle.field, 'Escape');
        await flush();
        expect(shown(handle.field)).toBe(before);
        key(handle.field, 'Enter');
        await flush();
        expect(handle.read()).toBe(start);
    });

    const resetGap = spec.knownGap?.reset;
    (resetGap ? it.fails : it)(`Reset: the host Reset restores the starting value and clears the refusal${resetGap ? ` (known gap: ${resetGap})` : ''}`, async () => {
        setLanguage('sl');
        const handle = await spec.mount();
        const start = handle.read();
        enterNumber(handle.field, text(spec.valid));
        await flush();
        near(handle.read(), spec.valid);
        enterNumber(handle.field, text(spec.outOfRange));
        await flush();
        expect(handle.refusalText ? handle.refusalText() : hintOf(handle.field)).toBeTruthy();
        await handle.reset();
        await flush();
        near(handle.read(), start);
        expect(handle.refusalText ? handle.refusalText() : hintOf(handle.field)).toBeNull();
    });
}

/** A text field for a number (`NumberInput`): see the file header. */
export function numericFieldBehaviour(name: string, spec: NumericSpec) {
    describe(`shared numeric field: ${name}`, () => {
        registerPlacement(spec);
        typedFieldCases(spec);

        it('keyboard: arrows step, Shift and Page keys take the big step, Home and End do nothing', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            const big = spec.bigStep ?? spec.step * 10;
            enterNumber(handle.field, String(spec.valid));
            await flush();
            key(handle.field, 'ArrowUp');
            await flush();
            near(handle.read(), spec.valid + spec.step);
            key(handle.field, 'ArrowDown');
            await flush();
            near(handle.read(), spec.valid);
            key(handle.field, 'ArrowUp', true);
            await flush();
            near(handle.read(), spec.valid + big);
            key(handle.field, 'PageDown');
            await flush();
            near(handle.read(), spec.valid);
            for (const home of ['Home', 'End']) key(handle.field, home);
            await flush();
            near(handle.read(), spec.valid);
        });
    });
}

/** A bounded slider: a range input that applies at once, with a number field that commits like any other. */
export function sliderBehaviour(name: string, spec: SliderSpec) {
    describe(`shared slider: ${name}`, () => {
        registerPlacement(spec);
        typedFieldCases(spec);

        it('commit: the range input applies at once', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            fireEvent.change(handle.range, {target: {value: String(spec.valid)}});
            await flush();
            near(handle.read(), spec.valid);
        });

        it('limit: a Shift step on the range input at the bounds stays put without a message', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            for (const [bound, up] of [[spec.max, true], [spec.min, false]] as const) {
                fireEvent.change(handle.range, {target: {value: String(bound)}});
                await flush();
                key(handle.range, up ? 'ArrowUp' : 'ArrowDown', true);
                key(handle.range, up ? 'PageUp' : 'PageDown');
                await flush();
                near(handle.read(), bound);
                expect(handle.refusalText ? handle.refusalText() : hintOf(handle.field)).toBeNull();
            }
        });

        it('keyboard: Shift and Page keys on the range input take the big step; the number field steps by arrows', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            const big = spec.bigStep ?? spec.step * 10;
            fireEvent.change(handle.range, {target: {value: String(spec.valid)}});
            await flush();
            key(handle.range, 'ArrowUp', true);
            await flush();
            near(handle.read(), spec.valid + big);
            key(handle.range, 'PageDown');
            await flush();
            near(handle.read(), spec.valid);
            key(handle.field, 'ArrowUp');
            await flush();
            near(handle.read(), spec.valid + spec.step);
        });
    });
}

/** The integer stepper (`CountSetter`): see the file header. A bound press keeps the count and says why (decision 13). */
export function countSetterBehaviour(name: string, spec: CountSpec) {
    describe(`shared count setter: ${name}`, () => {
        registerPlacement(spec);
        const reasonOf = (handle: CountHandle) => handle.refusalText
            ? handle.refusalText()
            : handle.plus.closest('.count-setter')?.querySelector('[data-count-reason]')?.textContent?.trim() || null;
        const toBound = async (handle: CountHandle, bound: number) => {
            for (let guard = spec.max - spec.min + 2; handle.read() !== bound && guard > 0; guard--) {
                fireEvent.click(bound > handle.read() ? handle.plus : handle.minus);
                await flush();
            }
            expect(handle.read()).toBe(bound);
        };

        it('commit: a press applies at once', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            const start = handle.read();
            fireEvent.click(start < spec.max ? handle.plus : handle.minus);
            await flush();
            expect(handle.read()).toBe(start < spec.max ? start + 1 : start - 1);
        });

        it('limit: a press at a bound keeps the count and the button stays focusable', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            for (const [bound, side] of [[spec.max, 'plus'], [spec.min, 'minus']] as const) {
                await toBound(handle, bound);
                const button = handle[side]; // looked up after the presses: a graph may re-mount its panel
                expect(button).toHaveAttribute('aria-disabled', 'true');
                expect(button).not.toBeDisabled();
                button.focus();
                expect(document.activeElement).toBe(button);
                fireEvent.click(button);
                await flush();
                expect(handle.read()).toBe(bound);
            }
        });

        it.each(languages)('refusal: a press at a bound gives its reason (%s)', async language => {
            setLanguage(language);
            const handle = await spec.mount();
            await toBound(handle, spec.max);
            fireEvent.click(handle.plus);
            await flush();
            expect(reasonOf(handle)).toBeTruthy();
            if (!handle.refusalText) expect(reasonOf(handle)).toBe(t('count_at_maximum', {value0: formatNumber(spec.max, language, 0)}));
            await toBound(handle, spec.min);
            fireEvent.click(handle.minus);
            await flush();
            if (!handle.refusalText) expect(reasonOf(handle)).toBe(t('count_at_minimum', {value0: formatNumber(spec.min, language, 0)}));
        });

        const keyed = (handle: CountHandle) => handle.field !== undefined;
        it('Escape: an open draft of the typed field reverts', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            if (!keyed(handle)) return; // no typed field: nothing to revert (the graph sets the count by buttons only)
            const field = handle.field!;
            const start = handle.read();
            typeDraft(field, String(spec.min === start ? spec.max : spec.min));
            key(field, 'Escape');
            await flush();
            key(field, 'Enter');
            await flush();
            expect(handle.read()).toBe(start);
        });

        it('keyboard: both buttons are native buttons; a typed field steps by arrows', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            expect(handle.plus.tagName).toBe('BUTTON');
            expect(handle.minus.tagName).toBe('BUTTON');
            handle.plus.focus();
            expect(document.activeElement).toBe(handle.plus);
            if (!keyed(handle)) return;
            const start = handle.read();
            key(handle.field!, start < spec.max ? 'ArrowUp' : 'ArrowDown');
            await flush();
            expect(handle.read()).toBe(start < spec.max ? start + 1 : start - 1);
        });

        it('Reset: the host Reset restores the starting count and clears the reason', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            const start = handle.read();
            await toBound(handle, start < spec.max ? start + 1 : start - 1);
            await toBound(handle, spec.max);
            fireEvent.click(handle.plus);
            await flush();
            expect(reasonOf(handle)).toBeTruthy();
            await handle.reset();
            await flush();
            expect(handle.read()).toBe(start);
            expect(reasonOf(handle)).toBeNull();
        });
    });
}
