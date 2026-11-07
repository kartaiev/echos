import { useEffect, useState } from "react";
import { MODE_IDS, type ModeId } from "../core/theory/modeVariants";
import { t } from "../i18n/translations";

/** The id of a Mode's card, so that the jump block can reach it. */
export const modeAnchor = (mode: ModeId) => `mode-${mode}`;

/** A card counts as the one being read once its top has passed under the jump block. */
const READING_LINE_PX = 130;

/** The Mode whose card is under the jump block now, or null above the first card. */
function useModeInView(): ModeId | null {
  const [inView, setInView] = useState<ModeId | null>(null);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      let current: ModeId | null = null;
      for (const mode of MODE_IDS) {
        const card = document.getElementById(modeAnchor(mode));
        if (card && card.getBoundingClientRect().top <= READING_LINE_PX) current = mode;
      }
      setInView(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return inView;
}

/**
 * The eight Modes at the top of a long page, staying there while it scrolls: the four authentic Modes, then the
 * four plagal ones. The Mode being read is marked. Buttons, not "#" links: the hash already chooses the view. The
 * card's heading takes the focus, so keyboard and screen reader users land where the eye does.
 */
export function ModeJump() {
  const inView = useModeInView();

  function jump(mode: ModeId) {
    const card = document.getElementById(modeAnchor(mode));
    if (!card) return;
    card.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
  }

  return (
    <nav className="mode-jump" aria-label={t("jump.label")}>
      {MODE_IDS.map((mode, i) => (
        <button
          key={mode}
          type="button"
          lang="el"
          className={i === 4 ? "mode-jump__plagal" : undefined}
          aria-label={t(`mode.${mode}`)}
          aria-current={inView === mode ? "location" : undefined}
          onClick={() => jump(mode)}
        >
          {t(`jump.${mode}`)}
        </button>
      ))}
    </nav>
  );
}
