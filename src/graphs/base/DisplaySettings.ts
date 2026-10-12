/** Stable identifiers; the visible labels are translated by `AxisSelector`. */
export enum AxisSelect {
    NONE = "none",
    ONLY_AXIS = "axes",
    AXIS_AND_MAJOR = "axes-major",
    AXIS_AND_MINOR = "axes-minor",
    EVERYTHING = "all"
}

const fontSizeStep = 2;
const strokeWidthStep = 0.5;
const pointSizeStep = 1;
const majorHeightStep = 5;
const minorHeightStep = 3;

const defaultFontSize = 20;
const defaultStrokeWidth = 2;
const defaultPointSize = 4;
const defaultMajorHeight = 10;
const defaultMinorHeight = 4;

const ticksNumbersVisibility = [AxisSelect.EVERYTHING];
const ticksMinorVisibility = [AxisSelect.AXIS_AND_MINOR, AxisSelect.EVERYTHING];
const ticksVisibility = [AxisSelect.AXIS_AND_MAJOR, AxisSelect.AXIS_AND_MINOR, AxisSelect.EVERYTHING];
const axisVisibility = [AxisSelect.ONLY_AXIS, AxisSelect.AXIS_AND_MAJOR, AxisSelect.AXIS_AND_MINOR, AxisSelect.EVERYTHING];

/**
 * How one graph is displayed: element size, coordinate-system parts and point labels. Every graph owns its own
 * instance, so two graphs never share a setting. JSXGraph attribute callbacks read it when an element is drawn
 * (`size: () => settings.pointSize`), so a change takes effect with the next board update.
 */
export class DisplaySettings {
    fontSize = defaultFontSize;
    strokeWidth = defaultStrokeWidth;
    pointSize = defaultPointSize;
    majorHeight = defaultMajorHeight;
    minorHeight = defaultMinorHeight;
    pointLabelsVisible = true;
    axisSelect = AxisSelect.EVERYTHING;

    private size = 0;

    /** The element size step chosen with the size slider (0 is the default size). */
    getSize(): number {
        return this.size;
    }

    setSize(size: number): void {
        this.size = size;
        this.fontSize = defaultFontSize + size * fontSizeStep;
        this.strokeWidth = defaultStrokeWidth + size * strokeWidthStep;
        this.pointSize = defaultPointSize + size * pointSizeStep;
        this.majorHeight = defaultMajorHeight + size * majorHeightStep;
        this.minorHeight = defaultMinorHeight + size * minorHeightStep;
    }

    getAxisSelect(): AxisSelect {
        return this.axisSelect;
    }

    setAxisSelect(selected: AxisSelect): void {
        this.axisSelect = selected;
    }

    ticksVisible(): boolean {
        return ticksVisibility.includes(this.axisSelect);
    }

    tickNumbersVisible(): boolean {
        return ticksNumbersVisibility.includes(this.axisSelect);
    }

    axisVisible(): boolean {
        return axisVisibility.includes(this.axisSelect);
    }

    minorVisible(): boolean {
        return ticksMinorVisibility.includes(this.axisSelect);
    }
}
