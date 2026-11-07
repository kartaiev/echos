import type { ModeId } from "../core/theory/modeVariants";
import { currentLanguage, t, tIn } from "../i18n/translations";

/** A Mode's name; in the English interface the Greek name follows it, as Greek chant books print it. */
export function ModeName({ mode }: { mode: ModeId }) {
  return (
    <>
      {t(`mode.${mode}`)}
      {currentLanguage() !== "el" && (
        <span className="mode-name__greek" lang="el">
          {tIn("el", `mode.${mode}`)}
        </span>
      )}
    </>
  );
}
