import type { KeyboardEvent, ReactNode } from "react";

interface SegmentedProps<T extends string | number> {
  options: readonly T[];
  value: T | null;
  label: string;
  onChange: (value: T) => void;
  /** What a button shows; the option itself when left out. */
  render?: (option: T) => ReactNode;
  /** What a button is read as, when its text alone does not say enough. */
  optionLabel?: (option: T) => string;
  className?: string;
  optionClassName?: string;
  lang?: (option: T) => string | undefined;
  /** Whether the arrows go round from the last choice to the first; off where the choices are an ordered scale. */
  wrap?: boolean;
}

/**
 * One choice out of a few, as a radio group: one Tab stop for the group, and the arrow keys move the choice, as
 * screen reader and keyboard users expect of radio buttons.
 */
export function Segmented<T extends string | number>(props: SegmentedProps<T>) {
  const { options, value, label, onChange } = props;
  const focusable = options.includes(value as T) ? value : options[0];

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step === undefined) return;
    e.preventDefault();
    const from = options.indexOf(focusable as T);
    const to =
      props.wrap === false ? Math.max(0, Math.min(options.length - 1, from + step)) : (from + step + options.length) % options.length;
    if (to === from) return;
    const next = options[to];
    if (next === undefined) return;
    onChange(next);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[to]?.focus();
  }

  return (
    <div className={props.className ?? "segmented"} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((option) => {
        const checked = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={props.optionLabel?.(option)}
            lang={props.lang?.(option)}
            tabIndex={option === focusable ? 0 : -1}
            className={[props.optionClassName, checked && "is-selected"].filter(Boolean).join(" ")}
            onClick={() => onChange(option)}
          >
            {props.render ? props.render(option) : option}
          </button>
        );
      })}
    </div>
  );
}
