import { useEffect, useMemo, useState } from "react";
import { createWebAudioOutput } from "../audio/webAudioOutput";
import { createPracticeSession, type PitchSettings } from "../core/practice/PracticeSession";
import { noteLabel, t } from "../i18n/translations";
import { Ladder } from "./Ladder";
import { SettingsPage } from "./SettingsPage";
import { loadPitchSettings, savePitchSettings } from "./storedSettings";

type View = "practice" | "settings";

/** Plain "#name" hashes only: they survive being opened inside claude.ai and other embeds. */
const SETTINGS_HASH = "#pitch";

function viewFromHash(): View {
  return location.hash === SETTINGS_HASH ? "settings" : "practice";
}

export function App() {
  const session = useMemo(() => createPracticeSession({ audio: createWebAudioOutput(), pitchSettings: loadPitchSettings() }), []);
  const [pitch, setPitch] = useState(() => session.pitchSettings());
  const [view, setView] = useState<View>(viewFromHash);
  const ladder = session.ladder();

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function changePitch(change: Partial<PitchSettings>) {
    session.setPitchSettings(change);
    const next = session.pitchSettings();
    savePitchSettings({ referencePitch: next.referencePitch, register: next.register });
    setPitch(next);
  }

  return (
    <main className="practice">
      <header className="practice__header">
        <div>
          <h1>{t("app.title")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
        {view === "practice" ? (
          <a className="header-link" href={SETTINGS_HASH}>{t("nav.settings")}</a>
        ) : (
          <a className="header-link" href="#practice">{t("nav.practice")}</a>
        )}
      </header>

      {view === "settings" ? (
        <SettingsPage pitch={pitch} onChange={changePitch} onPlayNi={() => session.playDegree("Ni")} />
      ) : (
        <section className="practice__body">
          <h2>{t(`genus.${ladder.genus}`)}</h2>
          <p className="practice__hint">{t("ladder.hint")}</p>
          <a className="pitch-card" href={SETTINGS_HASH}>
            <span className="pitch-card__text">
              <span className="pitch-card__label">{t("settings.referencePitch")}</span>
              <span className="pitch-card__value">{t("ladder.niPitch", { note: noteLabel(pitch.niNote), hz: pitch.niHz.toFixed(2) })}</span>
            </span>
            <span className="pitch-card__action" aria-hidden="true">{t("ladder.changePitch")} ›</span>
          </a>
          <Ladder ladder={ladder} onPlayDegree={(id) => session.playDegree(id)} />
          <p className="practice__source" title={ladder.source}>
            {t("ladder.tuning", { name: t(`tuning.${ladder.tuningSystemId}`), moria: ladder.moriaPerOctave })}
          </p>
        </section>
      )}
    </main>
  );
}
