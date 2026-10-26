import {JXGRationalBezierCurve} from "././JXGRationalBezierCurve";
import {JXGPHBezierCurve} from "./JXGPHBezierCurve";
import {JXGBezierCurve} from "./JXGBezierCurve";
import {Board} from "jsxgraph";
import {JXGGenericSplineCurve} from "./JXGGenericSplineCurve";
import {JXGQuadraticC1SplineCurve} from "./JXGQuadraticC1SplineCurve";
import {JXGQubicC2SplineCurve} from "./JXGQubicC2SplineCurve";
import {JXGQuadraticG1SplineCurve} from "./JXGQuadraticG1SplineCurve";
import {JXGSymmetricQuadraticG1SplineCurve} from "./JXGSymmetricQuadraticG1SplineCurve";
import {CURVE_TYPE_NAMES, CurveTypeName, isCurveTypeName} from "./curveTypeNames";
import {assertPlanarAdapter, assertPlanarDto} from "./planarDtoGuard";

/** Every stored curve type name has an adapter; the record type makes a name without one a type error. */
const nameToClass: Record<CurveTypeName, any> = {
    JSXRationalBezierCurve: JXGRationalBezierCurve,
    JSXGenericSplineCurve: JXGGenericSplineCurve,
    JSXQuadraticC1SplineCurve: JXGQuadraticC1SplineCurve,
    JSXQubicC2SplineCurve: JXGQubicC2SplineCurve,
    JSXQuadraticG1SplineCurve: JXGQuadraticG1SplineCurve,
    JSXBezierCurve: JXGBezierCurve,
    JSXPHBezierCurve: JXGPHBezierCurve,
    JSXSymmetricQuadraticG1SplineCurve: JXGSymmetricQuadraticG1SplineCurve,
};

const classToNameMap = new Map<any, CurveTypeName>(CURVE_TYPE_NAMES.map(name => [nameToClass[name], name]));


export class ClassMapper {
    static getFromDto(name: CurveTypeName): (s: any, board: Board) => any {
        const fromDto = nameToClass[name].fromDto;
        return (dto: any, board: Board) => {
            assertPlanarDto(dto);
            return fromDto(dto, board);
        };
    }

    /** The adapter class that stores curves under `name`, or undefined for an unknown name. */
    static getClass(name: string): (new (...args: any[]) => unknown) | undefined {
        return isCurveTypeName(name) ? nameToClass[name] : undefined;
    }

    static getClassName(clazz: any): CurveTypeName {
        return classToNameMap.get(clazz)!;
    }

    static getToDto(clazz: any): (curve: any) => any {
        const toDto = clazz.toDto;
        return (curve: any) => {
            assertPlanarAdapter(curve);
            const dto = toDto(curve);
            assertPlanarDto(dto);
            return dto;
        };
    }

}
