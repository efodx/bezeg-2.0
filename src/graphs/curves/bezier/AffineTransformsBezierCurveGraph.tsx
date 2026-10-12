import {t} from "../../../localization";
import React from 'react';

import {Button} from "react-bootstrap";
import {BaseBezierCurveGraph} from "../../base/BaseBezierCurveGraph";
import {BaseGraphStates} from "../../base/BaseCurveGraph";
import {Attributes} from "../../attributes/Attributes";
import {LessonActionRegistry} from "../../base/lesson/LessonActionRegistry";

function AffineActionButton(props: {
    label: string;
    detail: string;
    symbol: string;
    onClick: () => void;
}) {
    return <Button className="affine-action-button" aria-label={`${props.label}: ${props.detail}`} onClick={props.onClick}>
        <span className="affine-action-symbol" aria-hidden="true">{props.symbol}</span>
        <span className="affine-action-copy"><span>{props.label}</span><small>{props.detail}</small></span>
    </Button>;
}

function AffineActionGroup(props: {title: string; children: React.ReactNode; className?: string}) {
    return <section className={`affine-transform-group ${props.className ?? ""}`}>
        <h4>{props.title}</h4>
        <div className="affine-transform-actions">{props.children}</div>
    </section>;
}

export default class AffineTransformBezierCurveGraph extends BaseBezierCurveGraph<BaseGraphStates> {
    override initialize() {
        super.initialize();
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
    }

    protected override prepareLessonDefaultScene(): void {
        super.prepareLessonDefaultScene();
        this.getFirstJxgCurve().setAttributes(Attributes.bezierDisabled);
        this.boardUpdate();
    }

    protected override registerLessonActions(registry: LessonActionRegistry): void {
        super.registerLessonActions(registry);
        registry.on('affine-transform', action => {
            const curve = this.getFirstCurve();
            if (action.operation === 'translate-x') curve.moveFor(action.value, 0);
            if (action.operation === 'translate-y') curve.moveFor(0, action.value);
            if (action.operation === 'scale') curve.scale(action.value);
            if (action.operation === 'rotate') curve.rotate(action.value);
            if (action.operation === 'reflect-x') curve.flip(false, true);
            if (action.operation === 'reflect-y') curve.flip(true, false);
            this.boardUpdate();
        });
    }


    override presets(): string {
        return "affine-transform";
    }

    defaultPreset(): any {
        return [["JSXBezierCurve", {
            "points": [[-3, 2], [0, -2], [1, 2], [3, -2]], "state": {
                "showingJxgPoints": true,
                "showingControlPolygon": false,
                "showingConvexHull": false,
                "showingDecasteljauScheme": false,
                "subdivisionT": 0.5,
                "decasteljauT": 0.5,
                "extrapolationT": 1.2
            }
        }]];
    }

    override getGraphCommands(): JSX.Element[] {
        return super.getGraphCommands().concat([
            <AffineActionGroup key="position" title={t("affine_position")} className="affine-position-group">
                <AffineActionButton label={t("left")} detail="−0.5" symbol="←" onClick={() => this.moveFor(-0.5, 0)}/>
                <AffineActionButton label={t("right")} detail="+0.5" symbol="→" onClick={() => this.moveFor(0.5, 0)}/>
                <AffineActionButton label={t("up")} detail="+0.5" symbol="↑" onClick={() => this.moveFor(0, 0.5)}/>
                <AffineActionButton label={t("down")} detail="−0.5" symbol="↓" onClick={() => this.moveFor(0, -0.5)}/>
            </AffineActionGroup>,
            <AffineActionGroup key="scale" title={t("affine_scale")}>
                <AffineActionButton label={t("scale_up")} detail="×1.2" symbol="＋" onClick={() => this.scale(1.2)}/>
                <AffineActionButton label={t("scale_down")} detail="×0.8" symbol="−" onClick={() => this.scale(0.8)}/>
            </AffineActionGroup>,
            <AffineActionGroup key="rotation" title={t("affine_rotation")}>
                <AffineActionButton label={t("rotate_left")} detail="18°" symbol="↺" onClick={() => this.rotate(-0.10 * Math.PI)}/>
                <AffineActionButton label={t("rotate_right")} detail="18°" symbol="↻" onClick={() => this.rotate(0.10 * Math.PI)}/>
            </AffineActionGroup>,
            <AffineActionGroup key="reflection" title={t("affine_reflection")}>
                <AffineActionButton label={t("reflect_across_y")} detail={t("affine_axis_y")} symbol="↔" onClick={() => this.flip(true, false)}/>
                <AffineActionButton label={t("reflect_across_x")} detail={t("affine_axis_x")} symbol="↕" onClick={() => this.flip(false, true)}/>
            </AffineActionGroup>
        ]);
    }

    private moveFor(x: number, y: number) {
        this.getFirstCurve().moveFor(x, y);
        this.boardUpdate();
    }

    private scale(scale: number) {
        this.getFirstCurve().scale(scale);
        this.boardUpdate();
    }

    private rotate(number: number) {
        this.getFirstCurve().rotate(number);
        this.boardUpdate();
    }

    private flip(b: boolean, b2: boolean) {
        this.getFirstCurve().flip(b, b2);
        this.boardUpdate();
    }


}
