import { MODE_IDS, type ModeId } from "../core/theory/modeVariants";
import { t } from "../i18n/translations";

/** The id of a Mode's card, so that the jump row can reach it. */
export const modeAnchor = (mode: ModeId) => `mode-${mode}`;

/**
 * The eight Modes in a row that stays at the top of a long page. Buttons, not "#" links: the hash already chooses
 * the view. A folded card opens, and its heading takes the focus, so keyboard and screen reader users land where
 * the eye does.
 */
export function ModeJump() {
  function jump(mode: ModeId) {
    const card = document.getElementById(modeAnchor(mode));
    if (!card) return;
    if (card instanceof HTMLDetailsElement) card.open = true;
    card.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card.querySelector<HTMLElement>("summary, h3")?.focus({ preventScroll: true });
  }

  return (
    <nav className="mode-jump" aria-label={t("jump.label")}>
      {MODE_IDS.map((mode) => (
        <button key={mode} type="button" lang="el" aria-label={t(`mode.${mode}`)} onClick={() => jump(mode)}>
          {t(`jump.${mode}`)}
        </button>
      ))}
    </nav>
  );
}
