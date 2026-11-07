/** Joins the ids of the elements that describe a field into one `aria-describedby` value; undefined when there are none. */
export function joinIds(...ids: Array<string | false | undefined>): string | undefined {
    return ids.filter(Boolean).join(" ") || undefined;
}
