import React from "react";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {PointCoordinateEditor} from "./PointCoordinateEditor";
import {PointImpl} from "../../bezeg/impl/point/point-impl";

test("keyboard submission resolves current points after an auxiliary editor replaces them", () => {
    const before = [new PointImpl(1, 2)];
    const after = [new PointImpl(1, 2)];
    let points = before;
    const board = {on: jest.fn(), off: jest.fn()} as unknown as JXG.Board;
    const onChange = jest.fn();
    render(<PointCoordinateEditor prefix="w" points={() => points} board={board} onChange={onChange}/>);
    points = after;
    fireEvent.click(screen.getByText("Koordinate točk · urejanje s tipkovnico"));
    fireEvent.change(screen.getByLabelText("w0 x"), {target: {value: "3.25"}});
    fireEvent.click(screen.getByRole("button", {name: "Uporabi koordinate"}));
    expect(after[0].X()).toBe(3.25);
    expect(before[0].X()).toBe(1);
    expect(onChange).toHaveBeenCalledTimes(1);
});

test("auxiliary graph dragging refreshes coordinates and listeners are disposed", () => {
    const point = new PointImpl(1, 2);
    const board = {on: jest.fn(), off: jest.fn()} as unknown as JXG.Board;
    let refresh = () => {};
    const auxiliary = {on: jest.fn((event, callback) => {refresh = callback;}), off: jest.fn()} as unknown as JXG.Board;
    const {unmount} = render(<PointCoordinateEditor points={() => [point]} board={board} observeBoard={() => auxiliary} onChange={jest.fn()}/>);
    fireEvent.click(screen.getByText("Koordinate točk · urejanje s tipkovnico"));
    point.setX(4);
    act(() => refresh());
    expect(screen.getByLabelText("p0 x")).toHaveValue(4);
    unmount();
    expect(auxiliary.off).toHaveBeenCalledWith("up", refresh);
    expect(board.off).toHaveBeenCalledWith("up", refresh);
});
