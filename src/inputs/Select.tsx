import {useT} from "../localization";
interface SelectProps {
    options: { value: any; text: string; }[];
    selected?: string;
    /** When given, the select is controlled and always shows the option with this value. */
    value?: string;
    /** Accessible name; defaults to the parametrization wording the select was first written for. */
    ariaLabel?: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => any
}


export function Select(props: SelectProps) {
    const t = useT();
    let getOptions = () => props.options.map((option: { value: any; text: string }) =>
        <option key={option.value} value={option.value}>{option.text}</option>);
    const label = props.ariaLabel ?? t("choose_parametrization");

    if (props.value !== undefined) {
        return <select value={props.value} onChange={(e) => props.onChange(e)} className="form-select" aria-label={label}>
            {getOptions()}
        </select>;
    }
    return <select onChange={(e) => props.onChange(e)} className="form-select" aria-label={label}>
        {props.selected ? <option selected>{props.selected}</option> : ""}
        {getOptions()}
    </select>;
}
