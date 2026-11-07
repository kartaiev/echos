/** System follows the device's light or dark setting; the other two override it. */
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const isTheme = (value: unknown): value is Theme => THEMES.includes(value as Theme);

let setByUs = false;

/**
 * Light and dark set data-theme on the root element, which the stylesheet reads. System removes it again, but only
 * if this page set it: a host such as an embedding viewer may set data-theme itself.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") {
    if (setByUs) root.removeAttribute("data-theme");
    setByUs = false;
    return;
  }
  root.setAttribute("data-theme", theme);
  setByUs = true;
}
