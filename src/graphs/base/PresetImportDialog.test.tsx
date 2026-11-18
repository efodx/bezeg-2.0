import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {PresetImportDialog} from "./PresetImportDialog";
import {PresetLockContext, type UserActionMode} from "../context/react/PresetLockContext";

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

test.each(["lesson-card", "lesson-observe"] as const)("an import validated before a lesson is refused at confirm in %s mode", async locked => {
    localStorage.setItem("bezeg-2.0:preset-bezier-curve", "original");
    const imported = vi.fn();
    let mode: UserActionMode = "free";
    render(<PresetLockContext.Provider value={{mode: "free", current: () => mode}}><PresetImportDialog onImported={imported}/></PresetLockContext.Provider>);
    fireEvent.click(screen.getByRole("button", {name: "Uvozi prednastavitve"}));
    chooseFile(contents);
    const confirm = await screen.findByRole("button", {name: "Zamenjaj zbirke in uvozi"});
    mode = locked;
    fireEvent.click(confirm);
    expect(await screen.findByText("Med lekcijo ni na voljo.")).toHaveAttribute("role", "alert");
    expect(localStorage.getItem("bezeg-2.0:preset-bezier-curve")).toBe("original");
    expect(imported).not.toHaveBeenCalled();
    mode = "free";
    fireEvent.click(screen.getByRole("button", {name: "Zamenjaj zbirke in uvozi"}));
    await waitFor(() => expect(imported).toHaveBeenCalledTimes(1));
});
