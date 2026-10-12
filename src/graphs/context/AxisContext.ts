/** Stable identifiers; the visible labels are translated by `AxisSelector`. */
export enum AxisSelect {
    NONE = "none",
    ONLY_AXIS = "axes",
    AXIS_AND_MAJOR = "axes-major",
    AXIS_AND_MINOR = "axes-minor",
    EVERYTHING = "all"
}

class AxisContextSingleton {
    axisSelect = AxisSelect.EVERYTHING;
    ticksNumbersVisibility = [AxisSelect.EVERYTHING];
    ticksMinorVisibility = [AxisSelect.AXIS_AND_MINOR, AxisSelect.EVERYTHING];
    ticksVisibility = [AxisSelect.AXIS_AND_MAJOR, AxisSelect.AXIS_AND_MINOR, AxisSelect.EVERYTHING];
    axisVisibility = [AxisSelect.ONLY_AXIS, AxisSelect.AXIS_AND_MAJOR, AxisSelect.AXIS_AND_MINOR, AxisSelect.EVERYTHING];

    ticksVisible() {
        return this.ticksVisibility.includes(this.axisSelect);
    }


    tickNumbersVisible() {
        return this.ticksNumbersVisibility.includes(this.axisSelect);
    }

    axisVisible() {
        return this.axisVisibility.includes(this.axisSelect);
    }


    minorVisible() {
        return this.ticksMinorVisibility.includes(this.axisSelect);
    }

    getSelected() {
        return this.axisSelect;
    }

    setSelected(selected: AxisSelect) {
        this.axisSelect = selected;
    }
}

export const AxisContext = new AxisContextSingleton();