import type { SelectHTMLAttributes } from "react";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Classes for the field around the select, which takes its place in the layout. */
  fieldClassName?: string;
}

/**
 * A native select drawn with the app's own chevron instead of the browser's, so it looks the same in every browser
 * and like the chevron on Voice and Tempo. The field around it holds the chevron, which a select cannot.
 */
export function SelectField({ fieldClassName, ...select }: SelectFieldProps) {
  return (
    <span className={["select-field", fieldClassName].filter(Boolean).join(" ")}>
      <select {...select} />
    </span>
  );
}
