import {useT} from "../localization";
interface SelectProps {
    options: { value: any; text: string; }[];
    selected?: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => any
}


export function Select(props: SelectProps) {
    const t = useT();
    let getOptions = () => props.options.map((option: { value: any; text: string }) =>
        <option value={option.value}>{option.text}</option>);

    return <select onChange={(e) => props.onChange(e)} className="form-select" aria-label={t("choose_parametrization")}>
        {props.selected ? <option selected>{props.selected}</option> : ""}
        {getOptions()}
    </select>;
}