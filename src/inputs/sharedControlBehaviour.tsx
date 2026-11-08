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
 * The point controls (`pointListBehaviour`, `pointCollectionBehaviour`) meet the same checks: the count bound (a remove at the
 * fewest points, an add at the most) is their limit and refusal, a typed out-of-range coordinate is the numeric refusal. Real graphs
 * mount them from P3 to P5 (`graphs/base/points/`); `sharedControls.behaviour.test.tsx` runs them on the bare controls.
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

/** The keyboard case of a text field: the keymap of `stepKeys.ts`; Home and End change nothing. */
function registerNumericKeyboard(spec: NumericSpec) {
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
}

/** A text field for a number (`NumberInput`): see the file header. */
export function numericFieldBehaviour(name: string, spec: NumericSpec) {
    describe(`shared numeric field: ${name}`, () => {
        registerPlacement(spec);
        typedFieldCases(spec);

        registerNumericKeyboard(spec);
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

export interface PointListHandle extends NumericHandle {
    /** The number of rows now shown. */
    rows(): number;
    /** The per-row remove buttons, in row order; leave out for a list without removal. */
    removeButtons?(): HTMLElement[];
    /** The row-name toggles, in row order; leave out for a list without selection. */
    selectButtons?(): HTMLElement[];
}

export interface PointListSpec extends Omit<NumericSpec, 'mount'> {
    mount(): PointListHandle | Promise<PointListHandle>;
    /** The fewest rows; with `removeButtons` the remove buttons must be unavailable there, with a reason. */
    minCount?: number;
}

/**
 * The typed point list (`PointListInput`): `field` is a coordinate field of one row, so the numeric cases (limit, refusal, commit,
 * Escape, keyboard, Reset) run on it unchanged. Added: removal at the fewest rows and, for a list with selection, the pressed toggles.
 * Real graphs mount it from P3 to P5; `sharedControls.behaviour.test.tsx` runs it on the bare list.
 */
export function pointListBehaviour(name: string, spec: PointListSpec) {
    describe(`shared point list: ${name}`, () => {
        registerPlacement(spec);
        typedFieldCases(spec);
        registerNumericKeyboard(spec);

        const reasonOf = (button: HTMLElement) =>
            button.closest('.point-list')?.querySelector('[data-point-reason]')?.textContent?.trim() || null;

        if (spec.minCount !== undefined) {
            it.each(languages)('limit and refusal: a remove at the fewest rows keeps them and gives its reason (%s)', async language => {
                setLanguage(language);
                const handle = await spec.mount();
                const minCount = spec.minCount!;
                for (let guard = handle.rows() + 1; handle.rows() > minCount && guard > 0; guard--) {
                    fireEvent.click(handle.removeButtons!()[0]);
                    await flush();
                }
                expect(handle.rows()).toBe(minCount);
                const button = handle.removeButtons!()[0];
                expect(button).toHaveAttribute('aria-disabled', 'true');
                expect(button).not.toBeDisabled();
                button.focus();
                expect(document.activeElement).toBe(button);
                fireEvent.click(button);
                await flush();
                expect(handle.rows()).toBe(minCount);
                const reason = handle.refusalText ? handle.refusalText() : reasonOf(button);
                expect(reason).toBeTruthy();
                if (!handle.refusalText) expect(reason).toBe(t('count_at_minimum', {value0: formatNumber(minCount, language, 0)}));
            });

            it('commit: a remove above the fewest rows applies at once', async () => {
                setLanguage('sl');
                const handle = await spec.mount();
                const before = handle.rows();
                expect(before).toBeGreaterThan(spec.minCount!);
                fireEvent.click(handle.removeButtons!()[0]);
                await flush();
                expect(handle.rows()).toBe(before - 1);
            });
        } else {
            it.skip('limit and refusal at the fewest rows (skipped: this list has no count bound)', () => {});
        }

        it('selection: a row-name toggle is pressed on select and released on the second press', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            if (!handle.selectButtons) return; // a list without selection
            fireEvent.click(handle.selectButtons()[1]);
            await flush();
            expect(handle.selectButtons()[1]).toHaveAttribute('aria-pressed', 'true');
            expect(handle.selectButtons()[0]).toHaveAttribute('aria-pressed', 'false');
            fireEvent.click(handle.selectButtons()[1]);
            await flush();
            expect(handle.selectButtons()[1]).toHaveAttribute('aria-pressed', 'false');
        });
    });
}

export interface PointCollectionHandle extends Handle {
    /** The Add button, or the plus of the stepper. */
    add: HTMLElement;
    /** The remove-last button (the minus) or the Remove-selected button. */
    remove: HTMLElement;
    /** The number of points. */
    read(): number;
    /** Makes the Remove-selected button's precondition true (selects a point); leave out for remove-last. */
    select?(): void | Promise<void>;
    /** The coordinate fields of the typed entry, in axis order. */
    entryFields?(): HTMLElement[];
    /** The Add-at button of the typed entry. */
    addAt?: HTMLElement;
    /** The coordinates of the last point added by the typed entry, or undefined when none was. */
    lastAddedAt?(): readonly number[] | undefined;
}

export interface PointCollectionSpec {
    section?: 'edit' | 'display';
    mount(): PointCollectionHandle | Promise<PointCollectionHandle>;
    min: number;
    max: number;
    /** Typed entry: the coordinate range, a valid value inside it with room for one step up, and a value outside it. */
    entry?: {min: number; max: number; step: number; valid: number; outOfRange: number};
}

/**
 * The point collection controls (`PointCollection`): count bounds are the limit and the refusal (a press names why it is unavailable),
 * the typed entry is the numeric field contract (commit on Enter/blur, Escape, refusal, arrow keys) with the add on top of it.
 * Real graphs mount it from P3 to P5; `sharedControls.behaviour.test.tsx` runs it on the bare control.
 */
export function pointCollectionBehaviour(name: string, spec: PointCollectionSpec) {
    describe(`shared point collection: ${name}`, () => {
        registerPlacement({section: spec.section, mount: async () => {
            const handle = await spec.mount();
            return {...handle, field: handle.add, reset: handle.reset};
        }});
        const reasonOf = (handle: PointCollectionHandle) => handle.refusalText
            ? handle.refusalText()
            : handle.add.closest('.point-collection')?.querySelector('[data-point-collection-reason], [data-count-reason]')?.textContent?.trim() || null;
        const toBound = async (handle: PointCollectionHandle, bound: number) => {
            for (let guard = spec.max - spec.min + 2; handle.read() !== bound && guard > 0; guard--) {
                if (bound < handle.read() && handle.select) await handle.select();
                fireEvent.click(bound > handle.read() ? handle.add : handle.remove);
                await flush();
            }
            expect(handle.read()).toBe(bound);
        };

        it('commit: an Add press applies at once', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            const start = handle.read();
            expect(start).toBeLessThan(spec.max);
            fireEvent.click(handle.add);
            await flush();
            expect(handle.read()).toBe(start + 1);
        });

        it('limit: a press at a count bound keeps the count and the button stays focusable', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            await toBound(handle, spec.max);
            expect(handle.add).toHaveAttribute('aria-disabled', 'true');
            expect(handle.add).not.toBeDisabled();
            handle.add.focus();
            expect(document.activeElement).toBe(handle.add);
            fireEvent.click(handle.add);
            await flush();
            expect(handle.read()).toBe(spec.max);
            await toBound(handle, spec.min);
            if (handle.select) await handle.select();
            expect(handle.remove).toHaveAttribute('aria-disabled', 'true');
            expect(handle.remove).not.toBeDisabled();
            fireEvent.click(handle.remove);
            await flush();
            expect(handle.read()).toBe(spec.min);
        });

        it.each(languages)('refusal: a press at a count bound gives its reason (%s)', async language => {
            setLanguage(language);
            const handle = await spec.mount();
            await toBound(handle, spec.max);
            fireEvent.click(handle.add);
            await flush();
            expect(reasonOf(handle)).toBeTruthy();
            await toBound(handle, spec.min);
            if (handle.select) await handle.select();
            fireEvent.click(handle.remove);
            await flush();
            expect(reasonOf(handle)).toBeTruthy();
            if (!handle.refusalText) expect(reasonOf(handle)).toBe(t('count_at_minimum', {value0: formatNumber(spec.min, language, 0)}));
        });

        if (spec.entry) {
            const entry = spec.entry;
            const fieldsOf = (handle: PointCollectionHandle) => handle.entryFields!();
            const modelOf = (field: HTMLElement) => field.getAttribute('aria-valuenow');
            // Every field but the last gets a valid value first, so the last one's Enter has a complete point to add.
            const fillAllBut = async (handle: PointCollectionHandle, last: number) => {
                for (const field of fieldsOf(handle).slice(0, last)) {
                    typeDraft(field, String(entry.valid));
                    fireEvent.blur(field);
                    await flush();
                }
            };

            it.each(languages)('refusal: a typed out-of-range coordinate is refused with a reason and adds nothing (%s)', async language => {
                setLanguage(language);
                const handle = await spec.mount();
                const start = handle.read();
                const field = fieldsOf(handle)[0];
                enterNumber(field, String(entry.outOfRange));
                await flush();
                expect(handle.read()).toBe(start);
                expect(handle.lastAddedAt?.()).toBeUndefined();
                expect(hintOf(field)).toBe(rangeHint(entry.min, entry.max, language));
                expect(field).toHaveAttribute('aria-invalid', 'true');
                expect(modelOf(field)).toBeNull();
            });

            it('commit: typing alone adds nothing; Enter in the last field adds the point at the typed coordinates', async () => {
                setLanguage('sl');
                const handle = await spec.mount();
                const start = handle.read();
                const fields = fieldsOf(handle);
                const last = fields.length - 1;
                await fillAllBut(handle, last);
                typeDraft(fields[last], String(entry.valid));
                await flush();
                expect(handle.read()).toBe(start);
                key(fields[last], 'Enter');
                await flush();
                expect(handle.read()).toBe(start + 1);
                expect(handle.lastAddedAt!()).toEqual(fields.map(() => entry.valid));
            });

            it('commit: the Add-at button adds the typed point, and is unavailable with a reason while a coordinate is missing', async () => {
                setLanguage('sl');
                const handle = await spec.mount();
                const start = handle.read();
                const fields = fieldsOf(handle);
                expect(handle.addAt).toHaveAttribute('aria-disabled', 'true');
                fireEvent.click(handle.addAt!);
                await flush();
                expect(handle.read()).toBe(start);
                expect(reasonOf(handle)).toBeTruthy();
                for (const field of fields) {
                    typeDraft(field, String(entry.valid));
                    fireEvent.blur(field);
                    await flush();
                }
                expect(handle.read()).toBe(start);
                fireEvent.click(handle.addAt!);
                await flush();
                expect(handle.read()).toBe(start + 1);
            });

            it('Escape: an open draft reverts and nothing is added', async () => {
                setLanguage('sl');
                const handle = await spec.mount();
                const start = handle.read();
                const field = fieldsOf(handle)[0];
                typeDraft(field, String(entry.valid));
                key(field, 'Escape');
                await flush();
                expect(shown(field)).toBe('');
                key(field, 'Enter');
                await flush();
                expect(modelOf(field)).toBeNull();
                expect(handle.read()).toBe(start);
            });

            it('keyboard: arrows in a coordinate field step by one', async () => {
                setLanguage('sl');
                const handle = await spec.mount();
                const field = fieldsOf(handle)[0];
                typeDraft(field, String(entry.valid));
                fireEvent.blur(field);
                await flush();
                near(Number(modelOf(field)), entry.valid);
                key(field, 'ArrowUp');
                await flush();
                near(Number(modelOf(field)), entry.valid + entry.step);
                key(field, 'ArrowDown');
                await flush();
                near(Number(modelOf(field)), entry.valid);
            });
        } else {
            it.skip('typed entry (skipped: this collection has none)', () => {});
        }

        it('Reset: the host Reset restores the starting count and clears the reason', async () => {
            setLanguage('sl');
            const handle = await spec.mount();
            const start = handle.read();
            await toBound(handle, spec.max);
            fireEvent.click(handle.add);
            await flush();
            expect(reasonOf(handle)).toBeTruthy();
            await handle.reset();
            await flush();
            expect(handle.read()).toBe(start);
            expect(reasonOf(handle)).toBeNull();
        });
    });
}
