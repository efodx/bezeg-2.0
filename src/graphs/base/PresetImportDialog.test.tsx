import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {PresetImportDialog} from "./PresetImportDialog";

const contents = JSON.stringify({"preset-bezier-curve": {data: [{id: "Primer", data: [["JSXBezierCurve", {points: [[0, 0], [1, 2]]}]]}]}});
function chooseFile(text: string) {
    const file = new File([text], "presets.txt", {type: "text/plain"});
    Object.defineProperty(file, "text", {value: async () => text});
    fireEvent.change(screen.getByLabelText("Datoteka prednastavitev"), {target: {files: [file]}});
}
beforeEach(() => localStorage.clear());

test("invalid file reports an actionable error and cannot write", async () => {
    const imported = vi.fn();
    render(<PresetImportDialog onImported={imported}/>);
    fireEvent.click(screen.getByRole("button", {name: "Uvozi prednastavitve"}));
    chooseFile("{");
    expect(await screen.findByRole("alert")).toHaveTextContent("neveljaven JSON");
    expect(screen.getByRole("button", {name: "Uvozi", exact: true})).toBeDisabled();
    expect(localStorage.length).toBe(0);
    expect(imported).not.toHaveBeenCalled();
});

test("replacement lists the affected collection and cancellation preserves it", async () => {
    localStorage.setItem("bezeg-2.0:preset-bezier-curve", "original");
    const imported = vi.fn();
    render(<PresetImportDialog onImported={imported}/>);
    fireEvent.click(screen.getByRole("button", {name: "Uvozi prednastavitve"}));
    chooseFile(contents);
    expect(await screen.findByText("bezier-curve")).toBeVisible();
    expect(screen.getByRole("button", {name: "Zamenjaj zbirke in uvozi"})).toBeEnabled();
    fireEvent.click(screen.getByRole("button", {name: "Prekliči"}));
    expect(localStorage.getItem("bezeg-2.0:preset-bezier-curve")).toBe("original");
    expect(imported).not.toHaveBeenCalled();
});

test("explicit replacement commits the validated file", async () => {
    localStorage.setItem("bezeg-2.0:preset-bezier-curve", "original");
    const imported = vi.fn();
    render(<PresetImportDialog onImported={imported}/>);
    fireEvent.click(screen.getByRole("button", {name: "Uvozi prednastavitve"}));
    chooseFile(contents);
    const confirm = await screen.findByRole("button", {name: "Zamenjaj zbirke in uvozi"});
    fireEvent.click(confirm);
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem("preset-bezier-curve")).toBeNull();
    expect(JSON.parse(localStorage.getItem("bezeg-2.0:preset-bezier-curve")!).data[0].id).toBe("Primer");
});
