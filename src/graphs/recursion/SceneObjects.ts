/** An owned set of board objects and listeners: everything a recursion graph creates goes through `own`, and `dispose` removes it all (the same shape as in the combinatorics graphs). */
export class SceneObjects {
    private objects: JXG.GeometryElement[] = [];
    private listeners: Array<() => void> = [];

    own<E extends JXG.GeometryElement>(element: E): E {
        this.objects.push(element);
        return element;
    }

    listen(off: () => void): void {
        this.listeners.push(off);
    }

    objectCount(): number { return this.objects.length; }
    listenerCount(): number { return this.listeners.length; }

    /** Removes the listeners, then the objects, newest first; safe to call twice and after the board is gone. */
    dispose(board: JXG.Board | undefined): void {
        for (const off of this.listeners.splice(0)) off();
        if (board) {
            const alive = this.objects.filter(object => board.objectsList.includes(object)).reverse();
            if (alive.length) board.removeObject(alive);
        }
        this.objects = [];
    }
}
