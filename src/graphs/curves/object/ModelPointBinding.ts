import {PointImpl} from "../../../bezeg/impl/point/point-impl";
import {assertPlanarPoint} from "../../../bezeg/impl/point/planar-guard";

/** Keeps one numeric model point and its JSXGraph input point in sync. */
export class ModelPointBinding {
    private readonly unsubscribe: () => void;
    private disposed = false;

    constructor(
        private readonly modelPoint: PointImpl,
        private readonly boardPoint: JXG.Point,
        private readonly afterDrag?: () => void,
    ) {
        assertPlanarPoint(modelPoint, "ModelPointBinding");
        this.unsubscribe = modelPoint.subscribe(() => this.syncToBoard());
        boardPoint.on("drag", this.onDrag);
        this.syncToBoard();
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.unsubscribe();
        this.boardPoint.off("drag", this.onDrag);
    }

    private onDrag = (): void => {
        if (this.disposed) return;
        assertPlanarPoint(this.modelPoint, "ModelPointBinding");
        this.modelPoint.setCoordinates(this.boardPoint.X(), this.boardPoint.Y());
        this.afterDrag?.();
    };

    private syncToBoard(): void {
        if (this.disposed) return;
        assertPlanarPoint(this.modelPoint, "ModelPointBinding");
        const x = this.modelPoint.X();
        const y = this.modelPoint.Y();
        if (this.boardPoint.X() === x && this.boardPoint.Y() === y) return;
        this.boardPoint.setPositionDirectly(JXG.COORDS_BY_USER, [x, y]);
    }
}
